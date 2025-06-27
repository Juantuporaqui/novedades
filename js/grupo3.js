// ======= INICIALIZACIÓN FIREBASE (ajusta si cambias de proyecto) =======
// NOTA: Estas credenciales son visibles públicamente. Asegúrate de configurar las reglas de seguridad de Firestore
// para permitir el acceso solo a usuarios autenticados si esta aplicación maneja datos sensibles.
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
function showToast(msg, tipo = "info") {
    // Se reemplaza el alert() por una notificación más moderna si se desea en el futuro.
    // Por ahora, alert() es funcional para depuración.
    console.log(`[${tipo.toUpperCase()}] ${msg}`);
    alert(msg);
}

function limpiarFormulario(form) {
    if (form) form.reset();
}

function formatoFecha(fecha) {
    if (!fecha) return "N/A";
    // El objeto Date puede interpretar mal las fechas en formato 'YYYY-MM-DD'.
    // Añadir 'T00:00:00' ayuda a asegurar que se interprete en la zona horaria local.
    const f = new Date(fecha + 'T00:00:00');
    return `${f.getDate().toString().padStart(2, "0")}/${(f.getMonth() + 1).toString().padStart(2, "0")}/${f.getFullYear()}`;
}

// ======= REFERENCIAS DOM (Elementos Principales) =======
const operacionSelect = document.getElementById('operacionSelect');
const btnCargarOperacion = document.getElementById('btnCargarOperacion');
const btnNuevaOperacion = document.getElementById('btnNuevaOperacion');
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
let idOperacionActual = null; // Almacena el código operativo (ID del documento)

// ======= 1. BÚSQUEDA Y CARGA DE OPERACIONES EXISTENTES =======
async function cargarOperacionesEnSelect() {
    operacionSelect.innerHTML = `<option value="">-- Selecciona una operación --</option>`;
    try {
        const snapshot = await db.collection("grupo3_operaciones").orderBy("nombreOperacion").get();
        snapshot.forEach(doc => {
            const datos = doc.data();
            operacionSelect.innerHTML += `<option value="${doc.id}">${datos.nombreOperacion} (${doc.id})</option>`;
        });
    } catch (error) {
        console.error("Error al cargar operaciones: ", error);
        showToast("No se pudieron cargar las operaciones existentes.", "error");
    }
}

// ======= 2. NUEVA OPERACIÓN =======
btnNuevaOperacion.addEventListener('click', () => {
    formOperacion.reset();
    operacionActual = null;
    idOperacionActual = null;
    codigoOperacion.value = "";
    anioOperacion.value = new Date().getFullYear();
    fechaInicio.value = new Date().toISOString().slice(0, 10);
    limpiarTodosLosListados();
    setTimeout(() => {
        codigoOperacion.focus()
    }, 150);
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    operacionSelect.value = ""; // Desseleccionar el dropdown
});

// ======= 3. CARGAR UNA OPERACIÓN POR NOMBRE =======
btnCargarOperacion.addEventListener('click', async () => {
    const codigo = operacionSelect.value;
    if (!codigo) return showToast("Por favor, selecciona una operación para cargar.");

    try {
        const doc = await db.collection("grupo3_operaciones").doc(codigo).get();
        if (!doc.exists) return showToast("Error: No se encontró la operación seleccionada.", "error");

        operacionActual = doc.data();
        idOperacionActual = codigo;

        // Rellenar formulario principal
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
        cargarTodosLosListados(); // Cargar datos de todas las subcolecciones
        showToast(`Operación "${operacionActual.nombreOperacion}" cargada.`, "success");

    } catch (error) {
        console.error("Error al cargar la operación: ", error);
        showToast("Ocurrió un error al cargar la operación.", "error");
    }
});

// ======= 4. VALIDAR UNICIDAD DE CÓDIGO OPERATIVO =======
codigoOperacion.addEventListener('blur', async () => {
    const code = codigoOperacion.value.trim();
    if (!code) {
        codigoWarning.classList.add("d-none");
        btnGuardarOperacion.disabled = false;
        return;
    }
    // Solo valida si es una operación nueva o si el código ha cambiado en una existente
    if (code !== idOperacionActual) {
        const doc = await db.collection("grupo3_operaciones").doc(code).get();
        if (doc.exists) {
            codigoWarning.classList.remove("d-none");
            btnGuardarOperacion.disabled = true;
        } else {
            codigoWarning.classList.add("d-none");
            btnGuardarOperacion.disabled = false;
        }
    }
});

