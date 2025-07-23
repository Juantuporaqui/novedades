// Import functions from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  orderBy, query, addDoc, writeBatch, arrayUnion, arrayRemove, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ======= CONFIGURACIÓN Y VARIABLES GLOBALES =======
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e",
  measurementId: "G-S2VPQNWZ21"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const COLECCION_OPERACIONES = "grupo3_operaciones";
let operacionActual = null;
let idOperacionActual = null;
let bsConfirmationModal; // Instancia del modal de Bootstrap

// ======= REFERENCIAS DOM (PRINCIPALES) =======
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

// ======= UTILIDADES GENERALES =======
function showToast(msg, tipo = "info") {
  const toastContainer = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  const bgClass = {
      success: 'bg-success',
      error: 'bg-danger',
      info: 'bg-info',
      warning: 'bg-warning'
  }[tipo] || 'bg-secondary';

  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`;
  toastContainer.insertAdjacentHTML('beforeend', toastHTML);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
  toast.show();
  toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

function showConfirmationModal({ title, body, confirmText = 'Confirmar', onConfirm, isDanger = false }) {
    document.getElementById('confirmationModalLabel').textContent = title;
    document.getElementById('confirmationModalBody').innerHTML = body;
    const confirmBtn = document.getElementById('confirmationModalConfirm');
    confirmBtn.textContent = confirmText;
    
    const header = document.getElementById('confirmationModalHeader');
    confirmBtn.className = 'btn'; // Reset classes
    if (isDanger) {
        header.className = 'modal-header modal-header-danger';
        confirmBtn.classList.add('btn-danger');
    } else {
        header.className = 'modal-header';
        confirmBtn.classList.add('btn-primary');
    }

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        bsConfirmationModal.hide();
    });
    bsConfirmationModal.show();
}

function formatoFecha(fechaStr) {
  if (!fechaStr) return "N/A";
  try {
    const date = new Date(fechaStr + 'T00:00:00');
    if (isNaN(date.getTime())) return fechaStr;
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return fechaStr;
  }
}
function getFechaYYYYMMDD(date = new Date()) { return date.toISOString().slice(0, 10); }
function uniqueID() { return '_' + Math.random().toString(36).substring(2, 9); }
function actualizarIndicador(selector, tieneDatos) {
  const indicador = document.querySelector(selector);
  if (indicador) indicador.className = `data-indicator me-2 ${tieneDatos ? 'filled' : 'empty'}`;
}

// ======= LÓGICA PRINCIPAL DE OPERACIONES =======
async function cargarOperacionesEnSelect() {
  operacionSelect.innerHTML = `<option value="">-- Selecciona una operación --</option>`;
  const q = query(collection(db, COLECCION_OPERACIONES), orderBy("nombreOperacion", "asc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const op = doc.data();
    operacionSelect.innerHTML += `<option value="${doc.id}">${op.nombreOperacion} (${doc.id})</option>`;
  });
}

function resetearUI() {
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
  operacionSelect.value = "";
}

btnNuevaOperacion.addEventListener('click', resetearUI);

btnCargarOperacion.addEventListener('click', async () => {
  const codigo = operacionSelect.value;
  if (!codigo) return showToast("Selecciona una operación para cargar.", "warning");
  
  const docRef = doc(db, COLECCION_OPERACIONES, codigo);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return showToast("Error: No se encontró la operación.", "error");

  operacionActual = docSnap.data();
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
  showToast(`Operación "${operacionActual.nombreOperacion}" cargada.`, "success");
});

codigoOperacion.addEventListener('blur', async () => {
  const code = codigoOperacion.value.trim();
  if (!code) {
    codigoWarning.classList.add("d-none");
    btnGuardarOperacion.disabled = false;
    return;
  }
  if (idOperacionActual && code === idOperacionActual) return;

  const docRef = doc(db, COLECCION_OPERACIONES, code);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    codigoWarning.classList.remove("d-none");
    btnGuardarOperacion.disabled = true;
  } else {
    codigoWarning.classList.add("d-none");
    btnGuardarOperacion.disabled = false;
  }
});

formOperacion.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = codigoOperacion.value.trim();
  if (!code) return showToast("El Código operativo es obligatorio.", "error");

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
    await setDoc(doc(db, COLECCION_OPERACIONES, code), datos, { merge: true });
    showToast("Operación guardada correctamente.", "success");
    operacionActual = datos;
    idOperacionActual = code;
    await cargarOperacionesEnSelect();
    operacionSelect.value = code;
    btnGuardarOperacion.disabled = false;
    btnEliminarOperacion.classList.remove('d-none');
    btnGenerarInforme.classList.remove('d-none');
    codigoWarning.classList.add("d-none");
  } catch (error) {
      console.error("Error guardando operación:", error);
      showToast(`Error al guardar: ${error.message}`, "error");
  }
});

btnEliminarOperacion.addEventListener('click', () => {
  if (!idOperacionActual) return;
  showConfirmationModal({
      title: 'Confirmar Eliminación',
      body: `ATENCIÓN: Esta acción es irreversible.<br>Se borrará la operación "<b>${nombreOperacion.value}</b>" y <b>TODOS</b> sus datos asociados.<br><br>¿Estás completamente seguro?`,
      confirmText: 'Sí, Eliminar Todo',
      isDanger: true,
      onConfirm: async () => {
          showToast("Borrando operación y todos sus datos...", "info");
          try {
              await eliminarOperacionCompleta(idOperacionActual);
              showToast("Operación eliminada con éxito.", "success");
              resetearUI();
              await cargarOperacionesEnSelect();
          } catch (error) {
              console.error("Error en el borrado en cascada:", error);
              showToast(`Error al eliminar la operación: ${error.message}`, "error");
          }
      }
  });
});

async function eliminarOperacionCompleta(idOperacion) {
  const subcolecciones = [
    "juzgados", "inhibiciones", "historicoJuzgados", "intervenciones", "solicitudesJudiciales",
    "colaboraciones", "cronologia", "detenidos", "detenidosPrevistos", "otrasPersonas", 
    "inspecciones", "documentos", "observaciones", "pendientes"
  ];

  const docsSnap = await getDocs(collection(db, COLECCION_OPERACIONES, idOperacion, 'documentos'));
  for (const docSnap of docsSnap.docs) {
      const docData = docSnap.data();
      if (docData.path) {
          const fileRef = ref(storage, docData.path);
          try { await deleteObject(fileRef); } 
          catch (e) { console.warn(`No se pudo eliminar el archivo ${docData.path}: ${e.message}`); }
      }
  }

  const batch = writeBatch(db);
  for (const sub of subcolecciones) {
      const subCollectionRef = collection(db, COLECCION_OPERACIONES, idOperacion, sub);
      const snapshot = await getDocs(subCollectionRef);
      snapshot.forEach(doc => batch.delete(doc.ref));
  }
  batch.delete(doc(db, COLECCION_OPERACIONES, idOperacion));
  await batch.commit();
}

// ======= GESTIÓN DE SUBCOLECCIONES =======
async function addSubdocument(subcoleccion, data, formElement, callback) {
    if (!idOperacionActual) return showToast("Guarda la operación antes.", "warning");
    await addDoc(collection(db, COLECCION_OPERACIONES, idOperacionActual, subcoleccion), data);
    if (formElement) formElement.reset();
    if (callback) callback();
}

async function loadSubdocumentList(subcoleccion, listadoEl, indicatorSelector, renderFunction, orderByField = "ts", orderByDir = "desc") {
    if (!idOperacionActual) {
        listadoEl.innerHTML = "";
        return actualizarIndicador(indicatorSelector, false);
    }
    const q = query(collection(db, COLECCION_OPERACIONES, idOperacionActual, subcoleccion), orderBy(orderByField, orderByDir));
    const snap = await getDocs(q);
    listadoEl.innerHTML = snap.docs.map(doc => renderFunction(doc.id, doc.data())).join('');
    actualizarIndicador(indicatorSelector, !snap.empty);
    return snap; // Devuelve el snapshot para comprobaciones adicionales
}

// --- Juzgados ---
document.getElementById('btnAñadirJuzgado').addEventListener('click', () => {
    const data = { juzgado: document.getElementById('juzgadoInicial').value.trim(), diligencias: document.getElementById('diligenciasPreviasJuzgado').value.trim(), ts: new Date().toISOString() };
    if (!data.juzgado && !data.diligencias) return showToast("Completa al menos un campo.", "warning");
    addSubdocument('juzgados', data, document.getElementById('formJuzgados'), cargarListadoJuzgados);
});
async function cargarListadoJuzgados() {
    await loadSubdocumentList('juzgados', document.getElementById('listadoJuzgados'), '#headingJuzgados .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.juzgado}</b> (${d.diligencias})</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('juzgados', '${id}', cargarListadoJuzgados)"><i class="bi bi-trash"></i></button>
        </div>`);
}

