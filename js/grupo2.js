// ======= INICIALIZACIÓN FIREBASE (ajusta si cambias de proyecto) =======
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e",
  measurementId: "G-S2VPQNWZ21"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// ======= UTILIDADES GENERALES =======
function showToast(msg, tipo = "info") { alert(msg); }
function limpiarFormulario(form) { if (form) form.reset(); }
function formatoFecha(fecha) {
    if (!fecha) return "";
    if (typeof fecha === 'string' && fecha.includes('-')) {
        const parts = fecha.split('-');
        if (parts.length === 3) {
            const dateOnly = parts[2].substring(0, 2);
            return `${dateOnly}/${parts[1]}/${parts[0]}`;
        }
    }
    const f = new Date(fecha);
    return `${f.getDate().toString().padStart(2, "0")}/${(f.getMonth() + 1).toString().padStart(2, "0")}/${f.getFullYear()}`;
}
function uniqueID() { return '_' + Math.random().toString(36).substr(2, 9); }
function getFechaYYYYMMDD(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function actualizarIndicador(selector, tieneDatos) {
    const indicador = document.querySelector(selector);
    if (indicador) {
        indicador.className = `data-indicator me-2 ${tieneDatos ? 'filled' : 'empty'}`;
    }
}


// ======= REFERENCIAS DOM =======
const operacionSelect = document.getElementById('operacionSelect');
const btnCargarOperacion = document.getElementById('btnCargarOperacion');
const btnNuevaOperacion = document.getElementById('btnNuevaOperacion');
const btnEliminarOperacion = document.getElementById('btnEliminarOperacion');
const btnGenerarInforme = document.getElementById('btnGenerarInforme');
const formOperacion = document.getElementById('formOperacion');
const btnGuardarOperacion = document.getElementById('btnGuardarOperacion');
const codigoOperacion = document.getElementById('codigoOperacion');
const codigoWarning = document.getElementById('codigoWarning');
const anioOperacion = document.getElementById('anioOperacion');
const fechaInicio = document.getElementById('fechaInicio');
const nombreOperacion = document.getElementById('nombreOperacion');
const descripcionBreve = document.getElementById('descripcionBreve');
const origenInvestigacion = document.getElementById('origenInvestigacion');
const tipologiaDelictiva = document.getElementById('tipologiaDelictiva');
const procedimientosJudiciales = document.getElementById('procedimientosJudiciales');
const diligenciasPoliciales = document.getElementById('diligenciasPoliciales');


// ======= ESTADO DE OPERACIÓN ACTUAL =======
let operacionActual = null;
let idOperacionActual = null;

// ======= 1. BÚSQUEDA Y CARGA DE OPERACIONES EXISTENTES =======
async function cargarOperacionesEnSelect() {
    operacionSelect.innerHTML = `<option value="">-- Selecciona una operación --</option>`;
    const snapshot = await db.collection("grupo2_operaciones").get();
    let operaciones = [];
    snapshot.forEach(doc => {
        operaciones.push({ id: doc.id, ...doc.data() });
    });

    operaciones.sort((a, b) => {
        const nameA = a.nombreOperacion ? a.nombreOperacion.toLowerCase() : '';
        const nameB = b.nombreOperacion ? b.nombreOperacion.toLowerCase() : '';
        return nameA.localeCompare(nameB);
    });

    operaciones.forEach(op => {
        operacionSelect.innerHTML += `<option value="${op.id}">${op.nombreOperacion} (${op.id})</option>`;
    });
}


// ======= 2. NUEVA OPERACIÓN =======
btnNuevaOperacion.addEventListener('click', () => {
    formOperacion.reset();
    operacionActual = null;
    idOperacionActual = null;
    codigoOperacion.value = "";
    anioOperacion.value = new Date().getFullYear();
    fechaInicio.value = getFechaYYYYMMDD();
    limpiarTodosLosListados();
    setTimeout(() => { codigoOperacion.focus() }, 150);
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    btnEliminarOperacion.classList.add('d-none');
    btnGenerarInforme.classList.add('d-none');
});

// ======= 3. CARGAR UNA OPERACIÓN POR NOMBRE =======
btnCargarOperacion.addEventListener('click', async () => {
    const codigo = operacionSelect.value;
    if (!codigo) return showToast("Selecciona una operación.");
    const doc = await db.collection("grupo2_operaciones").doc(codigo).get();
    if (!doc.exists) return showToast("No existe esa operación.");
    operacionActual = doc.data();
    idOperacionActual = codigo;
    codigoOperacion.value = idOperacionActual;
    anioOperacion.value = operacionActual.anioOperacion || "";
    fechaInicio.value = operacionActual.fechaInicio || "";
    nombreOperacion.value = operacionActual.nombreOperacion || "";
    descripcionBreve.value = operacionActual.descripcionBreve || "";
    origenInvestigacion.value = operacionActual.origenInvestigacion || "";
    tipologiaDelictiva.value = operacionActual.tipologiaDelictiva || "";
    procedimientosJudiciales.value = operacionActual.procedimientosJudiciales || "";
    diligenciasPoliciales.value = operacionActual.diligenciasPoliciales || "";
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    btnEliminarOperacion.classList.remove('d-none');
    btnGenerarInforme.classList.remove('d-none');
    cargarTodosLosListados();
});

// ======= VALIDAR UNICIDAD DE CÓDIGO =======
codigoOperacion.addEventListener('blur', async () => {
    const code = codigoOperacion.value.trim();
    if (!code) { codigoWarning.classList.add("d-none"); btnGuardarOperacion.disabled = false; return; }
    if (idOperacionActual && code === idOperacionActual) {
      codigoWarning.classList.add("d-none");
      btnGuardarOperacion.disabled = false;
      return;
    }
    const doc = await db.collection("grupo2_operaciones").doc(code).get();
    if (doc.exists) {
        codigoWarning.classList.remove("d-none");
        btnGuardarOperacion.disabled = true;
    } else {
        codigoWarning.classList.add("d-none");
        btnGuardarOperacion.disabled = false;
    }
});


// ======= GUARDAR/ACTUALIZAR OPERACIÓN PRINCIPAL =======
formOperacion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codigoOperacion.value.trim();
    if (!code) return showToast("Código operativo obligatorio.");
    const datos = {
        anioOperacion: anioOperacion.value,
        fechaInicio: fechaInicio.value,
        nombreOperacion: nombreOperacion.value.trim(),
        descripcionBreve: descripcionBreve.value.trim(),
        origenInvestigacion: origenInvestigacion.value.trim(),
        tipologiaDelictiva: tipologiaDelictiva.value.trim(),
        procedimientosJudiciales: procedimientosJudiciales.value.trim(),
        diligenciasPoliciales: diligenciasPoliciales.value.trim(),
        actualizado: new Date().toISOString()
    };
    await db.collection("grupo2_operaciones").doc(code).set(datos, { merge: true });
    showToast("Operación guardada correctamente.", "success");
    operacionActual = datos;
    idOperacionActual = code;
    cargarOperacionesEnSelect();
    btnGuardarOperacion.disabled = false;
    btnEliminarOperacion.classList.remove('d-none');
    btnGenerarInforme.classList.remove('d-none');
    codigoWarning.classList.add("d-none");
});