// ======= 5. GUARDAR/ACTUALIZAR OPERACIÓN PRINCIPAL =======
formOperacion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codigoOperacion.value.trim();
    if (!code) return showToast("El Código Operativo es obligatorio.", "error");

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

    try {
        await db.collection("grupo3_operaciones").doc(code).set(datos, {
            merge: true
        });
        showToast("Operación guardada correctamente.", "success");
        operacionActual = datos;
        idOperacionActual = code;
        cargarOperacionesEnSelect(); // Refrescar la lista de operaciones
        operacionSelect.value = code; // Mantener la operación actual seleccionada
        btnGuardarOperacion.disabled = false;
        codigoWarning.classList.add("d-none");
    } catch (error) {
        console.error("Error al guardar la operación: ", error);
        showToast("No se pudo guardar la operación.", "error");
    }
});


// ======= GESTIÓN DE SUBCOLECCIONES (Juzgados, Intervenciones, etc.) =======

// --- JUZGADOS ---
const btnAñadirJuzgado = document.getElementById('btnAñadirJuzgado');
const juzgadoInicial = document.getElementById('juzgadoInicial');
const diligenciasPreviasJuzgado = document.getElementById('diligenciasPreviasJuzgado');
const listadoJuzgados = document.getElementById('listadoJuzgados');

btnAñadirJuzgado.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Debes guardar la operación principal antes de añadir detalles.");
    const data = {
        juzgado: juzgadoInicial.value.trim(),
        diligencias: diligenciasPreviasJuzgado.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.juzgado && !data.diligencias) return showToast("Completa al menos un campo para añadir el juzgado.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("juzgados").add(data);
    juzgadoInicial.value = "";
    diligenciasPreviasJuzgado.value = "";
    cargarListadoJuzgados();
});

async function cargarListadoJuzgados() {
    if (!idOperacionActual) return listadoJuzgados.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("juzgados").orderBy("ts", "desc").get();
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

// --- INHIBICIONES ---
const btnAñadirInhibicion = document.getElementById('btnAñadirInhibicion');
const juzgadoInhibido = document.getElementById('juzgadoInhibido');
const fechaInhibicion = document.getElementById('fechaInhibicion');
const listadoInhibiciones = document.getElementById('listadoInhibiciones');

btnAñadirInhibicion.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        juzgado: juzgadoInhibido.value.trim(),
        fecha: fechaInhibicion.value,
        ts: new Date().toISOString()
    };
    if (!data.juzgado || !data.fecha) return showToast("Completa todos los campos.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("inhibiciones").add(data);
    juzgadoInhibido.value = "";
    fechaInhibicion.value = "";
    cargarListadoInhibiciones();
});

async function cargarListadoInhibiciones() {
    if (!idOperacionActual) return listadoInhibiciones.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("inhibiciones").orderBy("fecha", "desc").get();
    listadoInhibiciones.innerHTML = "";
    snap.forEach(doc => {
        const j = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${j.juzgado}</b> (${formatoFecha(j.fecha)})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('inhibiciones', '${doc.id}', cargarListadoInhibiciones)"><i class="bi bi-trash"></i></button>`;
        listadoInhibiciones.appendChild(div);
    });
}

// --- HISTÓRICO DE JUZGADOS ---
const btnAñadirHistoricoJuzgado = document.getElementById('btnAñadirHistoricoJuzgado');
const fechaHistoricoJuzgado = document.getElementById('fechaHistoricoJuzgado');
const juzgadoRelacionado = document.getElementById('juzgadoRelacionado');
const descripcionEventoJuzgado = document.getElementById('descripcionEventoJuzgado');
const listadoHistoricoJuzgados = document.getElementById('listadoHistoricoJuzgados');

btnAñadirHistoricoJuzgado.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        fecha: fechaHistoricoJuzgado.value,
        juzgadoRelacionado: juzgadoRelacionado.value.trim(),
        descripcionEventoJuzgado: descripcionEventoJuzgado.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.fecha || !data.descripcionEventoJuzgado) return showToast("La fecha y la descripción son obligatorias.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("historicoJuzgados").add(data);
    fechaHistoricoJuzgado.value = "";
    juzgadoRelacionado.value = "";
    descripcionEventoJuzgado.value = "";
    cargarListadoHistoricoJuzgados();
});

async function cargarListadoHistoricoJuzgados() {
    if (!idOperacionActual) return listadoHistoricoJuzgados.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("historicoJuzgados").orderBy("fecha", "desc").get();
    listadoHistoricoJuzgados.innerHTML = "";
    snap.forEach(doc => {
        const h = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${formatoFecha(h.fecha)}</b> - ${h.juzgadoRelacionado}: ${h.descripcionEventoJuzgado}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('historicoJuzgados', '${doc.id}', cargarListadoHistoricoJuzgados)"><i class="bi bi-trash"></i></button>`;
        listadoHistoricoJuzgados.appendChild(div);
    });
}

