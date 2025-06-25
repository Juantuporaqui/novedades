// SIREX · Gestión Operativa Grupo 4 - JS Mejorado ©️2025
// Desarrollado por GitHub Copilot Chat Assistant para Juantuporaqui
// Incluye: validación, historial, búsqueda, exportación, autoguardado, estadísticas, ayuda y mucho más.

// ---- CONFIGURACIÓN GENERAL ----
const NOMBRE_GRUPO = "grupo4_gestion";
const NOMBRE_LOCALSTORE = "sirex_g4_autosave";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};

// ---- INICIALIZACIÓN FIREBASE ----
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// ---- VARIABLES DE ESTADO ----
let state = {
  colaboraciones: [],
  detenidos: [],
  citados: [],
  gestiones: [],
  inspeccionesTrabajo: [],
  otrasInspecciones: [],
  observaciones: "",
  idActual: null,
  historial: [],
  autosave: null
};
let undoStack = []; // Para deshacer último cambio
let connectionStatus = true; // Estado conexión Firebase

// ---- INICIALIZACIÓN ----
window.onload = () => {
  inicializarUI();
  cargarHistorial();
  recargarAutosave();
  renderListas();
  checkFirebaseConnection();
  setInterval(checkFirebaseConnection, 30000);
  $('fechaRegistro').focus();
  document.body.classList.toggle('dark-mode', getDarkMode());
};

// ---- SELECTOR RÁPIDO DE ELEMENTOS ----
const $ = id => document.getElementById(id);

// ---- VALIDACIONES Y FEEDBACK ----
function validarCampos(seccion) {
  // Devuelve true si todos los campos requeridos de la sección están rellenos y cantidad > 0
  let inputs = [];
  switch (seccion) {
    case 'colaboracion':
      inputs = [ $('colaboracionDesc'), $('colaboracionCantidad') ];
      break;
    case 'detenido':
      inputs = [ $('detenidoMotivo'), $('detenidoNacionalidad'), $('detenidoCantidad') ];
      break;
    case 'citado':
      inputs = [ $('citadoDesc'), $('citadoCantidad') ];
      break;
    case 'gestion':
      inputs = [ $('gestionDesc'), $('gestionCantidad') ];
      break;
    case 'inspeccionTrabajo':
      inputs = [ $('inspeccionTrabajoDesc'), $('inspeccionTrabajoCantidad') ];
      break;
    case 'otraInspeccion':
      inputs = [ $('otraInspeccionDesc'), $('otraInspeccionCantidad') ];
      break;
    default: return false;
  }
  let ok = true;
  inputs.forEach(input => {
    input.classList.remove('input-error');
    if (!input.value || (input.type==="number" && +input.value<=0)) {
      input.classList.add('input-error');
      ok = false;
    }
  });
  return ok;
}

// ---- AUTOGUARDADO LOCAL ----
function guardarAutosave() {
  try {
    let data = {
      colaboraciones: state.colaboraciones,
      detenidos: state.detenidos,
      citados: state.citados,
      gestiones: state.gestiones,
      inspeccionesTrabajo: state.inspeccionesTrabajo,
      otrasInspecciones: state.otrasInspecciones,
      observaciones: $('observaciones').value,
      fecha: $('fechaRegistro').value
    };
    localStorage.setItem(NOMBRE_LOCALSTORE, JSON.stringify(data));
    state.autosave = data;
  } catch(e) {}
}
function recargarAutosave() {
  let data = localStorage.getItem(NOMBRE_LOCALSTORE);
  if (data) {
    if (confirm("¿Recuperar el último autoguardado local?")) {
      let d = JSON.parse(data);
      ['colaboraciones','detenidos','citados','gestiones','inspeccionesTrabajo','otrasInspecciones'].forEach(key=>{
        state[key] = d[key]||[];
      });
      $('observaciones').value = d.observaciones||"";
      $('fechaRegistro').value = d.fecha||"";
      renderListas();
      mostrarResumen();
    }
  }
}

