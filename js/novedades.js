// js/novedades.js
// SIREX · Lógica para la carga de datos desde PDF

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
    authDomain: "ucrif-5bb75.firebaseapp.com",
    projectId: "ucrif-5bb75",
    storageBucket: "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId: "1:241698436443:web:1f333b3ae3f813b755167e",
    measurementId: "G-S2VPQNWZ21"
};
if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ELEMENTOS DOM ---
const spinner = document.getElementById('spinner');
const btnLeerPDF = document.getElementById('btnLeerPDF');
const pdfFileInput = document.getElementById('pdfFile');
const pdfModal = new bootstrap.Modal(document.getElementById('pdfConfirmModal'));
const pdfModalBody = document.getElementById('pdfConfirmModalBody');
const btnGuardarPDFData = document.getElementById('btnGuardarPDFData');

// --- SPINNER Y ERROR ---
function mostrarSpinner(mostrar) {
    spinner.classList.toggle('d-none', !mostrar);
}
function mostrarError(msg) {
    alert(`Error: ${msg}`);
}

// ==================================================================
// ====== LÓGICA PARA LECTURA DE NOVEDADES PDF ======================
// ==================================================================

// --- Evento para activar la selección de archivo ---
btnLeerPDF.addEventListener('click', () => {
    pdfFileInput.click();
});

// --- Evento cuando el usuario selecciona un archivo ---
pdfFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        mostrarSpinner(true);
        try {
            const pdfText = await leerTextoDePDF(file);
            const datosExtraidos = parseNovedadesPDF(pdfText);
            
            if (!datosExtraidos.fecha) {
                throw new Error("No se pudo determinar la fecha del documento de novedades.");
            }

            window._pdfDataToSave = datosExtraidos;
            mostrarDatosParaConfirmacion(datosExtraidos);
            pdfModal.show();

        } catch (error) {
            console.error("Error procesando el PDF:", error);
            mostrarError(`Error al procesar el PDF: ${error.message}`);
        } finally {
            mostrarSpinner(false);
            pdfFileInput.value = '';
        }
    }
});

