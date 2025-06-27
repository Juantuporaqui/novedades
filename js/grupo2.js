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
function showToast(msg, tipo="info") { alert(msg); }
function limpiarFormulario(form) { if(form) form.reset(); }
function formatoFecha(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${(f.getMonth()+1).toString().padStart(2,"0")}/${f.getFullYear()}`;
}
function uniqueID() { return '_' + Math.random().toString(36).substr(2, 9); }
// ======= REFERENCIAS DOM =======
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
let idOperacionActual = null; // código operativo (clave)
// ======= 1. BÚSQUEDA Y CARGA DE OPERACIONES EXISTENTES =======
async function cargarOperacionesEnSelect() {
  operacionSelect.innerHTML = `<option value="">-- Selecciona una operación --</option>`;
  const snapshot = await db.collection("grupo2_operaciones").orderBy("nombreOperacion").get();
  snapshot.forEach(doc => {
    const datos = doc.data();
    operacionSelect.innerHTML += `<option value="${doc.id}">${datos.nombreOperacion} (${doc.id})</option>`;
  });
}
cargarOperacionesEnSelect();

// ======= 2. NUEVA OPERACIÓN =======
btnNuevaOperacion.addEventListener('click', () => {
  formOperacion.reset();
  operacionActual = null;
  idOperacionActual = null;
  codigoOperacion.value = "";
  anioOperacion.value = new Date().getFullYear();
  fechaInicio.value = new Date().toISOString().slice(0,10);
  limpiarTodosLosListados();
  setTimeout(()=>{codigoOperacion.focus()},150);
  btnGuardarOperacion.disabled = false;
  codigoWarning.classList.add("d-none");
});

// ======= 3. CARGAR UNA OPERACIÓN POR NOMBRE =======
btnCargarOperacion.addEventListener('click', async () => {
  const codigo = operacionSelect.value;
  if(!codigo) return showToast("Selecciona una operación.");
  const doc = await db.collection("grupo2_operaciones").doc(codigo).get();
  if(!doc.exists) return showToast("No existe esa operación.");
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
  cargarTodosLosListados();
});

// ======= 4. VALIDAR UNICIDAD DE CÓDIGO =======
codigoOperacion.addEventListener('blur', async () => {
  const code = codigoOperacion.value.trim();
  if(!code) {codigoWarning.classList.add("d-none"); btnGuardarOperacion.disabled = false; return;}
  const doc = await db.collection("grupo2_operaciones").doc(code).get();
  if(doc.exists && (!idOperacionActual || code!==idOperacionActual)) {
    codigoWarning.classList.remove("d-none");
    btnGuardarOperacion.disabled = true;
  } else {
    codigoWarning.classList.add("d-none");
    btnGuardarOperacion.disabled = false;
  }
});

// ======= 5. GUARDAR/ACTUALIZAR OPERACIÓN PRINCIPAL =======
formOperacion.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = codigoOperacion.value.trim();
  if(!code) return showToast("Código operativo obligatorio.");
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
  await db.collection("grupo2_operaciones").doc(code).set(datos, {merge:true});
  showToast("Operación guardada correctamente.","success");
  operacionActual = datos;
  idOperacionActual = code;
  cargarOperacionesEnSelect();
  btnGuardarOperacion.disabled = false;
  codigoWarning.classList.add("d-none");
});
// ======= JUZGADOS =======
const btnAñadirJuzgado = document.getElementById('btnAñadirJuzgado');
const juzgadoInicial = document.getElementById('juzgadoInicial');
const diligenciasPreviasJuzgado = document.getElementById('diligenciasPreviasJuzgado');
const listadoJuzgados = document.getElementById('listadoJuzgados');

btnAñadirJuzgado.addEventListener('click', async ()=> {
  if(!idOperacionActual) return showToast("Debes crear/guardar la operación antes.");
  const data = {
    juzgado: juzgadoInicial.value.trim(),
    diligencias: diligenciasPreviasJuzgado.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.juzgado && !data.diligencias) return showToast("Completa algún campo.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("juzgados").add(data);
  juzgadoInicial.value = "";
  diligenciasPreviasJuzgado.value = "";
  cargarListadoJuzgados();
});
async function cargarListadoJuzgados() {
  if(!idOperacionActual) return listadoJuzgados.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("juzgados").orderBy("ts","desc").get();
  listadoJuzgados.innerHTML = "";
  snap.forEach(doc => {
    const j = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span><b>${j.juzgado}</b> (${j.diligencias})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarJuzgado('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoJuzgados.appendChild(div);
  });
}
window.eliminarJuzgado = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("juzgados").doc(docid).delete();
  cargarListadoJuzgados();
};

// ======= INHIBICIONES =======
const btnAñadirInhibicion = document.getElementById('btnAñadirInhibicion');
const juzgadoInhibido = document.getElementById('juzgadoInhibido');
const fechaInhibicion = document.getElementById('fechaInhibicion');
const listadoInhibiciones = document.getElementById('listadoInhibiciones');
btnAñadirInhibicion.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    juzgado: juzgadoInhibido.value.trim(),
    fecha: fechaInhibicion.value,
    ts: new Date().toISOString()
  };
  if(!data.juzgado && !data.fecha) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("inhibiciones").add(data);
  juzgadoInhibido.value = ""; fechaInhibicion.value = "";
  cargarListadoInhibiciones();
});
async function cargarListadoInhibiciones() {
  if(!idOperacionActual) return listadoInhibiciones.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("inhibiciones").orderBy("ts","desc").get();
  listadoInhibiciones.innerHTML = "";
  snap.forEach(doc => {
    const j = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span><b>${j.juzgado}</b> (${formatoFecha(j.fecha)})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarInhibicion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoInhibiciones.appendChild(div);
  });
}
window.eliminarInhibicion = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inhibiciones").doc(docid).delete();
  cargarListadoInhibiciones();
};

// ======= INSPECCIONES EN CASAS DE CITAS =======
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
        showToast("El nombre de la casa y la fecha son obligatorios.");
        return;
    }

    const data = {
        casa,
        fechaInspeccion: fecha,
        numFiliadas: num,
        nacionalidadesFiliadas: nacs,
        ts: new Date().toISOString()
    };

    try {
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").add(data);
        showToast("Inspección añadida correctamente.", "success");
        nombreCasa.value = "";
        fechaInspeccion.value = "";
        numFiliadas.value = "";
        nacionalidadesFiliadas.value = "";
        cargarListadoInspecciones();
    } catch (e) {
        console.error("Error añadiendo inspección:", e);
        showToast("No se pudo añadir la inspección. Consulta consola.", "error");
    }
});

async function cargarListadoInspecciones() {
    if (!idOperacionActual) {
        listadoInspecciones.innerHTML = "";
        return;
    }
    try {
        const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").orderBy("fechaInspeccion", "desc").get();
        listadoInspecciones.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement("div");
            div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
            div.innerHTML = `<span>
                <b>${d.casa || ""}</b> - ${formatoFecha(d.fechaInspeccion)}
                <br>
                Nº Filiadas: <b>${d.numFiliadas || 0}</b>
                <br>
                <span class="text-muted">Nacionalidades: ${(d.nacionalidadesFiliadas || []).join(', ') || "N/A"}</span>
            </span>
            <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSubdocumentoInspeccion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
            listadoInspecciones.appendChild(div);
        });
    } catch (e) {
        console.error("Error cargando inspecciones:", e);
        showToast("No se pudo cargar el listado de inspecciones.", "error");
    }
}