// ======= ELIMINACIÓN EN CASCADA DE UNA OPERACIÓN =======
if (btnEliminarOperacion) {
    btnEliminarOperacion.addEventListener('click', async () => {
        if (!idOperacionActual) return showToast("No hay ninguna operación cargada para eliminar.");

        const confirmacion = prompt(`ATENCIÓN: Esta acción es irreversible.\nSe borrará la operación "${nombreOperacion.value}" y TODOS sus datos asociados (juzgados, detenidos, documentos, etc.).\n\nEscribe "ELIMINAR" para confirmar.`);
        if (confirmacion !== "ELIMINAR") {
            showToast("Borrado cancelado.");
            return;
        }

        try {
            showToast("Borrando operación y todos sus datos... Este proceso puede tardar un momento.", "info");
            await eliminarOperacionCompleta(idOperacionActual);
            showToast("Operación eliminada con éxito.", "success");
            
            formOperacion.reset();
            operacionActual = null;
            idOperacionActual = null;
            limpiarTodosLosListados();
            cargarOperacionesEnSelect();
            btnEliminarOperacion.classList.add('d-none');
            btnGenerarInforme.classList.add('d-none');

        } catch (error) {
            console.error("Error en el borrado en cascada:", error);
            showToast(`Error al eliminar la operación: ${error.message}`, "error");
        }
    });
}