// --- INTERVENCIONES / MEDIDAS ---
const btnAñadirIntervencion = document.getElementById('btnAñadirIntervencion');
const intervencionTelefonica = document.getElementById('intervencionTelefonica');
const entradaRegistro = document.getElementById('entradaRegistro');
const listadoIntervenciones = document.getElementById('listadoIntervenciones');

btnAñadirIntervencion.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        intervencionTelefonica: intervencionTelefonica.value.trim(),
        entradaRegistro: entradaRegistro.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.intervencionTelefonica && !data.entradaRegistro) return showToast("Completa al menos un campo.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("intervenciones").add(data);
    intervencionTelefonica.value = "";
    entradaRegistro.value = "";
    cargarListadoIntervenciones();
});

async function cargarListadoIntervenciones() {
    if (!idOperacionActual) return listadoIntervenciones.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("intervenciones").orderBy("ts", "desc").get();
    listadoIntervenciones.innerHTML = "";
    snap.forEach(doc => {
        const i = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${i.intervencionTelefonica || ""} / ${i.entradaRegistro || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('intervenciones', '${doc.id}', cargarListadoIntervenciones)"><i class="bi bi-trash"></i></button>`;
        listadoIntervenciones.appendChild(div);
    });
}

// --- SOLICITUDES JUDICIALES ---
const btnAñadirSolicitudJudicial = document.getElementById('btnAñadirSolicitudJudicial');
const solicitudJudicial = document.getElementById('solicitudJudicial');
const descripcionSolicitudJudicial = document.getElementById('descripcionSolicitudJudicial');
const listadoSolicitudesJudiciales = document.getElementById('listadoSolicitudesJudiciales');

btnAñadirSolicitudJudicial.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        solicitudJudicial: solicitudJudicial.value.trim(),
        descripcionSolicitudJudicial: descripcionSolicitudJudicial.value.trim(),
        ts: new Date().toISOString()
    };
    if (!data.solicitudJudicial) return showToast("El tipo de solicitud es obligatorio.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("solicitudesJudiciales").add(data);
    solicitudJudicial.value = "";
    descripcionSolicitudJudicial.value = "";
    cargarListadoSolicitudesJudiciales();
});

async function cargarListadoSolicitudesJudiciales() {
    if (!idOperacionActual) return listadoSolicitudesJudiciales.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("solicitudesJudiciales").orderBy("ts", "desc").get();
    listadoSolicitudesJudiciales.innerHTML = "";
    snap.forEach(doc => {
        const s = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${s.solicitudJudicial || ""}</b> - ${s.descripcionSolicitudJudicial || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('solicitudesJudiciales', '${doc.id}', cargarListadoSolicitudesJudiciales)"><i class="bi bi-trash"></i></button>`;
        listadoSolicitudesJudiciales.appendChild(div);
    });
}
// ======= DETENIDOS =======
const btnAñadirDetenido = document.getElementById('btnAñadirDetenido');
const nombreDetenido = document.getElementById('nombreDetenido');
const fechaDetenido = document.getElementById('fechaDetenido');
const delitoDetenido = document.getElementById('delitoDetenido');
const nacionalidadDetenido = document.getElementById('nacionalidadDetenido');
const secuenciaDetenido = document.getElementById('secuenciaDetenido');
const listadoDetenidos = document.getElementById('listadoDetenidos');

btnAñadirDetenido.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    nombreDetenido: nombreDetenido.value.trim(),
    fechaDetenido: fechaDetenido.value,
    delitoDetenido: delitoDetenido.value.trim(),
    nacionalidadDetenido: nacionalidadDetenido.value.trim(),
    secuenciaDetenido: secuenciaDetenido.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.nombreDetenido && !data.fechaDetenido && !data.delitoDetenido && !data.nacionalidadDetenido && !data.secuenciaDetenido) return showToast("Completa los campos.");
  await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("detenidos").add(data);
  nombreDetenido.value = "";
  fechaDetenido.value = "";
  delitoDetenido.value = "";
  nacionalidadDetenido.value = "";
  secuenciaDetenido.value = "";
  cargarListadoDetenidos();
});
async function cargarListadoDetenidos() {
  if(!idOperacionActual) return listadoDetenidos.innerHTML="";
  const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("detenidos").orderBy("ts","desc").get();
  listadoDetenidos.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>
      <b>${d.nombreDetenido||""}</b> - ${formatoFecha(d.fechaDetenido)}<br>
      Delito: ${d.delitoDetenido||""} | Nacionalidad: ${d.nacionalidadDetenido||""} | Ordinal: ${d.secuenciaDetenido||""}
      </span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarDetenido('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoDetenidos.appendChild(div);
  });
}
window.eliminarDetenido = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("detenidos").doc(docid).delete();
  cargarListadoDetenidos();
};

