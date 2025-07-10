/****************************************************************************************
*   SIREX · Grupo 4 Operativo · JS alineado DOCX 2025                                    *
*   Añade: Arrays detenidos, colaboraciones, gestiones. Campos individuales identificados, *
*   citadosCecorex, citadosUcrif y observaciones. Incluye resumen, PDF, CSV, WhatsApp.   *
*****************************************************************************************/

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

let state = {
  detenidos: [],
  colaboraciones: [],
  gestiones: [],
  identificados: 0,
  citadosCecorex: 0,
  citadosUcrif: 0,
  citadosObservaciones: "",
  observaciones: ""
};

function limpiarInputs(...ids) {
  ids.forEach(id => { if($(id)) $(id).value = ""; });
}

function addItem(tipo, campos, ids) {
  for (let i = 0; i < campos.length; i++) {
    if (!$(ids[i]).value) {
      $(ids[i]).classList.add('input-error');
      setTimeout(() => $(ids[i]).classList.remove('input-error'), 700);
      return;
    }
  }
  let item = {};
  campos.forEach((campo, i) => {
    item[campo] = $(ids[i]).value.trim();
  });
  state[tipo].push(item);
  renderListas();
  limpiarInputs(...ids);
}

function renderListas() {
  if($('listaDetenidos')) {
    $('listaDetenidos').innerHTML = state.detenidos.map((item, idx) =>
      `<li>${item.numDetenidos || ""} · ${item.motivo} · ${item.nacionalidad} · ${item.diligencias} · ${item.observaciones}
        <button type="button" class="del-btn" onclick="eliminarItem('detenidos',${idx})">✕</button>
      </li>`
    ).join('');
  }
  if($('listaColaboraciones')) {
    $('listaColaboraciones').innerHTML = state.colaboraciones.map((item, idx) =>
      `<li>${item.colaboracionDesc} · ${item.colaboracionUnidad} · ${item.colaboracionResultado} · ${item.colaboracionTrabajo} · ${item.colaboracionLugar} · ${item.colaboracionResultadoI}
        <button type="button" class="del-btn" onclick="eliminarItem('colaboraciones',${idx})">✕</button>
      </li>`
    ).join('');
  }
  if($('listaGestiones')) {
    $('listaGestiones').innerHTML = state.gestiones.map((item, idx) =>
      `<li>${item.gestionDesc}
        <button type="button" class="del-btn" onclick="eliminarItem('gestiones',${idx})">✕</button>
      </li>`
    ).join('');
  }
}

window.eliminarItem = function(tipo, idx) {
  state[tipo].splice(idx, 1);
  renderListas();
};

async function guardarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");

  // Actualiza valores individuales
  state.identificados = Number($('identificados').value) || 0;
  state.citadosCecorex = Number($('citadosCecorex').value) || 0;
  state.citadosUcrif = Number($('citadosUcrif').value) || 0;
  state.citadosObservaciones = $('citadosObservaciones').value || "";
  state.observaciones = $('observaciones').value || "";

  await db.collection(NOMBRE_COLECCION).doc(fecha).set({
    fecha,
    ...state
  });
  alert("¡Registro guardado!");
  cargarHistorial();
}

async function cargarRegistro() {
  const fecha = $('fechaRegistro').value;
  if (!fecha) return alert("Selecciona la fecha");
  const doc = await db.collection(NOMBRE_COLECCION).doc(fecha).get();
  if (!doc.exists) return alert("No hay registro en esa fecha.");
  const data = doc.data();

  // Arrays
  state.detenidos = data.detenidos || [];
  state.colaboraciones = data.colaboraciones || [];
  state.gestiones = data.gestiones || [];

  // Individuales
  $('identificados').value = data.identificados || 0;
  $('citadosCecorex').value = data.citadosCecorex || 0;
  $('citadosUcrif').value = data.citadosUcrif || 0;
  $('citadosObservaciones').value = data.citadosObservaciones || "";
  $('observaciones').value = data.observaciones || "";

  renderListas();
  mostrarResumen();
}

