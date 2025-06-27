// js/novedades.js
// Versión compatible con carga de script tradicional (sin módulos)

document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONFIGURACIÓN FIREBASE ---
    // Asegúrate de que tu js/firebase.js inicializa la app
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
    const formulariosContainer = document.getElementById('formularios-container');
    const statusContainer = document.getElementById('status-container');

    // --- MANEJO DE EVENTOS ---
    if (inputDocx) {
        inputDocx.addEventListener('change', handleDocxUpload);
    }

    // --- FUNCIONES DE UI ---
    function mostrarEstado(mensaje, tipo = "info") {
        const alertClass = tipo === "error" ? "alert-danger" : "alert-success";
        const statusHTML = `<div class="alert ${alertClass}" role="alert" style="margin-top: 1rem;">${mensaje}</div>`;
        statusContainer.innerHTML = statusHTML;
        setTimeout(() => { statusContainer.innerHTML = ''; }, 5000);
    }

    function mostrarSpinner(visible = true) {
        let spinner = document.getElementById("spinnerCarga");
        if (spinner) spinner.remove();

        if (visible) {
            spinner = document.createElement("div");
            spinner.id = "spinnerCarga";
            spinner.innerHTML = '<div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"><span class="visually-hidden">Cargando...</span></div>';
            spinner.style.position = 'fixed';
            spinner.style.top = '50%';
            spinner.style.left = '50%';
            spinner.style.transform = 'translate(-50%, -50%)';
            spinner.style.zIndex = '10000';
            document.body.appendChild(spinner);
        }
    }

    // --- LÓGICA PRINCIPAL ---
    async function handleDocxUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        mostrarSpinner(true);
        formulariosContainer.innerHTML = ''; // Limpiar resultados anteriores

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const novedades = extraerYMapearDatos(result.value);

            if (Object.keys(novedades).length === 0) {
                throw new Error("No se encontraron tablas de datos. Revisa el formato del DOCX.");
            }

            autocompletarYMostrarFormularios(novedades);
            mostrarEstado("Datos extraídos correctamente. Revisa y guarda.", "success");

        } catch (err) {
            console.error("Error procesando DOCX:", err);
            mostrarEstado("Error al procesar el archivo: " + err.message, "error");
        } finally {
            mostrarSpinner(false);
        }
    }

    function extraerYMapearDatos(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const novedadesPorGrupo = {};

        const titulos = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4')).filter(p =>
            /^(GRUPO \d+|PUERTO|CIE|CECOREX)/i.test(p.textContent.trim())
        );

        titulos.forEach(tituloEl => {
            let currentEl = tituloEl.nextElementSibling;
            let tabla = null;
            while (currentEl && !tabla) {
                if (currentEl.tagName === 'TABLE') {
                    tabla = currentEl;
                }
                // Si encontramos otro título antes de una tabla, paramos.
                if (/^(GRUPO \d+|PUERTO|CIE|CECOREX)/i.test(currentEl.textContent.trim())) {
                    break;
                }
                currentEl = currentEl.nextElementSibling;
            }

            if (tabla) {
                const grupoNombre = tituloEl.textContent.trim().replace(":", "").toUpperCase();
                novedadesPorGrupo[grupoNombre] = tablaAObjetos(tabla);
            }
        });
        return novedadesPorGrupo;
    }

    function tablaAObjetos(tabla) {
        const filas = Array.from(tabla.querySelectorAll('tr'));
        if (filas.length < 2) return [];

        const encabezados = Array.from(filas[0].querySelectorAll('th, td')).map(celda =>
            celda.textContent.trim().toLowerCase().replace(/\s+/g, '_').replace(/:/g, '')
        );

        return filas.slice(1).map(fila => {
            const celdas = Array.from(fila.querySelectorAll('td'));
            let obj = {};
            encabezados.forEach((h, i) => {
                if (h) obj[h] = celdas[i] ? celdas[i].textContent.trim() : "";
            });
            return obj;
        });
    }

    function autocompletarYMostrarFormularios(novedadesPorGrupo) {
        Object.entries(novedadesPorGrupo).forEach(([grupo, novedades]) => {
            if (novedades.length > 0) {
                const card = document.createElement('div');
                card.className = 'form-group-card';
                
                let tableHTML = `<h3 class="text-primary">${grupo}</h3>
                                 <table class="table table-bordered table-sm"><thead><tr>`;
                
                const headers = Object.keys(novedades[0]);
                headers.forEach(key => {
                    tableHTML += `<th>${key.replace(/_/g, ' ')}</th>`;
                });
                tableHTML += `</tr></thead><tbody>`;

                novedades.forEach(novedad => {
                    tableHTML += `<tr>`;
                    headers.forEach(key => {
                        tableHTML += `<td>${novedad[key] || '---'}</td>`;
                    });
                    tableHTML += `</tr>`;
                });

                tableHTML += `</tbody></table>`;
                card.innerHTML = tableHTML;
                formulariosContainer.appendChild(card);
            }
        });

        // Añadir botón de guardado al final
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-success btn-lg w-100 mt-3';
        saveButton.innerHTML = '<i class="bi bi-check-circle-fill"></i> Confirmar y Guardar Todo en Firebase';
        saveButton.onclick = () => guardarTodasNovedades(novedadesPorGrupo);
        formulariosContainer.appendChild(saveButton);
    }

    async function guardarTodasNovedades(novedadesPorGrupo) {
        mostrarSpinner(true);
        const fechaStr = new Date().toISOString().slice(0, 10);
        const docRef = db.collection("novedades_diarias").doc(fechaStr);

        try {
            const datosAGuardar = {
                fecha: fechaStr,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                grupos: {}
            };
            
            for (const [grupo, novedades] of Object.entries(novedadesPorGrupo)) {
                const grupoKey = grupo.replace(/\s+/g, '_').toLowerCase();
                datosAGuardar.grupos[grupoKey] = novedades;
            }

            await docRef.set(datosAGuardar, { merge: true });
            mostrarEstado("¡Novedades guardadas correctamente en Firebase!", "success");

        } catch (err) {
            console.error("Error al guardar en Firebase:", err);
            mostrarEstado("Error al guardar los datos: " + err.message, "error");
        } finally {
            mostrarSpinner(false);
        }
    }
});