// ======= DETENIDOS PREVISTOS =======
const btnAñadirPrevisto = document.getElementById('btnAñadirPrevisto');
const nombrePrevisto = document.getElementById('nombrePrevisto');
const nacionalidadPrevisto = document.getElementById('nacionalidadPrevisto');
const delitoPrevisto = document.getElementById('delitoPrevisto');
const listadoDetenidosPrevistos = document.getElementById('listadoDetenidosPrevistos');

btnAñadirPrevisto.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    nombrePrevisto: nombrePrevisto.value.trim(),
    nacionalidadPrevisto: nacionalidadPrevisto.value.trim(),
    delitoPrevisto: delitoPrevisto.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.nombrePrevisto && !data.nacionalidadPrevisto && !data.delitoPrevisto) return showToast("Completa los campos.");
  await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("detenidosPrevistos").add(data);
  nombrePrevisto.value = "";
  nacionalidadPrevisto.value = "";
  delitoPrevisto.value = "";
  cargarListadoDetenidosPrevistos();
});
async function cargarListadoDetenidosPrevistos() {
  if(!idOperacionActual) return listadoDetenidosPrevistos.innerHTML="";
  const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("detenidosPrevistos").orderBy("ts","desc").get();
  listadoDetenidosPrevistos.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>
      <b>${d.nombrePrevisto||""}</b> | Nacionalidad: ${d.nacionalidadPrevisto||""} | Delito: ${d.delitoPrevisto||""}
      </span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarPrevisto('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoDetenidosPrevistos.appendChild(div);
  });
}
window.eliminarPrevisto = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("detenidosPrevistos").doc(docid).delete();
  cargarListadoDetenidosPrevistos();
};

// --- COLABORACIONES ---
const btnAñadirColaboracion = document.getElementById('btnAñadirColaboracion');
const grupoColaboracion = document.getElementById('grupoColaboracion');
const tipoColaboracion = document.getElementById('tipoColaboracion');
const fechaColaboracion = document.getElementById('fechaColaboracion');
const listadoColaboraciones = document.getElementById('listadoColaboraciones');

btnAñadirColaboracion.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        grupoColaboracion: grupoColaboracion.value.trim(),
        tipoColaboracion: tipoColaboracion.value.trim(),
        fechaColaboracion: fechaColaboracion.value,
        ts: new Date().toISOString()
    };
    if (!data.grupoColaboracion || !data.fechaColaboracion) return showToast("La fecha y el grupo/institución son obligatorios.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("colaboraciones").add(data);
    grupoColaboracion.value = "";
    tipoColaboracion.value = "";
    fechaColaboracion.value = "";
    cargarListadoColaboraciones();
});

async function cargarListadoColaboraciones() {
    if (!idOperacionActual) return listadoColaboraciones.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("colaboraciones").orderBy("fechaColaboracion", "desc").get();
    listadoColaboraciones.innerHTML = "";
    snap.forEach(doc => {
        const c = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${formatoFecha(c.fechaColaboracion)} - <b>${c.grupoColaboracion || ""}</b>: ${c.tipoColaboracion || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('colaboraciones', '${doc.id}', cargarListadoColaboraciones)"><i class="bi bi-trash"></i></button>`;
        listadoColaboraciones.appendChild(div);
    });
}

// --- CRONOLOGÍA ---
const btnAñadirEventoCronologia = document.getElementById('btnAñadirEventoCronologia');
const descripcionCronologia = document.getElementById('descripcionCronologia');
const fechaCronologia = document.getElementById('fechaCronologia');
const listadoCronologia = document.getElementById('listadoCronologia');

btnAñadirEventoCronologia.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        descripcionCronologia: descripcionCronologia.value.trim(),
        fecha: fechaCronologia.value,
        ts: new Date().toISOString()
    };
    if (!data.descripcionCronologia || !data.fecha) return showToast("La fecha y la descripción son obligatorias.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("cronologia").add(data);
    descripcionCronologia.value = "";
    fechaCronologia.value = "";
    cargarListadoCronologia();
});