// --- Inhibiciones ---
document.getElementById('btnAñadirInhibicion').addEventListener('click', () => {
    const data = { juzgado: document.getElementById('juzgadoInhibido').value.trim(), fecha: document.getElementById('fechaInhibicion').value, ts: new Date().toISOString() };
    if (!data.juzgado || !data.fecha) return showToast("Completa todos los campos.", "warning");
    addSubdocument('inhibiciones', data, document.getElementById('formInhibiciones'), cargarListadoInhibiciones);
});
async function cargarListadoInhibiciones() {
    await loadSubdocumentList('inhibiciones', document.getElementById('listadoInhibiciones'), '#headingJuzgados .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.juzgado}</b> (${formatoFecha(d.fecha)})</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('inhibiciones', '${id}', cargarListadoInhibiciones)"><i class="bi bi-trash"></i></button>
        </div>`, 'fecha');
}

// --- Histórico Juzgados ---
document.getElementById('btnAñadirHistoricoJuzgado').addEventListener('click', () => {
    const data = { fecha: document.getElementById('fechaHistoricoJuzgado').value, juzgadoRelacionado: document.getElementById('juzgadoRelacionado').value.trim(), descripcionEventoJuzgado: document.getElementById('descripcionEventoJuzgado').value.trim(), ts: new Date().toISOString() };
    if (!data.fecha || !data.descripcionEventoJuzgado) return showToast("La fecha y la descripción son obligatorias.", "warning");
    addSubdocument('historicoJuzgados', data, document.getElementById('formHistoricoJuzgados'), cargarListadoHistoricoJuzgados);
});
async function cargarListadoHistoricoJuzgados() {
    await loadSubdocumentList('historicoJuzgados', document.getElementById('listadoHistoricoJuzgados'), '#headingJuzgados .data-indicator', (id, h) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${formatoFecha(h.fecha)}</b> - ${h.juzgadoRelacionado}: ${h.descripcionEventoJuzgado}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('historicoJuzgados', '${id}', cargarListadoHistoricoJuzgados)"><i class="bi bi-trash"></i></button>
        </div>`, 'fecha');
}