async function eliminarOperacionCompleta(idOperacion) {
    console.log(`Iniciando borrado en cascada para la operación: ${idOperacion}`);
    const subcolecciones = [
        "juzgados", "inhibiciones", "inspecciones", "historicoJuzgados",
        "intervenciones", "cronologia", "solicitudesJudiciales", "colaboraciones",
        "detenidos", "detenidosPrevistos", "otrasPersonas", "observaciones", "pendientes", "documentos"
    ];

    for (const sub of subcolecciones) {
        const snap = await db.collection("grupo2_operaciones").doc(idOperacion).collection(sub).get();
        if (snap.empty) continue;

        console.log(`Borrando ${snap.size} documentos de la subcolección ${sub}...`);
        const batch = db.batch();
        snap.docs.forEach(async doc => {
            if (sub === 'documentos') {
                const docData = doc.data();
                if (docData.nombre) {
                    const fileRef = storage.ref().child(`grupo2/${idOperacion}/${docData.nombre}`);
                    try {
                        await fileRef.delete();
                        console.log(`Archivo ${docData.nombre} eliminado de Storage.`);
                    } catch (e) {
                        console.warn(`No se pudo eliminar el archivo ${docData.nombre} de Storage (puede que ya no exista): ${e.message}`);
                    }
                }
            }
            if (sub === 'detenidos') {
                await eliminarDeResumen('resumen_detenidos', doc.data().fechaDetenido, doc.id);
            }
            if (sub === 'cronologia') {
                await eliminarDeResumen('resumen_cronologia', doc.data().fecha, doc.id);
            }
            batch.delete(doc.ref);
        });
        await batch.commit();
    }

    console.log(`Borrando documento principal de la operación ${idOperacion}...`);
    await db.collection("grupo2_operaciones").doc(idOperacion).delete();
    console.log("Borrado en cascada completado.");
}

// ======= FUNCIÓN GENÉRICA PARA BORRAR SUBDOCUMENTOS =======
window.eliminarSubdocumento = async (subcoleccion, docid, callback) => {
    if (!idOperacionActual) return;
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection(subcoleccion).doc(docid).delete();
    if (callback) callback();
};

// ======= CRONOLOGÍA =======
const btnAñadirEventoCronologia = document.getElementById('btnAñadirEventoCronologia');
const descripcionCronologia = document.getElementById('descripcionCronologia');
const fechaCronologia = document.getElementById('fechaCronologia');

btnAñadirEventoCronologia.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        descripcionCronologia: descripcionCronologia.value.trim(),
        fecha: fechaCronologia.value,
        ts: new Date().toISOString()
    };
    if (!data.descripcionCronologia || !data.fecha) return showToast("Completa los campos.");

    const docRef = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("cronologia").add(data);
    const fechaDocId = data.fecha;
    const resumenRef = db.collection('resumen_cronologia').doc(fechaDocId);
    const resumenData = {
        ...data,
        idOperacion: idOperacionActual,
        nombreOperacion: nombreOperacion.value.trim(),
        idEntrada: docRef.id
    };
    await resumenRef.set({
        actuaciones: firebase.firestore.FieldValue.arrayUnion(resumenData)
    }, { merge: true });

    document.getElementById('formCronologia').reset();
    cargarListadoCronologia();
});

window.eliminarCronologia = async (docid, fecha) => {
    if (!idOperacionActual) return;
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("cronologia").doc(docid).delete();
    await eliminarDeResumen('resumen_cronologia', fecha, docid);
    cargarListadoCronologia();
};