window.eliminarSubdocumentoInspeccion = async function(docid) {
    if (!idOperacionActual) return;
    try {
        await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("inspecciones").doc(docid).delete();
        showToast("Inspección eliminada.", "success");
        cargarListadoInspecciones();
    } catch (e) {
        console.error("Error eliminando inspección:", e);
        showToast("No se pudo eliminar la inspección.", "error");
    }
};
// ======= HISTÓRICO DE JUZGADOS =======
const btnAñadirHistoricoJuzgado = document.getElementById('btnAñadirHistoricoJuzgado');
const fechaHistoricoJuzgado = document.getElementById('fechaHistoricoJuzgado');
const juzgadoRelacionado = document.getElementById('juzgadoRelacionado');
const descripcionEventoJuzgado = document.getElementById('descripcionEventoJuzgado');
const listadoHistoricoJuzgados = document.getElementById('listadoHistoricoJuzgados');
btnAñadirHistoricoJuzgado.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    fecha: fechaHistoricoJuzgado.value,
    juzgadoRelacionado: juzgadoRelacionado.value.trim(),
    descripcionEventoJuzgado: descripcionEventoJuzgado.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.fecha && !data.juzgadoRelacionado && !data.descripcionEventoJuzgado) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("historicoJuzgados").add(data);
  fechaHistoricoJuzgado.value = ""; juzgadoRelacionado.value = ""; descripcionEventoJuzgado.value = "";
  cargarListadoHistoricoJuzgados();
});
async function cargarListadoHistoricoJuzgados() {
  if(!idOperacionActual) return listadoHistoricoJuzgados.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("historicoJuzgados").orderBy("ts","desc").get();
  listadoHistoricoJuzgados.innerHTML = "";
  snap.forEach(doc => {
    const h = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span><b>${formatoFecha(h.fecha)}</b> - ${h.juzgadoRelacionado}: ${h.descripcionEventoJuzgado}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarHistoricoJuzgado('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoHistoricoJuzgados.appendChild(div);
  });
}
window.eliminarHistoricoJuzgado = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("historicoJuzgados").doc(docid).delete();
  cargarListadoHistoricoJuzgados();
};

