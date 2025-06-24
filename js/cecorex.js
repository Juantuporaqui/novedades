// Inicializa Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DOM refs ---
const registroSelect = document.getElementById('registroSelect');
const fechaRegistro = document.getElementById('fechaRegistro');
const btnBuscar = document.getElementById('btnBuscar');
const btnNuevo = document.getElementById('btnNuevo');
const cecorexForm = document.getElementById('cecorexForm');
const panelResumen = document.getElementById('panelResumen');
const resumenDiv = document.getElementById('resumen');

// Form fields
const turno = document.getElementById('turno');
const incoacciones = document.getElementById('incoacciones');
const consultasTel = document.getElementById('consultasTel');
const consultasEquipo = document.getElementById('consultasEquipo');
const diligenciasInforme = document.getElementById('diligenciasInforme');
const ciesConcedidos = document.getElementById('ciesConcedidos');
const ciesDenegados = document.getElementById('ciesDenegados');
const menas = document.getElementById('menas');
const observaciones = document.getElementById('observaciones');
const adjuntos = document.getElementById('adjuntos');
const tareaPendiente = document.getElementById('tareaPendiente');

// Estado
let fechaActual = null;

// Helpers
function showToast(msg) { alert(msg); }
function limpiarFormulario() { cecorexForm.reset(); }
function getDocId(fecha) { return fecha ? "cecorex_" + fecha : null; }
function getDocRef(fecha) { return db.collection("cecorex").doc(getDocId(fecha)); }

// Listar registros para selector rápido
async function cargarListaRegistros() {
  registroSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
  const snap = await db.collection("cecorex").orderBy(firebase.firestore.FieldPath.documentId()).get();
  snap.forEach(doc => {
    if (doc.id.startsWith("cecorex_")) {
      const fecha = doc.id.replace("cecorex_", "");
      registroSelect.innerHTML += `<option value="${fecha}">${fecha}</option>`;
    }
  });
}

// Buscar
btnBuscar.addEventListener('click', async () => {
  const fecha = registroSelect.value || fechaRegistro.value;
  if (!fecha) { showToast("Selecciona fecha."); return; }
  cargarRegistro(fecha);
});

btnNuevo.addEventListener('click', () => {
  limpiarFormulario();
  panelResumen.style.display = "none";
  fechaRegistro.value = "";
  registroSelect.value = "";
  fechaActual = null;
});

// Cargar al cambiar selector rápido
registroSelect.addEventListener('change', () => {
  if (registroSelect.value) cargarRegistro(registroSelect.value);
});

// Guardar
cecorexForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fecha = fechaRegistro.value;
  if (!fecha) { showToast("Selecciona fecha."); return; }
  // Recogida datos
  const datos = {
    fecha,
    turno: turno.value,
    incoacciones: incoacciones.value.trim(),
    consultasTel: consultasTel.value.trim(),
    consultasEquipo: consultasEquipo.value.trim(),
    diligenciasInforme: diligenciasInforme.value.trim(),
    ciesConcedidos: ciesConcedidos.value.trim(),
    ciesDenegados: ciesDenegados.value.trim(),
    menas: menas.value.trim(),
    observaciones: observaciones.value.trim(),
    tareaPendiente: tareaPendiente.value,
    adjuntos: adjuntos.files ? Array.from(adjuntos.files).map(f=>f.name) : []
  };
  await getDocRef(fecha).set(datos, { merge:true });
  showToast("Registro guardado correctamente.");
  cargarListaRegistros();
  mostrarResumen(datos);
  panelResumen.style.display = "block";
});

// Cargar registro
async function cargarRegistro(fecha) {
  const docSnap = await getDocRef(fecha).get();
  if (!docSnap.exists) { showToast("No existe ese registro."); return; }
  const datos = docSnap.data();
  fechaRegistro.value = datos.fecha || fecha;
  turno.value = datos.turno || "";
  incoacciones.value = datos.incoacciones || "";
  consultasTel.value = datos.consultasTel || "";
  consultasEquipo.value = datos.consultasEquipo || "";
  diligenciasInforme.value = datos.diligenciasInforme || "";
  ciesConcedidos.value = datos.ciesConcedidos || "";
  ciesDenegados.value = datos.ciesDenegados || "";
  menas.value = datos.menas || "";
  observaciones.value = datos.observaciones || "";
  tareaPendiente.value = datos.tareaPendiente || "No";
  mostrarResumen(datos);
  panelResumen.style.display = "block";
}

function mostrarResumen(datos) {
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${datos.fecha || ""}<br>
    <b>Turno:</b> ${datos.turno || ""}<br>
    <b>Incoacciones:</b> ${datos.incoacciones || ""}<br>
    <b>Consultas telefónicas:</b> ${datos.consultasTel || ""}<br>
    <b>Consultas equipo:</b> ${datos.consultasEquipo || ""}<br>
    <b>Diligencias informe:</b> ${datos.diligenciasInforme || ""}<br>
    <b>CIEs concedidos:</b> ${datos.ciesConcedidos || ""}<br>
    <b>CIEs denegados:</b> ${datos.ciesDenegados || ""}<br>
    <b>MENAs:</b> ${datos.menas || ""}<br>
    <b>Observaciones / Incidencias:</b> ${datos.observaciones || ""}<br>
    <b>Archivos adjuntos:</b> ${datos.adjuntos && datos.adjuntos.length ? datos.adjuntos.join(", ") : "Ninguno"}<br>
    <b>¿Tarea pendiente?:</b> ${datos.tareaPendiente || "No"}
  `;
}

// Al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  cargarListaRegistros();
});