async function cargarListadoCronologia() {
    const listadoEl = document.getElementById('listadoCronologia');
    if (!idOperacionActual) {
        listadoEl.innerHTML = "";
        return actualizarIndicador('#headingCronologia .data-indicator', false);
    }
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("cronologia").orderBy("fecha", "desc").get();
    listadoEl.innerHTML = "";
    snap.forEach(doc => {
        const c = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>${formatoFecha(c.fecha)} - ${c.descripcionCronologia || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarCronologia('${doc.id}', '${c.fecha}')"><i class="bi bi-trash"></i></button></div>`;
    });
    actualizarIndicador('#headingCronologia .data-indicator', !snap.empty);
}


// ======= JUZGADOS =======
document.getElementById('btnAñadirJuzgado').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        juzgado: document.getElementById('juzgadoInicial').value.trim(),
        diligencias: document.getElementById('diligenciasPreviasJuzgado').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.juzgado && !data.diligencias) return showToast("Completa algún campo.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("juzgados").add(data);
    document.getElementById('formJuzgados').reset();
    cargarListadoJuzgados();
});

document.getElementById('btnAñadirInhibicion').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        juzgadoInhibido: document.getElementById('juzgadoInhibido').value.trim(),
        fechaInhibicion: document.getElementById('fechaInhibicion').value,
        ts: new Date().toISOString()
    };
    if (!data.juzgadoInhibido || !data.fechaInhibicion) return showToast("Completa los campos.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inhibiciones").add(data);
    document.getElementById('formInhibiciones').reset();
    cargarListadoJuzgados();
});

document.getElementById('btnAñadirHistoricoJuzgado').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        fechaHistoricoJuzgado: document.getElementById('fechaHistoricoJuzgado').value,
        juzgadoRelacionado: document.getElementById('juzgadoRelacionado').value.trim(),
        descripcionEventoJuzgado: document.getElementById('descripcionEventoJuzgado').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.fechaHistoricoJuzgado || !data.juzgadoRelacionado || !data.descripcionEventoJuzgado) return showToast("Completa todos los campos.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("historicoJuzgados").add(data);
    document.getElementById('formHistoricoJuzgados').reset();
    cargarListadoJuzgados();
});

async function cargarListadoJuzgados() {
    const listadoEl = document.getElementById('listadoJuzgados');
    listadoEl.innerHTML = "";
    if (!idOperacionActual) return actualizarIndicador('#headingJuzgados .data-indicator', false);

    const snapJuzgados = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("juzgados").get();
    const snapInhibiciones = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inhibiciones").orderBy("fechaInhibicion", "desc").get();
    const snapHistorico = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("historicoJuzgados").orderBy("fechaHistoricoJuzgado", "desc").get();

    snapJuzgados.forEach(doc => {
        const j = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span><b>${j.juzgado}</b> (${j.diligencias})</span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('juzgados', '${doc.id}', cargarListadoJuzgados)"><i class="bi bi-trash"></i></button></div>`;
    });

    cargarListadoInhibiciones(snapInhibiciones);
    cargarListadoHistoricoJuzgados(snapHistorico);
    actualizarIndicador('#headingJuzgados .data-indicator', !snapJuzgados.empty || !snapInhibiciones.empty || !snapHistorico.empty);
}

function cargarListadoInhibiciones(snap) {
    const listadoEl = document.getElementById('listadoInhibiciones');
    listadoEl.innerHTML = "";
    snap.forEach(doc => {
        const i = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>${formatoFecha(i.fechaInhibicion)} - ${i.juzgadoInhibido}</span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('inhibiciones', '${doc.id}', cargarListadoJuzgados)"><i class="bi bi-trash"></i></button></div>`;
    });
}

function cargarListadoHistoricoJuzgados(snap) {
    const listadoEl = document.getElementById('listadoHistoricoJuzgados');
    listadoEl.innerHTML = "";
    snap.forEach(doc => {
        const h = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>${formatoFecha(h.fechaHistoricoJuzgado)} - <b>${h.juzgadoRelacionado}</b>: ${h.descripcionEventoJuzgado}</span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('historicoJuzgados', '${doc.id}', cargarListadoJuzgados)"><i class="bi bi-trash"></i></button></div>`;
    });
}