async function cargarListadoCronologia() {
    if (!idOperacionActual) return listadoCronologia.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("cronologia").orderBy("fecha", "desc").get();
    listadoCronologia.innerHTML = "";
    snap.forEach(doc => {
        const c = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${formatoFecha(c.fecha)}</b> - ${c.descripcionCronologia || ""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('cronologia', '${doc.id}', cargarListadoCronologia)"><i class="bi bi-trash"></i></button>`;
        listadoCronologia.appendChild(div);
    });
}

// ======= OTRAS PERSONAS =======
const btnAñadirOtraPersona = document.getElementById('btnAñadirOtraPersona');
const filiacionOtraPersona = document.getElementById('filiacionOtraPersona');
const tipoVinculacion = document.getElementById('tipoVinculacion');
const nacionalidadOtraPersona = document.getElementById('nacionalidadOtraPersona');
const telefonoOtraPersona = document.getElementById('telefonoOtraPersona');
const listadoOtrasPersonas = document.getElementById('listadoOtrasPersonas');

btnAñadirOtraPersona.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    filiacionOtraPersona: filiacionOtraPersona.value.trim(),
    tipoVinculacion: tipoVinculacion.value.trim(),
    nacionalidadOtraPersona: nacionalidadOtraPersona.value.trim(),
    telefonoOtraPersona: telefonoOtraPersona.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.filiacionOtraPersona && !data.tipoVinculacion && !data.nacionalidadOtraPersona && !data.telefonoOtraPersona) return showToast("Completa los campos.");
  await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("otrasPersonas").add(data);
  filiacionOtraPersona.value = "";
  tipoVinculacion.value = "";
  nacionalidadOtraPersona.value = "";
  telefonoOtraPersona.value = "";
  cargarListadoOtrasPersonas();
});
async function cargarListadoOtrasPersonas() {
  if(!idOperacionActual) return listadoOtrasPersonas.innerHTML="";
  const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual)
    .collection("otrasPersonas").orderBy("ts","desc").get();
  listadoOtrasPersonas.innerHTML = "";
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${p.filiacionOtraPersona||""} / ${p.tipoVinculacion||""} (${p.nacionalidadOtraPersona||""}) Tel: ${p.telefonoOtraPersona||""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarOtraPersona('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoOtrasPersonas.appendChild(div);
  });
}
window.eliminarOtraPersona = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("otrasPersonas").doc(docid).delete();
  cargarListadoOtrasPersonas();
};

// --- INSPECCIONES EN CASAS DE CITAS ---
const btnAñadirInspeccion = document.getElementById('btnAñadirInspeccion');
const nombreCasa = document.getElementById('nombreCasa');
const fechaInspeccion = document.getElementById('fechaInspeccion');
const numFiliadas = document.getElementById('numFiliadas');
const nacionalidadesFiliadas = document.getElementById('nacionalidadesFiliadas');
const listadoInspecciones = document.getElementById('listadoInspecciones');

btnAñadirInspeccion.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const casa = nombreCasa.value.trim();
    const fecha = fechaInspeccion.value;
    const num = parseInt(numFiliadas.value, 10) || 0;
    const nacs = nacionalidadesFiliadas.value.split(',').map(n => n.trim()).filter(n => n);

    if (!casa || !fecha) {
        return showToast("El nombre de la casa y la fecha son obligatorios.");
    }
    const data = {
        casa,
        fechaInspeccion: fecha,
        numFiliadas: num,
        nacionalidadesFiliadas: nacs,
        ts: new Date().toISOString()
    };
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("inspecciones").add(data);
    nombreCasa.value = "";
    fechaInspeccion.value = "";
    numFiliadas.value = "";
    nacionalidadesFiliadas.value = "";
    cargarListadoInspecciones();
});

async function cargarListadoInspecciones() {
    if (!idOperacionActual) return listadoInspecciones.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("inspecciones").orderBy("fechaInspeccion", "desc").get();
    listadoInspecciones.innerHTML = "";
    snap.forEach(doc => {
        const i = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><b>${i.casa}</b> (${formatoFecha(i.fechaInspeccion)}) - ${i.numFiliadas} filiadas [${i.nacionalidadesFiliadas.join(", ")}]</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('inspecciones', '${doc.id}', cargarListadoInspecciones)"><i class="bi bi-trash"></i></button>`;
        listadoInspecciones.appendChild(div);
    });
}


// --- DOCUMENTACIÓN (ADJUNTOS) ---
const btnAñadirDocumento = document.getElementById('btnAñadirDocumento');
const adjuntosDoc = document.getElementById('adjuntosDoc');
const listadoDocumentos = document.getElementById('listadoDocumentos');

