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
    // Detectar si la fecha ya viene en formato YYYY-MM-DD
    if (typeof fecha === 'string' && fecha.includes('-')) {
        const parts = fecha.split('-');
        if (parts.length === 3) {
            // Es una cadena YYYY-MM-DD, puede tener hora
            const dateOnly = parts[2].substring(0, 2);
            return `${dateOnly}/${parts[1]}/${parts[0]}`;
        }
    }
    // Si es un objeto Date o timestamp
    const f = new Date(fecha);
    return `${f.getDate().toString().padStart(2, "0")}/${(f.getMonth() + 1).toString().padStart(2, "0")}/${f.getFullYear()}`;
}
function uniqueID() { return '_' + Math.random().toString(36).substr(2, 9); }
function getFechaYYYYMMDD(date = new Date()) {
    return date.toISOString().slice(0, 10);
}


// ======= REFERENCIAS DOM =======
const operacionSelect = document.getElementById('operacionSelect');
const btnCargarOperacion = document.getElementById('btnCargarOperacion');
const btnNuevaOperacion = document.getElementById('btnNuevaOperacion');
const btnEliminarOperacion = document.getElementById('btnEliminarOperacion'); // REQUISITO 2: Nuevo botón
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

// REQUISITO 4: Corregida la ordenación
async function cargarOperacionesEnSelect() {
    operacionSelect.innerHTML = `<option value="">-- Selecciona una operación --</option>`;
    const snapshot = await db.collection("grupo2_operaciones").get();
    let operaciones = [];
    snapshot.forEach(doc => {
        operaciones.push({ id: doc.id, ...doc.data() });
    });

    // Ordenar en JavaScript para asegurar ordenación insensible a mayúsculas/minúsculas
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
    btnEliminarOperacion.classList.add('d-none'); // Ocultar botón de eliminar
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
    btnEliminarOperacion.classList.remove('d-none'); // Mostrar botón de eliminar
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
    codigoWarning.classList.add("d-none");
});

// ======= REQUISITO 2: ELIMINACIÓN EN CASCADA DE UNA OPERACIÓN =======
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
            
            // Resetear la interfaz
            formOperacion.reset();
            operacionActual = null;
            idOperacionActual = null;
            limpiarTodosLosListados();
            cargarOperacionesEnSelect();
            btnEliminarOperacion.classList.add('d-none');

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
            // Caso especial: si son documentos, borrar también de Storage
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
             // REQUISITO 5: Eliminar de las colecciones de resumen
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

    // Finalmente, borrar el documento principal de la operación
    console.log(`Borrando documento principal de la operación ${idOperacion}...`);
    await db.collection("grupo2_operaciones").doc(idOperacion).delete();
    console.log("Borrado en cascada completado.");
}


// ======= CRONOLOGÍA (Movido arriba por requisito de orden) =======
const btnAñadirEventoCronologia = document.getElementById('btnAñadirEventoCronologia');
const descripcionCronologia = document.getElementById('descripcionCronologia');
const fechaCronologia = document.getElementById('fechaCronologia');
const listadoCronologia = document.getElementById('listadoCronologia');

// REQUISITO 5: Lógica de escritura DUAL para Cronología
btnAñadirEventoCronologia.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        descripcionCronologia: descripcionCronologia.value.trim(),
        fecha: fechaCronologia.value,
        ts: new Date().toISOString()
    };
    if (!data.descripcionCronologia || !data.fecha) return showToast("Completa los campos.");

    // 1. Escritura en la subcolección de la operación
    const docRef = await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("cronologia").add(data);

    // 2. Escritura en la colección de resumen
    const fechaDocId = data.fecha; // YYYY-MM-DD
    const resumenRef = db.collection('resumen_cronologia').doc(fechaDocId);
    const resumenData = {
        ...data,
        idOperacion: idOperacionActual,
        nombreOperacion: nombreOperacion.value.trim(),
        idEntrada: docRef.id // ID único para poder borrarlo después
    };
    await resumenRef.set({
        actuaciones: firebase.firestore.FieldValue.arrayUnion(resumenData)
    }, { merge: true });

    descripcionCronologia.value = "";
    fechaCronologia.value = "";
    cargarListadoCronologia();
});

