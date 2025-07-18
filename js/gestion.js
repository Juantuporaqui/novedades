/****************************************************************************************
* SIREX · Gestión Avanzada - VERSIÓN DEFINITIVA 2025
* Compatible con importación automática de novedades.js, validación avanzada, historial,
* resumen, exportación PDF/CSV/WhatsApp y Firebase. TODOS LOS CAMPOS Y FUNCIONES.
****************************************************************************************/

// ===================== CONFIGURACIÓN FIREBASE ===========================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
const NOMBRE_COLECCION = "gestion_registros";
if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const $ = id => document.getElementById(id);

// ======================= CAMPOS DEL FORMULARIO ==========================
const formFields = [
  "CITAS-AS", "FALLOS", "CITAS", "ENTRV. ASILO", "FALLOS ASILO",
  "ASILOS CONCEDIDOS", "ASILOS DENEGADOS", "CARTAS CONCEDIDAS", "CARTAS DENEGADAS",
  "PROT. INTERNACIONAL", "CITAS SUBDELEG", "TARJET. SUBDELEG", "NOTIFICACIONES CONCEDIDAS",
  "NOTIFICACIONES DENEGADAS", "PRESENTADOS", "CORREOS UCRANIA", "TELE. FAVO",
  "TELE. DESFAV", "CITAS TLFN ASILO", "CITAS TLFN CARTAS", "OFICIOS", "OBSERVACIONES"
];

// ===================== LIMPIAR Y LEER FORMULARIO ========================
function limpiarForm(dataAuto = null) {
  $("formGestion")?.reset();
  formFields.forEach(id => {
    if ($(id)) {
      const isTextInput = $(id).type === 'text' || $(id).tagName === 'TEXTAREA';
      $(id).value = (dataAuto && typeof dataAuto[id] !== "undefined")
        ? dataAuto[id]
        : (isTextInput ? "" : 0);
    }
  });
  if ($("fechaRegistro")) $("fechaRegistro").value = dataAuto?.fecha || new Date().toISOString().slice(0, 10);
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
  f.setMinutes(f.getMinutes() + f.getTimezoneOffset());
  return `${f.getDate().toString().padStart(2,"0")}/${(f.getMonth()+1).toString().padStart(2,"0")}/${f.getFullYear().toString().slice(-2)}`;
}

// ================= GUARDAR, CARGAR Y ELIMINAR REGISTROS ================
async function guardarRegistro() {
  const fecha = $("fechaRegistro").value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!validateBeforeSave()) return;
  const docId = "gestion_" + fecha.replace(/-/g, "");
  const datos = { fecha, ...leerForm() };
  const ref = db.collection(NOMBRE_COLECCION).doc(docId);

  // Si existe, avisar antes de sobrescribir
  const doc = await ref.get();
  if (doc.exists) {
    if (!confirm("Ya existe un registro para esta fecha. ¿Quieres sobrescribirlo?")) return;
  }

  await ref.set(datos);
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

// ========================= HISTORIAL DE FECHAS ===========================
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

// ====================== RESUMEN DEL REGISTRO ACTUAL ======================
function mostrarResumen() {
  const d = leerForm();
  if (!validateBeforeSave(false)) {
    $("panelResumen").style.display = "none";
    return;
  }
  $("resumenRegistro").innerHTML = `
    <b>Citas Asilo:</b> ${d["CITAS-AS"]} (fallos: ${d["FALLOS"]})<br>
    <b>Entrevistas Asilo:</b> ${d["ENTRV. ASILO"]} (fallos: ${d["FALLOS ASILO"]})<br>
    <b>Cartas Invitación:</b> Concedidas: ${d["CARTAS CONCEDIDAS"]}, Denegadas: ${d["CARTAS DENEGADAS"]}<br>
    <b>Asilos:</b> Concedidos: ${d["ASILOS CONCEDIDOS"]}, Denegados: ${d["ASILOS DENEGADOS"]}<br>
    <b>Subdelegación:</b> Citas: ${d["CITAS SUBDELEG"]}, Tarjetas: ${d["TARJET. SUBDELEG"]}<br>
    <b>Presentados:</b> ${d["PRESENTADOS"]} | <b>Oficios:</b> ${d["OFICIOS"]}<br>
    <b>Observaciones:</b> ${d["OBSERVACIONES"] || "—"}
  `;
  $("panelResumen").style.display = "block";
}