btnAñadirDocumento.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes de subir archivos.");
    const files = adjuntosDoc.files;
    if (!files.length) return showToast("Selecciona al menos un archivo para subir.");

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) { // Límite de 10MB
            showToast(`El archivo ${file.name} excede el límite de 10MB y no será subido.`, "error");
            continue;
        }
        const ref = storage.ref().child(`grupo3/${idOperacionActual}/${Date.now()}_${file.name}`);
        try {
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("documentos").add({
                nombre: file.name,
                url,
                ts: new Date().toISOString(),
                size: file.size,
                path: ref.fullPath // Guardar la ruta para facilitar el borrado
            });
        } catch (error) {
            console.error("Error subiendo archivo: ", error);
            showToast(`No se pudo subir el archivo ${file.name}.`, "error");
        }
    }
    adjuntosDoc.value = ""; // Limpiar el input de archivos
    cargarListadoDocumentos();
});

async function cargarListadoDocumentos() {
    if (!idOperacionActual) return listadoDocumentos.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("documentos").orderBy("ts", "desc").get();
    listadoDocumentos.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span><a href="${d.url}" target="_blank" rel="noopener noreferrer">${d.nombre}</a> (${(d.size / 1024).toFixed(1)} KB)</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarDocumento('${doc.id}', '${d.path}')"><i class="bi bi-trash"></i></button>`;
        listadoDocumentos.appendChild(div);
    });
}

window.eliminarDocumento = async (docid, path) => {
    if (!idOperacionActual || !confirm("¿Seguro que quieres eliminar este documento? Esta acción no se puede deshacer.")) return;
    try {
        // Borrar el archivo de Storage
        if (path) {
            await storage.ref(path).delete();
        }
        // Borrar la referencia de Firestore
        await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("documentos").doc(docid).delete();
        showToast("Documento eliminado.", "success");
        cargarListadoDocumentos();
    } catch (error) {
        console.error("Error al eliminar el documento: ", error);
        showToast("No se pudo eliminar el documento. Es posible que el archivo ya no exista en el almacenamiento, pero se eliminará la referencia.", "error");
        // Intenta borrar el documento de Firestore incluso si falla el borrado de storage
        await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("documentos").doc(docid).delete();
        cargarListadoDocumentos();
    }
};


// --- OBSERVACIONES ---
const btnAñadirObservacion = document.getElementById('btnAñadirObservacion');
const comentariosObservaciones = document.getElementById('comentariosObservaciones');
const relevanteObservacion = document.getElementById('relevanteObservacion');
const confidencialObservacion = document.getElementById('confidencialObservacion');
const listadoObservaciones = document.getElementById('listadoObservaciones');

btnAñadirObservacion.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        comentariosObservaciones: comentariosObservaciones.value.trim(),
        relevanteObservacion: relevanteObservacion.checked,
        confidencialObservacion: confidencialObservacion.checked,
        ts: new Date().toISOString()
    };
    if (!data.comentariosObservaciones) return showToast("Escribe un comentario.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("observaciones").add(data);
    comentariosObservaciones.value = "";
    relevanteObservacion.checked = false;
    confidencialObservacion.checked = false;
    cargarListadoObservaciones();
});

async function cargarListadoObservaciones() {
    if (!idOperacionActual) return listadoObservaciones.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("observaciones").orderBy("ts", "desc").get();
    listadoObservaciones.innerHTML = "";
    snap.forEach(doc => {
        const o = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${o.comentariosObservaciones || ""} ${(o.relevanteObservacion ? "<b>[Relevante]</b>" : "")}${(o.confidencialObservacion ? " <b>[Confidencial]</b>" : "")}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('observaciones', '${doc.id}', cargarListadoObservaciones)"><i class="bi bi-trash"></i></button>`;
        listadoObservaciones.appendChild(div);
    });
}

// --- PENDIENTES ---
const btnAñadirPendiente = document.getElementById('btnAñadirPendiente');
const descripcionPendiente = document.getElementById('descripcionPendiente');
const fechaPendiente = document.getElementById('fechaPendiente');
const listadoPendientes = document.getElementById('listadoPendientes');

btnAñadirPendiente.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes.");
    const data = {
        descripcionPendiente: descripcionPendiente.value.trim(),
        fechaPendiente: fechaPendiente.value,
        ts: new Date().toISOString()
    };
    if (!data.descripcionPendiente) return showToast("La descripción es obligatoria.");
    await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("pendientes").add(data);
    descripcionPendiente.value = "";
    fechaPendiente.value = "";
    cargarListadoPendientes();
});

async function cargarListadoPendientes() {
    if (!idOperacionActual) return listadoPendientes.innerHTML = "";
    const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection("pendientes").orderBy("ts", "desc").get();
    listadoPendientes.innerHTML = "";
    snap.forEach(doc => {
        const p = doc.data();
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${p.descripcionPendiente || ""} (${formatoFecha(p.fechaPendiente)})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumento('pendientes', '${doc.id}', cargarListadoPendientes)"><i class="bi bi-trash"></i></button>`;
        listadoPendientes.appendChild(div);
    });
}


