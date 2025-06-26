/****************************************************************************************
*   SIREX · Gestión Avanzada - Moderno, compacto, robusto y fácil                       *
*   Basado en grupo4.js pero adaptado para el formulario de gestión                     *
****************************************************************************************/

// ---- Configuración Firebase ----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
const NOMBRE_COLECCION = "gestion_avanzada";

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const $ = id => document.getElementById(id);

// ---- Estado global ----
let state = {
  tipoTramite: "",
  datosGestionado: "",
  descripcionTramite: "",
  menas: 0,
  asilos: 0,
  citas: 0,
  cues: 0,
  asignaciones: 0,
  protecciones: 0,
  observaciones: ""
};

// ---- Utilidades ----
function limpiarForm() {
  $("formGestion").reset?.();
  $("tipoTramite").value = "";
  $("datosGestionado").value = "";
  $("descripcionTramite").value = "";
  $("menas").value = 0;
  $("asilos").value = 0;
  $("citas").value = 0;
  $("cues").value = 0;
  $("asignaciones").value = 0;
  $("protecciones").value = 0;
  $("observaciones").value = "";
  if ($("fechaRegistro")) $("fechaRegistro").value = "";
  state = {
    tipoTramite: "",
    datosGestionado: "",
    descripcionTramite: "",
    menas: 0,
    asilos: 0,
    citas: 0,
    cues: 0,
    asignaciones: 0,
    protecciones: 0,
    observaciones: ""
  };
  mostrarResumen();
}