// --- Intervenciones ---
document.getElementById('btnAñadirIntervencion').addEventListener('click', () => {
    const data = { intervencionTelefonica: document.getElementById('intervencionTelefonica').value.trim(), entradaRegistro: document.getElementById('entradaRegistro').value.trim(), ts: new Date().toISOString() };
    if (!data.intervencionTelefonica && !data.entradaRegistro) return showToast("Completa al menos un campo.", "warning");
    addSubdocument('intervenciones', data, document.getElementById('formIntervenciones'), cargarListadoIntervenciones);
});
async function cargarListadoIntervenciones() {
    await loadSubdocumentList('intervenciones', document.getElementById('listadoIntervenciones'), '#headingIntervenciones .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span>Tel: ${d.intervencionTelefonica || 'N/A'} | Reg: ${d.entradaRegistro || 'N/A'}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('intervenciones', '${id}', cargarListadoIntervenciones)"><i class="bi bi-trash"></i></button>
        </div>`);
}

// --- Solicitudes Judiciales ---
document.getElementById('btnAñadirSolicitudJudicial').addEventListener('click', () => {
    const data = { solicitudJudicial: document.getElementById('solicitudJudicial').value.trim(), descripcionSolicitudJudicial: document.getElementById('descripcionSolicitudJudicial').value.trim(), ts: new Date().toISOString() };
    if (!data.solicitudJudicial) return showToast("El tipo de solicitud es obligatorio.", "warning");
    addSubdocument('solicitudesJudiciales', data, document.getElementById('formSolicitudes'), cargarListadoSolicitudesJudiciales);
});
async function cargarListadoSolicitudesJudiciales() {
    await loadSubdocumentList('solicitudesJudiciales', document.getElementById('listadoSolicitudesJudiciales'), '#headingIntervenciones .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.solicitudJudicial}</b>: ${d.descripcionSolicitudJudicial}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('solicitudesJudiciales', '${id}', cargarListadoSolicitudesJudiciales)"><i class="bi bi-trash"></i></button>
        </div>`);
}