// ============= RESUMEN POR RANGO DE FECHAS, PDF, CSV, WHATSAPP ===========
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
  const numericFields = formFields.filter(id => $(id) && $(id).type === 'number');
  const agg = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
  let detalle = "";
  resumenes.forEach(r => {
    numericFields.forEach(k => agg[k] += +r[k] || 0);
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b>:
      Citas: ${r["CITAS-AS"]||0}, Fallos: ${r["FALLOS"]||0},
      Entrevistas: ${r["ENTRV. ASILO"]||0}, Fallos Entrevista: ${r["FALLOS ASILO"]||0},
      Cartas: C:${r["CARTAS CONCEDIDAS"]||0} D:${r["CARTAS DENEGADAS"]||0}
      </li>`;
  });
  $("divResumenFechas").innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>Citas asilo</b>: ${agg["CITAS-AS"]} (Fallos: ${agg["FALLOS"]})</li>
      <li><b>Entrevistas asilo</b>: ${agg["ENTRV. ASILO"]} (Fallos: ${agg["FALLOS ASILO"]})</li>
      <li><b>Cartas de invitación</b>: Concedidas: ${agg["CARTAS CONCEDIDAS"]}, Denegadas: ${agg["CARTAS DENEGADAS"]}</li>
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
    formFields.forEach(field => {
      if (r[field]) html += `<li><b>${field}:</b> ${r[field]}</li>`;
    });
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
    formFields.forEach(field => {
      if (r[field]) resumen += `${field}: ${r[field]}\n`;
    });
    resumen += `\n`;
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

// ====================== BUSCADOR Y MODO OSCURO ===========================
$("btnBuscar").onclick = async function() {
  let q = prompt("¿Qué palabra quieres buscar en las observaciones?");
  if (!q) return;
  const col = db.collection(NOMBRE_COLECCION);
  const snap = await col.get();
  let resultados = [];
  snap.forEach(docSnap => {
    let d = docSnap.data();
    let str = (d["OBSERVACIONES"] || "").toLowerCase();
    if (str.includes(q.toLowerCase())) resultados.push(d);
  });
  if (!resultados.length) return alert("No se encontraron resultados.");
  $("divResumenFechas").innerHTML = resultados.map(r =>
    `<div style="padding:6px;margin-bottom:7px;background:#e1f7ff;border-radius:9px;">
      <b>${formatoFechaCorta(r.fecha)}</b> · ${(r["OBSERVACIONES"]||"").slice(0,70)}...
      <button onclick="cargarPorFecha('${r.fecha}')">Ver</button>
    </div>`
  ).join("");
};

$("btnDarkMode").onclick = function() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem("sirex_darkmode", document.body.classList.contains('dark-mode') ? "1" : "0");
};
if (localStorage.getItem("sirex_darkmode") === "1") document.body.classList.add('dark-mode');

// ============== VALIDACIÓN Y CARGA INICIAL ===============================
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

// ==================== AUTO-IMPORT DESDE novedades.js =====================
window.autoImportGestion = function(data) {
  // Esta función será llamada por novedades.js si detecta datos compatibles para gestion_registros
  limpiarForm(data);
  alert("Parte diario gestionado auto-importado. Revisa y guarda si es correcto.");
  mostrarResumen();
};

// ===================== INICIALIZACIÓN DE EVENTOS =========================
window.onload = function() {
  $("btnGuardar").onclick = guardarRegistro;
  $("btnCargar").onclick = cargarRegistro;
  $("btnNuevo").onclick = nuevoRegistro;
  $("btnEliminar").onclick = eliminarRegistro;
  cargarHistorial();
  limpiarForm();
};
