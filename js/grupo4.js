/****************************************************************************************
*   SIREX · Grupo 4 Operativo · JS compatible DOCX · Full CRUD · Robustísimo            *
*   Incluye: Añadir/cargar/eliminar, historial, resumen por fechas, PDF/CSV/WhatsApp    *
*****************************************************************************************/

// 1. Firebase INIT + helpers

const NOMBRE_COLECCION = "grupo4_operativo";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const $ = id => document.getElementById(id);

// --- Estado global ---
let state = {
  numDetenidos: 0,
  identificados: 0,
  citadosCecorex: 0,
  citadosUcrif: 0,
  detenidos: [],
  colaboraciones: [],
  inspecciones: [],
  gestiones: [],
  observaciones: ""
};

// --------- Utilidades ----------
function limpiarInputs(...ids) {
  ids.forEach(id => { if($(id)) $(id).value = ""; });
}
function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  let f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${(f.getMonth()+1).toString().padStart(2,"0")}/${f.getFullYear().toString().slice(-2)}`;
}

// --------- Añadir elementos dinámicos ----------
function addDetenido() {
  const motivo = $('detenidoMotivo').value.trim();
  const nacionalidad = $('detenidoNacionalidad').value.trim();
  const diligencias = $('detenidoDiligencias').value.trim();
  const observ = $('detenidoObservaciones').value.trim();
  if (!motivo && !nacionalidad && !diligencias && !observ) return;
  state.detenidos.push({ motivo, nacionalidad, diligencias, observaciones: observ });
  renderListas();
  limpiarInputs('detenidoMotivo','detenidoNacionalidad','detenidoDiligencias','detenidoObservaciones');
}
function addColaboracion() {
  const unidad = $('colaboracionUnidad').value.trim();
  const resultado = $('colaboracionResultado').value.trim();
  if (!unidad && !resultado) return;
  state.colaboraciones.push({ unidad, resultado });
  renderListas();
  limpiarInputs('colaboracionUnidad','colaboracionResultado');
}
function addInspeccion() {
  const trabajo = $('inspeccionTrabajo').value.trim();
  const lugar = $('inspeccionLugar').value.trim();
  const resultado = $('inspeccionResultado').value.trim();
  if (!trabajo && !lugar && !resultado) return;
  state.inspecciones.push({ trabajo, lugar, resultado });
  renderListas();
  limpiarInputs('inspeccionTrabajo','inspeccionLugar','inspeccionResultado');
}
function addGestion() {
  const descripcion = $('gestionDescripcion').value.trim();
  if (!descripcion) return;
  state.gestiones.push({ descripcion });
  renderListas();
  limpiarInputs('gestionDescripcion');
}

// --------- Renderizar listas dinámicas ----------
function renderListas() {
  // Detenidos detallados
  $('listaDetenidos').innerHTML = state.detenidos.map((e, i) =>
    `<li>${e.motivo || "-"} · ${e.nacionalidad || "-"} · ${e.diligencias || "-"} · ${e.observaciones || "-"}
      <button type="button" class="del-btn" onclick="eliminarItem('detenidos',${i})">✕</button>
    </li>`
  ).join('');
  // Colaboraciones
  $('listaColaboraciones').innerHTML = state.colaboraciones.map((e, i) =>
    `<li>${e.unidad || "-"} · ${e.resultado || "-"}
      <button type="button" class="del-btn" onclick="eliminarItem('colaboraciones',${i})">✕</button>
    </li>`
  ).join('');
  // Inspecciones
  $('listaInspecciones').innerHTML = state.inspecciones.map((e, i) =>
    `<li>${e.trabajo || "-"} · ${e.lugar || "-"} · ${e.resultado || "-"}
      <button type="button" class="del-btn" onclick="eliminarItem('inspecciones',${i})">✕</button>
    </li>`
  ).join('');
  // Gestiones Varias
  $('listaGestiones').innerHTML = state.gestiones.map((e, i) =>
    `<li>${e.descripcion}
      <button type="button" class="del-btn" onclick="eliminarItem('gestiones',${i})">✕</button>
    </li>`
  ).join('');
}
window.eliminarItem = function(tipo, idx) {
  state[tipo].splice(idx, 1);
  renderListas();
};

// --------- Guardar y cargar registros ----------
async function guardarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  // Sincroniza los campos numéricos
  state.numDetenidos = parseInt($('numDetenidos').value) || 0;
  state.identificados = parseInt($('identificados').value) || 0;
  state.citadosCecorex = parseInt($('citadosCecorex').value) || 0;
  state.citadosUcrif = parseInt($('citadosUcrif').value) || 0;
  state.observaciones = $('observaciones').value.trim();

  await db.collection(NOMBRE_COLECCION).doc(fecha).set({
    fecha, ...state
  });
  alert("¡Registro guardado!");
  cargarHistorial();
}

async function cargarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  const doc = await db.collection(NOMBRE_COLECCION).doc(fecha).get();
  if (!doc.exists) return alert("No hay registro en esa fecha.");
  const d = doc.data();
  state = {
    numDetenidos: d.numDetenidos || 0,
    identificados: d.identificados || 0,
    citadosCecorex: d.citadosCecorex || 0,
    citadosUcrif: d.citadosUcrif || 0,
    detenidos: d.detenidos || [],
    colaboraciones: d.colaboraciones || [],
    inspecciones: d.inspecciones || [],
    gestiones: d.gestiones || [],
    observaciones: d.observaciones || ""
  };
  $('numDetenidos').value = state.numDetenidos || 0;
  $('identificados').value = state.identificados || 0;
  $('citadosCecorex').value = state.citadosCecorex || 0;
  $('citadosUcrif').value = state.citadosUcrif || 0;
  $('observaciones').value = state.observaciones || "";
  renderListas();
  mostrarResumen();
}

function nuevoRegistro() {
  if (confirm("¿Limpiar el formulario para nuevo registro?")) {
    state = {
      numDetenidos: 0, identificados: 0, citadosCecorex: 0, citadosUcrif: 0,
      detenidos: [], colaboraciones: [], inspecciones: [], gestiones: [], observaciones: ""
    };
    $('numDetenidos').value = 0;
    $('identificados').value = 0;
    $('citadosCecorex').value = 0;
    $('citadosUcrif').value = 0;
    $('observaciones').value = "";
    renderListas();
    mostrarResumen();
  }
}
async function eliminarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!confirm("¿Eliminar el registro de esta fecha?")) return;
  await db.collection(NOMBRE_COLECCION).doc(fecha).delete();
  nuevoRegistro();
  alert("Registro eliminado.");
  cargarHistorial();
}

// --------- Mostrar resumen cargado -----------
function mostrarResumen() {
  $('resumenRegistro').innerHTML = `
    <b>Nº Detenidos:</b> ${state.numDetenidos || 0} <br>
    <b>Identificados:</b> ${state.identificados || 0} <br>
    <b>Citados Cecorex:</b> ${state.citadosCecorex || 0} <br>
    <b>Citados UCRIF:</b> ${state.citadosUcrif || 0} <br>
    <b>Detenidos detallados:</b> ${state.detenidos.length}
    <ul>${state.detenidos.map(e=>`<li>${e.motivo || "-"} · ${e.nacionalidad || "-"} · ${e.diligencias || "-"} · ${e.observaciones || "-"}</li>`).join("")}</ul>
    <b>Colaboraciones:</b> ${state.colaboraciones.length}
    <ul>${state.colaboraciones.map(e=>`<li>${e.unidad || "-"} · ${e.resultado || "-"}</li>`).join("")}</ul>
    <b>Inspecciones de trabajo:</b> ${state.inspecciones.length}
    <ul>${state.inspecciones.map(e=>`<li>${e.trabajo || "-"} · ${e.lugar || "-"} · ${e.resultado || "-"}</li>`).join("")}</ul>
    <b>Gestiones varias:</b> ${state.gestiones.length}
    <ul>${state.gestiones.map(e=>`<li>${e.descripcion}</li>`).join("")}</ul>
    <b>Observaciones:</b> ${state.observaciones || "—"}
  `;
  $('panelResumen').style.display = "block";
}

// --------- Cargar historial de fechas -----------
async function cargarHistorial() {
  const snap = await db.collection(NOMBRE_COLECCION).orderBy("fecha", "desc").limit(10).get();
  if ($('historialFechas')) {
    $('historialFechas').innerHTML = Array.from(snap.docs).map(doc => {
      const f = doc.data().fecha;
      return `<button type="button" class="btn-historial" onclick="cargarPorFecha('${f}')">${formatoFechaCorta(f)}</button>`;
    }).join('');
  }
}
window.cargarPorFecha = async function(fecha) {
  $('fechaRegistro').value = fecha;
  cargarRegistro();
};

// --------- Listeners y arranque ----------
window.onload = function() {
  // Listeners añadir
  $('btnAddDetenido').onclick = addDetenido;
  $('btnAddColaboracion').onclick = addColaboracion;
  $('btnAddInspeccion').onclick = addInspeccion;
  $('btnAddGestion').onclick = addGestion;

  // Botones CRUD
  $('btnGuardar').onclick = guardarRegistro;
  $('btnCargar').onclick = cargarRegistro;
  $('btnNuevo').onclick = nuevoRegistro;
  $('btnEliminar').onclick = eliminarRegistro;

  // Modo oscuro
  $('btnDarkMode').onclick = function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem("sirex_darkmode", document.body.classList.contains('dark-mode') ? "1" : "0");
  };
  if (localStorage.getItem("sirex_darkmode") === "1") document.body.classList.add('dark-mode');

  // Buscar
  $('btnBuscar').onclick = async function() {
    let q = prompt("¿Qué palabra quieres buscar en registros?");
    if(!q) return;
    const col = db.collection(NOMBRE_COLECCION);
    const snap = await col.get();
    let resultados = [];
    snap.forEach(docSnap => {
      let d = docSnap.data();
      let str = [
        d.observaciones,
        ...(d.detenidos||[]).map(x=>x.motivo+" "+x.nacionalidad+" "+x.diligencias+" "+x.observaciones),
        ...(d.colaboraciones||[]).map(x=>x.unidad+" "+x.resultado),
        ...(d.inspecciones||[]).map(x=>x.trabajo+" "+x.lugar+" "+x.resultado),
        ...(d.gestiones||[]).map(x=>x.descripcion)
      ].join(" ").toLowerCase();
      if (str.includes(q.toLowerCase())) resultados.push(d);
    });
    if (!resultados.length) return alert("No se encontraron resultados.");
    $('divResumenFechas').innerHTML = resultados.map(r=>
      `<div style="padding:6px;margin-bottom:7px;background:#e1f7ff;border-radius:9px;">
        <b>${r.fecha}</b> · Obs: ${r.observaciones?.slice(0,50)||""}...
        <button onclick="cargarPorFecha('${r.fecha}')">Ver</button>
      </div>`
    ).join("");
  };

  cargarHistorial();
  renderListas();
};

// ------------- RESUMENES PDF, CSV, WHATSAPP -------------

window._resumenesFiltrados = [];
$('btnResumenFechas').onclick = async function() {
  const desde = $('resumenDesde').value;
  const hasta = $('resumenHasta').value;
  if (!desde || !hasta) return alert("Selecciona ambas fechas");
  const col = db.collection(NOMBRE_COLECCION);
  const snap = await col.get();
  let resumenes = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.fecha >= desde && data.fecha <= hasta) resumenes.push(data);
  });
  if (!resumenes.length) {
    $('divResumenFechas').innerHTML = "<i>No hay registros en este rango de fechas</i>";
    window._resumenesFiltrados = [];
    return;
  }
  // Resumen por totales
  let agg = {
    numDetenidos: 0, identificados: 0, citadosCecorex: 0, citadosUcrif: 0
  };
  resumenes.forEach(r => {
    agg.numDetenidos += parseInt(r.numDetenidos || 0);
    agg.identificados += parseInt(r.identificados || 0);
    agg.citadosCecorex += parseInt(r.citadosCecorex || 0);
    agg.citadosUcrif += parseInt(r.citadosUcrif || 0);
  });
  let detalle = "";
  resumenes.forEach(r => {
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b> · Det: ${r.numDetenidos||0} · Ident.: ${r.identificados||0} · Cecorex: ${r.citadosCecorex||0} · Ucrif: ${r.citadosUcrif||0}</li>`;
  });
  $('divResumenFechas').innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>Nº Detenidos</b>: ${agg.numDetenidos}</li>
      <li><b>Identificados</b>: ${agg.identificados}</li>
      <li><b>Citados Cecorex</b>: ${agg.citadosCecorex}</li>
      <li><b>Citados UCRIF</b>: ${agg.citadosUcrif}</li>
    </ul>
    <details><summary>Ver detalle diario</summary><ul>${detalle}</ul></details>
  `;
  window._resumenesFiltrados = resumenes;
};
// Exportar PDF
$('btnExportarPDF').onclick = function() {
  if (!window._resumenesFiltrados.length) return alert("Primero genera un resumen de fechas.");
  let html = `<h2>Resumen de Grupo 4</h2>
  <h4>Del ${formatoFechaCorta($('resumenDesde').value)} al ${formatoFechaCorta($('resumenHasta').value)}</h4>`;
  window._resumenesFiltrados.forEach(r=>{
    html += `<hr><b>${formatoFechaCorta(r.fecha)}</b><ul>`;
    html += `<li><b>Nº Detenidos:</b> ${r.numDetenidos||0}</li>`;
    html += `<li><b>Identificados:</b> ${r.identificados||0}</li>`;
    html += `<li><b>Citados Cecorex:</b> ${r.citadosCecorex||0}</li>`;
    html += `<li><b>Citados UCRIF:</b> ${r.citadosUcrif||0}</li>`;
    html += `<li><b>Observaciones:</b> ${r.observaciones||""}</li>`;
    html += `</ul>`;
  });
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Grupo 4</title></head><body>${html}</body></html>`);
  w.print();
};
// WhatsApp
$('btnWhatsapp').onclick = function() {
  if (!window._resumenesFiltrados.length) return alert("Primero genera un resumen de fechas.");
  let resumen = `Resumen SIREX Grupo 4\n${formatoFechaCorta($('resumenDesde').value)} al ${formatoFechaCorta($('resumenHasta').value)}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${formatoFechaCorta(r.fecha)} - Det: ${r.numDetenidos||0}, Ident: ${r.identificados||0}, Cecorex: ${r.citadosCecorex||0}, Ucrif: ${r.citadosUcrif||0}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};
// CSV
$('btnExportarCSV').onclick = function() {
  if (!window._resumenesFiltrados.length) return alert("Primero genera un resumen de fechas.");
  let csv = "Fecha,Nº Detenidos,Identificados,Citados Cecorex,Citados UCRIF,Observaciones\n";
  window._resumenesFiltrados.forEach(r => {
    csv += [
      r.fecha,
      r.numDetenidos||0,
      r.identificados||0,
      r.citadosCecorex||0,
      r.citadosUcrif||0,
      JSON.stringify(r.observaciones||"")
    ].join(",") + "\n";
  });
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumen_grupo4.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
};

// -------- Estado Firebase visual --------
window.addEventListener('load', function() {
  const statusDiv = $('statusFirebase');
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