// ---- CONTROL DE CONEXIÓN FIREBASE ----
function checkFirebaseConnection() {
  db.collection(NOMBRE_GRUPO).limit(1).get().then(()=> {
    connectionStatus = true;
    $('statusFirebase').textContent = "🟢 Conectado";
  }).catch(()=>{
    connectionStatus = false;
    $('statusFirebase').textContent = "🔴 Sin conexión";
    alert("¡Sin conexión a la base de datos! Trabaja solo en local.");
  });
}

// ---- HISTORIAL DE REGISTROS ----
function cargarHistorial() {
  db.collection(NOMBRE_GRUPO).orderBy("fecha","desc").limit(10).get()
    .then(snap=>{
      let his = [];
      snap.forEach(doc=>his.push(doc.data().fecha));
      state.historial = his;
      renderHistorial();
    });
}
function renderHistorial() {
  let div = $('historialFechas');
  div.innerHTML = state.historial.map(f=>
    `<button onclick="cargarPorFecha('${f}')" class="btn-historial">${formatoFechaCorta(f)}</button>`
  ).join("");
}

// ---- BUSCADOR DE REGISTROS ----
$('btnBuscar').onclick = async function() {
  let q = prompt("¿Qué palabra quieres buscar en registros?");
  if(!q) return;
  let col = db.collection(NOMBRE_GRUPO);
  let snapshot = await col.get();
  let resultados = [];
  snapshot.forEach(docSnap => {
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
  let html = resultados.map(r=>
    `<div style="padding:6px;margin-bottom:7px;background:#e1f7ff;border-radius:9px;">
      <b>${r.fecha}</b> · Obs: ${r.observaciones?.slice(0,50)||""}...
      <button onclick="cargarPorFecha('${r.fecha}')">Ver</button>
    </div>`
  ).join("");
  $('divResumenFechas').innerHTML = html;
}

// ---- EXPORTAR CSV ----
$('btnExportarCSV').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let rows = [ ["Fecha","Colaboraciones","Detenidos","Citados","Gestiones","InspeccionesTrabajo","OtrasInspecciones","Observaciones"] ];
  window._resumenesFiltrados.forEach(r=>{
    rows.push([
      r.fecha,
      (r.colaboraciones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.detenidos||[]).map(x=>`${x.motivo}-${x.nacionalidad} (${x.cantidad})`).join(" | "),
      (r.citados||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.gestiones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.inspeccionesTrabajo||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      (r.otrasInspecciones||[]).map(x=>`${x.descripcion} (${x.cantidad})`).join(" | "),
      r.observaciones
    ]);
  });
  let csv = rows.map(r=>r.map(cell=>`"${cell.replace(/"/g,'""')}"`).join(",")).join("\n");
  let blob = new Blob([csv],{type:'text/csv'});
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "sirex_gestion.csv";
  link.click();
}

// ---- DESHACER CAMBIOS EN LISTAS ----
function guardarUndo() {
  let snapshot = JSON.stringify({
    colaboraciones: [...state.colaboraciones],
    detenidos: [...state.detenidos],
    citados: [...state.citados],
    gestiones: [...state.gestiones],
    inspeccionesTrabajo: [...state.inspeccionesTrabajo],
    otrasInspecciones: [...state.otrasInspecciones]
  });
  undoStack.push(snapshot);
  if (undoStack.length > 10) undoStack.shift();
}
window.deshacer = function() {
  if(undoStack.length===0) return alert("Nada que deshacer.");
  let prev = JSON.parse(undoStack.pop());
  Object.keys(prev).forEach(k=>state[k]=prev[k]);
  renderListas();
  mostrarResumen();
}

// ---- CAMBIOS EN INPUTS: AUTOGUARDADO ----
findAllInputs().forEach(input => {
  input.addEventListener('input', guardarAutosave);
});
function findAllInputs() {
  return Array.from(document.querySelectorAll('input, textarea'));
}

// ---- ATALOS DE TECLADO GLOBALES ----
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.key==="z") window.deshacer();
  if(e.ctrlKey && e.key==="s") { e.preventDefault(); $('btnGuardar').click(); }
  if(e.ctrlKey && e.key==="n") { e.preventDefault(); $('btnNuevo').click(); }
  if(e.ctrlKey && e.key==="f") { e.preventDefault(); $('btnBuscar').click(); }
  if(e.ctrlKey && e.key==="d") { e.preventDefault(); toggleDarkMode(); }
});