// ======= DETENIDOS Y PREVISTOS =======
document.getElementById('btnAñadirDetenido').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        nombreDetenido: document.getElementById('nombreDetenido').value.trim(),
        fechaDetenido: document.getElementById('fechaDetenido').value,
        delitoDetenido: document.getElementById('delitoDetenido').value.trim(),
        nacionalidadDetenido: document.getElementById('nacionalidadDetenido').value.trim(),
        secuenciaDetenido: document.getElementById('secuenciaDetenido').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.nombreDetenido || !data.fechaDetenido) return showToast("Nombre y fecha son obligatorios.");

    const docRef = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidos").add(data);
    const fechaDocId = data.fechaDetenido;
    const resumenRef = db.collection('resumen_detenidos').doc(fechaDocId);
    const resumenData = {
        ...data,
        idOperacion: idOperacionActual,
        nombreOperacion: nombreOperacion.value.trim(),
        idEntrada: docRef.id
    };
    await resumenRef.set({
        detenciones: firebase.firestore.FieldValue.arrayUnion(resumenData)
    }, { merge: true });

    document.getElementById('formDetenidos').reset();
    cargarListadoDetenidos();
});

document.getElementById('btnAñadirPrevisto').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        nombrePrevisto: document.getElementById('nombrePrevisto').value.trim(),
        nacionalidadPrevisto: document.getElementById('nacionalidadPrevisto').value.trim(),
        delitoPrevisto: document.getElementById('delitoPrevisto').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.nombrePrevisto) return showToast("El nombre es obligatorio.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidosPrevistos").add(data);
    document.getElementById('formDetenidosPrevistos').reset();
    cargarListadoDetenidos();
});


window.eliminarDetenido = async (docid, fecha) => {
    if (!idOperacionActual) return;
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidos").doc(docid).delete();
    await eliminarDeResumen('resumen_detenidos', fecha, docid);
    cargarListadoDetenidos();
};

async function cargarListadoDetenidos() {
    const listadoEl = document.getElementById('listadoDetenidos');
    if (!idOperacionActual) {
        listadoEl.innerHTML = "";
        actualizarIndicador('#headingDetenidos .data-indicator', false);
        return;
    }

    const snapDetenidos = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidos").orderBy("fechaDetenido", "desc").get();
    listadoEl.innerHTML = "";
    snapDetenidos.forEach(doc => {
        const d = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
      <b>${d.nombreDetenido || ""}</b> - ${formatoFecha(d.fechaDetenido)}<br>
      <small>Delito: ${d.delitoDetenido || ""} | Nac: ${d.nacionalidadDetenido || ""} | Ord: ${d.secuenciaDetenido || ""}</small>
      </span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarDetenido('${doc.id}', '${d.fechaDetenido}')"><i class="bi bi-trash"></i></button></div>`;
    });
    
    const snapPrevistos = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidosPrevistos").orderBy("ts", "desc").get();
    cargarListadoDetenidosPrevistos(snapPrevistos);

    actualizarIndicador('#headingDetenidos .data-indicator', !snapDetenidos.empty || !snapPrevistos.empty);
}

function cargarListadoDetenidosPrevistos(snap) {
    const listadoEl = document.getElementById('listadoDetenidosPrevistos');
    listadoEl.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
        <b>${d.nombrePrevisto}</b> (${d.nacionalidadPrevisto || 'N/A'})<br><small>Delito: ${d.delitoPrevisto || '-'}</small>
        </span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('detenidosPrevistos', '${doc.id}', cargarListadoDetenidos)"><i class="bi bi-trash"></i></button></div>`;
    });
}

// ======= OTRAS PERSONAS VINCULADAS =======
document.getElementById('btnAñadirOtraPersona').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        filiacionOtraPersona: document.getElementById('filiacionOtraPersona').value.trim(),
        tipoVinculacion: document.getElementById('tipoVinculacion').value.trim(),
        nacionalidadOtraPersona: document.getElementById('nacionalidadOtraPersona').value.trim(),
        telefonoOtraPersona: document.getElementById('telefonoOtraPersona').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.filiacionOtraPersona) return showToast("El nombre es obligatorio.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("otrasPersonas").add(data);
    document.getElementById('formOtrasPersonas').reset();
    cargarListadoOtrasPersonas();
});