// --- Colaboraciones ---
document.getElementById('btnAñadirColaboracion').addEventListener('click', () => {
    const data = { fechaColaboracion: document.getElementById('fechaColaboracion').value, grupoColaboracion: document.getElementById('grupoColaboracion').value.trim(), tipoColaboracion: document.getElementById('tipoColaboracion').value.trim(), ts: new Date().toISOString() };
    if (!data.fechaColaboracion || !data.grupoColaboracion) return showToast("La fecha y el grupo son obligatorios.", "warning");
    addSubdocument('colaboraciones', data, document.getElementById('formColaboraciones'), cargarListadoColaboraciones);
});
async function cargarListadoColaboraciones() {
    await loadSubdocumentList('colaboraciones', document.getElementById('listadoColaboraciones'), '#headingIntervenciones .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span>${formatoFecha(d.fechaColaboracion)} - <b>${d.grupoColaboracion}</b>: ${d.tipoColaboracion}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('colaboraciones', '${id}', cargarListadoColaboraciones)"><i class="bi bi-trash"></i></button>
        </div>`, 'fechaColaboracion');
}

// --- Cronología ---
document.getElementById('btnAñadirEventoCronologia').addEventListener('click', async () => {
    const data = { descripcionCronologia: document.getElementById('descripcionCronologia').value.trim(), fecha: document.getElementById('fechaCronologia').value, ts: new Date().toISOString() };
    if (!data.descripcionCronologia || !data.fecha) return showToast("Completa los campos.", "warning");
    await addSubdocument('cronologia', data, document.getElementById('formCronologia'), cargarListadoCronologia);
});
async function cargarListadoCronologia() {
    await loadSubdocumentList('cronologia', document.getElementById('listadoCronologia'), '#headingCronologia .data-indicator', (id, c) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span>${formatoFecha(c.fecha)} - ${c.descripcionCronologia || ""}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('cronologia', '${id}', cargarListadoCronologia)"><i class="bi bi-trash"></i></button>
        </div>`, 'fecha');
}

// --- Detenidos ---
document.getElementById('btnAñadirDetenido').addEventListener('click', async () => {
    const data = {
      nombreDetenido: document.getElementById('nombreDetenido').value.trim(),
      fechaDetenido: document.getElementById('fechaDetenido').value,
      delitoDetenido: document.getElementById('delitoDetenido').value.trim(),
      nacionalidadDetenido: document.getElementById('nacionalidadDetenido').value.trim(),
      secuenciaDetenido: document.getElementById('secuenciaDetenido').value.trim(),
      ts: new Date().toISOString()
    };
    if (!data.nombreDetenido || !data.fechaDetenido) return showToast("Nombre y fecha son obligatorios.", "warning");
    await addSubdocument('detenidos', data, document.getElementById('formDetenidos'), cargarListadoDetenidos);
});
async function cargarListadoDetenidos() {
    const snap = await loadSubdocumentList('detenidos', document.getElementById('listadoDetenidos'), '#headingDetenidos .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.nombreDetenido}</b> - ${formatoFecha(d.fechaDetenido)}<br><small>Delito: ${d.delitoDetenido} | Nac: ${d.nacionalidadDetenido}</small></span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('detenidos', '${id}', cargarListadoDetenidos)"><i class="bi bi-trash"></i></button>
        </div>`, 'fechaDetenido');
    const snapPrevistos = await getDocs(collection(db, COLECCION_OPERACIONES, idOperacionActual, "detenidosPrevistos"));
    actualizarIndicador('#headingDetenidos .data-indicator', !snap.empty || !snapPrevistos.empty);
}

// --- Detenidos Previstos ---
document.getElementById('btnAñadirPrevisto').addEventListener('click', async () => {
    const data = { nombrePrevisto: document.getElementById('nombrePrevisto').value.trim(), nacionalidadPrevisto: document.getElementById('nacionalidadPrevisto').value.trim(), delitoPrevisto: document.getElementById('delitoPrevisto').value.trim(), ts: new Date().toISOString() };
    if (!data.nombrePrevisto) return showToast("El nombre es obligatorio.", "warning");
    await addSubdocument('detenidosPrevistos', data, document.getElementById('formDetenidosPrevistos'), cargarListadoDetenidosPrevistos);
});
async function cargarListadoDetenidosPrevistos() {
    const snap = await loadSubdocumentList('detenidosPrevistos', document.getElementById('listadoDetenidosPrevistos'), '#headingDetenidos .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.nombrePrevisto}</b> | Nac: ${d.nacionalidadPrevisto} | Delito: ${d.delitoPrevisto}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('detenidosPrevistos', '${id}', cargarListadoDetenidosPrevistos)"><i class="bi bi-trash"></i></button>
        </div>`);
    const snapDetenidos = await getDocs(collection(db, COLECCION_OPERACIONES, idOperacionActual, "detenidos"));
    actualizarIndicador('#headingDetenidos .data-indicator', !snap.empty || !snapDetenidos.empty);
}