function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  let f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${(f.getMonth()+1).toString().padStart(2,"0")}/${f.getFullYear().toString().slice(-2)}`;
}

// ---- Guardar, cargar y eliminar registros ----
async function guardarRegistro() {
  const fecha = $("fechaRegistro").value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!validateBeforeSave()) return;
  const docId = "gestion_" + fecha.replace(/-/g, "");
  // Leer valores del formulario
  const datos = {
    fecha,
    tipoTramite: $("tipoTramite").value,
    datosGestionado: $("datosGestionado").value,
    descripcionTramite: $("descripcionTramite").value,
    menas: parseInt($("menas").value) || 0,
    asilos: parseInt($("asilos").value) || 0,
    citas: parseInt($("citas").value) || 0,
    cues: parseInt($("cues").value) || 0,
    asignaciones: parseInt($("asignaciones").value) || 0,
    protecciones: parseInt($("protecciones").value) || 0,
    observaciones: $("observaciones").value
  };
  await db.collection(NOMBRE_COLECCION).doc(docId).set(datos);
  alert("¡Registro guardado!");
  cargarHistorial();
  state = {...datos};
  mostrarResumen();
}

async function cargarRegistro() {
  const fecha = $("fechaRegistro").value;
  if (!fecha) return alert("Selecciona la fecha");
  const docId = "gestion_" + fecha.replace(/-/g, "");
  const doc = await db.collection(NOMBRE_COLECCION).doc(docId).get();
  if (!doc.exists) return alert("No hay registro en esa fecha.");
  const d = doc.data();
  $("tipoTramite").value = d.tipoTramite || "";
  $("datosGestionado").value = d.datosGestionado || "";
  $("descripcionTramite").value = d.descripcionTramite || "";
  $("menas").value = d.menas || 0;
  $("asilos").value = d.asilos || 0;
  $("citas").value = d.citas || 0;
  $("cues").value = d.cues || 0;
  $("asignaciones").value = d.asignaciones || 0;
  $("protecciones").value = d.protecciones || 0;
  $("observaciones").value = d.observaciones || "";
  state = {...d};
  mostrarResumen();
}

function nuevoRegistro() {
  if (confirm("¿Limpiar el formulario para nuevo registro?")) limpiarForm();
}

async function eliminarRegistro() {
  const fecha = $("fechaRegistro").value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!confirm("¿Eliminar el registro de esta fecha?")) return;
  const docId = "gestion_" + fecha.replace(/-/g, "");
  await db.collection(NOMBRE_COLECCION).doc(docId).delete();
  limpiarForm();
  alert("Registro eliminado.");
  cargarHistorial();
}

// ---- Historial ----
async function cargarHistorial() {
  const snap = await db.collection(NOMBRE_COLECCION).orderBy("fecha", "desc").limit(10).get();
  if ($("historialFechas")) {
    $("historialFechas").innerHTML = Array.from(snap.docs).map(doc => {
      const f = doc.data().fecha;
      return `<button type="button" class="btn-historial" onclick="cargarPorFecha('${f}')">${formatoFechaCorta(f)}</button>`;
    }).join('');
  }
}
window.cargarPorFecha = async function(fecha) {
  $("fechaRegistro").value = fecha;
  cargarRegistro();
};

// ---- Resumen del registro ----
function mostrarResumen() {
  const d = {
    tipoTramite: $("tipoTramite").value,
    datosGestionado: $("datosGestionado").value,
    descripcionTramite: $("descripcionTramite").value,
    menas: $("menas").value,
    asilos: $("asilos").value,
    citas: $("citas").value,
    cues: $("cues").value,
    asignaciones: $("asignaciones").value,
    protecciones: $("protecciones").value,
    observaciones: $("observaciones").value
  };
  // Si todo está vacío, oculta
  if (
    !d.tipoTramite && !d.datosGestionado && !d.descripcionTramite &&
    !parseInt(d.menas) && !parseInt(d.asilos) && !parseInt(d.citas) &&
    !parseInt(d.cues) && !parseInt(d.asignaciones) && !parseInt(d.protecciones) &&
    !d.observaciones
  ) {
    $("panelResumen").style.display = "none";
    return;
  }
  $("resumenRegistro").innerHTML = `
    <b>Tipo de trámite:</b> ${d.tipoTramite || "—"}<br>
    <b>Datos gestionado:</b> ${d.datosGestionado || "—"}<br>
    <b>Descripción:</b> ${d.descripcionTramite || "—"}<br>
    <b>MENAs:</b> ${d.menas || 0}<br>
    <b>Asilos:</b> ${d.asilos || 0}<br>
    <b>Citas ofertadas:</b> ${d.citas || 0}<br>
    <b>CUEs:</b> ${d.cues || 0}<br>
    <b>Asignaciones:</b> ${d.asignaciones || 0}<br>
    <b>Protecciones:</b> ${d.protecciones || 0}<br>
    <b>Observaciones:</b> ${d.observaciones || "—"}
  `;
  $("panelResumen").style.display = "block";
}

// ---- Resumen por fechas, PDF, CSV, WhatsApp ----
window._resumenesFiltrados = [];

$("btnResumenFechas").onclick = async function() {
  const desde = $("resumenDesde").value;
  const hasta = $("resumenHasta").value;
  if (!desde || !hasta) return alert("Selecciona ambas fechas");
  const col = db.collection(NOMBRE_COLECCION);
  const snap = await col.get();
  let resumenes = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.fecha >= desde && data.fecha <= hasta) resumenes.push(data);
  });
  if (!resumenes.length) {
    $("divResumenFechas").innerHTML = "<i>No hay registros en este rango de fechas</i>";
    window._resumenesFiltrados = [];
    return;
  }
  // Totales
  const agg = {
    menas: 0, asilos: 0, citas: 0, cues: 0, asignaciones: 0, protecciones: 0
  };
  let detalle = "";
  resumenes.forEach(r => {
    agg.menas += +r.menas || 0;
    agg.asilos += +r.asilos || 0;
    agg.citas += +r.citas || 0;
    agg.cues += +r.cues || 0;
    agg.asignaciones += +r.asignaciones || 0;
    agg.protecciones += +r.protecciones || 0;
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b>: 
      MENAs: ${r.menas||0}, Asilos: ${r.asilos||0}, Citas: ${r.citas||0}, 
      CUEs: ${r.cues||0}, Asignaciones: ${r.asignaciones||0}, Protecciones: ${r.protecciones||0}
      </li>`;
  });
  $("divResumenFechas").innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>MENAs</b>: ${agg.menas}</li>
      <li><b>Asilos</b>: ${agg.asilos}</li>
      <li><b>Citas ofertadas</b>: ${agg.citas}</li>
      <li><b>CUEs</b>: ${agg.cues}</li>
      <li><b>Asignaciones</b>: ${agg.asignaciones}</li>
      <li><b>Protecciones</b>: ${agg.protecciones}</li>
    </ul>
    <details><summary>Ver detalle diario</summary><ul>${detalle}</ul></details>
  `;
  window._resumenesFiltrados = resumenes;
};

$("btnExportarPDF").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let html = `<h2>Resumen de Gestión</h2>
  <h4>Del ${formatoFechaCorta($("resumenDesde").value)} al ${formatoFechaCorta($("resumenHasta").value)}</h4>`;
  window._resumenesFiltrados.forEach(r=>{
    html += `<hr><b>${formatoFechaCorta(r.fecha)}</b>
      <ul>
        <li><b>Tipo de trámite:</b> ${r.tipoTramite||""}</li>
        <li><b>MENAs:</b> ${r.menas||0}</li>
        <li><b>Asilos:</b> ${r.asilos||0}</li>
        <li><b>Citas ofertadas:</b> ${r.citas||0}</li>
        <li><b>CUEs:</b> ${r.cues||0}</li>
        <li><b>Asignaciones:</b> ${r.asignaciones||0}</li>
        <li><b>Protecciones:</b> ${r.protecciones||0}</li>
        <li><b>Observaciones:</b> ${r.observaciones||""}</li>
      </ul>`;
  });
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Gestión</title></head><body>${html}</body></html>`);
  w.print();
};