function nuevoRegistro() {
  if (confirm("¿Limpiar el formulario para nuevo registro?")) {
    state = {
      detenidos: [],
      colaboraciones: [],
      gestiones: [],
      identificados: 0,
      citadosCecorex: 0,
      citadosUcrif: 0,
      citadosObservaciones: "",
      observaciones: ""
    };
    $('identificados').value = 0;
    $('citadosCecorex').value = 0;
    $('citadosUcrif').value = 0;
    $('citadosObservaciones').value = "";
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
  state = {
    detenidos: [],
    colaboraciones: [],
    gestiones: [],
    identificados: 0,
    citadosCecorex: 0,
    citadosUcrif: 0,
    citadosObservaciones: "",
    observaciones: ""
  };
  $('identificados').value = 0;
  $('citadosCecorex').value = 0;
  $('citadosUcrif').value = 0;
  $('citadosObservaciones').value = "";
  $('observaciones').value = "";
  renderListas();
  mostrarResumen();
  alert("Registro eliminado.");
  cargarHistorial();
}

function mostrarResumen() {
  const d = state;
  $('resumenRegistro').innerHTML = `
    <b>Detenidos:</b> ${d.detenidos.length}<br>
    <b>Identificados:</b> ${d.identificados}<br>
    <b>Citados CeCOREX:</b> ${d.citadosCecorex}<br>
    <b>Citados UCRIF:</b> ${d.citadosUcrif}<br>
    <b>Colaboraciones:</b> ${d.colaboraciones.length}<br>
    <b>Gestiones varias:</b> ${d.gestiones.length}<br>
    <b>Observaciones:</b> ${d.observaciones || "—"}
  `;
  $('panelResumen').style.display = "block";
}

async function cargarHistorial() {
  const snap = await db.collection(NOMBRE_COLECCION).orderBy("fecha", "desc").limit(10).get();
  if ($('historialFechas')) {
    $('historialFechas').innerHTML = Array.from(snap.docs).map(doc => {
      const f = doc.data().fecha;
      return `<button type="button" class="btn-historial" onclick="cargarPorFecha('${f}')">${f}</button>`;
    }).join('');
  }
}

window.cargarPorFecha = async function(fecha) {
  $('fechaRegistro').value = fecha;
  cargarRegistro();
};

window.onload = function() {
  $('btnAddDetenido').onclick = () => addItem('detenidos', ['numDetenidos','motivo','nacionalidad','diligencias','observaciones'],
    ['numDetenidos','detenidoMotivo','detenidoNacionalidad','detenidoDiligencias','detenidoObservaciones']);
  $('btnAddColaboracion').onclick = () => addItem('colaboraciones',
    ['colaboracionDesc','colaboracionUnidad','colaboracionResultado','colaboracionTrabajo','colaboracionLugar','colaboracionResultadoI'],
    ['colaboracionDesc','colaboracionUnidad','colaboracionResultado','colaboracionTrabajo','colaboracionLugar','colaboracionResultadoI']);
  $('btnAddGestion').onclick = () => addItem('gestiones',['gestionDesc'],['gestionDesc']);

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
        gestion: "Otras gestiones relevantes."
      };
      alert(ayudas[seccion] || "Sección no documentada.");
    };
  });

  cargarHistorial();
  renderListas();
};