async function cargarListadoOtrasPersonas() {
    const listadoEl = document.getElementById('listadoOtrasPersonas');
    if (!idOperacionActual) {
        listadoEl.innerHTML = "";
        return actualizarIndicador('#headingPersonasVinculadas .data-indicator', false);
    }
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("otrasPersonas").orderBy("ts", "desc").get();
    listadoEl.innerHTML = "";
    snap.forEach(doc => {
        const p = doc.data();
        listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
        <b>${p.filiacionOtraPersona}</b> (${p.nacionalidadOtraPersona || 'N/A'}) - ${p.tipoVinculacion || ''}<br><small>Tel: ${p.telefonoOtraPersona || '-'}</small>
        </span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('otrasPersonas', '${doc.id}', cargarListadoOtrasPersonas)"><i class="bi bi-trash"></i></button></div>`;
    });
    actualizarIndicador('#headingPersonasVinculadas .data-indicator', !snap.empty);
}

// ======= INSPECCIONES =======
const checkSinOperacion = document.getElementById('checkSinOperacion');
const fechaInspeccionRutinaria = document.getElementById('fechaInspeccionRutinaria');

checkSinOperacion.addEventListener('change', () => {
    fechaInspeccionRutinaria.disabled = !checkSinOperacion.checked;
    if (checkSinOperacion.checked) {
        fechaInspeccionRutinaria.value = getFechaYYYYMMDD();
    }
    cargarListadoInspecciones(); 
});

document.getElementById('btnAñadirInspeccion').addEventListener('click', async () => {
    const casa = document.getElementById('nombreCasa').value.trim();
    const num = parseInt(document.getElementById('numFiliadas').value, 10) || 0;
    const numCit = parseInt(document.getElementById('numCitadas').value, 10) || 0;
    const nacs = document.getElementById('nacionalidadesFiliadas').value.split(',').map(n => n.trim()).filter(Boolean);
    const idEntrada = uniqueID();

    if (!casa) return showToast("El nombre de la casa es obligatorio.");

    if (checkSinOperacion.checked) {
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return showToast("La fecha es obligatoria para inspecciones sin operación.");
        
        const data = { casa, numFiliadas: num, numCitadas: numCit, nacionalidadesFiliadas: nacs, ts: new Date().toISOString(), idEntrada };
        const docRef = db.collection('control_casas_citas').doc(fecha);
        await docRef.set({ datos: firebase.firestore.FieldValue.arrayUnion(data) }, { merge: true });
        showToast("Inspección rutinaria añadida.", "success");
    } else {
        if (!idOperacionActual) return showToast("Guarda la operación antes de añadir una inspección asociada.");
        const data = { casa, numFiliadas: num, numCitadas: numCit, nacionalidadesFiliadas: nacs, fechaInspeccion: fechaInicio.value, ts: new Date().toISOString() };
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").add(data);
        showToast("Inspección añadida a la operación.", "success");
    }
    
    document.getElementById('formInspecciones').reset();
    document.getElementById('numCitadas').value = "";
    document.getElementById('checkSinOperacion').checked = checkSinOperacion.checked;
    fechaInspeccionRutinaria.disabled = !checkSinOperacion.checked;
    cargarListadoInspecciones();
});

async function cargarListadoInspecciones() {
    const listadoEl = document.getElementById('listadoInspecciones');
    listadoEl.innerHTML = "";
    let tieneDatos = false;

    if (checkSinOperacion.checked) {
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return actualizarIndicador('#headingInspecciones .data-indicator', false);

        const doc = await db.collection("control_casas_citas").doc(fecha).get();
        if (doc.exists) {
            const inspecciones = doc.data().datos || [];
            tieneDatos = inspecciones.length > 0;
            inspecciones.forEach(d => {
                listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
                    <b>${d.casa || ""}</b><br>
                    <small>Filiadas: <b>${d.numFiliadas || 0}</b>, Citadas: <b>${d.numCitadas || 0}</b>. Nacionalidades: ${(d.nacionalidadesFiliadas || []).join(', ') || "N/A"}</small>
                </span>
                <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumentoInspeccion(null, '${d.idEntrada}', '${fecha}')"><i class="bi bi-trash"></i></button></div>`;
            });
        }
    } else {
        if (!idOperacionActual) return actualizarIndicador('#headingInspecciones .data-indicator', false);
        const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").orderBy("ts", "desc").get();
        tieneDatos = !snap.empty;
        snap.forEach(doc => {
            const d = doc.data();
            listadoEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
                <b>${d.casa || ""}</b> - ${formatoFecha(d.fechaInspeccion)}<br>
                <small>Filiadas: <b>${d.numFiliadas || 0}</b>, Citadas: <b>${d.numCitadas || 0}</b>. Nacionalidades: ${(d.nacionalidadesFiliadas || []).join(', ') || "N/A"}</small>
            </span>
            <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumentoInspeccion('${doc.id}')"><i class="bi bi-trash"></i></button></div>`;
        });
    }
    actualizarIndicador('#headingInspecciones .data-indicator', tieneDatos);
}