async function cargarListadoCronologia() {
    if (!idOperacionActual) return listadoCronologia.innerHTML = "";
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("cronologia").orderBy("fecha", "desc").get();
    listadoCronologia.innerHTML = "";
    snap.forEach(doc => {
        const c = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${formatoFecha(c.fecha)} - ${c.descripcionCronologia || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarCronologia('${doc.id}', '${c.fecha}')"><i class="bi bi-trash"></i></button>`;
        listadoCronologia.appendChild(div);
    });
}

// REQUISITO 5: Lógica de borrado DUAL para Cronología
window.eliminarCronologia = async (docid, fecha) => {
    if (!idOperacionActual) return;
    // 1. Eliminar de la subcolección
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("cronologia").doc(docid).delete();
    
    // 2. Eliminar de la colección de resumen
    await eliminarDeResumen('resumen_cronologia', fecha, docid);

    cargarListadoCronologia();
};


// ======= JUZGADOS (y resto de bloques en su orden original) =======
const btnAñadirJuzgado = document.getElementById('btnAñadirJuzgado');
const juzgadoInicial = document.getElementById('juzgadoInicial');
const diligenciasPreviasJuzgado = document.getElementById('diligenciasPreviasJuzgado');
const listadoJuzgados = document.getElementById('listadoJuzgados');

btnAñadirJuzgado.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
    const data = {
        juzgado: juzgadoInicial.value.trim(),
        diligencias: diligenciasPreviasJuzgado.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.juzgado && !data.diligencias) return showToast("Completa algún campo.");
    await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("juzgados").add(data);
    juzgadoInicial.value = "";
    diligenciasPreviasJuzgado.value = "";
    cargarListadoJuzgados();
});

async function cargarListadoJuzgados() {
    if (!idOperacionActual) return listadoJuzgados.innerHTML = "";
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("juzgados").orderBy("ts", "desc").get();
    listadoJuzgados.innerHTML = "";
    snap.forEach(doc => {
        const j = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${j.juzgado}</b> (${j.diligencias})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('juzgados', '${doc.id}', cargarListadoJuzgados)"><i class="bi bi-trash"></i></button>`;
        listadoJuzgados.appendChild(div);
    });
}


// ======= INSPECCIONES (Lógica modificada para "sin operación") =======
const checkSinOperacion = document.getElementById('checkSinOperacion');
const fechaInspeccionRutinaria = document.getElementById('fechaInspeccionRutinaria');
const btnAñadirInspeccion = document.getElementById('btnAñadirInspeccion');
const nombreCasa = document.getElementById('nombreCasa');
const numFiliadas = document.getElementById('numFiliadas');
const nacionalidadesFiliadas = document.getElementById('nacionalidadesFiliadas');
const listadoInspecciones = document.getElementById('listadoInspecciones');

// Lógica para el checkbox
checkSinOperacion.addEventListener('change', () => {
    fechaInspeccionRutinaria.disabled = !checkSinOperacion.checked;
    if (checkSinOperacion.checked) {
        fechaInspeccionRutinaria.value = getFechaYYYYMMDD();
        cargarListadoInspecciones(); 
    } else {
        cargarListadoInspecciones();
    }
});