// --- Otras Personas ---
document.getElementById('btnAñadirOtraPersona').addEventListener('click', async () => {
    const data = { filiacionOtraPersona: document.getElementById('filiacionOtraPersona').value.trim(), tipoVinculacion: document.getElementById('tipoVinculacion').value.trim(), nacionalidadOtraPersona: document.getElementById('nacionalidadOtraPersona').value.trim(), telefonoOtraPersona: document.getElementById('telefonoOtraPersona').value.trim(), ts: new Date().toISOString() };
    if (!data.filiacionOtraPersona) return showToast("El nombre es obligatorio.", "warning");
    await addSubdocument('otrasPersonas', data, document.getElementById('formOtrasPersonas'), cargarListadoOtrasPersonas);
});
async function cargarListadoOtrasPersonas() {
    await loadSubdocumentList('otrasPersonas', document.getElementById('listadoOtrasPersonas'), '#headingPersonasVinculadas .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><b>${d.filiacionOtraPersona}</b> (${d.tipoVinculacion}) | Nac: ${d.nacionalidadOtraPersona} | Tel: ${d.telefonoOtraPersona}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('otrasPersonas', '${id}', cargarListadoOtrasPersonas)"><i class="bi bi-trash"></i></button>
        </div>`);
}

// --- Inspecciones ---
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
    if (!casa) return showToast("El nombre de la casa es obligatorio.", "warning");

    if (checkSinOperacion.checked) {
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return showToast("La fecha es obligatoria para inspecciones sin operación.", "warning");
        const data = { casa, numFiliadas: num, numCitadas: numCit, nacionalidadesFiliadas: nacs, ts: new Date().toISOString(), idEntrada: uniqueID() };
        const docRef = doc(db, 'control_casas_citas', fecha);
        await setDoc(docRef, { datos: arrayUnion(data) }, { merge: true });
        showToast("Inspección rutinaria añadida.", "success");
    } else {
        if (!idOperacionActual) return showToast("Guarda la operación antes.", "warning");
        const data = { casa, numFiliadas: num, numCitadas: numCit, nacionalidadesFiliadas: nacs, fechaInspeccion: fechaInicio.value, ts: new Date().toISOString() };
        await addDoc(collection(db, COLECCION_OPERACIONES, idOperacionActual, "inspecciones"), data);
        showToast("Inspección añadida a la operación.", "success");
    }
    document.getElementById('formInspecciones').reset();
    checkSinOperacion.dispatchEvent(new Event('change')); // Recargar lista
});

async function cargarListadoInspecciones() {
    const listadoEl = document.getElementById('listadoInspecciones');
    listadoEl.innerHTML = "";
    let tieneDatos = false;

    if (checkSinOperacion.checked) {
        const fecha = fechaInspeccionRutinaria.value;
        if (!fecha) return actualizarIndicador('#headingInspecciones .data-indicator', false);
        const docSnap = await getDoc(doc(db, "control_casas_citas", fecha));
        if (docSnap.exists()) {
            const inspecciones = docSnap.data().datos || [];
            tieneDatos = inspecciones.length > 0;
            listadoEl.innerHTML = inspecciones.map(d => `
                <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
                    <span><b>${d.casa}</b><br><small>Filiadas: ${d.numFiliadas}, Citadas: ${d.numCitadas}. Nac: ${d.nacionalidadesFiliadas.join(', ')}</small></span>
                    <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarInspeccion(null, '${d.idEntrada}', '${fecha}')"><i class="bi bi-trash"></i></button>
                </div>`).join('');
        }
    } else {
        if (!idOperacionActual) return actualizarIndicador('#headingInspecciones .data-indicator', false);
        const snap = await getDocs(query(collection(db, COLECCION_OPERACIONES, idOperacionActual, "inspecciones"), orderBy("ts", "desc")));
        tieneDatos = !snap.empty;
        listadoEl.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
                <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
                    <span><b>${d.casa}</b> - ${formatoFecha(d.fechaInspeccion)}<br><small>Filiadas: ${d.numFiliadas}, Citadas: ${d.numCitadas}. Nac: ${d.nacionalidadesFiliadas.join(', ')}</small></span>
                    <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarInspeccion('${doc.id}')"><i class="bi bi-trash"></i></button>
                </div>`;
        }).join('');
    }
    actualizarIndicador('#headingInspecciones .data-indicator', tieneDatos);
}

