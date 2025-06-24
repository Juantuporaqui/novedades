// Inicializa Firebase
const firebaseConfig = {
  // ... tus claves aquí ...
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DOM Elements
const form = document.getElementById('formGestion');
const fechaGestion = document.getElementById('fechaGestion');
const tipoTramite = document.getElementById('tipoTramite');
const datosGestionado = document.getElementById('datosGestionado');
const descripcionTramite = document.getElementById('descripcionTramite');
const menas = document.getElementById('menas');
const asilos = document.getElementById('asilos');
const citas = document.getElementById('citas');
const cues = document.getElementById('cues');
const asignaciones = document.getElementById('asignaciones');
const protecciones = document.getElementById('protecciones');
const observaciones = document.getElementById('observaciones');
const resumenDiv = document.getElementById('resumenGestion');
const selectRegistros = document.getElementById('selectRegistros');
const historialLista = document.getElementById('historialLista');

let fechaActual = null;
let resumenCache = [];

// Helpers
function showToast(msg) { alert(msg); }

function limpiarForm() {
  form.reset();
  fechaGestion.value = new Date().toISOString().slice(0,10);
  fechaActual = fechaGestion.value;
}

// Cargar lista registros para selector/historial
async function cargarListaRegistros() {
  selectRegistros.innerHTML = "";
  historialLista.innerHTML = "";
  const snapshot = await db.collection("gestion").orderBy("fecha").get();
  let primero = true;
  snapshot.forEach(doc => {
    const data = doc.data();
    // Selector
    const opt = document.createElement("option");
    opt.value = data.fecha;
    opt.text = data.fecha + (data.tipoTramite ? " · " + data.tipoTramite : "");
    selectRegistros.appendChild(opt);

    // Histórico lateral
    const item = document.createElement("div");
    item.className = "histo-item";
    item.innerHTML = `<i class="bi bi-calendar3"></i> <b>${data.fecha}</b> <span>${data.tipoTramite || ""}</span>`;
    item.onclick = () => cargarRegistro(data.fecha);
    historialLista.appendChild(item);

    // Seleccionar el último por defecto
    if (primero) {
      selectRegistros.value = data.fecha;
      primero = false;
    }
  });
}

// Guardar registro
form.addEventListener('submit', async function(e) {
  e.preventDefault();
  const datos = {
    fecha: fechaGestion.value,
    tipoTramite: tipoTramite.value,
    datosGestionado: datosGestionado.value,
    descripcionTramite: descripcionTramite.value,
    menas: parseInt(menas.value) || 0,
    asilos: parseInt(asilos.value) || 0,
    citas: parseInt(citas.value) || 0,
    cues: parseInt(cues.value) || 0,
    asignaciones: parseInt(asignaciones.value) || 0,
    protecciones: parseInt(protecciones.value) || 0,
    observaciones: observaciones.value
  };
  await db.collection("gestion").doc(datos.fecha).set(datos);
  showToast("Registro guardado correctamente");
  cargarListaRegistros();
});

// Cargar registro en formulario
async function cargarRegistro(fecha) {
  const doc = await db.collection("gestion").doc(fecha).get();
  if (!doc.exists) { showToast("No hay datos en esa fecha"); return; }
  const d = doc.data();
  fechaGestion.value = d.fecha;
  tipoTramite.value = d.tipoTramite || "";
  datosGestionado.value = d.datosGestionado || "";
  descripcionTramite.value = d.descripcionTramite || "";
  menas.value = d.menas || 0;
  asilos.value = d.asilos || 0;
  citas.value = d.citas || 0;
  cues.value = d.cues || 0;
  asignaciones.value = d.asignaciones || 0;
  protecciones.value = d.protecciones || 0;
  observaciones.value = d.observaciones || "";
  fechaActual = d.fecha;
}

// Botón buscar
document.getElementById('btnBuscar').onclick = () => {
  const fecha = selectRegistros.value;
  if (fecha) cargarRegistro(fecha);
};
// Botón nuevo
document.getElementById('btnNuevo').onclick = limpiarForm;

// Resumen por fechas
document.getElementById('btnResumen').onclick = async () => {
  const desde = prompt("Fecha inicio (yyyy-mm-dd):");
  const hasta = prompt("Fecha fin (yyyy-mm-dd):");
  if (!desde || !hasta) return showToast("Rango no válido.");
  const snapshot = await db.collection("gestion").get();
  let res = [];
  snapshot.forEach(doc => {
    const f = doc.id;
    if (f >= desde && f <= hasta) res.push(doc.data());
  });
  resumenCache = res;
  mostrarResumen(res);
};
function mostrarResumen(lista) {
  if (!lista.length) { resumenDiv.innerHTML = "No hay datos para ese rango."; return; }
  let html = `<table border="1" cellpadding="4"><tr>
    <th>Fecha</th><th>Tipo</th><th>MENAs</th><th>Asilos</th><th>Citas</th>
    <th>CUEs</th><th>Asignaciones</th><th>Protecciones</th></tr>`;
  lista.forEach(d => {
    html += `<tr>
      <td>${d.fecha}</td>
      <td>${d.tipoTramite || ""}</td>
      <td>${d.menas||0}</td>
      <td>${d.asilos||0}</td>
      <td>${d.citas||0}</td>
      <td>${d.cues||0}</td>
      <td>${d.asignaciones||0}</td>
      <td>${d.protecciones||0}</td>
    </tr>`;
  });
  html += "</table>";
  resumenDiv.innerHTML = html;
}

// Exportar a Excel
document.getElementById('btnExportarExcel').onclick = () => {
  if (!resumenCache.length) return showToast("Genera primero un resumen.");
  const ws = XLSX.utils.json_to_sheet(resumenCache);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Gestión");
  XLSX.writeFile(wb, "gestion_resumen.xlsx");
};
// Exportar PDF (simple: usa print)
document.getElementById('btnExportarPDF').onclick = () => {
  if (!resumenCache.length) return showToast("Genera primero un resumen.");
  window.print();
};

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
  limpiarForm();
  cargarListaRegistros();
});