$("btnWhatsapp").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let resumen = `Resumen Gestión SIREX\n${formatoFechaCorta($("resumenDesde").value)} al ${formatoFechaCorta($("resumenHasta").value)}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${formatoFechaCorta(r.fecha)} - Tipo: ${r.tipoTramite||""}, MENAs: ${r.menas||0}, Asilos: ${r.asilos||0}, Citas: ${r.citas||0}, CUEs: ${r.cues||0}, Asig: ${r.asignaciones||0}, Prot: ${r.protecciones||0}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};

$("btnExportarCSV").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let csv = "Fecha,Tipo,DatosGestionado,Descripcion,MENAs,Asilos,Citas,CUEs,Asignaciones,Protecciones,Observaciones\n";
  window._resumenesFiltrados.forEach(r => {
    csv += [
      r.fecha,
      `"${(r.tipoTramite||"").replace(/"/g,'""')}"`,
      `"${(r.datosGestionado||"").replace(/"/g,'""')}"`,
      `"${(r.descripcionTramite||"").replace(/"/g,'""')}"`,
      r.menas||0, r.asilos||0, r.citas||0, r.cues||0, r.asignaciones||0, r.protecciones||0,
      `"${(r.observaciones||"").replace(/"/g,'""')}"`
    ].join(",") + "\n";
  });
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumen_gestion.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
};

// ---- Ayuda contextual ----
const ayudas = {
  tipoTramite: "Tipo de trámite gestionado (ejemplo: Asilo, Reagrupación, Carta Invitación...).",
  datosGestionado: "Datos relevantes del gestionado: nombre, NIE, nacionalidad, etc.",
  descripcionTramite: "Descripción breve del trámite realizado.",
  menas: "Número de MENAs (menores extranjeros no acompañados) gestionados en la fecha.",
  asilos: "Número de expedientes de asilo tramitados.",
  citas: "Número de citas ofertadas.",
  cues: "CUEs tramitados (Certificados de Registro de la UE).",
  asignaciones: "Número de asignaciones gestionadas.",
  protecciones: "Número de protecciones tramitadas.",
  observaciones: "Observaciones relevantes, incidencias, aclaraciones..."
};
document.querySelectorAll('.ayuda-btn').forEach(btn => {
  btn.onclick = () => {
    alert(ayudas[btn.dataset.seccion] || "Sección no documentada.");
  };
});

// ---- Buscador ----
$("btnBuscar").onclick = async function() {
  let q = prompt("¿Qué palabra quieres buscar en registros?");
  if(!q) return;
  const col = db.collection(NOMBRE_COLECCION);
  const snap = await col.get();
  let resultados = [];
  snap.forEach(docSnap => {
    let d = docSnap.data();
    let str = [
      d.tipoTramite, d.datosGestionado, d.descripcionTramite, d.observaciones
    ].join(" ").toLowerCase();
    if (str.includes(q.toLowerCase())) resultados.push(d);
  });
  if (!resultados.length) return alert("No se encontraron resultados.");
  $("divResumenFechas").innerHTML = resultados.map(r=>
    `<div style="padding:6px;margin-bottom:7px;background:#e1f7ff;border-radius:9px;">
      <b>${r.fecha}</b> · ${r.tipoTramite || ""} · Obs: ${(r.observaciones||"").slice(0,50)}...
      <button onclick="cargarPorFecha('${r.fecha}')">Ver</button>
    </div>`
  ).join("");
};

// ---- Modo oscuro ----
$("btnDarkMode").onclick = function() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem("sirex_darkmode", document.body.classList.contains('dark-mode') ? "1" : "0");
};
if (localStorage.getItem("sirex_darkmode") === "1")
  document.body.classList.add('dark-mode');

// ---- Listeners ----
window.onload = function() {
  $("btnGuardar").onclick = guardarRegistro;
  $("btnCargar").onclick = cargarRegistro;
  $("btnNuevo").onclick = nuevoRegistro;
  $("btnEliminar").onclick = eliminarRegistro;
  cargarHistorial();
  limpiarForm();
  mostrarResumen();
};

// ---- Estado de Firebase ----
window.addEventListener('load', function() {
  const statusDiv = $("statusFirebase");
  if (!statusDiv) return;
  try {
    if (firebase && firebase.apps.length) {
      statusDiv.innerHTML = '<span style="color: #388e3c;">✔️ Conectado a Firebase</span>';
    } else {
      statusDiv.innerHTML = '<span style="color: #e53935;">❌ No conectado a Firebase</span>';
    }
  } catch {
    statusDiv.innerHTML = '<span style="color: #e53935;">❌ Error de conexión Firebase</span>';
  }
});

// ---- Validación antes de guardar ----
function validateBeforeSave() {
  if (
    !$("tipoTramite").value.trim() &&
    !$("datosGestionado").value.trim() &&
    !$("descripcionTramite").value.trim() &&
    !$("observaciones").value.trim() &&
    !parseInt($("menas").value) &&
    !parseInt($("asilos").value) &&
    !parseInt($("citas").value) &&
    !parseInt($("cues").value) &&
    !parseInt($("asignaciones").value) &&
    !parseInt($("protecciones").value)
  ) {
    alert("El registro está vacío, añade al menos un dato o una observación.");
    return false;
  }
  return true;
}