window.eliminarSubdocumentoInspeccion = async function(docid, idEntrada = null, fechaDoc = null) {
    if (checkSinOperacion.checked && idEntrada && fechaDoc) {
        const docRef = db.collection("control_casas_citas").doc(fechaDoc);
        const doc = await docRef.get();
        if (doc.exists) {
            let datos = doc.data().datos || [];
            const datosFiltrados = datos.filter(item => item.idEntrada !== idEntrada);
            if (datosFiltrados.length === 0) {
                await docRef.delete();
            } else {
                await docRef.update({ datos: datosFiltrados });
            }
        }
    } else if (docid && idOperacionActual) {
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").doc(docid).delete();
    }
    cargarListadoInspecciones();
};

// ======= INTERVENCIONES Y MEDIDAS =======
document.getElementById('btnAñadirIntervencion').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const intervencion = document.getElementById('intervencionTelefonica').value.trim();
    const registro = document.getElementById('entradaRegistro').value.trim();
    if (intervencion) {
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("intervenciones").add({ tipo: 'telefonica', descripcion: intervencion, ts: new Date().toISOString() });
    }
    if (registro) {
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("intervenciones").add({ tipo: 'registro', descripcion: registro, ts: new Date().toISOString() });
    }
    document.getElementById('formIntervenciones').reset();
    cargarListadoIntervenciones();
});

document.getElementById('btnAñadirSolicitudJudicial').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        solicitud: document.getElementById('solicitudJudicial').value.trim(),
        descripcion: document.getElementById('descripcionSolicitudJudicial').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.solicitud) return showToast("El tipo de solicitud es obligatorio.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("solicitudesJudiciales").add(data);
    document.getElementById('formSolicitudes').reset();
    cargarListadoIntervenciones();
});

document.getElementById('btnAñadirColaboracion').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        fechaColaboracion: document.getElementById('fechaColaboracion').value,
        grupoColaboracion: document.getElementById('grupoColaboracion').value.trim(),
        tipoColaboracion: document.getElementById('tipoColaboracion').value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.fechaColaboracion || !data.grupoColaboracion) return showToast("Fecha y grupo son obligatorios.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("colaboraciones").add(data);
    document.getElementById('formColaboraciones').reset();
    cargarListadoIntervenciones();
});