// ---- MODO OSCURO ----
function getDarkMode() {
  return localStorage.getItem("sirex_darkmode") === "1";
}
function toggleDarkMode() {
  let dm = !getDarkMode();
  localStorage.setItem("sirex_darkmode", dm ? "1" : "0");
  document.body.classList.toggle('dark-mode', dm);
}
$('btnDarkMode').onclick = toggleDarkMode;

// ---- RENDER LISTAS ----
function renderListas() {
  renderLista('listaColaboraciones', state.colaboraciones, ['descripcion'], 'colaboracion');
  renderLista('listaDetenidos', state.detenidos, ['motivo','nacionalidad'], 'detenido');
  renderLista('listaCitados', state.citados, ['descripcion'], 'citado');
  renderLista('listaGestiones', state.gestiones, ['descripcion'], 'gestion');
  renderLista('listaInspeccionesTrabajo', state.inspeccionesTrabajo, ['descripcion'], 'inspeccionTrabajo');
  renderLista('listaOtrasInspecciones', state.otrasInspecciones, ['descripcion'], 'otraInspeccion');
}

// ---- AGREGAR ELEMENTOS (CON VALIDACIÓN) ----
$('btnAddColaboracion').onclick = function() {
  if(!validarCampos('colaboracion')) return;
  guardarUndo();
  state.colaboraciones.push({
    descripcion: $('colaboracionDesc').value.trim(),
    cantidad: +$('colaboracionCantidad').value
  });
  renderListas(); limpiarInputs();
};
$('btnAddDetenido').onclick = function() {
  if(!validarCampos('detenido')) return;
  guardarUndo();
  state.detenidos.push({
    motivo: $('detenidoMotivo').value.trim(),
    nacionalidad: $('detenidoNacionalidad').value.trim(),
    cantidad: +$('detenidoCantidad').value
  });
  renderListas(); limpiarInputs();
};
$('btnAddCitado').onclick = function() {
  if(!validarCampos('citado')) return;
  guardarUndo();
  state.citados.push({
    descripcion: $('citadoDesc').value.trim(),
    cantidad: +$('citadoCantidad').value
  });
  renderListas(); limpiarInputs();
};
$('btnAddGestion').onclick = function() {
  if(!validarCampos('gestion')) return;
  guardarUndo();
  state.gestiones.push({
    descripcion: $('gestionDesc').value.trim(),
    cantidad: +$('gestionCantidad').value
  });
  renderListas(); limpiarInputs();
};
$('btnAddInspeccionTrabajo').onclick = function() {
  if(!validarCampos('inspeccionTrabajo')) return;
  guardarUndo();
  state.inspeccionesTrabajo.push({
    descripcion: $('inspeccionTrabajoDesc').value.trim(),
    cantidad: +$('inspeccionTrabajoCantidad').value
  });
  renderListas(); limpiarInputs();
};
$('btnAddOtraInspeccion').onclick = function() {
  if(!validarCampos('otraInspeccion')) return;
  guardarUndo();
  state.otrasInspecciones.push({
    descripcion: $('otraInspeccionDesc').value.trim(),
    cantidad: +$('otraInspeccionCantidad').value
  });
  renderListas(); limpiarInputs();
};

// ---- ELIMINAR ELEMENTO DE LISTA ----
window.eliminarItem = function(tipo, idx) {
  if(confirm("¿Eliminar este elemento?")) {
    guardarUndo();
    state[tipo + (tipo.endsWith('s') ? '' : 's')].splice(idx, 1);
    renderListas();
  }
}

// ---- GUARDAR REGISTRO EN FIREBASE ----
$('btnGuardar').onclick = async function() {
  const fecha = $('fechaRegistro').value;
  if(!fecha) return alert("Selecciona la fecha del registro");
  const docId = "gestion_" + fecha.replace(/-/g,"");
  guardarAutosave();
  mostrarCargando("Guardando...");
  try {
    await db.collection(NOMBRE_GRUPO).doc(docId).set({
      fecha,
      colaboraciones: state.colaboraciones,
      detenidos: state.detenidos,
      citados: state.citados,
      gestiones: state.gestiones,
      inspeccionesTrabajo: state.inspeccionesTrabajo,
      otrasInspecciones: state.otrasInspecciones,
      observaciones: $('observaciones').value
    });
    mostrarResumen();
    alert("¡Registro guardado correctamente!");
    cargarHistorial();
  } catch (err) {
    alert("Error al guardar: " + err.message);
  }
}

