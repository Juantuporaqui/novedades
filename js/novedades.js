// ==============================================================================
// SIREX - SCRIPT CENTRAL DE PROCESAMIENTO DE NOVEDADES - GRUPOS 1 y 4 AUTOIMPORT
// Profesional 2025 · Importa Grupo 1 (menos Gestiones) y Grupo 4 Operativo · DOCX oficial
// ==============================================================================

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
    const fechaDetectadaBadge = document.getElementById('fechaDetectadaBadge');
    const spinner = document.getElementById('spinner-area');

    let parsedDataForConfirmation = null;
    let erroresValidacion = [];
    let grupoDetectado = ""; // "grupo1" o "grupo4"

    // --- UI ---
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
        resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos</h3>';
        for (const key in parsedData) {
            if (key === 'fecha') continue;
            const dataContent = parsedData[key];
            if (dataContent && ((Array.isArray(dataContent) && dataContent.length > 0) || Object.keys(dataContent).length > 0)) {
                const card = document.createElement('div');
                card.className = 'card mb-3 shadow-sm';
                card.innerHTML = `
                    <div class="card-header bg-light"><strong>${key.toUpperCase()}</strong></div>
                    <div class="card-body">
                        <pre class="results-card">${JSON.stringify(dataContent, null, 2)}</pre>
                    </div>
                `;
                resultsContainer.appendChild(card);
            }
        }
    }
    function showFechaEditable(fechaISO) {
        if (!fechaEdicionDiv || !fechaManualInput) return;
        fechaEdicionDiv.style.display = "flex";
        if (fechaISO && /^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
            fechaManualInput.value = fechaISO;
            fechaDetectadaBadge.textContent = "Detectada: " + fechaISO.split("-").reverse().join("/");
            fechaDetectadaBadge.className = "badge bg-success";
        } else {
            fechaManualInput.value = "";
            fechaDetectadaBadge.textContent = "No detectada";
            fechaDetectadaBadge.className = "badge bg-secondary";
        }
    }
    function obtenerFechaFormateada() {
        return fechaManualInput.value || "";
    }

    // --- EVENTOS ---
    if (inputDocx) inputDocx.addEventListener('change', handleDocxUpload);
    if (btnConfirmarGuardado) btnConfirmarGuardado.addEventListener('click', onConfirmSave);
    if (btnCancelar) btnCancelar.addEventListener('click', onCancel);

    // --- PRINCIPAL ---
    async function handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        onCancel();
        showSpinner(true);
        showStatus('Procesando archivo...', 'info');
        if (!file.name.toLowerCase().endsWith('.docx')) {
            showStatus('Solo se admiten archivos DOCX.', 'danger');
            showSpinner(false);
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            // Detecta grupo y llama a parser adecuado
            const { detectado, datos, fecha } = autoDetectAndParse(result.value);
            grupoDetectado = detectado;
            if (!datos || Object.keys(datos).length === 0) throw new Error("No se han extraído datos válidos.");
            parsedDataForConfirmation = { [detectado]: datos, fecha };

            showFechaEditable(fecha);
            showResults({ [detectado]: datos });

            erroresValidacion = validarDatos(datos, grupoDetectado);
            if (erroresValidacion.length) {
                showStatus('<ul>' + erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
                btnConfirmarGuardado.disabled = true;
            } else {
                showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.', 'info');
                btnConfirmarGuardado.disabled = false;
            }
            showConfirmationUI(true);

        } catch (err) {
            console.error("Error:", err);
            showStatus(`Error: ${err.message}`, 'danger');
        } finally {
            showSpinner(false);
            inputDocx.value = '';
        }
    }

    async function onConfirmSave() {
        if (!parsedDataForConfirmation || !grupoDetectado) {
            showStatus('No hay datos para guardar.', 'danger');
            return;
        }
        let fechaFinal = obtenerFechaFormateada();
        if (!fechaFinal) {
            showStatus('Selecciona una fecha válida.', 'danger');
            fechaManualInput.focus();
            return;
        }
        parsedDataForConfirmation.fecha = fechaFinal;

        erroresValidacion = validarDatos(parsedDataForConfirmation[grupoDetectado], grupoDetectado);
        if (erroresValidacion.length) {
            showStatus('<ul>' + erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
            btnConfirmarGuardado.disabled = true;
            return;
        }

        showSpinner(true);
        showConfirmationUI(false);
        showStatus('Guardando en Firebase...', 'info');
        resultsContainer.innerHTML = '';

        try {
            const colName = grupoDetectado === "grupo1_expulsiones" ? "grupo1_expulsiones" : "grupo4_operativo";
            const ref = db.collection(colName).doc(fechaFinal);
            const snap = await ref.get();
            if (snap.exists) {
                showStatus(`Ya existen datos para ese día en ${grupoDetectado}. No se han guardado nuevos datos.`, 'danger');
                showResults({ [grupoDetectado]: parsedDataForConfirmation[grupoDetectado] });
                showConfirmationUI(true);
                return;
            }
            await ref.set(parsedDataForConfirmation[grupoDetectado], { merge: false });
            showStatus('¡Guardado con éxito en Firebase!', 'success');
        } catch (err) {
            console.error("Error al guardar:", err);
            showStatus(`Error: ${err.message}`, 'danger');
            showResults({ [grupoDetectado]: parsedDataForConfirmation[grupoDetectado] });
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
        grupoDetectado = "";
        if (fechaEdicionDiv) fechaEdicionDiv.style.display = "none";
    }

    // =============== PARSERS AUTOMÁTICOS =========================

    function autoDetectAndParse(html) {
        // ¿Es parte de grupo 1 o grupo 4?
        const texto = html.toUpperCase();
        if (texto.includes("DETENIDOS") && texto.includes("EXPULSADOS")) {
            // Es grupo 1
            const { grupo1, fecha } = parseGrupo1Completo(html);
            return { detectado: "grupo1_expulsiones", datos: grupo1, fecha };
        }
        if (texto.includes("COLABORACIONES") && texto.includes("CITADOS")) {
            // Es grupo 4 operativo
            const { grupo4, fecha } = parseGrupo4Completo(html);
            return { detectado: "grupo4_operativo", datos: grupo4, fecha };
        }
        // Por defecto, error
        return { detectado: "", datos: {}, fecha: "" };
    }

    // ------------ PARSER GRUPO 1 -----------------
    function parseGrupo1Completo(html) {
        const root = document.createElement('div');
        root.innerHTML = html;
        const tablas = Array.from(root.querySelectorAll('table'));
        let fecha = '';
        // Busca fecha robusta en todo el documento
        const textPlano = root.innerText || root.textContent || "";
        let m = textPlano.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (m) {
            fecha = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
        let grupo1 = {};
        function filtrarGestiones(tabla) {
            const firstRow = tabla.querySelector('tr');
            if (!firstRow) return false;
            const txt = firstRow.textContent.toUpperCase();
            return !txt.includes('GESTIONES');
        }
        grupo1.detenidos = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('DETENIDOS') &&
                rows[0].textContent.toUpperCase().includes('MOTIVO')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (cells.length < 4) continue;
                    const obj = {
                        numero: parseInt(cells[0]?.textContent.trim()) || '', // CAMBIO: ahora es número
                        motivo: cells[1]?.textContent.trim() || '',
                        nacionalidad: cells[2]?.textContent.trim() || '',
                        diligencias: cells[3]?.textContent.trim() || '',
                        observaciones: cells[4]?.textContent.trim() || ''
                    };
                    if (Object.values(obj).some(x => x)) grupo1.detenidos.push(obj);
                }
            }
        }
        if (!grupo1.detenidos.length) delete grupo1.detenidos;

        // Expulsados, Fletados, etc. igual que antes...
        grupo1.expulsados = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('EXPULSADOS') &&
                rows[0].textContent.toUpperCase().includes('NACIONALIDAD')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (cells.length < 2) continue;
                    const obj = {
                        nombre: cells[0]?.textContent.trim() || '',
                        nacionalidad: cells[1]?.textContent.trim() || '',
                        diligencias: cells[2]?.textContent.trim() || '',
                        nConduccionesPos: parseInt(cells[3]?.textContent.trim()) || 0,
                        conduccionesNeg: parseInt(cells[4]?.textContent.trim()) || 0,
                        observaciones: cells[5]?.textContent.trim() || ''
                    };
                    if (obj.nombre || obj.nacionalidad) grupo1.expulsados.push(obj);
                }
            }
        }
        if (!grupo1.expulsados.length) delete grupo1.expulsados;

        grupo1.fletados = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('FLETADOS') &&
                rows[0].textContent.toUpperCase().includes('DESTINO')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (cells.length < 2) continue;
                    const obj = {
                        destino: cells[0]?.textContent.trim() || '',
                        pax: parseInt(cells[1]?.textContent.trim()) || 0,
                        observaciones: cells[2]?.textContent.trim() || ''
                    };
                    if (obj.destino) grupo1.fletados.push(obj);
                }
            }
        }
        if (!grupo1.fletados.length) delete grupo1.fletados;

        grupo1.fletadosFuturos = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('FLETADOS FUTUROS')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (cells.length < 2) continue;
                    const obj = {
                        destino: cells[0]?.textContent.trim() || '',
                        pax: parseInt(cells[1]?.textContent.trim()) || 0,
                        fecha: cells[2]?.textContent.trim() || ''
                    };
                    if (obj.destino) grupo1.fletadosFuturos.push(obj);
                }
            }
        }
        if (!grupo1.fletadosFuturos.length) delete grupo1.fletadosFuturos;

        grupo1.conduccionesPositivas = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('CONDUCCIONES POSITIVAS')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (!cells.length) continue;
                    const obj = {
                        numero: parseInt(cells[0]?.textContent.trim()) || 0,
                        fecha: cells[1]?.textContent.trim() || ''
                    };
                    if (obj.numero) grupo1.conduccionesPositivas.push(obj);
                }
            }
        }
        if (!grupo1.conduccionesPositivas.length) delete grupo1.conduccionesPositivas;

        grupo1.conduccionesNegativas = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('CONDUCCIONES NEGATIVAS')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (!cells.length) continue;
                    const obj = {
                        numero: parseInt(cells[0]?.textContent.trim()) || 0,
                        fecha: cells[1]?.textContent.trim() || ''
                    };
                    if (obj.numero) grupo1.conduccionesNegativas.push(obj);
                }
            }
        }
        if (!grupo1.conduccionesNegativas.length) delete grupo1.conduccionesNegativas;

        grupo1.pendientes = [];
        for (let t of tablas) {
            if (!filtrarGestiones(t)) continue;
            const rows = Array.from(t.querySelectorAll('tr'));
            if (
                rows.length &&
                rows[0].textContent.toUpperCase().includes('PENDIENTES')
            ) {
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll('td'));
                    if (!cells.length) continue;
                    const obj = {
                        descripcion: cells[0]?.textContent.trim() || '',
                        fecha: cells[1]?.textContent.trim() || ''
                    };
                    if (obj.descripcion) grupo1.pendientes.push(obj);
                }
            }
        }
        if (!grupo1.pendientes.length) delete grupo1.pendientes;

        return { grupo1, fecha };
    }

    // ------------ PARSER GRUPO 4 OPERATIVO -----------------
    function parseGrupo4Completo(html) {
        const root = document.createElement('div');
        root.innerHTML = html;
        const tablas = Array.from(root.querySelectorAll('table'));
        let fecha = '';
        // Busca fecha robusta en todo el documento
        const textPlano = root.innerText || root.textContent || "";
        let m = textPlano.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (m) {
            fecha = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
        let grupo4 = {};
        function mapSeccion(tablas, palabras, campos, parseFn) {
            for (const t of tablas) {
                const headTxt = t.querySelector('tr')?.textContent?.toUpperCase() || '';
                if (palabras.every(w => headTxt.includes(w.toUpperCase()))) {
                    const data = [];
                    const rows = Array.from(t.querySelectorAll('tr'));
                    for (let i = 1; i < rows.length; i++) {
                        const cells = Array.from(rows[i].querySelectorAll('td'));
                        if (cells.length < campos.length) continue;
                        let obj = {};
                        for (let c = 0; c < campos.length; c++) {
                            obj[campos[c]] = cells[c]?.textContent.trim() || '';
                        }
                        if (parseFn) obj = parseFn(obj);
                        if (Object.values(obj).some(x => x)) data.push(obj);
                    }
                    return data;
                }
            }
            return [];
        }
        grupo4.colaboraciones = mapSeccion(tablas, ['Colaboraciones'], ['desc', 'cantidad'], x => ({
            descripcion: x.desc, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.colaboraciones.length) delete grupo4.colaboraciones;

        grupo4.detenidos = mapSeccion(tablas, ['Detenidos'], ['motivo', 'nacionalidad', 'cantidad'], x => ({
            motivo: x.motivo, nacionalidad: x.nacionalidad, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.detenidos.length) delete grupo4.detenidos;

        grupo4.citados = mapSeccion(tablas, ['Citados'], ['desc', 'cantidad'], x => ({
            descripcion: x.desc, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.citados.length) delete grupo4.citados;

        grupo4.gestiones = mapSeccion(tablas, ['Otras gestiones'], ['desc', 'cantidad'], x => ({
            descripcion: x.desc, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.gestiones.length) delete grupo4.gestiones;

        grupo4.inspeccionesTrabajo = mapSeccion(tablas, ['Inspecciones trabajo'], ['desc', 'cantidad'], x => ({
            descripcion: x.desc, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.inspeccionesTrabajo.length) delete grupo4.inspeccionesTrabajo;

        grupo4.otrasInspecciones = mapSeccion(tablas, ['Otras inspecciones'], ['desc', 'cantidad'], x => ({
            descripcion: x.desc, cantidad: parseInt(x.cantidad) || 0
        }));
        if (!grupo4.otrasInspecciones.length) delete grupo4.otrasInspecciones;

        for (const t of tablas) {
            const headTxt = t.querySelector('tr')?.textContent?.toUpperCase() || '';
            if (headTxt.includes('OBSERVACIONES')) {
                const txt = Array.from(t.querySelectorAll('tr td')).slice(1).map(td => td.textContent.trim()).join(' ');
                if (txt) grupo4.observaciones = txt;
            }
        }

        return { grupo4, fecha };
    }

    // ------------ VALIDACIÓN GENERAL ------------
    function validarDatos(data, grupo) {
    let errores = [];
    // --- Grupo 1 ---
    if (grupo === "grupo1_expulsiones") {
        if (
            (!data.detenidos || data.detenidos.length === 0) &&
            (!data.expulsados || data.expulsados.length === 0) &&
            (!data.fletados || data.fletados.length === 0)
        ) {
            errores.push('Debe haber al menos un detenido, expulsado o fletado.');
        }
    }
    // --- Grupo 4 ---
    if (grupo === "grupo4_operativo") {
        // Puedes adaptar los campos requeridos a tu criterio
        let faltan = [];
        if (!data.colaboraciones || data.colaboraciones.length === 0) faltan.push("Colaboraciones");
        if (!data.detenidos || data.detenidos.length === 0) faltan.push("Detenidos");
        if (!data.inspeccionesTrabajo || data.inspeccionesTrabajo.length === 0) faltan.push("Inspecciones Trabajo");

        if (faltan.length === 3) {
            errores.push('Debe haber al menos un registro relevante (colaboraciones, detenidos o inspecciones trabajo).');
        } else if (faltan.length > 0) {
            errores.push('⚠️ Faltan registros en: ' + faltan.join(', '));
        }
    }
    // --- Fecha válida para ambos grupos ---
    if (!obtenerFechaFormateada() || !/^\d{4}-\d{2}-\d{2}$/.test(obtenerFechaFormateada())) {
        errores.push('La fecha es obligatoria y debe ser válida.');
    }
    return errores;
}
});