window.eliminarInspeccion = (docid, idEntrada = null, fechaDoc = null) => {
    showConfirmationModal({
        title: 'Eliminar Inspección', body: '¿Seguro que quieres eliminar esta inspección?', isDanger: true,
        onConfirm: async () => {
            if (checkSinOperacion.checked && idEntrada && fechaDoc) {
                const docRef = doc(db, "control_casas_citas", fechaDoc);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const datosFiltrados = (docSnap.data().datos || []).filter(item => item.idEntrada !== idEntrada);
                    if (datosFiltrados.length === 0) await deleteDoc(docRef);
                    else await updateDoc(docRef, { datos: datosFiltrados });
                }
            } else if (docid && idOperacionActual) {
                await deleteDoc(doc(db, COLECCION_OPERACIONES, idOperacionActual, "inspecciones", docid));
            }
            cargarListadoInspecciones();
        }
    });
};

// --- Observaciones ---
document.getElementById('btnAñadirObservacion').addEventListener('click', async () => {
    const data = { comentariosObservaciones: document.getElementById('comentariosObservaciones').value.trim(), relevanteObservacion: document.getElementById('relevanteObservacion').checked, confidencialObservacion: document.getElementById('confidencialObservacion').checked, ts: new Date().toISOString() };
    if (!data.comentariosObservaciones) return showToast("Escribe un comentario.", "warning");
    await addSubdocument('observaciones', data, document.getElementById('formObservaciones'), cargarListadoObservaciones);
});
async function cargarListadoObservaciones() {
    await loadSubdocumentList('observaciones', document.getElementById('listadoObservaciones'), '#headingObservaciones .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span>${d.comentariosObservaciones} ${d.relevanteObservacion ? '<b>[R]</b>' : ''} ${d.confidencialObservacion ? '<b>[C]</b>' : ''}</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('observaciones', '${id}', cargarListadoObservaciones)"><i class="bi bi-trash"></i></button>
        </div>`);
}

// --- Pendientes ---
document.getElementById('btnAñadirPendiente').addEventListener('click', async () => {
    const data = { descripcionPendiente: document.getElementById('descripcionPendiente').value.trim(), fechaPendiente: document.getElementById('fechaPendiente').value, ts: new Date().toISOString() };
    if (!data.descripcionPendiente) return showToast("La descripción es obligatoria.", "warning");
    await addSubdocument('pendientes', data, document.getElementById('formPendientes'), cargarListadoPendientes);
});
async function cargarListadoPendientes() {
    await loadSubdocumentList('pendientes', document.getElementById('listadoPendientes'), '#headingPendientes .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span>${d.descripcionPendiente} (${formatoFecha(d.fechaPendiente)})</span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarSubdocumento('pendientes', '${id}', cargarListadoPendientes)"><i class="bi bi-trash"></i></button>
        </div>`, 'fechaPendiente');
}