btnAñadirInspeccion.addEventListener('click', async () => {
    const casa = nombreCasa.value.trim();
    const num = parseInt(numFiliadas.value, 10) || 0;
    const nacs = nacionalidadesFiliadas.value.split(',').map(n => n.trim()).filter(n => n);
    const idEntrada = uniqueID(); // ID único para poder borrarlo después del array

    if (!casa) {
        showToast("El nombre de la casa es obligatorio.");
        return;
    }

    if (checkSinOperacion.checked) {
        // Guardar en colección de control (rutinaria)
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return showToast("La fecha es obligatoria para inspecciones sin operación.");
        
        const data = { casa, numFiliadas: num, nacionalidadesFiliadas: nacs, ts: new Date().toISOString(), idEntrada };
        const docRef = db.collection('control_casas_citas').doc(fecha);
        await docRef.set({
            datos: firebase.firestore.FieldValue.arrayUnion(data)
        }, { merge: true });
        
        showToast("Inspección rutinaria añadida.", "success");

    } else {
        // Guardar en la subcolección de la operación actual
        if (!idOperacionActual) return showToast("Guarda la operación antes de añadir una inspección asociada.");
        
        const data = { casa, numFiliadas: num, nacionalidadesFiliadas: nacs, fechaInspeccion: fechaInicio.value, ts: new Date().toISOString() };
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").add(data);
        showToast("Inspección añadida a la operación.", "success");
    }
    
    // Limpiar y recargar
    nombreCasa.value = "";
    numFiliadas.value = "";
    nacionalidadesFiliadas.value = "";
    cargarListadoInspecciones();
});


async function cargarListadoInspecciones() {
    listadoInspecciones.innerHTML = "";

    if (checkSinOperacion.checked) {
        // Cargar desde la colección de control
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return;

        const doc = await db.collection("control_casas_citas").doc(fecha).get();
        if (doc.exists) {
            const inspecciones = doc.data().datos || [];
            inspecciones.forEach(d => {
                const div = document.createElement("div");
                div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
                div.innerHTML = `<span>
                    <b>${d.casa || ""}</b><br>
                    Nº Filiadas: <b>${d.numFiliadas || 0}</b><br>
                    <span class="text-muted">Nacionalidades: ${(d.nacionalidadesFiliadas || []).join(', ') || "N/A"}</span>
                </span>
                <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumentoInspeccion(null, '${d.idEntrada}', '${fecha}')"><i class="bi bi-trash"></i></button>`;
                listadoInspecciones.appendChild(div);
            });
        }
    } else {
        // Cargar desde la operación actual
        if (!idOperacionActual) return;
        const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").orderBy("ts", "desc").get();
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement("div");
            div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
            div.innerHTML = `<span>
                <b>${d.casa || ""}</b> - ${formatoFecha(d.fechaInspeccion)}<br>
                Nº Filiadas: <b>${d.numFiliadas || 0}</b><br>
                <span class="text-muted">Nacionalidades: ${(d.nacionalidadesFiliadas || []).join(', ') || "N/A"}</span>
            </span>
            <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumentoInspeccion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
            listadoInspecciones.appendChild(div);
        });
    }
}


// REQUISITO 1: Lógica de borrado dual para Inspecciones
window.eliminarSubdocumentoInspeccion = async function(docid, idEntrada = null, fechaDoc = null) {
    if (checkSinOperacion.checked && idEntrada && fechaDoc) {
        // Eliminar de inspección rutinaria
        const docRef = db.collection("control_casas_citas").doc(fechaDoc);
        const doc = await docRef.get();
        if (doc.exists) {
            let datos = doc.data().datos || [];
            const datosFiltrados = datos.filter(item => item.idEntrada !== idEntrada);

            if (datosFiltrados.length === 0) {
                // Si el array queda vacío, eliminar el documento completo
                await docRef.delete();
                showToast("Última inspección del día eliminada, junto con el registro diario.", "success");
            } else {
                await docRef.update({ datos: datosFiltrados });
                showToast("Inspección rutinaria eliminada.", "success");
            }
        }
    } else if (docid && idOperacionActual) {
        // Eliminar de una operación
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").doc(docid).delete();
        showToast("Inspección eliminada de la operación.", "success");
    }
    cargarListadoInspecciones();
};


// ======= DETENIDOS (Lógica de escritura DUAL) =======
const btnAñadirDetenido = document.getElementById('btnAñadirDetenido');
const nombreDetenido = document.getElementById('nombreDetenido');
const fechaDetenido = document.getElementById('fechaDetenido');
const delitoDetenido = document.getElementById('delitoDetenido');
const nacionalidadDetenido = document.getElementById('nacionalidadDetenido');
const secuenciaDetenido = document.getElementById('secuenciaDetenido');
const listadoDetenidos = document.getElementById('listadoDetenidos');

// REQUISITO 5: Escritura DUAL para Detenidos
btnAñadirDetenido.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        nombreDetenido: nombreDetenido.value.trim(),
        fechaDetenido: fechaDetenido.value,
        delitoDetenido: delitoDetenido.value.trim(),
        nacionalidadDetenido: nacionalidadDetenido.value.trim(),
        secuenciaDetenido: secuenciaDetenido.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.nombreDetenido || !data.fechaDetenido) return showToast("Nombre y fecha son obligatorios.");

    // 1. Escritura en la subcolección de la operación
    const docRef = await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("detenidos").add(data);
    
    // 2. Escritura en la colección de resumen
    const fechaDocId = data.fechaDetenido; // YYYY-MM-DD
    const resumenRef = db.collection('resumen_detenidos').doc(fechaDocId);
    const resumenData = {
        ...data,
        idOperacion: idOperacionActual,
        nombreOperacion: nombreOperacion.value.trim(),
        idEntrada: docRef.id // ID único para poder borrarlo después
    };
    await resumenRef.set({
        detenciones: firebase.firestore.FieldValue.arrayUnion(resumenData)
    }, { merge: true });

    // Limpiar formulario y recargar lista
    document.getElementById('formDetenidos').reset();
    cargarListadoDetenidos();
});


async function cargarListadoDetenidos() {
    if (!idOperacionActual) return listadoDetenidos.innerHTML = "";
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
        .collection("detenidos").orderBy("fechaDetenido", "desc").get();
    listadoDetenidos.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>
      <b>${d.nombreDetenido || ""}</b> - ${formatoFecha(d.fechaDetenido)}<br>
      Delito: ${d.delitoDetenido || ""} | Nacionalidad: ${d.nacionalidadDetenido || ""} | Ordinal: ${d.secuenciaDetenido || ""}
      </span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarDetenido('${doc.id}', '${d.fechaDetenido}')"><i class="bi bi-trash"></i></button>`;
        listadoDetenidos.appendChild(div);
    });
}

