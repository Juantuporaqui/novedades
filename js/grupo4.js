// Firebase Config
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

// === Arrays en memoria ===
let colaboraciones = [], detenidos = [], citados = [],
    gestiones = [], inspeccionesTrabajo = [], otrasInspecciones = [];

let idActual = null; // fechaISO para el documento actual

// === Helpers DOM ===
function $(id) { return document.getElementById(id); }
function limpiarInputs() {
  $('colaboracionDesc').value = '';
  $('colaboracionCantidad').value = '';
  $('detenidoMotivo').value = '';
  $('detenidoNacionalidad').value = '';
  $('detenidoCantidad').value = '';
  $('citadoDesc').value = '';
  $('citadoCantidad').value = '';
  $('gestionDesc').value = '';
  $('gestionCantidad').value = '';
  $('inspeccionTrabajoDesc').value = '';
  $('inspeccionTrabajoCantidad').value = '';
  $('otraInspeccionDesc').value = '';
  $('otraInspeccionCantidad').value = '';
}
function limpiarListas() {
  $('listaColaboraciones').innerHTML = '';
  $('listaDetenidos').innerHTML = '';
  $('listaCitados').innerHTML = '';
  $('listaGestiones').innerHTML = '';
  $('listaInspeccionesTrabajo').innerHTML = '';
  $('listaOtrasInspecciones').innerHTML = '';
}
function limpiarTodo() {
  limpiarInputs();
  limpiarListas();
  $('observaciones').value = '';
  colaboraciones = [];
  detenidos = [];
  citados = [];
  gestiones = [];
  inspeccionesTrabajo = [];
  otrasInspecciones = [];
  idActual = null;
  $('panelResumen').style.display = "none";
}

// === Listados dinámicos ===
function renderListas() {
  // Colaboraciones
  let lista = $('listaColaboraciones');
  lista.innerHTML = '';
  colaboraciones.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.descripcion} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('colaboracion',${idx})">✖</button>`;
    lista.appendChild(li);
  });

  // Detenidos
  lista = $('listaDetenidos');
  lista.innerHTML = '';
  detenidos.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.motivo} - ${item.nacionalidad} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('detenido',${idx})">✖</button>`;
    lista.appendChild(li);
  });

  // Citados
  lista = $('listaCitados');
  lista.innerHTML = '';
  citados.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.descripcion} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('citado',${idx})">✖</button>`;
    lista.appendChild(li);
  });

  // Gestiones
  lista = $('listaGestiones');
  lista.innerHTML = '';
  gestiones.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.descripcion} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('gestion',${idx})">✖</button>`;
    lista.appendChild(li);
  });

  // Inspecciones Trabajo
  lista = $('listaInspeccionesTrabajo');
  lista.innerHTML = '';
  inspeccionesTrabajo.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.descripcion} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('inspeccionTrabajo',${idx})">✖</button>`;
    lista.appendChild(li);
  });

  // Otras Inspecciones
  lista = $('listaOtrasInspecciones');
  lista.innerHTML = '';
  otrasInspecciones.forEach((item, idx) => {
    let li = document.createElement('li');
    li.innerHTML = `<span>${item.descripcion} (${item.cantidad})</span>
      <button class="del-btn" onclick="eliminarItem('otraInspeccion',${idx})">✖</button>`;
    lista.appendChild(li);
  });
}

// Eliminar un elemento de una lista
window.eliminarItem = function(tipo, idx) {
  switch(tipo) {
    case 'colaboracion': colaboraciones.splice(idx,1); break;
    case 'detenido': detenidos.splice(idx,1); break;
    case 'citado': citados.splice(idx,1); break;
    case 'gestion': gestiones.splice(idx,1); break;
    case 'inspeccionTrabajo': inspeccionesTrabajo.splice(idx,1); break;
    case 'otraInspeccion': otrasInspecciones.splice(idx,1); break;
  }
  renderListas();
}

// Añadir elementos
$('btnAddColaboracion').onclick = function() {
  const desc = $('colaboracionDesc').value.trim();
  const cantidad = parseInt($('colaboracionCantidad').value);
  if(desc && cantidad>0) {
    colaboraciones.push({descripcion: desc, cantidad});
    renderListas(); limpiarInputs();
  }
};
$('btnAddDetenido').onclick = function() {
  const motivo = $('detenidoMotivo').value.trim();
  const nacionalidad = $('detenidoNacionalidad').value.trim();
  const cantidad = parseInt($('detenidoCantidad').value);
  if(motivo && nacionalidad && cantidad>0) {
    detenidos.push({motivo, nacionalidad, cantidad});
    renderListas(); limpiarInputs();
  }
};
$('btnAddCitado').onclick = function() {
  const desc = $('citadoDesc').value.trim();
  const cantidad = parseInt($('citadoCantidad').value);
  if(desc && cantidad>0) {
    citados.push({descripcion: desc, cantidad});
    renderListas(); limpiarInputs();
  }
};
$('btnAddGestion').onclick = function() {
  const desc = $('gestionDesc').value.trim();
  const cantidad = parseInt($('gestionCantidad').value);
  if(desc && cantidad>0) {
    gestiones.push({descripcion: desc, cantidad});
    renderListas(); limpiarInputs();
  }
};
$('btnAddInspeccionTrabajo').onclick = function() {
  const desc = $('inspeccionTrabajoDesc').value.trim();
  const cantidad = parseInt($('inspeccionTrabajoCantidad').value);
  if(desc && cantidad>0) {
    inspeccionesTrabajo.push({descripcion: desc, cantidad});
    renderListas(); limpiarInputs();
  }
};
$('btnAddOtraInspeccion').onclick = function() {
  const desc = $('otraInspeccionDesc').value.trim();
  const cantidad = parseInt($('otraInspeccionCantidad').value);
  if(desc && cantidad>0) {
    otrasInspecciones.push({descripcion: desc, cantidad});
    renderListas(); limpiarInputs();
  }
};