// ======= INTERVENCIONES =======
const btnAñadirIntervencion = document.getElementById('btnAñadirIntervencion');
const intervencionTelefonica = document.getElementById('intervencionTelefonica');
const entradaRegistro = document.getElementById('entradaRegistro');
const listadoIntervenciones = document.getElementById('listadoIntervenciones');
btnAñadirIntervencion.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    intervencionTelefonica: intervencionTelefonica.value.trim(),
    entradaRegistro: entradaRegistro.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.intervencionTelefonica && !data.entradaRegistro) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("intervenciones").add(data);
  intervencionTelefonica.value = ""; entradaRegistro.value = "";
  cargarListadoIntervenciones();
});
async function cargarListadoIntervenciones() {
  if(!idOperacionActual) return listadoIntervenciones.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("intervenciones").orderBy("ts","desc").get();
  listadoIntervenciones.innerHTML = "";
  snap.forEach(doc => {
    const i = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${i.intervencionTelefonica||""} / ${i.entradaRegistro||""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarIntervencion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoIntervenciones.appendChild(div);
  });
}
window.eliminarIntervencion = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("intervenciones").doc(docid).delete();
  cargarListadoIntervenciones();
};

// ======= CRONOLOGÍA =======
const btnAñadirEventoCronologia = document.getElementById('btnAñadirEventoCronologia');
const descripcionCronologia = document.getElementById('descripcionCronologia');
const fechaCronologia = document.getElementById('fechaCronologia');
const listadoCronologia = document.getElementById('listadoCronologia');
btnAñadirEventoCronologia.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    descripcionCronologia: descripcionCronologia.value.trim(),
    fecha: fechaCronologia.value,
    ts: new Date().toISOString()
  };
  if(!data.descripcionCronologia && !data.fecha) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("cronologia").add(data);
  descripcionCronologia.value = ""; fechaCronologia.value = "";
  cargarListadoCronologia();
});
async function cargarListadoCronologia() {
  if(!idOperacionActual) return listadoCronologia.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("cronologia").orderBy("ts","desc").get();
  listadoCronologia.innerHTML = "";
  snap.forEach(doc => {
    const c = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${formatoFecha(c.fecha)} - ${c.descripcionCronologia||""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarCronologia('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoCronologia.appendChild(div);
  });
}
window.eliminarCronologia = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("cronologia").doc(docid).delete();
  cargarListadoCronologia();
};
// ======= SOLICITUDES JUDICIALES =======
const btnAñadirSolicitudJudicial = document.getElementById('btnAñadirSolicitudJudicial');
const solicitudJudicial = document.getElementById('solicitudJudicial');
const descripcionSolicitudJudicial = document.getElementById('descripcionSolicitudJudicial');
const listadoSolicitudesJudiciales = document.getElementById('listadoSolicitudesJudiciales');
btnAñadirSolicitudJudicial.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    solicitudJudicial: solicitudJudicial.value.trim(),
    descripcionSolicitudJudicial: descripcionSolicitudJudicial.value.trim(),
    ts: new Date().toISOString()
  };
  if(!data.solicitudJudicial && !data.descripcionSolicitudJudicial) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("solicitudesJudiciales").add(data);
  solicitudJudicial.value = ""; descripcionSolicitudJudicial.value = "";
  cargarListadoSolicitudesJudiciales();
});
async function cargarListadoSolicitudesJudiciales() {
  if(!idOperacionActual) return listadoSolicitudesJudiciales.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("solicitudesJudiciales").orderBy("ts","desc").get();
  listadoSolicitudesJudiciales.innerHTML = "";
  snap.forEach(doc => {
    const s = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${s.solicitudJudicial||""} - ${s.descripcionSolicitudJudicial||""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarSolicitudJudicial('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoSolicitudesJudiciales.appendChild(div);
  });
}
window.eliminarSolicitudJudicial = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("solicitudesJudiciales").doc(docid).delete();
  cargarListadoSolicitudesJudiciales();
};

// ======= COLABORACIONES =======
const btnAñadirColaboracion = document.getElementById('btnAñadirColaboracion');
const grupoColaboracion = document.getElementById('grupoColaboracion');
const tipoColaboracion = document.getElementById('tipoColaboracion');
const fechaColaboracion = document.getElementById('fechaColaboracion');
const listadoColaboraciones = document.getElementById('listadoColaboraciones');
btnAñadirColaboracion.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    grupoColaboracion: grupoColaboracion.value.trim(),
    tipoColaboracion: tipoColaboracion.value.trim(),
    fechaColaboracion: fechaColaboracion.value,
    ts: new Date().toISOString()
  };
  if(!data.grupoColaboracion && !data.tipoColaboracion && !data.fechaColaboracion) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("colaboraciones").add(data);
  grupoColaboracion.value = ""; tipoColaboracion.value = ""; fechaColaboracion.value = "";
  cargarListadoColaboraciones();
});
async function cargarListadoColaboraciones() {
  if(!idOperacionActual) return listadoColaboraciones.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("colaboraciones").orderBy("ts","desc").get();
  listadoColaboraciones.innerHTML = "";
  snap.forEach(doc => {
    const c = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${formatoFecha(c.fechaColaboracion)} - ${c.grupoColaboracion||""}: ${c.tipoColaboracion||""}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarColaboracion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoColaboraciones.appendChild(div);
  });
}
window.eliminarColaboracion = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("colaboraciones").doc(docid).delete();
  cargarListadoColaboraciones();
};

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
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
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
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
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
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidos").doc(docid).delete();
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
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("detenidosPrevistos").add(data);
  nombrePrevisto.value = "";
  nacionalidadPrevisto.value = "";
  delitoPrevisto.value = "";
  cargarListadoDetenidosPrevistos();
});
async function cargarListadoDetenidosPrevistos() {
  if(!idOperacionActual) return listadoDetenidosPrevistos.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
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
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("detenidosPrevistos").doc(docid).delete();
  cargarListadoDetenidosPrevistos();
};
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
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("otrasPersonas").add(data);
  filiacionOtraPersona.value = "";
  tipoVinculacion.value = "";
  nacionalidadOtraPersona.value = "";
  telefonoOtraPersona.value = "";
  cargarListadoOtrasPersonas();
});
async function cargarListadoOtrasPersonas() {
  if(!idOperacionActual) return listadoOtrasPersonas.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
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
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("otrasPersonas").doc(docid).delete();
  cargarListadoOtrasPersonas();
};