async function cargarListadoIntervenciones() {
    if (!idOperacionActual) return actualizarIndicador('#headingIntervenciones .data-indicator', false);
    
    const snapIntervenciones = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("intervenciones").get();
    const snapSolicitudes = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("solicitudesJudiciales").get();
    const snapColaboraciones = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("colaboraciones").get();
    
    const listadoIntervencionesEl = document.getElementById('listadoIntervenciones');
    listadoIntervencionesEl.innerHTML = "";
    snapIntervenciones.forEach(doc => {
        const i = doc.data();
        listadoIntervencionesEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
        <b>${i.tipo === 'telefonica' ? 'Int. Telefónica' : 'Entrada y Registro'}:</b> ${i.descripcion}
        </span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('intervenciones', '${doc.id}', cargarListadoIntervenciones)"><i class="bi bi-trash"></i></button></div>`;
    });

    const listadoSolicitudesEl = document.getElementById('listadoSolicitudesJudiciales');
    listadoSolicitudesEl.innerHTML = "";
    snapSolicitudes.forEach(doc => {
        const s = doc.data();
        listadoSolicitudesEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
        <b>${s.solicitud}:</b> ${s.descripcion}
        </span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('solicitudesJudiciales', '${doc.id}', cargarListadoIntervenciones)"><i class="bi bi-trash"></i></button></div>`;
    });

    const listadoColaboracionesEl = document.getElementById('listadoColaboraciones');
    listadoColaboracionesEl.innerHTML = "";
    snapColaboraciones.forEach(doc => {
        const c = doc.data();
        listadoColaboracionesEl.innerHTML += `<div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center"><span>
        ${formatoFecha(c.fechaColaboracion)} - <b>${c.grupoColaboracion}</b> (${c.tipoColaboracion})
        </span><button class="btn btn-sm btn-danger" onclick="eliminarSubdocumento('colaboraciones', '${doc.id}', cargarListadoIntervenciones)"><i class="bi bi-trash"></i></button></div>`;
    });

    actualizarIndicador('#headingIntervenciones .data-indicator', !snapIntervenciones.empty || !snapSolicitudes.empty || !snapColaboraciones.empty);
}

// ======= DOCUMENTACIÓN ADJUNTA =======
// Implementación pendiente

// ======= ANOTACIONES / OBSERVACIONES =======
// Implementación pendiente

// ======= TAREAS PENDIENTES =======
// Implementación pendiente


// ======= LIMPIEZA Y CARGA DE TODOS LOS LISTADOS =======
function limpiarTodosLosListados() {
    const listados = document.querySelectorAll('.listado-dinamico');
    listados.forEach(listado => listado.innerHTML = "");
    document.querySelectorAll('.data-indicator').forEach(el => el.className = 'data-indicator me-2 empty');
}

function cargarTodosLosListados() {
    cargarListadoCronologia();
    cargarListadoJuzgados();
    cargarListadoDetenidos();
    cargarListadoOtrasPersonas();
    cargarListadoInspecciones();
    cargarListadoIntervenciones();
    // cargarListadoDocumentos();
    // cargarListadoObservaciones();
    // cargarListadoPendientes();
}

// ======= INFORME AUTOMÁTICO =======
document.getElementById('btnGenerarInforme').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Carga una operación primero.");
    const doc = await db.collection("grupo2_operaciones").doc(idOperacionActual).get();
    if (!doc.exists) return showToast("No existe esa operación.");
    const op = doc.data();

    async function getSubcoleccion(nombre, orderByField = "ts", orderDirection = "desc") {
        const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection(nombre).orderBy(orderByField, orderDirection).get();
        let arr = [];
        snap.forEach(d => arr.push({id: d.id, ...d.data()}));
        return arr;
    }

    // ... (resto de la lógica de generación de informes)

});

// ======= RESÚMENES SEMANALES =======
// ... (lógica de resúmenes)

// ========== AUTOINICIALIZACIÓN ==========
window.addEventListener('DOMContentLoaded', () => {
    anioOperacion.value = new Date().getFullYear();
    fechaInicio.value = getFechaYYYYMMDD();
    cargarOperacionesEnSelect();
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    if(btnEliminarOperacion) btnEliminarOperacion.classList.add('d-none');
    if(btnGenerarInforme) btnGenerarInforme.classList.add('d-none');
    
    if(checkSinOperacion) {
        checkSinOperacion.checked = false;
        fechaInspeccionRutinaria.disabled = true;
    }

    limpiarTodosLosListados();
});

async function eliminarDeResumen(coleccionResumen, fechaDocId, idEntradaAEliminar) {
    if(!fechaDocId || !idEntradaAEliminar) return;

    const resumenRef = db.collection(coleccionResumen).doc(fechaDocId);
    const doc = await resumenRef.get();

    if (doc.exists) {
        const key = coleccionResumen === 'resumen_detenidos' ? 'detenciones' : 'actuaciones';
        let items = doc.data()[key] || [];
        const itemsFiltrados = items.filter(item => item.idEntrada !== idEntradaAEliminar);
        
        if (itemsFiltrados.length === 0) {
            await resumenRef.delete();
        } else {
            await resumenRef.update({ [key]: itemsFiltrados });
        }
    }
}