// ====================== RESUMEN, PDF, CSV, WHATSAPP ======================

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
  // Resumimos por totales
  let agg = {
    detenidos: 0, identificados: 0, citadosCecorex: 0, citadosUcrif: 0, colaboraciones: 0, gestiones: 0
  };
  let detalle = "";
  resumenes.forEach(r => {
    agg.detenidos += (r.detenidos||[]).length;
    agg.identificados += Number(r.identificados||0);
    agg.citadosCecorex += Number(r.citadosCecorex||0);
    agg.citadosUcrif += Number(r.citadosUcrif||0);
    agg.colaboraciones += (r.colaboraciones||[]).length;
    agg.gestiones += (r.gestiones||[]).length;
    detalle += `<li><b>${r.fecha}</b>: Detenidos: ${(r.detenidos||[]).length}, Identificados: ${r.identificados||0}, CeCOREX: ${r.citadosCecorex||0}, UCRIF: ${r.citadosUcrif||0}, Colaboraciones: ${(r.colaboraciones||[]).length}, Gestiones: ${(r.gestiones||[]).length}</li>`;
  });
  $('divResumenFechas').innerHTML = `
    <b>Resumen total del ${desde} al ${hasta}:</b><br>
    <ul>
      <li><b>Detenidos</b>: ${agg.detenidos}</li>
      <li><b>Identificados</b>: ${agg.identificados}</li>
      <li><b>Citados CeCOREX</b>: ${agg.citadosCecorex}</li>
      <li><b>Citados UCRIF</b>: ${agg.citadosUcrif}</li>
      <li><b>Colaboraciones</b>: ${agg.colaboraciones}</li>
      <li><b>Gestiones varias</b>: ${agg.gestiones}</li>
    </ul>
    <details><summary>Ver detalle diario</summary><ul>${detalle}</ul></details>
  `;
  window._resumenesFiltrados = resumenes;
};

// PDF
$('btnExportarPDF').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let html = `<h2>Resumen de Gestión</h2>
  <h4>Del ${$('resumenDesde').value} al ${$('resumenHasta').value}</h4>`;
  window._resumenesFiltrados.forEach(r=>{
    html += `<hr><b>${r.fecha}</b><ul>`;
    if(r.detenidos && r.detenidos.length)
      html += `<li><b>Detenidos:</b> ${r.detenidos.length}</li>`;
    html += `<li><b>Identificados:</b> ${r.identificados||0}</li>`;
    html += `<li><b>Citados CeCOREX:</b> ${r.citadosCecorex||0}</li>`;
    html += `<li><b>Citados UCRIF:</b> ${r.citadosUcrif||0}</li>`;
    if(r.colaboraciones && r.colaboraciones.length)
      html += `<li><b>Colaboraciones:</b> ${r.colaboraciones.length}</li>`;
    if(r.gestiones && r.gestiones.length)
      html += `<li><b>Gestiones varias:</b> ${r.gestiones.length}</li>`;
    if(r.observaciones) html += `<li><b>Obs:</b> ${r.observaciones}</li>`;
    html += "</ul>";
  });
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Gestión</title></head><body>${html}</body></html>`);
  w.print();
};

// WhatsApp
$('btnWhatsapp').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let resumen = `Resumen Gestión SIREX\n${$('resumenDesde').value} al ${$('resumenHasta').value}:\n`;
  window._resumenesFiltrados.forEach(r=>{
    resumen += `${r.fecha} - Det: ${(r.detenidos||[]).length}, Ident: ${r.identificados||0}, CeCOREX: ${r.citadosCecorex||0}, UCRIF: ${r.citadosUcrif||0}, Colab: ${(r.colaboraciones||[]).length}, Gest: ${(r.gestiones||[]).length}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(()=>alert("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(()=>alert("No se pudo copiar. Actualiza el navegador."));
};

// CSV
$('btnExportarCSV').onclick = function() {
  if (!window._resumenesFiltrados || window._resumenesFiltrados.length===0) {
    alert("Primero genera un resumen de fechas.");
    return;
  }
  let csv = "Fecha,Detenidos,Identificados,CitadosCeCOREX,CitadosUCRIF,Colaboraciones,Gestiones,Observaciones\n";
  window._resumenesFiltrados.forEach(r => {
    csv += [
      r.fecha,
      (r.detenidos||[]).length,
      r.identificados||0,
      r.citadosCecorex||0,
      r.citadosUcrif||0,
      (r.colaboraciones||[]).length,
      (r.gestiones||[]).length,
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

// ======================= FIN =======================
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
