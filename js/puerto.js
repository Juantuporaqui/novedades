// --- FIREBASE INIT ---
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

// --- UI REFS ---
const form = document.getElementById('formPuerto');
const panelResumen = document.getElementById('panelResumenPuerto');
const resumenDiv = document.getElementById('resumenPuerto');
const btnPDF = document.getElementById('btnPDF');
const btnCargar = document.getElementById('btnCargar');
const btnNuevo = document.getElementById('btnNuevo');
const fechaInput = document.getElementById('fechaPuerto');
const adjuntosInput = document.getElementById('adjuntos');

function showToast(msg) { alert(msg); }

// --- Helpers ---
function getDocIdFecha(fecha) {
  if (!fecha) return null;
  const fechaISO = new Date(fecha).toISOString().slice(0,10);
  return `puerto_${fechaISO}`;
}
function getDocRef(fecha) {
  return db.collection("grupo_puerto").doc(getDocIdFecha(fecha));
}

function limpiarFormulario() {
  form.reset();
  if (fechaInput) fechaInput.value = "";
  adjuntosInput.value = "";
  panelResumen.style.display = 'none';
}

// --- Cargar registro ---
btnCargar.addEventListener('click', async () => {
  const fecha = fechaInput.value;
  if (!fecha) return showToast("Selecciona una fecha.");
  const doc = await getDocRef(fecha).get();
  if (!doc.exists) return showToast("No hay registro para ese día.");
  cargarFormulario(doc.data());
  mostrarResumen(doc.data());
});

// --- Nuevo registro (reset) ---
btnNuevo.addEventListener('click', limpiarFormulario);

// --- Guardar registro ---
form.addEventListener('submit', async function(e){
  e.preventDefault();
  const fecha = fechaInput.value;
  if (!fecha) return showToast("Selecciona una fecha.");
  const datos = recogerDatosFormulario();
  // Adjuntos a Storage
  let adjuntosSubidos = [];
  if (adjuntosInput.files.length > 0) {
    for (let file of adjuntosInput.files) {
      const ref = storage.ref().child(`puerto/${fecha}_${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      adjuntosSubidos.push({ nombre: file.name, url });
    }
  }
  datos.adjuntos = adjuntosSubidos;
  await getDocRef(fecha).set(datos, { merge: true });
  showToast("Registro guardado en la nube.");
  mostrarResumen(datos);
});

// --- Cargar formulario (al cargar un día) ---
function cargarFormulario(datos) {
  for (const [k,v] of Object.entries(datos)) {
    if (form[k]) {
      if (form[k].type === 'file') continue;
      form[k].value = v;
    }
  }
}

// --- Recoger datos del form ---
function recogerDatosFormulario() {
  return {
    fecha: form.fechaPuerto.value,
    tipoControl: form.tipoControl.value,
    marinosArgos: parseInt(form.marinosArgos.value)||0,
    controlPasaportes: parseInt(form.controlPasaportes.value)||0,
    cruceros: parseInt(form.cruceros.value)||0,
    cruceristas: parseInt(form.cruceristas.value)||0,
    visadosValencia: parseInt(form.visadosValencia.value)||0,
    visadosCG: parseInt(form.visadosCG.value)||0,
    ferryEntradas: parseInt(form.ferryEntradas.value)||0,
    ferrySalidas: parseInt(form.ferrySalidas.value)||0,
    ferryVehiculos: parseInt(form.ferryVehiculos.value)||0,
    ferryPasajeros: parseInt(form.ferryPasajeros.value)||0,
    ferryCulminados: parseInt(form.ferryCulminados.value)||0,
    ferryExcepcionales: parseInt(form.ferryExcepcionales.value)||0,
    denegaciones: parseInt(form.denegaciones.value)||0,
    puertoDeportivo: parseInt(form.puertoDeportivo.value)||0,
    observaciones: form.observaciones.value.trim(),
    tareaPendiente: form.tareaPendiente.value,
    adjuntos: [] // se rellenará al guardar
  };
}

// --- Mostrar resumen bonito ---
function mostrarResumen(datos) {
  panelResumen.style.display = 'block';
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${datos.fecha}<br>
    <b>Tipo de control:</b> ${datos.tipoControl}<br>
    <b>Marinos chequedos en Argos:</b> ${datos.marinosArgos}<br>
    <b>Control pasaportes marinos:</b> ${datos.controlPasaportes}<br>
    <b>Cruceros:</b> ${datos.cruceros} / <b>Cruceristas:</b> ${datos.cruceristas}<br>
    <b>Visados Valencia:</b> ${datos.visadosValencia} / <b>CG:</b> ${datos.visadosCG}<br>
    <b>Ferry - Entradas:</b> ${datos.ferryEntradas}, <b>Salidas:</b> ${datos.ferrySalidas}, 
    <b>Vehículos:</b> ${datos.ferryVehiculos}, <b>Pasajeros:</b> ${datos.ferryPasajeros}<br>
    <b>Culminados EISICS:</b> ${datos.ferryCulminados}, 
    <b>Excepcionales:</b> ${datos.ferryExcepcionales}<br>
    <b>Puerto deportivo:</b> ${datos.puertoDeportivo}<br>
    <b>Denegaciones:</b> ${datos.denegaciones}<br>
    <b>Observaciones:</b> ${datos.observaciones || '---'}<br>
    <b>Archivos adjuntos:</b> ${
      (Array.isArray(datos.adjuntos) && datos.adjuntos.length) 
        ? datos.adjuntos.map(a=>`<a href="${a.url}" target="_blank">${a.nombre}</a>`).join(", ")
        : 'Ninguno'
    }<br>
    <b>Tarea pendiente:</b> ${datos.tareaPendiente}
  `;
}

// --- PDF / Imprimir ---
btnPDF.addEventListener('click', () => {
  window.print();
});

// --- Inicialización automática ---
window.addEventListener('DOMContentLoaded', () => {
  const hoy = new Date().toISOString().slice(0,10);
  fechaInput.value = hoy;
});