// REQUISITO 5: Lógica de borrado DUAL para Detenidos
window.eliminarDetenido = async (docid, fecha) => {
    if (!idOperacionActual) return;
    // 1. Eliminar de la subcolección
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidos").doc(docid).delete();
    
    // 2. Eliminar de la colección de resumen
    await eliminarDeResumen('resumen_detenidos', fecha, docid);
    
    cargarListadoDetenidos();
};

// Función genérica para eliminar de un array de resumen
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


// ======= FUNCIÓN GENÉRICA PARA BORRAR SUBDOCUMENTOS SIMPLES =======
// (Para secciones que no necesitan lógica dual)
window.eliminarSubdocumento = async (subcoleccion, docid, callback) => {
    if (!idOperacionActual) return;
    await db.collection("grupo2_operaciones").doc(idOperacionActual).collection(subcoleccion).doc(docid).delete();
    if (callback) callback();
};


// ... (Aquí irían el resto de las secciones: Inhibiciones, Histórico, Intervenciones, etc. que usan la lógica simple)
// Por brevedad y para centrarnos en los cambios, las omito, pero en tu fichero final deberían estar.
// Asumimos que existen y que sus botones de borrado llaman a `eliminarSubdocumento(...)`

// ======= LIMPIEZA Y CARGA DE TODOS LOS LISTADOS =======
function limpiarTodosLosListados() {
    const listados = document.querySelectorAll('.listado-dinamico'); //Añade esta clase a todos tus divs de listados
    listados.forEach(listado => listado.innerHTML = "");
    listadoCronologia.innerHTML = ""; // Específico porque está fuera del querySelector
    listadoInspecciones.innerHTML = "";
    listadoDetenidos.innerHTML = "";
    // etc. para todos
}

