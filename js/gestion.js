/****************************************************************************************
*   SIREX · Gestión Avanzada - Moderno y robusto, adaptado a tus nuevos campos          *
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
let state = {};

// ---- Limpieza y lectura de formulario ----
function limpiarForm() {
  $("formGestion").reset?.();
  [
    "tipoTramite", "datosGestionado", "descripcionTramite", "menas", "entrevistasAsilo",
    "citas", "citasFaltan",
    "cartasFallan", "cartasConcedidas", "cartasDenegadas",
    "cues", "asignaciones", "protecciones",
    "oficios", "correosProtcInternacional", "telefonemas",
    "modificacionesFavorables", "modificacionesDesfavorables",
    "citasSubdelegacion", "tarjetasSubdelegacion",
    "notificacionesConcedidas", "notificacionesDenegadas",
    "presentados", "observaciones"
  ].forEach(id => { if($(id)) $(id).value = (id === "datosGestionado" || id === "descripcionTramite" || id==="observaciones") ? "" : 0; });
  if ($("fechaRegistro")) $("fechaRegistro").value = "";
  state = {};
  mostrarResumen();
}

function leerForm() {
  return {
    tipoTramite: $("tipoTramite").value,
    datosGestionado: $("datosGestionado").value,
    descripcionTramite: $("descripcionTramite").value,
    menas: parseInt($("menas").value) || 0,
    entrevistasAsilo: parseInt($("entrevistasAsilo").value) || 0,
    citas: parseInt($("citas").value) || 0,
    citasFaltan: parseInt($("citasFaltan").value) || 0,
    cartasFallan: parseInt($("cartasFallan").value) || 0,
    cartasConcedidas: parseInt($("cartasConcedidas").value) || 0,
    cartasDenegadas: parseInt($("cartasDenegadas").value) || 0,
    cues: parseInt($("cues").value) || 0,
    asignaciones: parseInt($("asignaciones").value) || 0,
    protecciones: parseInt($("protecciones").value) || 0,
    oficios: parseInt($("oficios").value) || 0,
    correosProtcInternacional: parseInt($("correosProtcInternacional").value) || 0,
    telefonemas: parseInt($("telefonemas").value) || 0,
    modificacionesFavorables: parseInt($("modificacionesFavorables").value) || 0,
    modificacionesDesfavorables: parseInt($("modificacionesDesfavorables").value) || 0,
    citasSubdelegacion: parseInt($("citasSubdelegacion").value) || 0,
    tarjetasSubdelegacion: parseInt($("tarjetasSubdelegacion").value) || 0,
    notificacionesConcedidas: parseInt($("notificacionesConcedidas").value) || 0,
    notificacionesDenegadas: parseInt($("notificacionesDenegadas").value) || 0,
    presentados: parseInt($("presentados").value) || 0,
    observaciones: $("observaciones").value
  };
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
  const datos = { fecha, ...leerForm() };
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
  for(let k in leerForm()) {
    if($(k)) $(k).value = (typeof d[k] !== "undefined" && d[k] !== null) ? d[k] : (k === "datosGestionado" || k === "descripcionTramite" || k==="observaciones" ? "" : 0);
  }
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
  const d = leerForm();
  // Si todo está vacío, oculta
  if (
    !d.tipoTramite && !d.datosGestionado && !d.descripcionTramite &&
    !d.menas && !d.entrevistasAsilo && !d.citas && !d.citasFaltan &&
    !d.cartasFallan && !d.cartasConcedidas && !d.cartasDenegadas &&
    !d.cues && !d.asignaciones && !d.protecciones &&
    !d.oficios && !d.correosProtcInternacional && !d.telefonemas &&
    !d.modificacionesFavorables && !d.modificacionesDesfavorables &&
    !d.citasSubdelegacion && !d.tarjetasSubdelegacion &&
    !d.notificacionesConcedidas && !d.notificacionesDenegadas &&
    !d.presentados && !d.observaciones
  ) {
    $("panelResumen").style.display = "none";
    return;
  }
  $("resumenRegistro").innerHTML = `
    <b>Tipo de trámite:</b> ${d.tipoTramite || "—"}<br>
    <b>Datos gestionado:</b> ${d.datosGestionado || "—"}<br>
    <b>Descripción:</b> ${d.descripcionTramite || "—"}<br>
    <b>MENAs:</b> ${d.menas || 0}<br>
    <b>Entrevistas asilo:</b> ${d.entrevistasAsilo || 0}<br>
    <b>Citas ofertadas:</b> ${d.citas || 0} <b>Faltan:</b> ${d.citasFaltan || 0}<br>
    <b>Cartas invitación:</b> Fallan: ${d.cartasFallan||0}, Concedidas: ${d.cartasConcedidas||0}, Denegadas: ${d.cartasDenegadas||0}<br>
    <b>CUEs:</b> ${d.cues || 0}<br>
    <b>Asignaciones:</b> ${d.asignaciones || 0}<br>
    <b>Protecciones:</b> ${d.protecciones || 0}<br>
    <b>Oficios:</b> ${d.oficios || 0}<br>
    <b>Correos protc internacional:</b> ${d.correosProtcInternacional || 0}<br>
    <b>Telefonemas:</b> ${d.telefonemas || 0}<br>
    <b>Modificaciones telemáticos:</b> Favorables: ${d.modificacionesFavorables||0}, Desfavorables: ${d.modificacionesDesfavorables||0}<br>
    <b>Citas subdelegación:</b> ${d.citasSubdelegacion || 0}<br>
    <b>Tarjetas subdelegación:</b> ${d.tarjetasSubdelegacion || 0}<br>
    <b>Notificaciones concedidas:</b> ${d.notificacionesConcedidas || 0}<br>
    <b>Notificaciones denegadas:</b> ${d.notificacionesDenegadas || 0}<br>
    <b>Presentados:</b> ${d.presentados || 0}<br>
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
    menas: 0, entrevistasAsilo: 0, citas: 0, citasFaltan: 0,
    cartasFallan: 0, cartasConcedidas: 0, cartasDenegadas: 0,
    cues: 0, asignaciones: 0, protecciones: 0,
    oficios: 0, correosProtcInternacional: 0, telefonemas: 0,
    modificacionesFavorables: 0, modificacionesDesfavorables: 0,
    citasSubdelegacion: 0, tarjetasSubdelegacion: 0,
    notificacionesConcedidas: 0, notificacionesDenegadas: 0,
    presentados: 0
  };
  let detalle = "";
  resumenes.forEach(r => {
    Object.keys(agg).forEach(k => agg[k] += +r[k] || 0);
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b>: 
      MENAs: ${r.menas||0}, Entrevistas asilo: ${r.entrevistasAsilo||0}, 
      Citas: ${r.citas||0} (faltan: ${r.citasFaltan||0}), 
      Cartas: F:${r.cartasFallan||0} C:${r.cartasConcedidas||0} D:${r.cartasDenegadas||0}, 
      CUEs: ${r.cues||0}, Asig: ${r.asignaciones||0}, Prot: ${r.protecciones||0}, 
      Oficios: ${r.oficios||0}, Correos: ${r.correosProtcInternacional||0}, Tel: ${r.telefonemas||0}, 
      Modif: F:${r.modificacionesFavorables||0} D:${r.modificacionesDesfavorables||0}, 
      Citas subdel: ${r.citasSubdelegacion||0}, Tarjetas subdel: ${r.tarjetasSubdelegacion||0},
      Notif+ ${r.notificacionesConcedidas||0}, Notif- ${r.notificacionesDenegadas||0}, 
      Presentados: ${r.presentados||0}
      </li>`;
  });
  $("divResumenFechas").innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>MENAs</b>: ${agg.menas}</li>
      <li><b>Entrevistas asilo</b>: ${agg.entrevistasAsilo}</li>
      <li><b>Citas ofertadas</b>: ${agg.citas} <b>Faltan:</b> ${agg.citasFaltan}</li>
      <li><b>Cartas de invitación</b>: Fallan: ${agg.cartasFallan}, Concedidas: ${agg.cartasConcedidas}, Denegadas: ${agg.cartasDenegadas}</li>
      <li><b>CUEs</b>: ${agg.cues}</li>
      <li><b>Asignaciones</b>: ${agg.asignaciones}</li>
      <li><b>Protecciones</b>: ${agg.protecciones}</li>
      <li><b>Oficios</b>: ${agg.oficios}</li>
      <li><b>Correos protc internacional</b>: ${agg.correosProtcInternacional}</li>
      <li><b>Telefonemas</b>: ${agg.telefonemas}</li>
      <li><b>Modificaciones telemáticos</b>: Favorables ${agg.modificacionesFavorables}, Desfavorables ${agg.modificacionesDesfavorables}</li>
      <li><b>Citas subdelegación</b>: ${agg.citasSubdelegacion}</li>
      <li><b>Tarjetas subdelegación</b>: ${agg.tarjetasSubdelegacion}</li>
      <li><b>Notificaciones concedidas</b>: ${agg.notificacionesConcedidas}</li>
      <li><b>Notificaciones denegadas</b>: ${agg.notificacionesDenegadas}</li>
      <li><b>Presentados</b>: ${agg.presentados}</li>
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
        <li><b>Entrevistas asilo:</b> ${r.entrevistasAsilo||0}</li>
        <li><b>Citas ofertadas:</b> ${r.citas||0} <b>Faltan:</b> ${r.citasFaltan||0}</li>
        <li><b>Cartas invitación:</b> Fallan: ${r.cartasFallan||0}, Concedidas: ${r.cartasConcedidas||0}, Denegadas: ${r.cartasDenegadas||0}</li>
        <li><b>CUEs:</b> ${r.cues||0}</li>
        <li><b>Asignaciones:</b> ${r.asignaciones||0}</li>
        <li><b>Protecciones:</b> ${r.protecciones||0}</li>
        <li><b>Oficios:</b> ${r.oficios||0}</li>
        <li><b>Correos protc internacional:</b> ${r.correosProtcInternacional||0}</li>
        <li><b>Telefonemas:</b> ${r.telefonemas||0}</li>
        <li><b>Modificaciones telemáticos:</b> Favorables: ${r.modificacionesFavorables||0}, Desfavorables: ${r.modificacionesDesfavorables||0}</li>
        <li><b>Citas subdelegación:</b> ${r.citasSubdelegacion||0}</li>
        <li><b>Tarjetas subdelegación:</b> ${r.tarjetasSubdelegacion||0}</li>
        <li><b>Notificaciones concedidas:</b> ${r.notificacionesConcedidas||0}</li>
        <li><b>Notificaciones denegadas:</b> ${r.notificacionesDenegadas||0}</li>
        <li><b>Presentados:</b> ${r.presentados||0}</li>
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
    resumen += `${formatoFechaCorta(r.fecha)} - Tipo: ${r.tipoTramite||""}, MENAs: ${r.menas||0}, Asilo: ${r.entrevistasAsilo||0}, Citas: ${r.citas||0} (faltan: ${r.citasFaltan||0}), Cartas: F${r.cartasFallan||0} C${r.cartasConcedidas||0} D${r.cartasDenegadas||0}, CUEs: ${r.cues||0}, Asig: ${r.asignaciones||0}, Prot: ${r.protecciones||0}, Oficios: ${r.oficios||0}, Correos: ${r.correosProtcInternacional||0}, Tel: ${r.telefonemas||0}, Modif: F${r.modificacionesFavorables||0} D${r.modificacionesDesfavorables||0}, Citas subdel: ${r.citasSubdelegacion||0}, Tarjetas subdel: ${r.tarjetasSubdelegacion||0}, Notif+: ${r.notificacionesConcedidas||0}, Notif-: ${r.notificacionesDenegadas||0}, Presentados: ${r.presentados||0}\n`;
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
  let csv = "Fecha,Tipo,DatosGestionado,Descripcion,MENAs,EntrevistasAsilo,Citas,CitasFaltan,CartasFallan,CartasConcedidas,CartasDenegadas,CUEs,Asignaciones,Protecciones,Oficios,CorreosProtcInternacional,Telefonemas,ModifFavorables,ModifDesfavorables,CitasSubdelegacion,TarjetasSubdelegacion,NotifConcedidas,NotifDenegadas,Presentados,Observaciones\n";
  window._resumenesFiltrados.forEach(r => {
    csv += [
      r.fecha,
      `"${(r.tipoTramite||"").replace(/"/g,'""')}"`,
      `"${(r.datosGestionado||"").replace(/"/g,'""')}"`,
      `"${(r.descripcionTramite||"").replace(/"/g,'""')}"`,
      r.menas||0, r.entrevistasAsilo||0, r.citas||0, r.citasFaltan||0,
      r.cartasFallan||0, r.cartasConcedidas||0, r.cartasDenegadas||0,
      r.cues||0, r.asignaciones||0, r.protecciones||0, r.oficios||0,
      r.correosProtcInternacional||0, r.telefonemas||0, r.modificacionesFavorables||0, r.modificacionesDesfavorables||0,
      r.citasSubdelegacion||0, r.tarjetasSubdelegacion||0,
      r.notificacionesConcedidas||0, r.notificacionesDenegadas||0,
      r.presentados||0,
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
  menas: "Número de MENAs gestionados.",
  entrevistasAsilo: "Número de entrevistas de asilo realizadas.",
  citas: "Número de citas ofertadas.",
  citasFaltan: "Número de citas ofertadas que faltan.",
  cartasInvitacion: "Cartas de invitación gestionadas: fallan, concedidas, denegadas.",
  cartasFallan: "Cartas de invitación que han fallado.",
  cartasConcedidas: "Cartas de invitación concedidas.",
  cartasDenegadas: "Cartas de invitación denegadas.",
  cues: "CUEs tramitados (Certificados de Registro de la UE).",
  asignaciones: "Número de asignaciones gestionadas.",
  protecciones: "Número de protecciones tramitadas.",
  oficios: "Oficios realizados.",
  correosProtcInternacional: "Correos de protección internacional gestionados.",
  telefonemas: "Telefonemas realizados.",
  modificacionesTelematicos: "Modificaciones telemáticos: favorables y desfavorables.",
  modificacionesFavorables: "Modificaciones telemáticos favorables.",
  modificacionesDesfavorables: "Modificaciones telemáticos desfavorables.",
  citasSubdelegacion: "Citas gestionadas en subdelegación.",
  tarjetasSubdelegacion: "Tarjetas gestionadas en subdelegación.",
  notificacionesConcedidas: "Notificaciones concedidas.",
  notificacionesDenegadas: "Notificaciones denegadas.",
  presentados: "Número de presentados.",
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
  const d = leerForm();
  if (
    !d.tipoTramite && !d.datosGestionado && !d.descripcionTramite &&
    !d.menas && !d.entrevistasAsilo && !d.citas && !d.citasFaltan &&
    !d.cartasFallan && !d.cartasConcedidas && !d.cartasDenegadas &&
    !d.cues && !d.asignaciones && !d.protecciones &&
    !d.oficios && !d.correosProtcInternacional && !d.telefonemas &&
    !d.modificacionesFavorables && !d.modificacionesDesfavorables &&
    !d.citasSubdelegacion && !d.tarjetasSubdelegacion &&
    !d.notificacionesConcedidas && !d.notificacionesDenegadas &&
    !d.presentados && !d.observaciones
  ) {
    alert("El registro está vacío, añade al menos un dato o una observación.");
    return false;
  }
  return true;
}
