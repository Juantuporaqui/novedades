// =================================================================================
// SIREX - SCRIPT CENTRAL DE PROCESAMIENTO DE NOVEDADES (ID solo con fecha, estándar)
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
    const confirmationButtons = document.getElementById('confirmation-buttons');
    const btnConfirmarGuardado = document.getElementById('btnConfirmarGuardado');
    const btnCancelar = document.getElementById('btnCancelar');
    const fechaEdicionDiv = document.getElementById('fecha-edicion');
    const fechaManualInput = document.getElementById('fechaManualInput');

    let parsedDataForConfirmation = null;

    // --- MANEJO DE EVENTOS ---
    if (inputDocx) inputDocx.addEventListener('change', handleDocxUpload);
    if(btnConfirmarGuardado) btnConfirmarGuardado.addEventListener('click', onConfirmSave);
    if(btnCancelar) btnCancelar.addEventListener('click', onCancel);

    // --- FUNCIONES DE UI ---
    function showStatus(message, type = 'info') {
        if (!statusContainer) return;
        let alertClass = 'alert-info';
        if (type === 'success') alertClass = 'alert-success';
        if (type === 'error') alertClass = 'alert-danger';
        statusContainer.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;
    }

    function showSpinner(visible) {
        const spinner = document.getElementById('spinner-area');
        if (spinner) spinner.style.display = visible ? 'flex' : 'none';
    }

    function showConfirmationUI(show) {
        if (confirmationButtons) confirmationButtons.style.display = show ? 'block' : 'none';
    }

    function showResults(parsedData) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos Extraídos para Validación</h3>';
        for (const key in parsedData) {
            if (key === 'fecha') continue; // No la mostramos aquí, la muestra el input editable
            const dataContent = parsedData[key];
            if (dataContent && (Object.keys(dataContent).length > 0 || (Array.isArray(dataContent) && dataContent.length > 0))) {
                const card = document.createElement('div');
                card.className = 'card mb-3 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-light"><strong>${key.replace(/_/g, ' ').toUpperCase()}</strong></div>
                    <div class="card-body">
                        <pre class="results-card">${JSON.stringify(dataContent, null, 2)}</pre>
                    </div>
                `;
                resultsContainer.appendChild(card);
            }
        }
    }

    function showFechaEditable(fecha) {
        if (!fechaEdicionDiv || !fechaManualInput) return;
        // Mostrar la fecha en formato español DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            const [yy, mm, dd] = fecha.split('-');
            fechaManualInput.value = `${dd}/${mm}/${yy}`;
        } else {
            fechaManualInput.value = fecha;
        }
        fechaEdicionDiv.style.display = "block";
    }

    function obtenerFechaFormateada() {
        let val = fechaManualInput.value.trim();
        let regexES = /^(\d{1,2})[\/\- ](\d{1,2})[\/\- ](\d{2,4})$/;
        let match = val.match(regexES);
        if (match) {
            let dd = match[1].padStart(2, '0');
            let mm = match[2].padStart(2, '0');
            let yyyy = match[3];
            if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
            return `${yyyy}-${mm}-${dd}`;
        }
        // Si el usuario mete lo que sea, retorna lo que haya (pero preferimos el formato correcto)
        return val;
    }

    // --- LÓGICA PRINCIPAL ---
    async function handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        onCancel(); 
        showSpinner(true);
        showStatus('Procesando archivo...', 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            parsedDataForConfirmation = parseAllSections(result.value);

            // Mostramos la fecha extraída o manual
            showFechaEditable(parsedDataForConfirmation.fecha);

            if (Object.keys(parsedDataForConfirmation).length <= 2) {
                throw new Error("No se pudo extraer ninguna sección de grupo. Revisa que el DOCX sigue la plantilla.");
            }

            showResults(parsedDataForConfirmation);
            showStatus('Datos extraídos. Por favor, revisa la información, corrige la fecha si quieres y confirma para guardar.', 'info');
            showConfirmationUI(true);

        } catch (err) {
            console.error("Error en el procesamiento:", err);
            showStatus(`Error: ${err.message}`, 'error');
        } finally {
            showSpinner(false);
            inputDocx.value = '';
        }
    }

    async function onConfirmSave() {
        if (!parsedDataForConfirmation) {
            showStatus('No hay datos para guardar.', 'error');
            return;
        }
        // Tomar la fecha del campo editable y normalizar formato
        let fechaFinal = obtenerFechaFormateada();
        parsedDataForConfirmation.fecha = fechaFinal;

        showSpinner(true);
        showConfirmationUI(false);
        showStatus('Guardando datos en Firebase, por favor espera...', 'info');
        resultsContainer.innerHTML = '';

        try {
            await saveAllToFirebase(parsedDataForConfirmation);
            showStatus('¡Éxito! Todos los datos han sido guardados en Firebase.', 'success');
        } catch (err) {
            console.error("Error al guardar en Firebase:", err);
            showStatus(`Error al guardar: ${err.message}`, 'error');
            showResults(parsedDataForConfirmation);
            showConfirmationUI(true);
        } finally {
            showSpinner(false);
            parsedDataForConfirmation = null;
            fechaEdicionDiv.style.display = "none";
        }
    }

    function onCancel() {
        resultsContainer.innerHTML = '';
        statusContainer.innerHTML = '';
        showConfirmationUI(false);
        parsedDataForConfirmation = null;
        if (fechaEdicionDiv) fechaEdicionDiv.style.display = "none";
    }

    // ==================================================================
    // PARSERS
    // ==================================================================
    function normalizeText(str) {
        if (!str) return '';
        return str
            .replace(/&nbsp;/g, ' ')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    // --------- BÚSQUEDA ROBUSTA DE TABLAS ---------
    function findTableAfterTitle(htmlRoot, titleText) {
        const normalizedSearchText = normalizeText(titleText);

        // Busca el header como antes
        const headers = Array.from(htmlRoot.querySelectorAll('h1, h2, h3, h4, p, strong'));
        const targetHeader = headers.find(h => {
            const normalizedHeaderText = normalizeText(h.textContent);
            return normalizedHeaderText.includes(normalizedSearchText);
        });
        if (targetHeader) {
            let nextElement = targetHeader;
            for (let i = 0; i < 6; i++) {
                nextElement = nextElement.nextElementSibling;
                if (!nextElement) break;
                if (nextElement.tagName === 'TABLE') return nextElement;
            }
        }

        // Búsqueda secundaria: busca una tabla con columna típica de la sección
        const sectionHints = {
            'CECOREX': ['Remisiones a Subdelegación', 'Alegaciones de Abogados'],
            'CIE': ['Internos', 'Ingresos'],
            'GESTIÓN': ['Entrevistas de Asilo realizadas', 'Cartas Concedidas']
        };
        const hintList = sectionHints[titleText.toUpperCase()] || [];
        if (hintList.length > 0) {
            const tables = Array.from(htmlRoot.querySelectorAll('table'));
            for (const table of tables) {
                const cells = Array.from(table.querySelectorAll('td, th'));
                for (const cell of cells) {
                    const cellText = normalizeText(cell.textContent);
                    if (hintList.some(hint => cellText.includes(normalizeText(hint)))) {
                        return table;
                    }
                }
            }
        }

        console.warn(`No se encontró la tabla para la sección: ${titleText}`);
        return null;
    }

    function mapKeyValueTable(table, keyColumn = 0, valueColumn = 1) {
        const data = {};
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > valueColumn) {
                const key = cells[keyColumn].textContent.trim();
                const value = cells[valueColumn].textContent.trim();
                if (key) {
                    data[key] = !isNaN(parseFloat(value)) && isFinite(value) && value !== '' ? parseFloat(value) : value;
                }
            }
        });
        return data;
    }

    function mapArrayTable(table) {
        const data = [];
        const headerRow = table.querySelector('tr');
        if (!headerRow) return data;

        const headers = Array.from(headerRow.children)
            .map(th => th.textContent.trim().toLowerCase().replace(/ /g, '_').replace(/\//g, '_').replace(/º/g,'').replace(/\./g, ''));
            
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0 && Array.from(cells).some(c => c.textContent.trim() !== '')) {
                const entry = {};
                cells.forEach((cell, index) => {
                    const header = headers[index];
                    if(header) entry[header] = cell.textContent.trim();
                });
                data.push(entry);
            }
        });
        return data;
    }

    function parseAllSections(html) {
        const htmlRoot = document.createElement('div');
        htmlRoot.innerHTML = html;
        const data = {};
        const metadata = {};
        const firstTable = htmlRoot.querySelector('table');
        if (firstTable && firstTable.textContent.includes('Turno')) {
            const cells = firstTable.querySelectorAll('td');
            if (cells.length > 1 && cells[1].textContent.trim()) metadata.turno = cells[1].textContent.trim();
            if (cells.length > 3 && cells[3].textContent.trim()) metadata.responsable = cells[3].textContent.trim();
        }
        data.metadata = metadata;
        
        // --- Detección universal de la fecha + prompt manual ---
        const dateRegex = /(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})\s*[\/\-. ]\s*(\d{2,4})/g;
        let allText = htmlRoot.textContent || '';
        let allDates = [...allText.matchAll(dateRegex)];
        let dateMatch = null;
        if (allDates.length > 0) {
            dateMatch = allDates[0];
        }
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) {
                year = (parseInt(year, 10) > 50 ? "19" : "20") + year;
            }
            data.fecha = `${year}-${month}-${day}`;
        } else {
            const today = new Date();
            let fechaManual = prompt("No se encontró fecha en el parte. Introduce la fecha (dd/mm/yyyy):", `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`);
            if (fechaManual && fechaManual.match(/^\d{1,2}[\/\- ]\d{1,2}[\/\- ]\d{2,4}$/)) {
                let match = fechaManual.match(/^(\d{1,2})[\/\- ](\d{1,2})[\/\- ](\d{2,4})$/);
                let dd = match[1].padStart(2, '0');
                let mm = match[2].padStart(2, '0');
                let yyyy = match[3];
                if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
                data.fecha = `${yyyy}-${mm}-${dd}`;
            } else {
                data.fecha = today.toISOString().slice(0, 10);
            }
            console.warn("No se encontró ninguna fecha en el documento, usando fecha manual o actual.");
        }

        // --- SECCIONES ---
        const secciones = {
            grupo1: { title: "GRUPO 1", type: 'key-value' },
            investigacion: { title: "GRUPOS 2 y 3", type: 'array' },
            casas_citas: { title: "CONTROL CASA DE CITAS", type: 'array' },
            grupo4: { title: "GRUPO 4", type: 'array' },
            puerto: { title: "PUERTO", type: 'key-value' },
            cecorex: { title: "CECOREX", type: 'key-value', keyCol: 0, valCol: 1 },
            cie: { title: "CIE", type: 'key-value' },
            gestion: { title: "GESTIÓN", type: 'key-value', keyCol: 0, valCol: 1 }
        };
        for (const [key, config] of Object.entries(secciones)) {
            const table = findTableAfterTitle(htmlRoot, config.title);
            if (table) {
                if (config.type === 'key-value') data[key] = mapKeyValueTable(table, config.keyCol, config.valCol);
                else if (config.type === 'array') data[key] = mapArrayTable(table);
            }
        }

        // LOG de depuración para ver exactamente qué grupos saca
        console.log("DATA EXTRAÍDA:", data);

        return data;
    }
    
    // ==================================================================
    // LÓGICA DE GUARDADO Y TRADUCCIÓN
    // ==================================================================
    async function saveAllToFirebase(data) {
        const fecha = data.fecha;
        if (!fecha) throw new Error("No se pudo determinar la fecha para guardar los registros.");

        // ====== SOLO FECHA COMO ID ======
        const firebaseMap = {
            cecorex: { collection: "cecorex", id: fecha },
            cie: { collection: "grupo_cie", id: fecha },
            gestion: { collection: "gestion_avanzada", id: fecha },
            puerto: { collection: "grupoPuerto_registros", id: fecha },
            grupo1: { collection: "grupo1_diario", id: fecha },
            grupo4: { collection: "grupo4_operativo", id: fecha },
            investigacion: { collection: "investigacion_diario", id: fecha },
            casas_citas: { collection: "control_casas_citas", id: fecha }
        };

        for (const [key, fbConfig] of Object.entries(firebaseMap)) {
            if (data[key] && (Object.keys(data[key]).length > 0 || (Array.isArray(data[key]) && data[key].length > 0))) {
                let dataToSave = {
                    fecha: fecha,
                    ...(data.metadata && data.metadata.turno && { turno: data.metadata.turno }),
                    ...(data.metadata && data.metadata.responsable && { responsable: data.metadata.responsable }),
                    ...formatDataForFirebase(key, data[key])
                };
                const docRef = db.collection(fbConfig.collection).doc(fbConfig.id);
                batch.set(docRef, dataToSave, { merge: true });
            }
        }
        await batch.commit();
    }

    function formatDataForFirebase(key, parsedData) {
        const translationMap = {
            cecorex: {
                'Remisiones a Subdelegación': 'remisiones',
                'Alegaciones de Abogados': 'alegaciones',
                'Decretos expulsión grabados': 'decretos',
                'Citados en Oficina': 'citados',
                'Diligencias de informe': 'diligenciasInforme',
                'Consultas (Equipo)': 'consultasEquipo',
                'Consultas (Telefónicas)': 'consultasTel',
                'Prohibiciones de entrada grabadas': 'prohibiciones',
                'Trámites de audiencia': 'audiencias',
                'Detenidos ILE': 'detenidosILE',
                'Notificaciones con Letrado': 'notificaciones',
                'MENAs': 'menas',
                'Observaciones': 'observaciones'
            },
            gestion: {
                'Entrevistas de Asilo realizadas': 'entrevistasAsilo',
                'Fallos en Entrevistas de Asilo': 'entrevistasAsiloFallos',
                'Cartas Concedidas': 'cartasConcedidas',
                'Cartas Denegadas': 'cartasDenegadas',
                'Citas Subdelegación': 'citasSubdelegacion',
                'Tarjetas recogidas en Subdelegación': 'tarjetasSubdelegacion',
                'Notificaciones Concedidas': 'notificacionesConcedidas',
                'Notificaciones Denegadas': 'notificacionesDenegadas',
                'Citas ofertadas': 'citas',
                'Citas que faltan': 'citasFaltan',
                'CUEs (Certificados UE)': 'cues',
                'Asignaciones de NIE': 'asignaciones',
                'Modificaciones telem. Favorables': 'modificacionesFavorables',
                'Modificaciones telem. Desfavorables': 'modificacionesDesfavorables',
                'Declaración Entrada': 'declaracionEntrada',
                'Oficios realizados': 'oficios',
                'Telefonemas Asilo': 'citasTelAsilo',
                'Telefonemas Cartas': 'citasTelCartas',
                'Renuncias Ucrania / Asilo': 'renunciasAsilo'
            },
        };

        if (!translationMap[key]) {
            if(Array.isArray(parsedData)) return { datos: parsedData };
            return { ...parsedData };
        }

        const translatedData = {};
        for (const [oldKey, value] of Object.entries(parsedData)) {
            const newKey = translationMap[key][oldKey];
            if (newKey) {
                translatedData[newKey] = value;
            } else {
                translatedData[oldKey] = value;
            }
        }
        return translatedData;
    }
});
