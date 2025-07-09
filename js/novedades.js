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
    let erroresValidacion = [];

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
            const { grupo1, fecha } = parseGrupo1Completo(result.value);
            if (!grupo1 || Object.keys(grupo1).length === 0) throw new Error("No se han extraído datos válidos de Grupo 1.");

            parsedDataForConfirmation = { grupo1_expulsiones: grupo1, fecha };
            showFechaEditable(fecha);
            showResults({ grupo1_expulsiones: grupo1 });

            erroresValidacion = validarDatos(grupo1);
            if (erroresValidacion.length) {
                showStatus('⚠️ Errores en campos críticos:<ul>' +
                    erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>Corrige antes de guardar.', 'warning');
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
        if (!parsedDataForConfirmation) {
            showStatus('No hay datos para guardar.', 'danger');
            return;
        }
        let fechaFinal = obtenerFechaFormateada();
        parsedDataForConfirmation.fecha = fechaFinal;

        erroresValidacion = validarDatos(parsedDataForConfirmation.grupo1_expulsiones);
        if (erroresValidacion.length) {
            showStatus('⚠️ Errores:<ul>' +
                erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>Corrige antes de guardar.', 'warning');
            btnConfirmarGuardado.disabled = true;
            return;
        }

        showSpinner(true);
        showConfirmationUI(false);
        showStatus('Guardando en Firebase...', 'info');
        resultsContainer.innerHTML = '';

        try {
            const ref = db.collection("grupo1_expulsiones").doc(fechaFinal);
            const snap = await ref.get();
            if (snap.exists) {
                showStatus('Ya existen datos para ese día en Grupo 1. No se han guardado nuevos datos.', 'danger');
                showResults({ grupo1_expulsiones: parsedDataForConfirmation.grupo1_expulsiones });
                showConfirmationUI(true);
                return;
            }
            await ref.set(parsedDataForConfirmation.grupo1_expulsiones, { merge: false });
            showStatus('¡Guardado con éxito en Firebase!', 'success');
        } catch (err) {
            console.error("Error al guardar:", err);
            showStatus(`Error: ${err.message}`, 'danger');
            showResults({ grupo1_expulsiones: parsedDataForConfirmation.grupo1_expulsiones });
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

    // --------------------------------------------------------------------------
    // PARSER COMPLETO DE GRUPO 1 (excepto GESTIONES)
    // ADAPTADO: Detenidos solo número correlativo
    // --------------------------------------------------------------------------
    function parseGrupo1Completo(html) {
        const root = document.createElement('div');
        root.innerHTML = html;
        const tablas = Array.from(root.querySelectorAll('table'));
        let fecha = '';
        let grupo1 = {};

        // Busca fecha (primeras filas)
        if (tablas[0]) {
            const txt = tablas[0].textContent;
            const m = txt.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }

        // --- Helper general para cada tabla, ignora si cabecera contiene 'GESTIONES' ---
        function filtrarGestiones(tabla) {
            const firstRow = tabla.querySelector('tr');
            if (!firstRow) return false;
            const txt = firstRow.textContent.toUpperCase();
            return !txt.includes('GESTIONES');
        }

        // ---- Detenidos: solo número, motivo, nacionalidad, diligencias, observaciones ----
        grupo1.detenidos = [];
        let contadorDetenidos = 1;
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
                        numero: contadorDetenidos++,
                        motivo: cells[1]?.textContent.trim() || '',
                        nacionalidad: cells[2]?.textContent.trim() || '',
                        diligencias: cells[3]?.textContent.trim() || '',
                        observaciones: cells[4]?.textContent.trim() || ''
                    };
                    // Añade si algún campo relevante no está vacío
                    if (obj.motivo || obj.nacionalidad || obj.diligencias || obj.observaciones) grupo1.detenidos.push(obj);
                }
            }
        }
        if (!grupo1.detenidos.length) delete grupo1.detenidos;

        // ---- Expulsados ----
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
                    // Solo si hay nombre o nacionalidad
                    if (obj.nombre || obj.nacionalidad) grupo1.expulsados.push(obj);
                }
            }
        }
        if (!grupo1.expulsados.length) delete grupo1.expulsados;

        // ---- Fletados ----
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

        // ---- Fletados Futuros ----
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

        // ---- Conducciones positivas ----
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

        // ---- Conducciones negativas ----
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

        // ---- Pendientes de gestión ----
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

    // --------------------------------------------------------------------------
    // VALIDACIÓN: Debe haber al menos algún registro útil
    // --------------------------------------------------------------------------
    function validarDatos(grupo1) {
        let errores = [];
        if (
            (!grupo1.detenidos || grupo1.detenidos.length === 0) &&
            (!grupo1.expulsados || grupo1.expulsados.length === 0) &&
            (!grupo1.fletados || grupo1.fletados.length === 0)
        ) {
            errores.push('Debe haber al menos un detenido, expulsado o fletado.');
        }
        return errores;
    }

});