// ======= FUNCIONES GLOBALES DE GESTIÓN =======

// CORRECCIÓN: Función genérica para eliminar subdocumentos y evitar repetir código.
window.eliminarSubdocumento = async (subcoleccion, docid, callback) => {
    if (!idOperacionActual || !confirm("¿Seguro que quieres eliminar este elemento?")) return;
    try {
        await db.collection("grupo3_operaciones").doc(idOperacionActual).collection(subcoleccion).doc(docid).delete();
        if (callback) callback();
    } catch (error) {
        console.error(`Error al eliminar en ${subcoleccion}:`, error);
        showToast("No se pudo eliminar el elemento.", "error");
    }
};

// CORRECCIÓN: Se define UNA SOLA VEZ la función para limpiar todos los listados.
function limpiarTodosLosListados() {
    listadoJuzgados.innerHTML = "";
    listadoInhibiciones.innerHTML = "";
    listadoHistoricoJuzgados.innerHTML = "";
    listadoIntervenciones.innerHTML = "";
    listadoSolicitudesJudiciales.innerHTML = "";
    listadoColaboraciones.innerHTML = "";
    listadoDetenidos.innerHTML = "";
    listadoCronologia.innerHTML = "";
    listadoObservaciones.innerHTML = "";
    listadoPendientes.innerHTML = "";
    listadoDocumentos.innerHTML = "";
    listadoInspecciones.innerHTML = "";
}

// CORRECCIÓN: Se define UNA SOLA VEZ la función para cargar todos los listados.
function cargarTodosLosListados() {
    cargarListadoJuzgados();
    cargarListadoInhibiciones();
    cargarListadoHistoricoJuzgados();
    cargarListadoIntervenciones();
    cargarListadoSolicitudesJudiciales();
    cargarListadoColaboraciones();
    cargarListadoDetenidos();
    cargarListadoCronologia();
    cargarListadoObservaciones();
    cargarListadoPendientes();
    cargarListadoDocumentos();
    cargarListadoInspecciones();
}

// ======= FUNCIONES ADICIONALES (Informes, etc.) =======