// --- Lógica para Documentos con subida a Storage ---
document.getElementById('btnAñadirDocumento').addEventListener('click', () => {
    if (!idOperacionActual) return showToast("Guarda la operación antes de subir archivos.", "warning");
    const files = document.getElementById('adjuntosDoc').files;
    if (files.length === 0) return showToast("Selecciona al menos un archivo.", "warning");

    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    
    Array.from(files).forEach(file => {
        const filePath = `${COLECCION_OPERACIONES}/${idOperacionActual}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        progressContainer.classList.remove('d-none');

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = progress + '%';
            }, 
            (error) => {
                console.error("Error subiendo archivo:", error);
                showToast(`Error al subir ${file.name}: ${error.code}`, "error");
                progressContainer.classList.add('d-none');
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const docData = { nombre: file.name, url: downloadURL, path: filePath, size: file.size, type: file.type, ts: new Date().toISOString() };
                await addDoc(collection(db, COLECCION_OPERACIONES, idOperacionActual, "documentos"), docData);
                showToast(`Archivo "${file.name}" subido.`, "success");
                cargarListadoDocumentos();
                progressContainer.classList.add('d-none');
                document.getElementById('formDocumentacion').reset();
            }
        );
    });
});

async function cargarListadoDocumentos() {
    await loadSubdocumentList('documentos', document.getElementById('listadoDocumentos'), '#headingDocumentacion .data-indicator', (id, d) => `
        <div class="dato-item border-bottom py-1 d-flex justify-content-between align-items-center">
            <span><a href="${d.url}" target="_blank"><i class="bi bi-file-earmark-arrow-down"></i> ${d.nombre}</a> <small class="text-muted">(${(d.size / 1024).toFixed(1)} KB)</small></span>
            <button class="btn btn-sm btn-outline-danger ms-2" title="Eliminar" onclick="window.eliminarDocumento('${id}', '${d.path}')"><i class="bi bi-trash"></i></button>
        </div>`);
}

window.eliminarDocumento = (docId, filePath) => {
    showConfirmationModal({
        title: 'Eliminar Documento',
        body: 'Se borrará de la base de datos y del almacenamiento.',
        isDanger: true,
        onConfirm: async () => {
            if (!idOperacionActual) return;
            try {
                await deleteDoc(doc(db, COLECCION_OPERACIONES, idOperacionActual, "documentos", docId));
                await deleteObject(ref(storage, filePath));
                showToast("Documento eliminado.", "success");
                cargarListadoDocumentos();
            } catch (error) {
                console.error("Error eliminando documento:", error);
                showToast(`Error al eliminar: ${error.message}`, "error");
            }
        }
    });
};

// ======= FUNCIONES GLOBALES DE GESTIÓN =======
function limpiarTodosLosListados() {
    document.querySelectorAll('.listado-dinamico').forEach(listado => listado.innerHTML = "");
    document.querySelectorAll('.data-indicator').forEach(el => el.className = 'data-indicator me-2 empty');
}

function cargarTodosLosListados() {
    if (!idOperacionActual) return;
    cargarListadoJuzgados();
    cargarListadoInhibiciones();
    cargarListadoHistoricoJuzgados();
    cargarListadoIntervenciones();
    cargarListadoSolicitudesJudiciales();
    cargarListadoColaboraciones();
    cargarListadoCronologia();
    cargarListadoDetenidos();
    cargarListadoDetenidosPrevistos();
    cargarListadoOtrasPersonas();
    cargarListadoInspecciones();
    cargarListadoDocumentos();
    cargarListadoObservaciones();
    cargarListadoPendientes();
}

window.eliminarSubdocumento = (subcoleccion, docid, callback) => {
    showConfirmationModal({
        title: 'Confirmar Eliminación',
        body: '¿Seguro que quieres eliminar este elemento?',
        isDanger: true,
        onConfirm: async () => {
            if (!idOperacionActual) return;
            await deleteDoc(doc(db, COLECCION_OPERACIONES, idOperacionActual, subcoleccion, docid));
            if (callback) callback();
            showToast("Elemento eliminado.", "success");
        }
    });
};

// ======= INFORME AUTOMÁTICO =======
btnGenerarInforme.addEventListener('click', async () => {
    if (!idOperacionActual) return showToast("Carga una operación primero.", "warning");
    showToast("Generando informe...", "info");
    // Lógica del informe...
});

// ======= INICIALIZACIÓN DE LA APLICACIÓN =======
document.addEventListener('DOMContentLoaded', () => {
  bsConfirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  
  anioOperacion.value = new Date().getFullYear();
  fechaInicio.value = getFechaYYYYMMDD();
  document.getElementById('fechaHistoricoJuzgado').value = getFechaYYYYMMDD();
  document.getElementById('fechaInhibicion').value = getFechaYYYYMMDD();
  document.getElementById('fechaColaboracion').value = getFechaYYYYMMDD();
  document.getElementById('fechaCronologia').value = getFechaYYYYMMDD();
  document.getElementById('fechaDetenido').value = getFechaYYYYMMDD();
  document.getElementById('fechaPendiente').value = getFechaYYYYMMDD();
  
  cargarOperacionesEnSelect();
  btnGuardarOperacion.disabled = false;
  codigoWarning.classList.add("d-none");
  btnEliminarOperacion.classList.add('d-none');
  btnGenerarInforme.classList.add('d-none');
  limpiarTodosLosListados();
});