// --- Helpers para fechas ---
function fechaToId(fecha) {
  if(!fecha) return null;
  return "gestion_" + fecha.replace(/-/g,"");
}

// === Guardar ===
$('btnGuardar').onclick = async function() {
  const fecha = $('fechaRegistro').value;
  if(!fecha) { alert("Selecciona la fecha del registro"); return; }
  const docId = fechaToId(fecha);
  idActual = docId;
  const obs = $('observaciones').value.trim();
  await db.collection('grupo4_oper').doc(docId).set({
    fecha, colaboraciones, detenidos, citados,
    gestiones, inspeccionesTrabajo, otrasInspecciones, observaciones: obs
  });
  mostrarResumen();
  alert("¡Registro guardado correctamente!");
}

// === Cargar ===
$('btnCargar').onclick = async function() {
  const fecha = $('fechaRegistro').value;
  if(!fecha) { alert("Selecciona la fecha del registro"); return; }
  const docId = fechaToId(fecha);
  const doc = await db.collection('grupo4_gestion').doc(docId).get();
  if(!doc.exists) {
    alert("No hay registro en esa fecha."); limpiarTodo();
    return;
  }
  idActual = docId;
  const data = doc.data();
  colaboraciones = data.colaboraciones || [];
  detenidos = data.detenidos || [];
  citados = data.citados || [];
  gestiones = data.gestiones || [];
  inspeccionesTrabajo = data.inspeccionesTrabajo || [];
  otrasInspecciones = data.otrasInspecciones || [];
  $('observaciones').value = data.observaciones || '';
  renderListas();
  mostrarResumen();
}

// === Eliminar ===
$('btnEliminar').onclick = async function() {
  const fecha = $('fechaRegistro').value;
  if(!fecha) { alert("Selecciona la fecha"); return; }
  const docId = fechaToId(fecha);
  if(confirm("¿Eliminar el registro de esta fecha?")) {
    await db.collection('grupo4_gestion').doc(docId).delete();
    limpiarTodo();
    alert("Registro eliminado.");
  }
}

// === Nuevo ===
$('btnNuevo').onclick = function() {
  limpiarTodo();
  $('fechaRegistro').value = "";
}

// === Mostrar resumen ===
function mostrarResumen() {
  const div = $('resumenRegistro');
  div.innerHTML = `
    <b>Colaboraciones:</b> ${colaboraciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Detenidos:</b> ${detenidos.map(e=>`${e.motivo} - ${e.nacionalidad} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Citados:</b> ${citados.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras gestiones:</b> ${gestiones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Inspecciones trabajo:</b> ${inspeccionesTrabajo.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Otras inspecciones:</b> ${otrasInspecciones.map(e=>`${e.descripcion} (${e.cantidad})`).join(", ") || "—"}<br>
    <b>Observaciones:</b> ${$('observaciones').value || "—"}
  `;
  $('panelResumen').style.display = "block";
}

function formatoFechaCorta(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  return `${f.getDate().toString().padStart(2,"0")}/${
    (f.getMonth()+1).toString().padStart(2,"0")}/${
    f.getFullYear().toString().slice(-2)}`;  // <-- así te queda solo '25'
}


// === Resumen por rango de fechas ===

$('btnResumenFechas').onclick = async function() {
  const desde = $('resumenDesde').value;
  const hasta = $('resumenHasta').value;
  if (!desde || !hasta) {
    alert("Selecciona ambas fechas");
    return;
  }
  const col = db.collection("grupo4_gestion");
  const snapshot = await col.get();
  let resumenes = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.fecha >= desde && data.fecha <= hasta) resumenes.push(data);
  });
  if (resumenes.length === 0) {
    $('divResumenFechas').innerHTML = "<i>No hay registros en este rango de fechas</i>";
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
    detalle += `<li><b>${r.fecha}</b>: 
      Colaboraciones: ${(r.colaboraciones||[]).length}, 
      Detenidos: ${(r.detenidos||[]).length}, 
      Citados: ${(r.citados||[]).length}, 
      Gestiones: ${(r.gestiones||[]).length}, 
      Insp. Trabajo: ${(r.inspeccionesTrabajo||[]).length}, 
      Otras Insp.: ${(r.otrasInspecciones||[]).length}
      </li>`;
  });
  $('divResumenFechas').innerHTML = `
    <b>Resumen total del ${desde} al ${hasta}:</b><br>
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
  window._resumenesFiltrados = resumenes; // Para PDF/WhatsApp
};

// === Exportar PDF ===
$('btnExportarPDF').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let html = `<h2>Resumen de Gestión</h2>
  <h4>Del ${$('resumenDesde').value} al ${$('resumenHasta').value}</h4>`;
  window._resumenesFiltrados.forEach(r=>{
    html += `<hr><b>${r.fecha}</b><ul>`;
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

// === WhatsApp resumen abreviado ===
$('btnWhatsapp').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let resumen = `Resumen Gestión SIREX\n${$('resumenDesde').value} al ${$('resumenHasta').value}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${r.fecha} - Colb: ${(r.colaboraciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Det: ${(r.detenidos||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Cit: ${(r.citados||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Gest: ${(r.gestiones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Insp: ${(r.inspeccionesTrabajo||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}, Otras: ${(r.otrasInspecciones||[]).map(x=>x.cantidad).reduce((a,b)=>a+b,0)}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};


// --- Inicialización automática ---
window.onload = () => {
  limpiarTodo();
  renderListas();
};