document.getElementById('btnGenerarInforme').addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Carga una operación para poder generar un informe.");

    try {
        const doc = await db.collection("grupo3_operaciones").doc(idOperacionActual).get();
        if (!doc.exists) return showToast("No se encontró la operación para generar el informe.", "error");
        const op = doc.data();

        // Función auxiliar para obtener datos de subcolecciones
        async function getSubcoleccion(nombre) {
            const snap = await db.collection("grupo3_operaciones").doc(idOperacionActual).collection(nombre).get();
            let arr = [];
            snap.forEach(d => arr.push(d.data()));
            return arr;
        }

        // Cargar todos los datos en paralelo
        const [juzgados, inhibiciones, historicoJuzgados, intervenciones, solicitudesJudiciales, colaboraciones, cronologia, detenidos, inspecciones, documentos, observaciones, pendientes] = await Promise.all([
            getSubcoleccion("juzgados"),
            getSubcoleccion("inhibiciones"),
            getSubcoleccion("historicoJuzgados"),
            getSubcoleccion("intervenciones"),
            getSubcoleccion("solicitudesJudiciales"),
            getSubcoleccion("colaboraciones"),
            getSubcoleccion("cronologia"),
            getSubcoleccion("detenidos"),
            getSubcoleccion("inspecciones"),
            getSubcoleccion("documentos"),
            getSubcoleccion("observaciones"),
            getSubcoleccion("pendientes")
        ]);

        // CORRECCIÓN: Se cambia "Grupo 2" por "Grupo 3" para que coincida con el título.
        let html = `
      <div id="informe-para-pdf" style="font-family: Arial, sans-serif; color:#333; max-width: 900px; margin:auto; padding:20px;">
        <div style="display:flex; align-items:center; margin-bottom:20px; border-bottom: 2px solid #005c9e; padding-bottom: 15px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Emblema_del_Cuerpo_Nacional_de_Polic%C3%ADa_de_Espa%C3%B1a.svg/1200px-Emblema_del_Cuerpo_Nacional_de_Polic%C3%ADa_de_Espa%C3%B1a.svg.png" alt="CNP" style="width:60px; height:60px; margin-right:20px;">
          <div>
            <h2 style="margin:0; font-size:24px; color:#005c9e;">Informe de Operación de Investigación</h2>
            <div style="font-size:16px; color:#555;">Benito · UCRIF · Grupo 3</div>
          </div>
        </div>

        <h3 style="color:#005c9e; border-bottom:1px solid #ccc; padding-bottom:5px;">Datos Generales</h3>
        <table style="width:100%; margin-bottom:18px; font-size:14px; border-collapse: collapse;">
          <tr><td style="font-weight:bold; width:25%; padding:4px;">Código:</td><td style="padding:4px;">${idOperacionActual}</td>
              <td style="font-weight:bold; width:25%; padding:4px;">Año:</td><td style="padding:4px;">${op.anioOperacion || ""}</td></tr>
          <tr><td style="font-weight:bold; padding:4px;">Nombre:</td><td colspan="3" style="padding:4px;">${op.nombreOperacion || ""}</td></tr>
          <tr><td style="font-weight:bold; padding:4px;">Fecha de Inicio:</td><td style="padding:4px;">${formatoFecha(op.fechaInicio) || ""}</td>
              <td style="font-weight:bold; padding:4px;">Delito Principal:</td><td style="padding:4px;">${op.tipologiaDelictiva || ""}</td></tr>
          <tr><td style="font-weight:bold; padding:4px;">Origen:</td><td colspan="3" style="padding:4px;">${op.origenInvestigacion || ""}</td></tr>
          <tr><td style="font-weight:bold; padding:4px;">Proc. Judiciales:</td><td colspan="3" style="padding:4px;">${op.procedimientosJudiciales || ""}</td></tr>
          <tr><td style="font-weight:bold; vertical-align:top; padding:4px;">Resumen:</td><td colspan="3" style="padding:4px;">${op.descripcionBreve.replace(/\n/g, '<br>') || "<em>Sin datos</em>"}</td></tr>
          <tr><td style="font-weight:bold; vertical-align:top; padding:4px;">Diligencias:</td><td colspan="3" style="padding:4px;">${op.diligenciasPoliciales.replace(/\n/g, '<br>') || "<em>Sin datos</em>"}</td></tr>
        </table>

        <h3 style="color:#005c9e; border-bottom:1px solid #ccc; padding-bottom:5px; margin-top:25px;">Detalle Judicial</h3>
        <ul>
          ${juzgados.map(j => `<li><b>Juzgado:</b> ${j.juzgado || "-"} (Diligencias: ${j.diligencias || "-"})</li>`).join("") || "<li>No hay juzgados añadidos.</li>"}
          ${inhibiciones.map(i => `<li><b>Inhibición:</b> ${formatoFecha(i.fecha)} - ${i.juzgado || "-"}</li>`).join("") || ""}
          ${historicoJuzgados.map(h => `<li><b>Histórico:</b> ${formatoFecha(h.fecha)} - ${h.juzgadoRelacionado || ""}: ${h.descripcionEventoJuzgado || "-"}</li>`).join("") || ""}
        </ul>

        <h3 style="color:#005c9e; border-bottom:1px solid #ccc; padding-bottom:5px; margin-top:25px;">Personas Vinculadas</h3>
        <ul>
          ${detenidos.map(d => `<li><b>Detenido:</b> ${d.nombreDetenido || ""} (${d.nacionalidadDetenido || ""}) - ${formatoFecha(d.fechaDetenido)} - <b>Delito:</b> ${d.delitoDetenido || ""}</li>`).join("") || "<li>No hay detenidos registrados.</li>"}
        </ul>
        
        <h3 style="color:#005c9e; border-bottom:1px solid #ccc; padding-bottom:5px; margin-top:25px;">Cronología de Eventos</h3>
        <ol>
          ${[...cronologia].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map(e => `<li><b>${formatoFecha(e.fecha)}</b>: ${e.descripcionCronologia || ""}</li>`).join("") || "<li>No hay eventos en la cronología.</li>"}
        </ol>

        <div style="margin-top:40px; text-align:center; font-size:12px; color:#999;">
          Informe generado automáticamente por Benito · UCRIF · ${new Date().toLocaleDateString('es-ES')}
        </div>
      </div>`;

        const element = document.createElement('div');
        element.innerHTML = html;

        html2pdf().from(element.firstElementChild).set({
            margin: 0.8,
            filename: `informe-operacion-${idOperacionActual}.pdf`,
            html2canvas: {
                scale: 2
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'portrait'
            }
        }).save();

    } catch (error) {
        console.error("Error al generar el informe: ", error);
        showToast("No se pudo generar el informe en PDF.", "error");
    }
});


// ======= AUTOINICIALIZACIÓN DE LA APLICACIÓN =======
window.addEventListener('DOMContentLoaded', () => {
    anioOperacion.value = new Date().getFullYear();
    fechaInicio.value = new Date().toISOString().slice(0, 10);
    cargarOperacionesEnSelect();
    btnGuardarOperacion.disabled = false;
    codigoWarning.classList.add("d-none");
    limpiarTodosLosListados();
});