// ---- CARGAR REGISTRO ----
window.cargarPorFecha = async function(fecha) {
  const docId = "gestion_" + (fecha||$('fechaRegistro').value).replace(/-/g,"");
  mostrarCargando("Cargando...");
  try {
    const doc = await db.collection(NOMBRE_GRUPO).doc(docId).get();
    if(!doc.exists) {
      alert("No hay registro en esa fecha."); limpiarTodo(); return;
    }
    let d = doc.data();
    Object.keys(state).forEach(k=>typeof state[k]==="object" ? state[k]=d[k]||[] : null);
    $('observaciones').value = d.observaciones || '';
    $('fechaRegistro').value = d.fecha || '';
    renderListas();
    mostrarResumen();
  } catch (err) {
    alert("Error al cargar: " + err.message);
  }
}

// ---- ELIMINAR REGISTRO ----
$('btnEliminar').onclick = async function() {
  const fecha = $('fechaRegistro').value;
  if(!fecha) return alert("Selecciona la fecha");
  const docId = "gestion_" + fecha.replace(/-/g,"");
  if(confirm("¿Eliminar el registro de esta fecha?")) {
    mostrarCargando("Eliminando...");
    try {
      await db.collection(NOMBRE_GRUPO).doc(docId).delete();
      limpiarTodo();
      alert("Registro eliminado.");
      cargarHistorial();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }
}

// ---- NUEVO REGISTRO ----
$('btnNuevo').onclick = function() {
  if(confirm("¿Limpiar el formulario para nuevo registro?")) {
    limpiarTodo(); $('fechaRegistro').value = "";
  }
}

// ---- MOSTRAR RESUMEN ----
function mostrarResumen() {
  const div = $('resumenRegistro');
  div.innerHTML = `
    <b>Colaboraciones:</b> ${state.colaboraciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Detenidos:</b> ${state.detenidos.map(e=>`${e.motivo} - ${e.nacionalidad} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Citados:</b> ${state.citados.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras gestiones:</b> ${state.gestiones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Inspecciones trabajo:</b> ${state.inspeccionesTrabajo.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras inspecciones:</b> ${state.otrasInspecciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Observaciones:</b> ${$('observaciones').value || "—"}
  `;
  $('panelResumen').style.display = "block";
}

// ---- FORMATO FECHA ----
function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  let f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${
      (f.getMonth()+1).toString().padStart(2,"0")}/${
      f.getFullYear().toString().slice(-2)}`;
}

// ---- RESUMEN POR RANGO DE FECHAS ----
$('btnResumenFechas').onclick = async function() {
  const desde = $('resumenDesde').value;
  const hasta = $('resumenHasta').value;
  if (!desde || !hasta) return alert("Selecciona ambas fechas");
  mostrarCargando("Consultando...");
  try {
    const col = db.collection(NOMBRE_GRUPO);
    const snapshot = await col.get();
    let resumenes = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.fecha >= desde && data.fecha <= hasta) resumenes.push(data);
    });
    if (resumenes.length === 0) {
      $('divResumenFechas').innerHTML = "<i>No hay registros en este rango de fechas</i>";
      window._resumenesFiltrados = [];
      return;
    }
    // Resumen numérico agrupado
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
      <div style="margin-top:12px"><button onclick="renderGraficoResumen()">📊 Ver gráfico</button></div>
    `;
    window._resumenesFiltrados = resumenes;
  } catch (err) {
    $('divResumenFechas').innerHTML = "<b style='color:red'>Error al consultar: "+err.message+"</b>";
  }
}

// ---- GRÁFICO DE RESUMEN (usando Chart.js CDN) ----
window.renderGraficoResumen = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) return;
  let resumenes = window._resumenesFiltrados;
  let fechas = resumenes.map(r=>formatoFechaCorta(r.fecha));
  let colab = resumenes.map(r=>(r.colaboraciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let det = resumenes.map(r=>(r.detenidos||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let cit = resumenes.map(r=>(r.citados||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let ges = resumenes.map(r=>(r.gestiones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let inspT = resumenes.map(r=>(r.inspeccionesTrabajo||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let inspO = resumenes.map(r=>(r.otrasInspecciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0));
  let html = `<canvas id="graficoResumen" width="400" height="200"></canvas>`;
  $('divResumenFechas').insertAdjacentHTML('beforeend', html);
  let script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = ()=>{
    let ctx = $('graficoResumen').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: fechas,
        datasets: [
          {label:"Colab", data:colab, backgroundColor:'#079cd860'},
          {label:"Detenidos", data:det, backgroundColor:'#ea434387'},
          {label:"Citados", data:cit, backgroundColor:'#15498e8a'},
          {label:"Gestiones", data:ges, backgroundColor:'#28b06399'},
          {label:"Insp. Trab", data:inspT, backgroundColor:'#f7a73caa'},
          {label:"Insp. Otras", data:inspO, backgroundColor:'#c217d1bb'}
        ]
      }
    });
  };
  document.body.appendChild(script);
}

// ---- EXPORTAR A PDF (MEJORADO) ----
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

// ---- EXPORTAR WHATSAPP ----
$('btnWhatsapp').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let resumen = `Resumen Gestión SIREX\n${formatoFechaCorta($('resumenDesde').value)} al ${formatoFechaCorta($('resumenHasta').value)}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${formatoFechaCorta(r.fecha)} - Colb: ${(r.colaboraciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Det: ${(r.detenidos||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Cit: ${(r.citados||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Gest: ${(r.gestiones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, InspT: ${(r.inspeccionesTrabajo||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, InspO: ${(r.otrasInspecciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};

// ---- AYUDA CONTEXTUAL ----
window.mostrarAyuda = function(seccion) {
  let textos = {
    colaboracion: "Registra colaboraciones con otros cuerpos o unidades.",
    detenido: "Añade detenidos, indicando motivo y nacionalidad.",
    citado: "Registra personas citadas.",
    gestion: "Otras gestiones relevantes.",
    inspeccionTrabajo: "Inspecciones de trabajo realizadas.",
    otraInspeccion: "Otras inspecciones fuera del trabajo."
  };
  alert(textos[seccion] || "Sección no documentada.");
};

// ---- INICIALIZACIÓN DE UI (elementos dinámicos extra) ----
function inicializarUI() {
  // Botón de estado Firebase
  let s = document.createElement('span');
  s.id = "statusFirebase";
  s.style.marginLeft = "18px";
  s.style.fontWeight = "bold";
  s.style.fontSize = "1.1em";
  $('formOperativo').insertAdjacentElement("beforebegin", s);
  // Historial
  let h = document.createElement('div');
  h.id = "historialFechas";
  h.style.margin = "1em 0";
  h.style.display = "flex";
  h.style.flexWrap = "wrap";
  h.style.gap = "0.5em";
  $('formOperativo').insertAdjacentElement("afterend", h);
  // Botón modo oscuro
  let d = document.createElement('button');
  d.id = "btnDarkMode";
  d.type = "button";
  d.textContent = "🌙/☀️";
  d.title = "Cambiar modo oscuro/claro";
  d.className = "btn-secundario";
  $('formOperativo').insertAdjacentElement("beforebegin", d);
  // Botón buscar
  let b = document.createElement('button');
  b.id = "btnBuscar";
  b.type = "button";
  b.textContent = "🔎 Buscar";
  b.className = "btn-secundario";
  $('formOperativo').insertAdjacentElement("beforebegin", b);
  // Botón exportar CSV
  let c = document.createElement('button');
  c.id = "btnExportarCSV";
  c.type = "button";
  c.textContent = "⬇️ Exportar CSV";
  c.className = "btn-pdf";
  document.querySelector('.panel-glass').appendChild(c);
}

// FIN DEL ARCHIVO
