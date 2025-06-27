/****************************************************************************************
* SIREX · Gestión Avanzada - VERSIÓN MEJORADA Y COMPLETA
* Formulario reestructurado y con todos los campos de los partes diarios.
* Funcionalidad de guardado, carga, resumen y exportación 100% compatible.
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

// ---- IDs de todos los campos del formulario ----
const formFields = [
    "tipoTramite", "datosGestionado", "descripcionTramite", "observaciones",
    "entrevistasAsilo", "entrevistasAsiloFallos", "citas", "citasFaltan", "renunciasAsilo",
    "citasTelAsilo", "citasTelCartas", "renunciasUcrania", "correosUcrania",
    "cartasConcedidas", "cartasDenegadas", "cartasFallan", "devolucionesTasas",
    "citasSubdelegacion", "tarjetasSubdelegacion", "cues", "certificadosBailen",
    "asignaciones", "prorrogasEstancia", "declaracionEntrada", "protecciones",
    "menas", "presentados", "atencionPublico", "cajaOAR", "notificacionesConcedidas",
    "notificacionesDenegadas", "modificacionesFavorables", "modificacionesDesfavorables",
    "oficios", "correosProtcInternacional", "telefonemas", "correoSubdelegacion", "anulacion"
];

// ---- Limpieza y lectura de formulario ----
function limpiarForm() {
  $("formGestion")?.reset();
  formFields.forEach(id => {
    if ($(id)) {
        const isTextInput = $(id).type === 'text' || $(id).tagName === 'TEXTAREA';
        $(id).value = isTextInput ? "" : 0;
    }
  });
  if ($("fechaRegistro")) $("fechaRegistro").value = new Date().toISOString().slice(0, 10);
  mostrarResumen();
}

function leerForm() {
  const data = {};
  formFields.forEach(id => {
    if ($(id)) {
        const isTextInput = $(id).type === 'text' || $(id).tagName === 'TEXTAREA';
        data[id] = isTextInput ? $(id).value.trim() : (parseInt($(id).value) || 0);
    }
  });
  return data;
}

function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  f.setMinutes(f.getMinutes() + f.getTimezoneOffset()); // Ajuste a UTC
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
  mostrarResumen();
}

async function cargarRegistro() {
  const fecha = $("fechaRegistro").value;
  if (!fecha) return alert("Selecciona la fecha");
  const docId = "gestion_" + fecha.replace(/-/g, "");
  const doc = await db.collection(NOMBRE_COLECCION).doc(docId).get();
  if (!doc.exists) return alert("No hay registro en esa fecha.");
  const d = doc.data();
  formFields.forEach(id => {
      if ($(id) && typeof d[id] !== "undefined" && d[id] !== null) {
          $(id).value = d[id];
      }
  });
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
  if (!validateBeforeSave(false)) { // No mostrar alerta, solo chequear
    $("panelResumen").style.display = "none";
    return;
  }
  $("resumenRegistro").innerHTML = `
    <b>Tipo de trámite:</b> ${d.tipoTramite || "—"}<br>
    <b>Datos gestionado:</b> ${d.datosGestionado || "—"}<br>
    <hr>
    <b>Asilo y Citas:</b> Entrevistas: ${d.entrevistasAsilo} (fallan ${d.entrevistasAsiloFallos}) | Citas: ${d.citas} (faltan ${d.citasFaltan}) | Renuncias Asilo: ${d.renunciasAsilo}<br>
    <b>Cartas Invitación:</b> Concedidas: ${d.cartasConcedidas}, Denegadas: ${d.cartasDenegadas}, Fallan: ${d.cartasFallan}<br>
    <b>Subdelegación/Bailén:</b> Citas Sub.: ${d.citasSubdelegacion}, Tarjetas: ${d.tarjetasSubdelegacion}, CUEs: ${d.cues}, Certificados: ${d.certificadosBailen}<br>
    <b>Comunicaciones:</b> Oficios: ${d.oficios}, Correos Prot. Int: ${d.correosProtcInternacional}, Telefonemas: ${d.telefonemas}<br>
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

  const numericFields = formFields.filter(id => {
      const el = $(id);
      return el && el.type === 'number';
  });
  const agg = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});

  let detalle = "";
  resumenes.forEach(r => {
    numericFields.forEach(k => agg[k] += +r[k] || 0);
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b>: 
      Entrevistas: ${r.entrevistasAsilo||0} (fallos ${r.entrevistasAsiloFallos||0}), 
      Citas: ${r.citas||0} (faltan ${r.citasFaltan||0}), 
      Cartas: C:${r.cartasConcedidas||0} D:${r.cartasDenegadas||0} F:${r.cartasFallan||0}, 
      CUEs: ${r.cues||0}, Asig. NIE: ${r.asignaciones||0}
      </li>`;
  });
  
  $("divResumenFechas").innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>Entrevistas asilo</b>: ${agg.entrevistasAsilo} (Fallos: ${agg.entrevistasAsiloFallos})</li>
      <li><b>Citas ofertadas</b>: ${agg.citas} (Faltan: ${agg.citasFaltan})</li>
      <li><b>Cartas de invitación</b>: Concedidas: ${agg.cartasConcedidas}, Denegadas: ${agg.cartasDenegadas}, Fallan: ${agg.cartasFallan}</li>
      <li><b>CUEs</b>: ${agg.cues} | <b>Certificados (Bailén)</b>: ${agg.certificadosBailen} | <b>Asignaciones NIE</b>: ${agg.asignaciones}</li>
      <li><b>Notificaciones</b>: Concedidas: ${agg.notificacionesConcedidas}, Denegadas: ${agg.notificacionesDenegadas}</li>
      <li><b>Modif. Telemáticas</b>: Favorables: ${agg.modificacionesFavorables}, Desfavorables: ${agg.modificacionesDesfavorables}</li>
      <li><b>Presentados</b>: ${agg.presentados} | <b>MENAs</b>: ${agg.menas}</li>
    </ul>
    <details><summary>Ver detalle diario</summary><ul>${detalle}</ul></details>
  `;
  window._resumenesFiltrados = resumenes;
};

function generateHTMLReport(resumenes) {
    let html = `<h2>Resumen de Gestión</h2>
    <h4>Del ${formatoFechaCorta($("resumenDesde").value)} al ${formatoFechaCorta($("resumenHasta").value)}</h4>`;
    resumenes.forEach(r => {
        html += `<hr><b>${formatoFechaCorta(r.fecha)}</b><ul>`;
        if (r.tipoTramite) html += `<li><b>Trámite:</b> ${r.tipoTramite}</li>`;
        if (r.datosGestionado) html += `<li><b>Gestionado:</b> ${r.datosGestionado}</li>`;
        
        const numericFieldsToShow = numericFields.filter(f => r[f]); // Mostrar solo campos con valor
        numericFieldsToShow.forEach(field => {
            html += `<li><b>${$(field).labels[0].innerText}:</b> ${r[field]}</li>`;
        });

        if (r.observaciones) html += `<li><b>Observaciones:</b> ${r.observaciones}</li>`;
        html += `</ul>`;
    });
    return html;
}

$("btnExportarPDF").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length === 0) {
    return alert("Primero genera un resumen de fechas.");
  }
  const html = generateHTMLReport(window._resumenesFiltrados);
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Gestión</title></head><body>${html}</body></html>`);
  w.print();
};

$("btnWhatsapp").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length === 0) {
    return alert("Primero genera un resumen de fechas.");
  }
  let resumen = `*Resumen Gestión SIREX*\n*${formatoFechaCorta($("resumenDesde").value)} al ${formatoFechaCorta($("resumenHasta").value)}:*\n\n`;
  window._resumenesFiltrados.forEach(r => {
    resumen += `*${formatoFechaCorta(r.fecha)}*:\n`;
    resumen += `Citas: ${r.citas||0} (fallos ${r.citasFaltan||0})\n`;
    resumen += `Asilo: ${r.entrevistasAsilo||0} (fallos ${r.entrevistasAsiloFallos||0})\n`;
    resumen += `Cartas: C:${r.cartasConcedidas||0}, D:${r.cartasDenegadas||0}, F:${r.cartasFallan||0}\n`;
    resumen += `CUEs: ${r.cues||0}, Asig.NIE: ${r.asignaciones||0}\n\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(() => alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(() => alert("No se pudo copiar. Actualiza el navegador."));
};

$("btnExportarCSV").onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length === 0) {
    return alert("Primero genera un resumen de fechas.");
  }
  const headers = ["Fecha", ...formFields];
  let csv = headers.join(",") + "\n";
  window._resumenesFiltrados.forEach(r => {
    const row = [r.fecha, ...formFields.map(field => {
        const value = r[field] || "";
        return `"${String(value).replace(/"/g, '""')}"`;
    })];
    csv += row.join(",") + "\n";
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumen_gestion.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
};

// ---- Buscador y Modo oscuro ----
$("btnBuscar").onclick = async function() {
  let q = prompt("¿Qué palabra quieres buscar en registros (en 'Datos gestionado' u 'Observaciones')?");
  if (!q) return;
  const col = db.collection(NOMBRE_COLECCION);
  const snap = await col.get();
  let resultados = [];
  snap.forEach(docSnap => {
    let d = docSnap.data();
    let str = [d.datosGestionado, d.observaciones].join(" ").toLowerCase();
    if (str.includes(q.toLowerCase())) resultados.push(d);
  });
  if (!resultados.length) return alert("No se encontraron resultados.");
  $("divResumenFechas").innerHTML = resultados.map(r =>
    `<div style="padding:6px;margin-bottom:7px;background:#e1f7ff;border-radius:9px;">
      <b>${r.fecha}</b> · ${(r.datosGestionado||"").slice(0,50)}...
      <button onclick="cargarPorFecha('${r.fecha}')">Ver</button>
    </div>`
  ).join("");
};

$("btnDarkMode").onclick = function() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem("sirex_darkmode", document.body.classList.contains('dark-mode') ? "1" : "0");
};
if (localStorage.getItem("sirex_darkmode") === "1") document.body.classList.add('dark-mode');


// ---- Validación y Carga Inicial ----
function validateBeforeSave(showAlert = true) {
  const data = leerForm();
  const hasData = formFields.some(field => {
      if (typeof data[field] === 'string') return data[field].length > 0;
      if (typeof data[field] === 'number') return data[field] > 0;
      return false;
  });
  if (!hasData && showAlert) {
    alert("El registro está vacío, añade al menos un dato o una observación.");
    return false;
  }
  return hasData;
}

window.onload = function() {
  $("btnGuardar").onclick = guardarRegistro;
  $("btnCargar").onclick = cargarRegistro;
  $("btnNuevo").onclick = nuevoRegistro;
  $("btnEliminar").onclick = eliminarRegistro;
  
  cargarHistorial();
  limpiarForm();
};