// ======= OBSERVACIONES =======
const btnAñadirObservacion = document.getElementById('btnAñadirObservacion');
const comentariosObservaciones = document.getElementById('comentariosObservaciones');
const relevanteObservacion = document.getElementById('relevanteObservacion');
const confidencialObservacion = document.getElementById('confidencialObservacion');
const listadoObservaciones = document.getElementById('listadoObservaciones');
btnAñadirObservacion.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    comentariosObservaciones: comentariosObservaciones.value.trim(),
    relevanteObservacion: relevanteObservacion.checked,
    confidencialObservacion: confidencialObservacion.checked,
    ts: new Date().toISOString()
  };
  if(!data.comentariosObservaciones) return showToast("Escribe un comentario.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("observaciones").add(data);
  comentariosObservaciones.value = "";
  relevanteObservacion.checked = false;
  confidencialObservacion.checked = false;
  cargarListadoObservaciones();
});
async function cargarListadoObservaciones() {
  if(!idOperacionActual) return listadoObservaciones.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("observaciones").orderBy("ts","desc").get();
  listadoObservaciones.innerHTML = "";
  snap.forEach(doc => {
    const o = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${o.comentariosObservaciones||""} ${(o.relevanteObservacion?"<b>[Relevante]</b>":"")}${(o.confidencialObservacion?" <b>[Confidencial]</b>":"")}</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarObservacion('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoObservaciones.appendChild(div);
  });
}
window.eliminarObservacion = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("observaciones").doc(docid).delete();
  cargarListadoObservaciones();
};