function cargarTodosLosListados() {
    cargarListadoCronologia(); // REQUISITO DE ORDEN
    cargarListadoJuzgados();
    // cargarListadoInhibiciones();
    cargarListadoInspecciones();
    // cargarListadoHistoricoJuzgados();
    // cargarListadoIntervenciones();
    // cargarListadoSolicitudesJudiciales();
    // cargarListadoColaboraciones();
    cargarListadoDetenidos();
    // cargarListadoDetenidosPrevistos();
    // cargarListadoOtrasPersonas();
    // cargarListadoObservaciones();
    // cargarListadoPendientes();
    // cargarListadoDocumentos();
}

// ======= REQUISITO 6: INFORME AUTOMÁTICO SIN CAMPOS VACÍOS =======
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

    const [juzgados, inhibiciones, historicoJuzgados, intervenciones, solicitudesJudiciales, colaboraciones, cronologia, detenidos, detenidosPrevistos, otrasPersonas, documentos, observaciones, pendientes, inspecciones] = await Promise.all([
        getSubcoleccion("juzgados"),
        getSubcoleccion("inhibiciones", "fecha", "desc"),
        getSubcoleccion("historicoJuzgados", "fecha", "desc"),
        getSubcoleccion("intervenciones"),
        getSubcoleccion("solicitudesJudiciales"),
        getSubcoleccion("colaboraciones", "fechaColaboracion", "desc"),
        getSubcoleccion("cronologia", "fecha", "desc"),
        getSubcoleccion("detenidos", "fechaDetenido", "desc"),
        getSubcoleccion("detenidosPrevistos"),
        getSubcoleccion("otrasPersonas"),
        getSubcoleccion("documentos"),
        getSubcoleccion("observaciones"),
        getSubcoleccion("pendientes", "fechaPendiente", "desc"),
        getSubcoleccion("inspecciones", "fechaInspeccion", "desc")
    ]);

    let html = `
    <div id="informe-operacion" style="font-family: 'Segoe UI', Arial, sans-serif; color:#152045; max-width: 900px; margin:auto; background: #f6f8fb; border-radius:14px; box-shadow:0 2px 28px #143e8a22; padding:32px">
        <div style="display:flex; align-items:center; margin-bottom:18px;">
            <img src="../img/logo_cnp.png" alt="CNP" style="width:52px; height:52px; margin-right:20px;">
            <div>
                <h2 style="margin:0; font-size:2rem; color:#14224b;">Informe de Operación</h2>
                <div style="font-size:1.05rem; color:#29497a;">Benito · UCRIF · Grupo 2</div>
            </div>
        </div>
        <hr>
        <h3 style="color:#182b4d;">Datos Generales</h3>
        <table style="width:100%; margin-bottom:18px; font-size:1.02rem;">
            ${idOperacionActual ? `<tr><th style="text-align:left; width: 25%;">Código:</th><td>${idOperacionActual}</td></tr>` : ''}
            ${op.nombreOperacion ? `<tr><th style="text-align:left;">Nombre:</th><td>${op.nombreOperacion}</td></tr>` : ''}
            ${op.anioOperacion ? `<tr><th style="text-align:left;">Año:</th><td>${op.anioOperacion}</td></tr>` : ''}
            ${op.fechaInicio ? `<tr><th style="text-align:left;">Fecha de Inicio:</th><td>${formatoFecha(op.fechaInicio)}</td></tr>` : ''}
            ${op.tipologiaDelictiva ? `<tr><th style="text-align:left;">Tipología Delictiva:</th><td>${op.tipologiaDelictiva}</td></tr>` : ''}
            ${op.origenInvestigacion ? `<tr><th style="text-align:left;">Origen Investigación:</th><td>${op.origenInvestigacion}</td></tr>` : ''}
            ${op.procedimientosJudiciales ? `<tr><th style="text-align:left;">Proc. Judiciales:</th><td>${op.procedimientosJudiciales}</td></tr>` : ''}
            ${op.descripcionBreve ? `<tr><th style="text-align:left; vertical-align: top;">Resumen:</th><td>${op.descripcionBreve}</td></tr>` : ''}
        </table>
        
        ${op.diligenciasPoliciales ? `
            <h4 style="margin-top:20px;">Diligencias Policiales Relevantes</h4>
            <div style="background:#e9f0fb; border-radius:8px; padding:12px 15px; margin-bottom:14px; border-left:4px solid #29497a;">
                ${op.diligenciasPoliciales}
            </div>` : ''}

        ${cronologia.length > 0 ? `
            <hr><h3 style="color:#39526b;">Cronología</h3>
            <ol>${cronologia.map(e => `<li>${formatoFecha(e.fecha)} - ${e.descripcionCronologia || ""}</li>`).join("")}</ol>` : ''}
        
        ${juzgados.length > 0 ? `
            <hr><h3 style="color:#233f6a;">Juzgados</h3>
            <ul>${juzgados.map(j => `<li><b>${j.juzgado || "-"}</b> (${j.diligencias || "-"})</li>`).join("")}</ul>` : ''}

        ${inhibiciones.length > 0 ? `
            <h4>Inhibiciones</h4>
            <ul>${inhibiciones.map(i => `<li>${formatoFecha(i.fecha)} - ${i.juzgado || "-"}</li>`).join("")}</ul>` : ''}
        
        ${historicoJuzgados.length > 0 ? `
            <h4>Histórico de Juzgados</h4>
            <ul>${historicoJuzgados.map(h => `<li>${formatoFecha(h.fecha)} - <b>${h.juzgadoRelacionado || "-"}</b>: ${h.descripcionEventoJuzgado || "-"}</li>`).join("")}</ul>` : ''}

        ${detenidos.length > 0 || detenidosPrevistos.length > 0 || otrasPersonas.length > 0 ? `<hr><h3 style="color:#253c5e;">Personas Vinculadas</h3>` : ''}
        ${detenidos.length > 0 ? `
            <h4>Detenidos</h4>
            <ul>${detenidos.map(d => `<li><b>${d.nombreDetenido}</b> (${d.nacionalidadDetenido || 'N/A'}) - ${formatoFecha(d.fechaDetenido)}<br><small>Delito: ${d.delitoDetenido || '-'} | Ordinal: ${d.secuenciaDetenido || '-'}</small></li>`).join("")}</ul>` : ''}
        
        ${detenidosPrevistos.length > 0 ? `
            <h4>Detenidos Previstos</h4>
            <ul>${detenidosPrevistos.map(d => `<li><b>${d.nombrePrevisto}</b> (${d.nacionalidadPrevisto || 'N/A'})<br><small>Delito: ${d.delitoPrevisto || '-'}</small></li>`).join("")}</ul>` : ''}

        ${otrasPersonas.length > 0 ? `
            <h4>Otras Personas</h4>
            <ul>${otrasPersonas.map(p => `<li><b>${p.filiacionOtraPersona}</b> (${p.nacionalidadOtraPersona || ''}) - ${p.tipoVinculacion || ''}<br><small>Tel: ${p.telefonoOtraPersona || '-'}</small></li>`).join("")}</ul>` : ''}

        ${inspecciones.length > 0 ? `
            <hr><h3 style="color:#29366e;">Inspecciones en la Operación</h3>
            <ul>${inspecciones.map(it => `<li><b>${it.casa}</b> - Filiadas: ${it.numFiliadas}, Nacionalidades: ${(it.nacionalidadesFiliadas || []).join(', ')}</li>`).join("")}</ul>` : ''}

        ${documentos.length > 0 ? `
            <hr><h3 style="color:#38545e;">Documentación Adjunta</h3>
            <ul>${documentos.map(docu => `<li><a href="${docu.url}" target="_blank">${docu.nombre}</a> (${(docu.size / 1024).toFixed(1)} KB)</li>`).join("")}</ul>` : ''}
        
        ${observaciones.length > 0 ? `
            <hr><h3 style="color:#38715e;">Anotaciones / Observaciones</h3>
            <ul>${observaciones.map(o => `<li>${o.comentariosObservaciones || ""} ${(o.relevanteObservacion ? "<b>[Relevante]</b>" : "")}${(o.confidencialObservacion ? " <b>[Confidencial]</b>" : "")}</li>`).join("")}</ul>` : ''}
        
        ${pendientes.length > 0 ? `
            <hr><h3 style="color:#4f7a4f;">Elementos Pendientes</h3>
            <ul>${pendientes.map(p => `<li>${p.descripcionPendiente || ""} (${formatoFecha(p.fechaPendiente)})</li>`).join("")}</ul>` : ''}
        
        <hr>
        <div style="font-size:.9rem; color:#456; text-align:center; margin-top: 20px;">Informe generado automáticamente por Benito · UCRIF · ${formatoFecha(new Date())}</div>
    </div>
    <div style="text-align:center; margin:18px 0;">
        <button onclick="window.print()" style="font-size:1.1rem; background:#ffd94a; color:#152045; border:none; border-radius:7px; padding:8px 22px; font-weight:bold; cursor:pointer;">Imprimir o Guardar PDF</button>
    </div>
    `;

    let win = window.open("", "informe-operacion", "width=1100,height=900,scrollbars=yes");
    win.document.write(`<html><head><title>Informe de Operación - ${op.nombreOperacion || idOperacionActual}</title><style>body{background:#eef4f9} @media print{body{background:#fff !important} #informe-operacion{box-shadow:none !important}} table, th, td{border: 1px solid #ddd; border-collapse: collapse;} th, td {padding: 8px;}</style></head><body>${html}</body></html>`);
    win.document.close();
});


