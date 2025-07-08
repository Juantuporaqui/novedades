// =================================================================================
// SIREX - SCRIPT CENTRAL DE PROCESAMIENTO DE NOVEDADES (ID solo con fecha, estándar)
// Versión definitiva profesional, 2025 - DOCX oficial, parser robusto, batch seguro
// Incluye validación avanzada de campos críticos antes de guardar
// =================================================================================

document.addEventListener('DOMContentLoaded', function () {

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
    const spinner = document.getElementById('spinner-area');

    let parsedDataForConfirmation = null;
    let bloquesFaltantes = [];
    let erroresValidacion = [];

    // --- MANEJO DE EVENTOS ---
    if (inputDocx) inputDocx.addEventListener('change', handleDocxUpload);
    if (btnConfirmarGuardado) btnConfirmarGuardado.addEventListener('click', onConfirmSave);
    if (btnCancelar) btnCancelar.addEventListener('click', onCancel);

    // --- FUNCIONES DE UI ---
    function showStatus(message, type = 'info') {
        if (!statusContainer) return;
        let alertClass = 'alert-info';
        if (type === 'success') alertClass = 'alert-success';
        if (type === 'error' || type === 'danger') alertClass = 'alert-danger';
        if (type === 'warning') alertClass = 'alert-warning';
        statusContainer.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;
    }

    function showSpinner(visible) {
        if (spinner) spinner.style.display = visible ? 'flex' : 'none';
    }

    function showConfirmationUI(show) {
        if (confirmationButtons) confirmationButtons.style.display = show ? 'block' : 'none';
    }

    function showResults(parsedData) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos para validación</h3>';
        for (const key in parsedData) {
            if (key === 'fecha') continue; // Fecha se muestra aparte
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
        if (bloquesFaltantes.length) {
            resultsContainer.innerHTML += `<div class="alert alert-warning mt-2">Atención: No se encontraron los siguientes bloques: <b>${bloquesFaltantes.join(', ')}</b>. Se grabará solo lo encontrado.</div>`;
        }
    }

    function showFechaEditable(fecha) {
        if (!fechaEdicionDiv || !fechaManualInput) return;
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
        return val;
    }

    // --- LÓGICA PRINCIPAL ---
    async function handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        onCancel();
        showSpinner(true);
        showStatus('Procesando archivo...', 'info');

        if (!file.name.toLowerCase().endsWith('.docx')) {
            showStatus('Solo se admiten archivos DOCX con la plantilla oficial.', 'danger');
            showSpinner(false);
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const { datos, fecha, faltantes } = parseAllSections(result.value);
            parsedDataForConfirmation = datos;
            parsedDataForConfirmation.fecha = fecha;
            bloquesFaltantes = faltantes;

            showFechaEditable(fecha);

            if (Object.keys(parsedDataForConfirmation).length <= 1) {
                throw new Error("No se pudo extraer ninguna sección de grupo. Revisa que el DOCX sigue la plantilla.");
            }

            showResults(parsedDataForConfirmation);

            // === VALIDACIÓN AVANZADA INMEDIATA TRAS PREVIEW ===
            erroresValidacion = validarDatos(parsedDataForConfirmation);
            if (erroresValidacion.length) {
                showStatus('⚠️ Errores de validación en campos críticos:<br><ul>' +
                    erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>Corrige antes de guardar.', 'warning');
                btnConfirmarGuardado.disabled = true;
            } else {
                showStatus('Datos extraídos. Revisa la información, corrige la fecha si quieres y confirma para guardar.', 'info');
                btnConfirmarGuardado.disabled = false;
            }

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
        let fechaFinal = obtenerFechaFormateada();
        parsedDataForConfirmation.fecha = fechaFinal;

        // === VALIDACIÓN AVANZADA ANTES DE GUARDAR ===
        erroresValidacion = validarDatos(parsedDataForConfirmation);
        if (erroresValidacion.length) {
            showStatus('⚠️ Errores de validación en campos críticos:<br><ul>' +
                erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>Corrige antes de guardar.', 'warning');
            btnConfirmarGuardado.disabled = true;
            return;
        }

        showSpinner(true);
        showConfirmationUI(false);
        showStatus('Guardando datos en Firebase, por favor espera...', 'info');
        resultsContainer.innerHTML = '';

        try {
            // Comprobar si hay algún grupo/colección ya existente para ese día
            const yaExisten = await existeDatoParaFecha(fechaFinal, parsedDataForConfirmation);
            if (yaExisten) {
                showStatus('Ya existen datos para ese día en algún grupo. Revise antes de guardar. No se han grabado datos.', 'danger');
                showResults(parsedDataForConfirmation);
                showConfirmationUI(true);
                return;
            }
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
        bloquesFaltantes = [];
    }

    // =======================================================
    // PARSER PLANTILLA OFICIAL (100% tablas, orden estricto)
    // =======================================================
    function parseAllSections(html) {
        const htmlRoot = document.createElement('div');
        htmlRoot.innerHTML = html;
        const tablas = Array.from(htmlRoot.querySelectorAll('table'));

        const grupos = [
            { key: 'grupo1_diario', label: "GRUPO 1 – EXPULSIONES", campos: ['Detenidos', 'Identificados', 'Testigos', 'Implicados', 'Incidentes', 'Observaciones'] },
            { key: 'investigacion1_diario', label: "GRUPO 2 – INVESTIGACIÓN 1", tabla: ['Nº', 'OPERACIÓN', 'CRONOLOGÍA', 'FUNCIONARIO', 'DILIGENCIAS REALIZADAS', 'PENDIENTES'] },
            { key: 'investigacion2_diario', label: "GRUPO 3 – INVESTIGACIÓN 2", tabla: ['Nº', 'OPERACIÓN', 'CRONOLOGÍA', 'FUNCIONARIO', 'DILIGENCIAS REALIZADAS', 'PENDIENTES'], subtabla: ['CASA', 'FECHA INSPECCIÓN', 'Nº FILIADAS', 'NACIONALIDADES'] },
            { key: 'grupo4_diario', label: "GRUPO 4 – OPERATIVO", tabla: ['INTERVENCIÓN', 'RESULTADO', 'LUGAR', 'OBSERVACIONES'] },
            { key: 'puerto_diario', label: "PUERTO", campos: ['Identificados', 'Detenidos', 'Diligencias', 'Observaciones'] },
            { key: 'cecorex_diario', label: "CECOREX", campos: ['Remisiones a Subdelegación', 'Alegaciones de Abogados', 'Decretos expulsión grabados', 'Citados en Oficina', 'MENAs', 'Observaciones'] },
            { key: 'cie_diario', label: "CIE", campos: ['Internos total', 'Ingresos Marroquíes', 'Ingresos Argelinos', 'Salidas (traslados)', 'Observaciones/incidentes'] },
            { key: 'gestion_diario', label: "GESTIÓN", campos: ['Entrevistas de Asilo realizadas', 'Fallos entrevistas Asilo', 'Cartas Concedidas', 'Cartas Denegadas', 'CUEs entregados', 'Asignaciones de NIE', 'Notificaciones concedidas', 'Notificaciones denegadas', 'Oficios realizados', 'Observaciones'] }
        ];

        const datos = {};
        let fecha = '';
        let bloquesFaltantes = [];

        // --- Encabezado: SIEMPRE primera tabla ---
        if (tablas.length > 0) {
            const encabezado = mapKeyValueTable(tablas[0]);
            if (encabezado['Fecha']) {
                fecha = normalizaFecha(encabezado['Fecha']);
            }
            datos['encabezado'] = encabezado;
        }

        // --- Para cada grupo ---
        let idxTabla = 1; // Empezamos después de encabezado
        grupos.forEach((g, gi) => {
            let encontrado = false;
            for (; idxTabla < tablas.length; idxTabla++) {
                const t = tablas[idxTabla];
                const firstRow = t.querySelector('tr');
                if (!firstRow) continue;
                const firstCellText = firstRow.textContent.trim().toUpperCase();

                // Si coincide la cabecera esperada de tabla
                if (g.campos && g.campos.some(c => firstRow.innerHTML.toUpperCase().includes(c.toUpperCase()))) {
                    datos[g.key] = mapKeyValueTable(t);
                    encontrado = true;
                    idxTabla++;
                    break;
                }
                if (g.tabla && g.tabla.every(c => firstRow.innerHTML.toUpperCase().includes(c.toUpperCase()))) {
                    datos[g.key] = mapArrayTable(t);
                    encontrado = true;
                    idxTabla++;
                    // Subtabla especial (solo Grupo 3)
                    if (g.subtabla && idxTabla < tablas.length) {
                        const nextT = tablas[idxTabla];
                        const nextRow = nextT.querySelector('tr');
                        if (nextRow && g.subtabla.every(c => nextRow.innerHTML.toUpperCase().includes(c.toUpperCase()))) {
                            datos[g.key + '_casas_de_citas'] = mapArrayTable(nextT);
                            idxTabla++;
                        }
                    }
                    break;
                }
            }
            if (!encontrado) bloquesFaltantes.push(g.label);
        });

        return { datos, fecha, faltantes: bloquesFaltantes };
    }

    function mapKeyValueTable(table) {
        const data = {};
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
                const key = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                if (key) data[key] = value;
                if (cells.length > 2) data[key + '_obs'] = cells[2].textContent.trim();
            }
        });
        return data;
    }

    function mapArrayTable(table) {
        const data = [];
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length < 2) return data;
        const headers = Array.from(rows[0].querySelectorAll('td,th')).map(h => h.textContent.trim());
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (!cells.length) continue;
            const rowObj = {};
            for (let j = 0; j < headers.length; j++) {
                rowObj[headers[j]] = (cells[j] ? cells[j].textContent.trim() : '');
            }
            // Evita filas vacías
            if (Object.values(rowObj).some(v => v)) data.push(rowObj);
        }
        return data;
    }

    function normalizaFecha(texto) {
        if (!texto) return '';
        const m = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (!m) return '';
        const d = m[1].padStart(2, '0');
        const mes = m[2].padStart(2, '0');
        const a = m[3];
        return `${a}-${mes}-${d}`;
    }

    // =======================================================
    // GUARDADO EN FIREBASE (batch, seguro, no sobrescribe)
    // =======================================================
    async function existeDatoParaFecha(fecha, parsedData) {
        // Comprueba para cada grupo si ya hay datos ese día
        const colecciones = [
            'grupo1_diario', 'investigacion1_diario', 'investigacion2_diario', 'grupo4_diario',
            'puerto_diario', 'cecorex_diario', 'cie_diario', 'gestion_diario'
        ];
        for (const key of colecciones) {
            if (parsedData[key]) {
                const docRef = db.collection(key).doc(fecha);
                const snap = await docRef.get();
                if (snap.exists) return true;
            }
        }
        return false;
    }

    async function saveAllToFirebase(parsedData) {
        const fecha = parsedData.fecha;
        if (!fecha) throw new Error("No se pudo determinar la fecha para guardar los registros.");

        const batch = db.batch();
        // --- Guardar cada grupo existente ---
        for (const key of Object.keys(parsedData)) {
            if (key === 'fecha' || key === 'encabezado') continue;
            const datosGrupo = parsedData[key];
            if (!datosGrupo || (Array.isArray(datosGrupo) && datosGrupo.length === 0)) continue;
            batch.set(
                db.collection(key).doc(fecha),
                {
                    fecha,
                    ...datosGrupo
                },
                { merge: false }
            );
        }
        await batch.commit();
    }

    // =======================================================
    // VALIDACIÓN AVANZADA DE CAMPOS CRÍTICOS
    // =======================================================
    function validarDatos(parsedData) {
        // Define campos críticos por bloque (amplía según necesidades reales)
        const camposCriticos = {
            grupo1_diario: ['Detenidos', 'Identificados', 'Testigos', 'Implicados'],
            puerto_diario: ['Identificados', 'Detenidos', 'Diligencias'],
            cecorex_diario: ['Remisiones a Subdelegación', 'MENAs'],
            cie_diario: ['Internos total', 'Ingresos Marroquíes', 'Ingresos Argelinos', 'Salidas (traslados)'],
            gestion_diario: ['Entrevistas de Asilo realizadas', 'Cartas Concedidas', 'Cartas Denegadas', 'CUEs entregados', 'Asignaciones de NIE']
        };
        let errores = [];
        for (const [grupo, campos] of Object.entries(camposCriticos)) {
            if (!parsedData[grupo]) continue;
            for (const campo of campos) {
                const valor = parsedData[grupo][campo];
                if (valor === undefined || valor === "" || isNaN(Number(valor)) || Number(valor) < 0) {
                    errores.push(`${grupo.replace('_diario','').toUpperCase()} - ${campo}: "${valor}"`);
                }
            }
        }
        return errores;
    }

});