// ======= PENDIENTES =======
const btnAñadirPendiente = document.getElementById('btnAñadirPendiente');
const descripcionPendiente = document.getElementById('descripcionPendiente');
const fechaPendiente = document.getElementById('fechaPendiente');
const listadoPendientes = document.getElementById('listadoPendientes');
btnAñadirPendiente.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const data = {
    descripcionPendiente: descripcionPendiente.value.trim(),
    fechaPendiente: fechaPendiente.value,
    ts: new Date().toISOString()
  };
  if(!data.descripcionPendiente && !data.fechaPendiente) return showToast("Completa los campos.");
  await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("pendientes").add(data);
  descripcionPendiente.value = ""; fechaPendiente.value = "";
  cargarListadoPendientes();
});
async function cargarListadoPendientes() {
  if(!idOperacionActual) return listadoPendientes.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("pendientes").orderBy("ts","desc").get();
  listadoPendientes.innerHTML = "";
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span>${p.descripcionPendiente||""} (${formatoFecha(p.fechaPendiente)})</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarPendiente('${doc.id}')"><i class="bi bi-trash"></i></button>`;
    listadoPendientes.appendChild(div);
  });
}
window.eliminarPendiente = async (docid) => {
  if(!idOperacionActual) return;
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("pendientes").doc(docid).delete();
  cargarListadoPendientes();
};
function limpiarTodosLosListados() {
  listadoJuzgados.innerHTML = "";
  listadoInhibiciones.innerHTML = "";
  listadoHistoricoJuzgados.innerHTML = "";
  listadoIntervenciones.innerHTML = "";
  listadoSolicitudesJudiciales.innerHTML = "";
  listadoColaboraciones.innerHTML = "";
  listadoDetenidos.innerHTML = "";
  listadoDetenidosPrevistos.innerHTML = "";
  listadoOtrasPersonas.innerHTML = "";
  listadoCronologia.innerHTML = "";
  listadoObservaciones.innerHTML = "";
  listadoPendientes.innerHTML = "";
  listadoDocumentos.innerHTML = "";
  listadoInspecciones.innerHTML = "";
}
function cargarTodosLosListados() {
  cargarListadoJuzgados();
  cargarListadoInhibiciones();
  cargarListadoHistoricoJuzgados();
  cargarListadoIntervenciones();
  cargarListadoSolicitudesJudiciales();
  cargarListadoColaboraciones();
  cargarListadoDetenidos();
  cargarListadoDetenidosPrevistos();
  cargarListadoOtrasPersonas();
  cargarListadoCronologia();
  cargarListadoObservaciones();
  cargarListadoPendientes();
  cargarListadoDocumentos();
  cargarListadoInspecciones();
}
// ======= ADJUNTAR DOCUMENTOS (Firebase Storage) =======
const btnAñadirDocumento = document.getElementById('btnAñadirDocumento');
const adjuntosDoc = document.getElementById('adjuntosDoc');
const listadoDocumentos = document.getElementById('listadoDocumentos');
btnAñadirDocumento.addEventListener('click', async ()=>{
  if(!idOperacionActual) return showToast("Guarda la operación antes.");
  const files = adjuntosDoc.files;
  if(!files.length) return showToast("Selecciona al menos un archivo.");
  for(let i=0; i<files.length; i++) {
    const file = files[i];
    if(file.size > 10*1024*1024) { showToast(`Archivo ${file.name} excede 10MB.`); continue; }
    const ref = storage.ref().child(`grupo2/${idOperacionActual}/${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    await db.collection("grupo2_operaciones").doc(idOperacionActual)
      .collection("documentos").add({
        nombre: file.name, url, ts: new Date().toISOString(), size: file.size
      });
  }
  adjuntosDoc.value = "";
  cargarListadoDocumentos();
});
async function cargarListadoDocumentos() {
  if(!idOperacionActual) return listadoDocumentos.innerHTML="";
  const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual)
    .collection("documentos").orderBy("ts","desc").get();
  listadoDocumentos.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
    div.innerHTML = `<span><a href="${d.url}" target="_blank">${d.nombre}</a> (${(d.size/1024).toFixed(1)} KB)</span>
      <button class="btn btn-sm btn-danger ms-2" title="Eliminar" onclick="eliminarDocumento('${doc.id}', '${d.nombre}')"><i class="bi bi-trash"></i></button>`;
    listadoDocumentos.appendChild(div);
  });
}
window.eliminarDocumento = async (docid, nombre) => {
  if(!idOperacionActual) return;
  try { await storage.ref().child(`grupo2/${idOperacionActual}/${nombre}`).delete(); } catch(e){}
  await db.collection("grupo2_operaciones").doc(idOperacionActual).collection("documentos").doc(docid).delete();
  cargarListadoDocumentos();
};
// ======= INFORME AUTOMÁTICO CON BOTÓN PDF =======
document.getElementById('btnGenerarInforme').addEventListener('click', async () => {
  if(!idOperacionActual) return showToast("Carga una operación primero.");
  const doc = await db.collection("grupo2_operaciones").doc(idOperacionActual).get();
  if(!doc.exists) return showToast("No existe esa operación.");
  const op = doc.data();

  // Subcolecciones (reutilizamos funciones previas)
  async function getSubcoleccion(nombre) {
    const snap = await db.collection("grupo2_operaciones").doc(idOperacionActual).collection(nombre).get();
    let arr = [];
    snap.forEach(d=>arr.push(d.data()));
    return arr;
  }
  const [juzgados, inhibiciones, historicoJuzgados, intervenciones, solicitudesJudiciales, colaboraciones, cronologia, detenidos, detenidosPrevistos, otrasPersonas, documentos, observaciones, pendientes] = await Promise.all([
    getSubcoleccion("juzgados"),
    getSubcoleccion("inhibiciones"),
    getSubcoleccion("historicoJuzgados"),
    getSubcoleccion("intervenciones"),
    getSubcoleccion("solicitudesJudiciales"),
    getSubcoleccion("colaboraciones"),
    getSubcoleccion("cronologia"),
    getSubcoleccion("detenidos"),
    getSubcoleccion("detenidosPrevistos"),
    getSubcoleccion("otrasPersonas"),
    getSubcoleccion("documentos"),
    getSubcoleccion("observaciones"),
    getSubcoleccion("pendientes")
  ]);

  let html = `
  <div id="informe-operacion" style="font-family: 'Segoe UI', Arial, sans-serif; color:#152045; max-width: 900px; margin:auto; background: #f6f8fb; border-radius:14px; box-shadow:0 2px 28px #143e8a22; padding:32px">
    <div style="display:flex; align-items:center; margin-bottom:18px;">
      <img src="../img/logo_cnp.png" alt="CNP" style="width:52px; height:52px; margin-right:20px;">
      <div>
        <h2 style="margin:0; font-size:2rem; color:#14224b;">Informe Automático · Operación de Investigación</h2>
        <div style="font-size:1.05rem; color:#29497a;">Benito · UCRIF · Grupo 2</div>
      </div>
    </div>
    <hr>
    <h3 style="color:#182b4d;">Datos Generales</h3>
    <table style="width:100%; margin-bottom:18px; font-size:1.02rem;">
      <tr><th style="text-align:left;">Código:</th><td>${idOperacionActual}</td>
          <th>Año:</th><td>${op.anioOperacion||""}</td></tr>
      <tr><th style="text-align:left;">Nombre:</th><td colspan="3">${op.nombreOperacion||""}</td></tr>
      <tr><th>Fecha de Inicio:</th><td>${formatoFecha(op.fechaInicio)||""}</td>
          <th>Tipología Delictiva:</th><td>${op.tipologiaDelictiva||""}</td></tr>
      <tr><th>Origen Investigación:</th><td>${op.origenInvestigacion||""}</td>
          <th>Procedimientos Judiciales:</th><td>${op.procedimientosJudiciales||""}</td></tr>
      <tr><th>Resumen:</th><td colspan="3">${op.descripcionBreve||""}</td></tr>
    </table>
    <h4>Diligencias Policiales Relevantes</h4>
    <div style="background:#e9f0fb; border-radius:8px; padding:12px 15px; margin-bottom:14px; border-left:4px solid #29497a;">
      ${op.diligenciasPoliciales||"<em>Sin datos</em>"}
    </div>
    <hr>
    <h3 style="color:#233f6a;">Juzgados</h3>
    <ul>
      ${juzgados.map(j=>`<li><b>${j.juzgado||"-"}</b> (${j.diligencias||"-"})</li>`).join("") || "<li>No hay juzgados añadidos.</li>"}
    </ul>
    <h4>Inhibiciones</h4>
    <ul>
      ${inhibiciones.map(i=>`<li>${formatoFecha(i.fecha)} - ${i.juzgado||"-"}</li>`).join("") || "<li>No hay inhibiciones.</li>"}
    </ul>
    <h4>Histórico de Juzgados</h4>
    <ul>
      ${historicoJuzgados.map(h=>`<li>${formatoFecha(h.fecha)} - <b>${h.juzgadoRelacionado||"-"}</b>: ${h.descripcionEventoJuzgado||"-"}</li>`).join("") || "<li>No hay histórico.</li>"}
    </ul>
    <hr>
    <h3 style="color:#29366e;">Intervenciones y Medidas</h3>
    <ul>
      ${intervenciones.map(it=>`<li>${it.intervencionTelefonica||""} ${it.entradaRegistro?"/ "+it.entradaRegistro:""}</li>`).join("") || "<li>No hay intervenciones.</li>"}
    </ul>
    <h4>Solicitudes Judiciales</h4>
    <ul>
      ${solicitudesJudiciales.map(s=>`<li>${s.solicitudJudicial||""} - ${s.descripcionSolicitudJudicial||""}</li>`).join("") || "<li>No hay solicitudes.</li>"}
    </ul>
    <h4>Colaboraciones</h4>
    <ul>
      ${colaboraciones.map(c=>`<li>${formatoFecha(c.fechaColaboracion)} - ${c.grupoColaboracion||""}: ${c.tipoColaboracion||""}</li>`).join("") || "<li>No hay colaboraciones.</li>"}
    </ul>
    <hr>
    <h3 style="color:#39526b;">Cronología</h3>
    <ol>
      ${cronologia.map(e=>`<li>${formatoFecha(e.fecha)} - ${e.descripcionCronologia||""}</li>`).join("") || "<li>No hay eventos.</li>"}
    </ol>
    <hr>
    <h3 style="color:#253c5e;">Personas Vinculadas</h3>
    <h4>Detenidos</h4>
    <ul>
      ${detenidos.map(d=>`<li>${d.filiacionDelito||""} (${d.nacionalidadDetenido||""}) - ${formatoFecha(d.fechaDetenido)} [${d.secuenciaDetenido||""}]</li>`).join("") || "<li>No hay detenidos.</li>"}
    </ul>
    <h4>Detenidos previstos</h4>
    <ul>
      ${detenidosPrevistos.map(d=>`<li>${d.filiacionPrevisto||""} (${d.nacionalidadPrevisto||""}) - ${formatoFecha(d.fechaPrevisto)} [${d.secuenciaPrevisto||""}]</li>`).join("") || "<li>No hay previstos.</li>"}
    </ul>
    <h4>Otras personas</h4>
    <ul>
      ${otrasPersonas.map(p=>`<li>${p.filiacionOtraPersona||""} / ${p.tipoVinculacion||""} (${p.nacionalidadOtraPersona||""}) Tel: ${p.telefonoOtraPersona||""}</li>`).join("") || "<li>No hay otras personas.</li>"}
    </ul>
    <hr>
    <h3 style="color:#38545e;">Documentación Adjunta</h3>
    <ul>
      ${documentos.map(docu=>`<li><a href="${docu.url}" target="_blank">${docu.nombre}</a> (${(docu.size/1024).toFixed(1)} KB)</li>`).join("") || "<li>No hay documentos subidos.</li>"}
    </ul>
    <hr>
    <h3 style="color:#38715e;">Anotaciones / Observaciones</h3>
    <ul>
      ${observaciones.map(o=>`<li>${o.comentariosObservaciones||""} ${(o.relevanteObservacion?"<b>[Relevante]</b>":"")}${(o.confidencialObservacion?" <b>[Confidencial]</b>":"")}</li>`).join("") || "<li>No hay observaciones.</li>"}
    </ul>
    <hr>
    <h3 style="color:#4f7a4f;">Elementos Pendientes</h3>
    <ul>
      ${pendientes.map(p=>`<li>${p.descripcionPendiente||""} (${formatoFecha(p.fechaPendiente)})</li>`).join("") || "<li>No hay elementos pendientes.</li>"}
    </ul>
    <hr>
    <div style="font-size:.99rem; color:#456;">Informe generado automáticamente por Benito · UCRIF · ${formatoFecha(new Date())}</div>
  </div>
  <div style="text-align:right;margin:18px 0 0 0">
    <button onclick="window.print()" style="font-size:1.1rem; background:#ffd94a; color:#152045; border:none; border-radius:7px; padding:8px 22px; font-weight:bold; box-shadow:0 1px 8px #29497a18; cursor:pointer; margin-right:15px;">Imprimir o Guardar PDF</button>
    <button id="btnDescargarPDF" style="font-size:1.1rem; background:#375da6; color:#fff; border:none; border-radius:7px; padding:8px 22px; font-weight:bold; box-shadow:0 1px 8px #29497a18; cursor:pointer;">Descargar PDF</button>
  </div>
  `;

  let win = window.open("", "informe-operacion", "width=1100,height=900,scrollbars=yes");
  win.document.write(`
    <html>
      <head>
        <title>Informe de Operación - Benito</title>
        <link rel="icon" href="../favicon.png">
        <meta charset="utf-8">
        <style>
          body { background: #eef4f9; }
          @media print { body { background: #fff !important; } #informe-operacion { box-shadow:none !important; } }
          h2, h3, h4 { font-family: 'Segoe UI', Arial, sans-serif; }
          table th, table td { padding: 3px 6px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
      </head>
      <body>
        ${html}
        <script>
          document.getElementById("btnDescargarPDF").onclick = function() {
            const element = document.getElementById('informe-operacion');
            html2pdf().from(element).set({margin:0.6, filename: 'informe-operacion-${idOperacionActual}.pdf', html2canvas:{scale:2}, jsPDF:{format:'a4', orientation:'portrait'}}).save();
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
});
// ========== AUTOINICIALIZACIÓN ==========
window.addEventListener('DOMContentLoaded', () => {
  anioOperacion.value = new Date().getFullYear();
  fechaInicio.value = new Date().toISOString().slice(0,10);
  cargarOperacionesEnSelect();
  btnGuardarOperacion.disabled = false;
  codigoWarning.classList.add("d-none");
  limpiarTodosLosListados();
});