// ======= REQUISITO 3: FUNCIÓN GLOBAL PARA RESÚMENES SEMANALES =======
window.generarResumenSemanal = async function(fechaInicio, fechaFin) {
    console.log(`Generando resumen global de ${fechaInicio} a ${fechaFin}`);
    const resultado = {
        inspecciones: [],
        detenidos: []
    };

    try {
        // 1. Obtener Inspecciones de Operaciones
        const inspeccionesOpSnap = await db.collectionGroup('inspecciones')
            .where('fechaInspeccion', '>=', fechaInicio)
            .where('fechaInspeccion', '<=', fechaFin)
            .get();
        inspeccionesOpSnap.forEach(doc => {
            const data = doc.data();
            const opId = doc.ref.parent.parent.id; // Navegar hasta el ID de la operación
            resultado.inspecciones.push({ ...data, tipo: 'Operación', idOperacion: opId });
        });

        // 2. Obtener Inspecciones Rutinarias
        const inspeccionesRutinariasSnap = await db.collection('control_casas_citas')
            .where(firebase.firestore.FieldPath.documentId(), '>=', fechaInicio)
            .where(firebase.firestore.FieldPath.documentId(), '<=', fechaFin)
            .get();
        inspeccionesRutinariasSnap.forEach(doc => {
            const datosDiarios = doc.data().datos || [];
            datosDiarios.forEach(insp => {
                resultado.inspecciones.push({ ...insp, tipo: 'Rutinaria', fechaInspeccion: doc.id });
            });
        });

        // 3. Obtener Detenidos (de operaciones)
        const detenidosSnap = await db.collectionGroup('detenidos')
            .where('fechaDetenido', '>=', fechaInicio)
            .where('fechaDetenido', '<=', fechaFin)
            .get();
        detenidosSnap.forEach(doc => {
            const data = doc.data();
            const opId = doc.ref.parent.parent.id;
             resultado.detenidos.push({ ...data, idOperacion: opId });
        });

        console.log("Resumen generado:", resultado);
        return resultado;

    } catch (error) {
        console.error("Error generando el resumen semanal:", error);
        showToast("Error al generar el resumen. Revisa la consola para más detalles.", "error");
        return null;
    }
};

// ========== AUTOINICIALIZACIÓN ==========
window.addEventListener('DOMContentLoaded', () => {
    anioOperacion.value = new Date().getFullYear();
    fechaInicio.value = getFechaYYYYMMDD();
    cargarOperacionesEnSelect();
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    if(btnEliminarOperacion) btnEliminarOperacion.classList.add('d-none');
    
    // Configuración inicial del formulario de inspecciones
    if(checkSinOperacion) {
        checkSinOperacion.checked = false;
        fechaInspeccionRutinaria.disabled = true;
    }

    limpiarTodosLosListados();
});
