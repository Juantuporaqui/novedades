// =================================================================================
// SIREX - SCRIPT CENTRAL DE PROCESAMIENTO DE NOVEDADES
// Lee un archivo .docx estandarizado, extrae los datos de cada grupo
// y los guarda en sus respectivas colecciones de Firebase.
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {

    // --- CONFIGURACIÓN FIREBASE ---
    const firebaseConfig = {
        apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
        authDomain: "ucrif-5bb75.firebaseapp.com",
        projectId: "ucrif-5bb75",
        storageBucket: "ucrif-5bb75.appspot.com",
        messagingSenderId: "241698436443",
        appId: "1:241698436443:web:1f333b3ae3f813b755167e"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // --- ELEMENTOS DOM ---
    const inputDocx = document.getElementById('inputDocx');
    const statusContainer = document.getElementById('status-container');
    const resultsContainer = document.getElementById('results-container');

    // --- MANEJO DE EVENTOS ---
    if (inputDocx) {
        inputDocx.addEventListener('change', handleDocxUpload);
    }

    // =================================================
    // FUNCIONES DE UI (SPINNER Y MENSAJES)
    // =================================================
    function showStatus(message, type = 'info') {
        if (!statusContainer) return;
        let alertClass = 'alert-info';
        if (type === 'success') alertClass = 'alert-success';
        if (type === 'error') alertClass = 'alert-danger';
        statusContainer.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;
    }

    function showSpinner(visible) {
        const spinner = document.getElementById('spinner-area');
        if (spinner) {
            spinner.style.display = visible ? 'flex' : 'none';
        }
    }

    function showResults(parsedData) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '<h3><i class="bi bi-check-circle-fill text-success"></i> Datos Extraídos</h3>';
        
        for (const key in parsedData) {
            if (Object.keys(parsedData[key]).length > 0 || (Array.isArray(parsedData[key]) && parsedData[key].length > 0)) {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `
                    <div class="card-header"><strong>${key.toUpperCase()}</strong></div>
                    <div class="card-body">
                        <pre style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(parsedData[key], null, 2)}</pre>
                    </div>
                `;
                resultsContainer.appendChild(card);
            }
        }
    }


    // =================================================
    // LÓGICA PRINCIPAL DE PROCESAMIENTO
    // =================================================
    async function handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.docx')) {
            showStatus('Por favor, selecciona un archivo .docx válido.', 'error');
            return;
        }

        showSpinner(true);
        resultsContainer.innerHTML = '';
        showStatus('Procesando archivo...', 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            // 1. Parsear el HTML para extraer todos los datos
            const parsedData = parseAllSections(html);

            if (Object.keys(parsedData).length === 0) {
                throw new Error("No se pudo extraer ninguna sección. Revisa que los títulos de los grupos en el DOCX son correctos.");
            }

            showResults(parsedData);

            // 2. Guardar los datos en Firebase
            await saveAllToFirebase(parsedData);
            
            showStatus('¡Proceso completado! Todos los datos han sido guardados en Firebase.', 'success');

        } catch (err) {
            console.error("Error en el procesamiento:", err);
            showStatus(`Error: ${err.message}`, 'error');
        } finally {
            showSpinner(false);
            inputDocx.value = ''; // Reset input
        }
    }
    
    // =================================================
    // PARSERS (El "cerebro" que interpreta el HTML)
    // =================================================

    /**
     * Busca un título (h1, h2, h3) en el documento y devuelve la tabla que le sigue.
     */
    function findTableAfterTitle(htmlRoot, titleText) {
        const headers = Array.from(htmlRoot.querySelectorAll('h1, h2, h3, h4, p > strong'));
        const targetHeader = headers.find(h => h.textContent.trim().toUpperCase().includes(titleText.toUpperCase()));
        
        if (targetHeader) {
            // Buscamos la tabla como un elemento siguiente
            let nextElement = targetHeader.closest('p')?.nextElementSibling || targetHeader.nextElementSibling;
            while(nextElement) {
                if (nextElement.tagName === 'TABLE') {
                    return nextElement;
                }
                nextElement = nextElement.nextElementSibling;
            }
        }
        return null; // Si no se encuentra
    }

    /**
     * Convierte una tabla de dos columnas (Concepto, Valor) en un objeto.
     * Ideal para GESTIÓN, CECOREX, GRUPO 1.
     */
    function mapKeyValueTable(table) {
        const data = {};
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const key = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                if (key) { // Solo si la celda de concepto no está vacía
                    data[key] = !isNaN(parseFloat(value)) && isFinite(value) ? parseFloat(value) : value;
                }
            }
        });
        return data;
    }

    /**
     * Convierte una tabla donde cada fila es un registro, en un array de objetos.
     * Ideal para INVESTIGACIÓN, CIE, GRUPO 4.
     */
    function mapArrayTable(table) {
        const data = [];
        const headers = Array.from(table.querySelectorAll('th, td'))
            .slice(0, table.querySelector('tr').children.length)
            .map(th => th.textContent.trim().toLowerCase().replace(/ /g, '_').replace(/\./g, ''));
            
        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Omitir cabecera
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0 && Array.from(cells).some(c => c.textContent.trim() !== '')) {
                const entry = {};
                cells.forEach((cell, index) => {
                    const header = headers[index];
                    if(header) {
                       entry[header] = cell.textContent.trim();
                    }
                });
                data.push(entry);
            }
        });
        return data;
    }

    /**
     * Orquesta el parseo de todas las secciones del documento.
     */
    function parseAllSections(html) {
        const htmlRoot = document.createElement('div');
        htmlRoot.innerHTML = html;

        const data = {};
        
        // --- Metadata ---
        const pTags = Array.from(htmlRoot.querySelectorAll('p'));
        const turnoTag = pTags.find(p => p.textContent.includes('Turno (M/T/N):'));
        if (turnoTag) {
            data.metadata = {
                turno: turnoTag.textContent.split(',')[0].replace('Turno (M/T/N):', '').trim(),
                responsable: turnoTag.textContent.split('Responsable:')[1]?.trim()
            };
        }

        const tituloTag = pTags.find(p => p.textContent.startsWith('NOVEDADES B.P.E.F.'));
        if(tituloTag) {
            const match = tituloTag.textContent.match(/\[(.*?)\]/);
            if(match && match[1]) {
                const dateParts = match[1].split('/');
                if (dateParts.length === 3) {
                     data.fecha = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`;
                }
            }
        }
        if(!data.fecha) { // Fallback a hoy si no encuentra fecha
            const today = new Date();
            data.fecha = today.toISOString().slice(0, 10);
            console.warn("No se encontró fecha en el título, usando fecha actual.");
        }


        // --- Parseo por Grupos ---
        const secciones = {
            grupo1: { title: "GRUPO 1", type: 'key-value' },
            investigacion: { title: "GRUPOS 2 y 3", type: 'array' },
            casas_citas: { title: "CONTROL CASA DE CITAS", type: 'array' },
            grupo4: { title: "GRUPO 4", type: 'array' },
            puerto: { title: "PUERTO", type: 'puerto' },
            cecorex: { title: "CECOREX", type: 'key-value' },
            cie: { title: "CIE", type: 'array' },
            gestion: { title: "GESTIÓN", type: 'key-value' }
        };

        for (const [key, config] of Object.entries(secciones)) {
            const table = findTableAfterTitle(htmlRoot, config.title);
            if (table) {
                if (config.type === 'key-value') {
                    data[key] = mapKeyValueTable(table);
                } else if (config.type === 'array') {
                    data[key] = mapArrayTable(table);
                } else if (config.type === 'puerto') { // Parser especial para Puerto
                    data[key] = mapKeyValueTable(table); // La estructura ahora es simple
                }
            }
        }
        return data;
    }


    // =================================================
    // LÓGICA DE GUARDADO EN FIREBASE
    // =================================================
    
    /**
     * Recibe el objeto con todos los datos parseados y lo guarda en Firebase.
     */
    async function saveAllToFirebase(data) {
        const fecha = data.fecha;
        if (!fecha) throw new Error("No se pudo determinar la fecha para guardar los registros.");
        
        const fechaSinGuiones = fecha.replace(/-/g, "");

        const batch = db.batch();

        // Mapeo de claves de datos a colecciones y formatos de ID de Firebase
        const firebaseMap = {
            cecorex: { collection: "cecorex", id: `cecorex_${fecha}` },
            cie: { collection: "grupo_cie", id: fecha },
            gestion: { collection: "gestion_avanzada", id: `gestion_${fechaSinGuiones}` },
            puerto: { collection: "grupoPuerto_registros", id: `puerto_${fecha}` },
            grupo1: { collection: "grupo1_diario", id: `g1_${fecha}` }, // Asumimos colecciones nuevas
            grupo4: { collection: "grupo4_operativo", id: `g4_${fecha}` },
            investigacion: { collection: "investigacion_diario", id: `inv_${fecha}` },
            casas_citas: { collection: "control_casas_citas", id: `citas_${fecha}` }
        };
        
        for (const [key, fbConfig] of Object.entries(firebaseMap)) {
            if (data[key] && (Object.keys(data[key]).length > 0 || data[key].length > 0)) {
                
                // Formateamos los datos antes de guardarlos para que coincidan con las apps existentes si es necesario
                let dataToSave = {
                    fecha: fecha,
                    ...data.metadata, // añadimos turno y responsable
                    ...formatDataForFirebase(key, data[key])
                };

                const docRef = db.collection(fbConfig.collection).doc(fbConfig.id);
                batch.set(docRef, dataToSave, { merge: true });
            }
        }
        
        await batch.commit();
    }
    
    /**
     * Transforma los datos parseados a la estructura que cada app espera.
     * Esta función es CLAVE para la compatibilidad.
     */
    function formatDataForFirebase(key, parsedData) {
        // Para la mayoría, la estructura parseada es suficiente.
        // Hacemos ajustes solo para las que lo necesiten.
        switch(key) {
            case 'cecorex':
                 // El parser ya devuelve { "Remisiones": 4, ... } que es un formato bueno.
                 // Podríamos mapear los nombres a los IDs de los campos si fuera necesario.
                 return { ...parsedData };
            case 'cie':
                 // El parser devuelve un array de objetos, que es una buena forma de guardarlo.
                 return { novedades: parsedData };
            // Añadir más casos si otros formularios necesitan una estructura de datos específica
            default:
                return { datos: parsedData };
        }
    }

});
