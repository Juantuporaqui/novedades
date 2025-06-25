/****************************************************************************************
*   SIREX · Grupo 4 Operativo · JS extensísimo, robusto y a prueba de errores            *
*   Incluye: Añadir/cargar/eliminar, historial, resumen por fechas, PDF/CSV/WhatsApp,   *
*   validaciones, ayuda, sincronía perfecta con HTML, superdiseño                        *
*****************************************************************************************/

// 1. Firebase INIT + helpers

const NOMBRE_COLECCION = "grupo4_gestion"; // Cambia si tu colección se llama diferente

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

// Estado global para el formulario
let state = {
  colaboraciones: [],
  detenidos: [],
  citados: [],
  gestiones: [],
  inspeccionesTrabajo: [],
  otrasInspecciones: [],
  observaciones: ""
};

// -------- Utilidades --------
function limpiarInputs(...ids) {
  ids.forEach(id => { if($(id)) $(id).value = ""; });
}

function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  let f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${(f.getMonth()+1).toString().padStart(2,"0")}/${f.getFullYear().toString().slice(-2)}`;
}

// -------- Añadir elementos dinámicos --------
function addItem(tipo, campos, ids) {
  for (let i = 0; i < campos.length; i++) {
    if (!$(ids[i]).value || (campos[i] === 'cantidad' && +$(ids[i]).value <= 0)) {
      $(ids[i]).classList.add('input-error');
      setTimeout(() => $(ids[i]).classList.remove('input-error'), 700);
      return;
    }
  }
  let item = {};
  campos.forEach((campo, i) => {
    item[campo] = $(ids[i]).value.trim();
    if (campo === 'cantidad') item[campo] = +item[campo];
  });
  state[tipo].push(item);
  renderListas();
  limpiarInputs(...ids);
}

// -------- Renderizar listas --------
function renderListas() {
  [
    ['colaboraciones', ['descripcion', 'cantidad'], 'listaColaboraciones'],
    ['detenidos', ['motivo', 'nacionalidad', 'cantidad'], 'listaDetenidos'],
    ['citados', ['descripcion', 'cantidad'], 'listaCitados'],
    ['gestiones', ['descripcion', 'cantidad'], 'listaGestiones'],
    ['inspeccionesTrabajo', ['descripcion', 'cantidad'], 'listaInspeccionesTrabajo'],
    ['otrasInspecciones', ['descripcion', 'cantidad'], 'listaOtrasInspecciones']
  ].forEach(([tipo, campos, ulId]) => {
    if(!$(ulId)) return;
    $(ulId).innerHTML = state[tipo].map((item, idx) =>
      `<li>${campos.map(c => item[c]).join(" · ")}
        <button type="button" class="del-btn" onclick="eliminarItem('${tipo}',${idx})">✕</button>
      </li>`
    ).join('');
  });
}

// -------- Eliminar item de una lista --------
window.eliminarItem = function(tipo, idx) {
  state[tipo].splice(idx, 1);
  renderListas();
};
// -------- Guardar y cargar registros --------

async function guardarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  const docId = "gestion_" + fecha.replace(/-/g, "");
  await db.collection(NOMBRE_COLECCION).doc(docId).set({
    fecha,
    ...state,
    observaciones: $('observaciones').value
  });
  alert("¡Registro guardado!");
  cargarHistorial();
}

async function cargarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  const docId = "gestion_" + fecha.replace(/-/g, "");
  const doc = await db.collection(NOMBRE_COLECCION).doc(docId).get();
  if (!doc.exists) return alert("No hay registro en esa fecha.");
  const data = doc.data();
  Object.keys(state).forEach(k => state[k] = data[k] || []);
  $('observaciones').value = data.observaciones || "";
  renderListas();
  mostrarResumen();
}

function nuevoRegistro() {
  if (confirm("¿Limpiar el formulario para nuevo registro?")) {
    Object.keys(state).forEach(k => state[k] = []);
    $('observaciones').value = "";
    renderListas();
    mostrarResumen();
  }
}

async function eliminarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!confirm("¿Eliminar el registro de esta fecha?")) return;
  const docId = "gestion_" + fecha.replace(/-/g, "");
  await db.collection(NOMBRE_COLECCION).doc(docId).delete();
  Object.keys(state).forEach(k => state[k] = []);
  $('observaciones').value = "";
  renderListas();
  mostrarResumen();
  alert("Registro eliminado.");
  cargarHistorial();
}

// -------- Mostrar resumen de un registro cargado --------

function mostrarResumen() {
  const d = state;
  $('resumenRegistro').innerHTML = `
    <b>Colaboraciones:</b> ${d.colaboraciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Detenidos:</b> ${d.detenidos.map(e=>`${e.motivo} - ${e.nacionalidad} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Citados:</b> ${d.citados.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras gestiones:</b> ${d.gestiones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Inspecciones trabajo:</b> ${d.inspeccionesTrabajo.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras inspecciones:</b> ${d.otrasInspecciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Observaciones:</b> ${$('observaciones').value || "—"}
  `;
  $('panelResumen').style.display = "block";
}

// -------- Cargar historial de fechas --------

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

// -------- Asignación de listeners y arranque --------

window.onload = function() {
  // Listeners para añadir elementos
  $('btnAddColaboracion').onclick = () => addItem('colaboraciones', ['descripcion', 'cantidad'], ['colaboracionDesc', 'colaboracionCantidad']);
  $('btnAddDetenido').onclick = () => addItem('detenidos', ['motivo', 'nacionalidad', 'cantidad'], ['detenidoMotivo', 'detenidoNacionalidad', 'detenidoCantidad']);
  $('btnAddCitado').onclick = () => addItem('citados', ['descripcion', 'cantidad'], ['citadoDesc', 'citadoCantidad']);
  $('btnAddGestion').onclick = () => addItem('gestiones', ['descripcion', 'cantidad'], ['gestionDesc', 'gestionCantidad']);
  $('btnAddInspeccionTrabajo').onclick = () => addItem('inspeccionesTrabajo', ['descripcion', 'cantidad'], ['inspeccionTrabajoDesc', 'inspeccionTrabajoCantidad']);
  $('btnAddOtraInspeccion').onclick = () => addItem('otrasInspecciones', ['descripcion', 'cantidad'], ['otraInspeccionDesc', 'otraInspeccionCantidad']);

  // Listeners para guardar/cargar/eliminar
  $('btnGuardar').onclick = guardarRegistro;
  $('btnCargar').onclick = cargarRegistro;
  $('btnNuevo').onclick = nuevoRegistro;
  $('btnEliminar').onclick = eliminarRegistro;

  // Modo oscuro
  $('btnDarkMode').onclick = function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem("sirex_darkmode", document.body.classList.contains('dark-mode') ? "1" : "0");
  };
  if (localStorage.getItem("sirex_darkmode") === "1")
    document.body.classList.add('dark-mode');

  // Ayuda contextual
  document.querySelectorAll('.ayuda-btn').forEach(btn => {
    btn.onclick = () => {
      const seccion = btn.dataset.seccion;
      const ayudas = {
        colaboracion: "Registra colaboraciones con otros cuerpos o unidades.",
        detenido: "Añade detenidos, indicando motivo y nacionalidad.",
        citado: "Registra personas citadas.",
        gestion: "Otras gestiones relevantes.",
        inspeccionTrabajo: "Inspecciones de trabajo realizadas.",
        otraInspeccion: "Otras inspecciones fuera del trabajo."
      };
      alert(ayudas[seccion] || "Sección no documentada.");
    };
  });

  // Buscador básico
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
        ...(d.colaboraciones||[]).map(x=>x.descripcion),
        ...(d.detenidos||[]).map(x=>x.motivo+" "+x.nacionalidad),
        ...(d.citados||[]).map(x=>x.descripcion),
        ...(d.gestiones||[]).map(x=>x.descripcion),
        ...(d.inspeccionesTrabajo||[]).map(x=>x.descripcion),
        ...(d.otrasInspecciones||[]).map(x=>x.descripcion)
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
// ----------- RESUMEN POR RANGO DE FECHAS, PDF, WHATSAPP, CSV -----------

// Estado para los registros filtrados por rango
window._resumenesFiltrados = [];

// Botón de resumen por rango
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
  // Resumimos por totales
  const agg = {
    colaboraciones: 0, detenidos: 0, citados: 0, gestiones: 0, inspeccionesTrabajo: 0, otrasInspecciones: 0
  };
  let detalle = "";
  resumenes.forEach(r => {
    agg.colaboraciones += (r.colaboraciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    agg.detenidos += (r.detenidos||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    agg.citados += (r.citados||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    agg.gestiones += (r.gestiones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    agg.inspeccionesTrabajo += (r.inspeccionesTrabajo||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    agg.otrasInspecciones += (r.otrasInspecciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0);
    detalle += `<li><b>${formatoFechaCorta(r.fecha)}</b>: 
      Colaboraciones: ${(r.colaboraciones||[]).length}, 
      Detenidos: ${(r.detenidos||[]).length}, 
      Citados: ${(r.citados||[]).length}, 
      Gestiones: ${(r.gestiones||[]).length}, 
      Insp. Trabajo: ${(r.inspeccionesTrabajo||[]).length}, 
      Otras Insp.: ${(r.otrasInspecciones||[]).length}
      </li>`;
  });
  $('divResumenFechas').innerHTML = `
    <b>Resumen total del ${formatoFechaCorta(desde)} al ${formatoFechaCorta(hasta)}:</b><br>
    <ul>
      <li><b>Colaboraciones</b>: ${agg.colaboraciones}</li>
      <li><b>Detenidos</b>: ${agg.detenidos}</li>
      <li><b>Citados</b>: ${agg.citados}</li>
      <li><b>Otras gestiones</b>: ${agg.gestiones}</li>
      <li><b>Inspecciones trabajo</b>: ${agg.inspeccionesTrabajo}</li>
      <li><b>Otras inspecciones</b>: ${agg.otrasInspecciones}</li>
    </ul>
    <details><summary>Ver detalle diario</summary><ul>${detalle}</ul></details>
  `;
  window._resumenesFiltrados = resumenes;
};

// Botón PDF
$('btnExportarPDF').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let html = `<h2>Resumen de Gestión</h2>
  <h4>Del ${formatoFechaCorta($('resumenDesde').value)} al ${formatoFechaCorta($('resumenHasta').value)}</h4>`;
  window._resumenesFiltrados.forEach(r=>{
    html += `<hr><b>${formatoFechaCorta(r.fecha)}</b><ul>`;
    if(r.colaboraciones && r.colaboraciones.length)
      html += `<li><b>Colaboraciones:</b> ${r.colaboraciones.map(x=>`${x.descripcion} (${x.cantidad})`).join(", ")}</li>`;
    if(r.detenidos && r.detenidos.length)
      html += `<li><b>Detenidos:</b> ${r.detenidos.map(x=>`${x.motivo} - ${x.nacionalidad} (${x.cantidad})`).join(", ")}</li>`;
    if(r.citados && r.citados.length)
      html += `<li><b>Citados:</b> ${r.citados.map(x=>`${x.descripcion} (${x.cantidad})`).join(", ")}</li>`;
    if(r.gestiones && r.gestiones.length)
      html += `<li><b>Otras gestiones:</b> ${r.gestiones.map(x=>`${x.descripcion} (${x.cantidad})`).join(", ")}</li>`;
    if(r.inspeccionesTrabajo && r.inspeccionesTrabajo.length)
      html += `<li><b>Inspecciones trabajo:</b> ${r.inspeccionesTrabajo.map(x=>`${x.descripcion} (${x.cantidad})`).join(", ")}</li>`;
    if(r.otrasInspecciones && r.otrasInspecciones.length)
      html += `<li><b>Otras inspecciones:</b> ${r.otrasInspecciones.map(x=>`${x.descripcion} (${x.cantidad})`).join(", ")}</li>`;
    if(r.observaciones) html += `<li><b>Observaciones:</b> ${r.observaciones}</li>`;
    html += "</ul>";
  });
  // Abre en ventana e imprime PDF
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Gestión</title></head><body>${html}</body></html>`);
  w.print();
};

// Botón WhatsApp
$('btnWhatsapp').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let resumen = `Resumen Gestión SIREX\n${formatoFechaCorta($('resumenDesde').value)} al ${formatoFechaCorta($('resumenHasta').value)}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${formatoFechaCorta(r.fecha)} - Colb: ${(r.colaboraciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Det: ${(r.detenidos||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Cit: ${(r.citados||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Ges: ${(r.gestiones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, InspT: ${(r.inspeccionesTrabajo||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, InspO: ${(r.otrasInspecciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};

// Botón CSV
$('btnExportarCSV').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let csv = "Fecha,Colaboraciones,Detenidos,Citados,Gestiones,InspeccionesTrabajo,OtrasInspecciones,Observaciones\n";
  window._resumenesFiltrados.forEach(r => {
    csv += [
      r.fecha,
      (r.colaboraciones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.detenidos||[]).map(x=>`${x.motivo} - ${x.nacionalidad} (${x.cantidad})`).join(" | "),
      (r.citados||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.gestiones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.inspeccionesTrabajo||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.otrasInspecciones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
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
// --------- Extras y helpers ---------

// Mensaje de estado de Firebase
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

// Validación extra para evitar entradas vacías en guardado
function validateBeforeSave() {
  if (
    state.colaboraciones.length === 0 &&
    state.detenidos.length === 0 &&
    state.citados.length === 0 &&
    state.gestiones.length === 0 &&
    state.inspeccionesTrabajo.length === 0 &&
    state.otrasInspecciones.length === 0 &&
    !$('observaciones').value.trim()
  ) {
    alert("El registro está vacío, añade al menos un dato o una observación.");
    return false;
  }
  return true;
}

// Reemplazar guardarRegistro por esta versión más robusta
async function robustGuardarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  if (!validateBeforeSave()) return;
  const docId = "gestion_" + fecha.replace(/-/g, "");
  await db.collection(NOMBRE_COLECCION).doc(docId).set({
    fecha,
    ...state,
    observaciones: $('observaciones').value
  });
  alert("¡Registro guardado!");
  cargarHistorial();
}

// Asignar la función robusta al botón guardar (sobrescribe anterior)
window.onload = (function(origOnload){
  return function() {
    if(origOnload) origOnload();
    $('btnGuardar').onclick = robustGuardarRegistro;
  }
})(window.onload);

// Ayuda accesible en resumen fechas y exportar
if ($('btnExportarPDF')) $('btnExportarPDF').title = "Exportar el resumen a PDF (abre ventana de impresión)";
if ($('btnExportarCSV')) $('btnExportarCSV').title = "Exportar el resumen a hoja de cálculo CSV";
if ($('btnWhatsapp')) $('btnWhatsapp').title = "Copiar resumen al portapapeles para WhatsApp (pega en la app)";

// Pequeña mejora para mostrar/ocultar resumen de registro si no hay datos
function mostrarResumen() {
  const d = state;
  if (
    d.colaboraciones.length === 0 &&
    d.detenidos.length === 0 &&
    d.citados.length === 0 &&
    d.gestiones.length === 0 &&
    d.inspeccionesTrabajo.length === 0 &&
    d.otrasInspecciones.length === 0 &&
    !$('observaciones').value.trim()
  ) {
    $('panelResumen').style.display = "none";
    return;
  }
  $('resumenRegistro').innerHTML = `
    <b>Colaboraciones:</b> ${d.colaboraciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Detenidos:</b> ${d.detenidos.map(e=>`${e.motivo} - ${e.nacionalidad} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Citados:</b> ${d.citados.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras gestiones:</b> ${d.gestiones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Inspecciones trabajo:</b> ${d.inspeccionesTrabajo.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras inspecciones:</b> ${d.otrasInspecciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Observaciones:</b> ${$('observaciones').value || "—"}
  `;
  $('panelResumen').style.display = "block";
}