async function leerTextoDePDF(file) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (event) => {
            try {
                const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function parseNovedadesPDF(texto) {
    const datos = {};
    const matchFecha = texto.match(/DEL DÍA (\d{1,2}) DE (\w+) (\d{4})/i);
    if (matchFecha) {
        const meses = { "enero": 0, "febrero": 1, "marzo": 2, "abril": 3, "mayo": 4, "junio": 5, "julio": 6, "agosto": 7, "septiembre": 8, "octubre": 9, "noviembre": 10, "diciembre": 11 };
        const dia = parseInt(matchFecha[1], 10);
        const mes = meses[matchFecha[2].toLowerCase()];
        const anio = parseInt(matchFecha[3], 10);
        const fecha = new Date(anio, mes, dia);
        datos.fecha = fecha.toISOString().slice(0, 10);
        datos.fecha_yyyymmdd = `${anio}${String(mes+1).padStart(2,'0')}${String(dia).padStart(2,'0')}`;
    }

    const getNum = (regex, txt) => {
        const match = txt.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    const secciones = texto.split(/GRUPO \d:|CECOREX:|PUERTO:|CIE:/);
    const titulos = texto.match(/GRUPO \d:|CECOREX:|PUERTO:|CIE:/g);

    if(titulos){
        titulos.forEach((titulo, index) => {
            const seccionTexto = secciones[index + 1] || "";
            const grupoId = titulo.toLowerCase().replace(":", "").replace(" ", "");

            if (grupoId === "grupo1") {
                datos.grupo1 = {
                    expulsados: getNum(/Expulsión de ciudadano de [\w\s]+, excarcelado/i, seccionTexto) > 0 ? [{nombre: 'Expulsado desde prisión', nacionalidad: 'N/D', diligencias: 'N/D'}] : [],
                    fletados: [], 
                };
            }
            if (grupoId === "grupo3") {
                 const numIdentificadas = getNum(/CONTROL CASA DE\s+CITAS\s+-\s*(\d+) identificadas/i, seccionTexto);
                 if (numIdentificadas > 0) {
                     datos.grupo3 = {
                        inspecciones: [{
                            casa: "Control genérico",
                            numFiliadas: numIdentificadas,
                            nacionalidadesFiliadas: ["Varias"],
                            fechaInspeccion: datos.fecha
                        }]
                    };
                 }
            }
            if (grupoId === "grupo4") {
                datos.grupo4 = {
                    citados: getNum(/CITAS\s*=\s*(\d+)/i, seccionTexto),
                    // Otros campos se pueden añadir aquí si se encuentran en el PDF
                };
            }
            if (grupoId === "cecorex") {
                datos.cecorex = {
                    detenidos: getNum(/(\d+) DETENIDO por ILE/i, seccionTexto),
                    identificados: getNum(/(\d+) identificados vía pública/i, seccionTexto),
                    citados: getNum(/(\d+) citados para CECOREX/i, seccionTexto),
                };
            }
             if (grupoId === "puerto") {
                datos.puerto = {
                    denegaciones: 0,
                    marinosArgos: getNum(/Marinos chequeados en ARGOS:\s*(\d+)/i, seccionTexto),
                    cruceristas: getNum(/Control pasaportes marinos:\s*(\d+)/i, seccionTexto),
                };
            }
            if (grupoId === "cie") {
                datos.cie = {
                    internosNac: getNum(/(\d+) INTERNOS/i, seccionTexto),
                    salidas: 0,
                };
            }
        });
    }
    return datos;
}

function mostrarDatosParaConfirmacion(datos) {
    let html = `<p>Hemos extraído los siguientes datos del PDF para la fecha <b>${datos.fecha}</b>. Por favor, revísalos antes de guardar.</p>`;
    html += '<ul class="list-group">';
    if(datos.grupo1) html += `<li class="list-group-item"><b>🚔 Grupo 1:</b> ${datos.grupo1.expulsados.length} expulsado(s) detectado(s).</li>`;
    if(datos.grupo3) html += `<li class="list-group-item"><b>🕵️‍♂️ Grupo 3:</b> ${datos.grupo3.inspecciones ? datos.grupo3.inspecciones[0].numFiliadas : '0'} filiadas en control de casa de citas.</li>`;
    if(datos.grupo4) html += `<li class="list-group-item"><b>🚨 Grupo 4:</b> ${datos.grupo4.citados} citado(s).</li>`;
    if(datos.cecorex) html += `<li class="list-group-item"><b>📡 CECOREX:</b> ${datos.cecorex.detenidos} detenido(s), ${datos.cecorex.identificados} identificado(s), ${datos.cecorex.citados} citado(s).</li>`;
    if(datos.puerto) html += `<li class="list-group-item"><b>⚓ Puerto:</b> ${datos.puerto.marinosArgos} marinos chequeados, ${datos.puerto.cruceristas} en control de pasaportes.</li>`;
    if(datos.cie) html += `<li class="list-group-item"><b>🏢 CIE:</b> ${datos.cie.internosNac} interno(s).</li>`;
    html += '</ul>';
    pdfModalBody.innerHTML = html;
}

btnGuardarPDFData.addEventListener('click', async () => {
    const datos = window._pdfDataToSave;
    if (!datos || !datos.fecha) {
        mostrarError("No hay datos de PDF para guardar.");
        return;
    }
    mostrarSpinner(true);
    pdfModal.hide();
    try {
        const batch = db.batch();
        if (datos.grupo1) {
            const ref1 = db.collection("grupo1_expulsiones").doc(`expulsiones_${datos.fecha}`);
            batch.set(ref1, { expulsados: datos.grupo1.expulsados, fletados: datos.grupo1.fletados }, { merge: true });
        }
        if (datos.grupo3 && datos.grupo3.inspecciones) {
            // Asumimos que las inspecciones se añaden a una operación genérica del día
            const opRef = db.collection("grupo3_operaciones").doc(`op_diaria_${datos.fecha}`);
            batch.set(opRef, { nombreOperacion: `Novedades ${datos.fecha}` }, { merge: true });
            datos.grupo3.inspecciones.forEach(ins => {
                const insRef = opRef.collection("inspecciones").doc();
                batch.set(insRef, ins);
            });
        }
        if (datos.grupo4) {
             const ref4 = db.collection("grupo4_gestion").doc(`gestion_${datos.fecha_yyyymmdd}`);
             batch.set(ref4, {citados: datos.grupo4.citados, fecha: datos.fecha}, {merge: true});
        }
        if (datos.puerto) {
            const refP = db.collection("grupoPuerto_registros").doc(`puerto_${datos.fecha}`);
            batch.set(refP, {...datos.puerto, fecha: datos.fecha}, {merge: true});
        }
        if (datos.cie) {
            const refC = db.collection("grupo_cie").doc(datos.fecha);
            batch.set(refC, {...datos.cie, fecha: datos.fecha}, {merge: true});
        }
        await batch.commit();
        alert("Datos del PDF guardados correctamente en la base de datos.");
    } catch (error) {
        console.error("Error al guardar datos del PDF en Firestore:", error);
        mostrarError("No se pudieron guardar los datos del PDF.");
    } finally {
        mostrarSpinner(false);
    }
});
