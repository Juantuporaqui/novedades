// ========== Firebase Inicialización ==========
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e",
  measurementId: "G-S2VPQNWZ21"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function showToast(msg) { alert(msg); }
function formatoFecha(f) {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}
function limpiarFormulario() {
  if (form) form.reset();
  internosNac = [];
  ingresos = [];
  salidas = [];
  renderAll();
}

let form, fechaInput, btnCargar, btnNuevo, btnGuardarRegistro, observacionesInput;
let nacionalidadInterno, numInternosNac, btnAddInternoNac, ventanaInternosNac;
let nacionalidadIngreso, numIngresos, btnAddIngreso, ventanaIngresos;
let destinoSalida, numSalidas, btnAddSalida, ventanaSalidas;
let nInternosInput;
let panelResumen, resumenDiv;
let desdeResumen, hastaResumen, btnGenerarResumen, btnExportarPDF, btnExportarCSV, btnWhatsapp, resumenAvanzadoVentana;

let internosNac = [];
let ingresos = [];
let salidas = [];

// ========== DOMContentLoaded ==========
window.addEventListener('DOMContentLoaded', () => {
  // Referencias DOM
  form = document.getElementById('formCIE');
  fechaInput = document.getElementById('fechaCIE');
  btnCargar = document.getElementById('btnCargar');
  btnNuevo = document.getElementById('btnNuevo');
  btnGuardarRegistro = document.getElementById('btnGuardarRegistro');
  observacionesInput = document.getElementById('observaciones');
  nacionalidadInterno = document.getElementById('nacionalidadInterno');
  numInternosNac = document.getElementById('numInternosNac');
  btnAddInternoNac = document.getElementById('btnAddInternoNac');
  ventanaInternosNac = document.getElementById('ventanaInternosNac');
  nacionalidadIngreso = document.getElementById('nacionalidadIngreso');
  numIngresos = document.getElementById('numIngresos');
  btnAddIngreso = document.getElementById('btnAddIngreso');
  ventanaIngresos = document.getElementById('ventanaIngresos');
  destinoSalida = document.getElementById('destinoSalida');
  numSalidas = document.getElementById('numSalidas');
  btnAddSalida = document.getElementById('btnAddSalida');
  ventanaSalidas = document.getElementById('ventanaSalidas');
  nInternosInput = document.getElementById('nInternos');
  panelResumen = document.getElementById('panelResumenCIE');
  resumenDiv = document.getElementById('resumenCIE');
  desdeResumen = document.getElementById('desdeResumen');
  hastaResumen = document.getElementById('hastaResumen');
  btnGenerarResumen = document.getElementById('btnGenerarResumen');
  btnExportarPDF = document.getElementById('btnExportarPDF');
  btnExportarCSV = document.getElementById('btnExportarCSV');
  btnWhatsapp = document.getElementById('btnWhatsapp');
  resumenAvanzadoVentana = document.getElementById('resumenAvanzadoVentana');

  // Inicial
  limpiarFormulario();
  if(panelResumen) panelResumen.style.display = "none";

  // Añadir nacionalidad de internos
  if (btnAddInternoNac) {
    btnAddInternoNac.onclick = function() {
      const n = nacionalidadInterno.value.trim();
      const v = parseInt(numInternosNac.value) || 0;
      if (!n || v <= 0) return showToast("Introduce nacionalidad y número > 0");
      internosNac.push({ nacionalidad: n, numero: v });
      nacionalidadInterno.value = ""; numInternosNac.value = "";
      renderAll();
    };
  }
  if (btnAddIngreso) {
    btnAddIngreso.onclick = function() {
      const n = nacionalidadIngreso.value.trim();
      const v = parseInt(numIngresos.value) || 0;
      if (!n || v <= 0) return showToast("Introduce nacionalidad y número > 0");
      ingresos.push({ nacionalidad: n, numero: v });
      nacionalidadIngreso.value = ""; numIngresos.value = "";
      renderAll();
    };
  }
  if (btnAddSalida) {
    btnAddSalida.onclick = function() {
      const d = destinoSalida.value.trim();
      const v = parseInt(numSalidas.value) || 0;
      if (!d || v <= 0) return showToast("Introduce destino y número > 0");
      salidas.push({ destino: d, numero: v });
      destinoSalida.value = ""; numSalidas.value = "";
      renderAll();
    };
  }

  function renderList(container, lista, eliminarFn) {
    container.innerHTML = "";
    if (!lista.length) {
      container.innerHTML = "<span class='text-muted'>Sin datos</span>";
      return;
    }
    lista.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = "dato-item";
      div.innerHTML = `<span>${Object.values(item).join(" · ")}</span>`;
      const btn = document.createElement('button');
      btn.textContent = "🗑️";
      btn.onclick = () => eliminarFn(i);
      btn.style = "margin-left:1em; border:none; background:none; cursor:pointer;";
      div.appendChild(btn);
      container.appendChild(div);
    });
  }
  window.renderAll = function() {
    renderList(ventanaInternosNac, internosNac, (i) => { internosNac.splice(i, 1); renderAll(); });
    renderList(ventanaIngresos, ingresos, (i) => { ingresos.splice(i, 1); renderAll(); });
    renderList(ventanaSalidas, salidas, (i) => { salidas.splice(i, 1); renderAll(); });
  };

  // Guardar registro
  if(form) form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!fechaInput.value) return showToast("Selecciona fecha");
    if (!nInternosInput.value) return showToast("Introduce número de internos");
    const datos = {
      fecha: fechaInput.value,
      nInternos: parseInt(nInternosInput.value) || 0,
      internosNac: internosNac.slice(),
      ingresos: ingresos.slice(),
      salidas: salidas.slice(),
      observaciones: observacionesInput.value.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("grupo_cie").doc(fechaInput.value).set(datos);
    showToast("Registro guardado correctamente.");
    mostrarResumen(datos);
  });

  // Cargar registro
  if (btnCargar) btnCargar.onclick = async function() {
    if (!fechaInput.value) return showToast("Selecciona una fecha");
    const doc = await db.collection("grupo_cie").doc(fechaInput.value).get();
    if (!doc.exists) { showToast("No hay registro para esa fecha"); return; }
    const d = doc.data();
    nInternosInput.value = d.nInternos || "";
    internosNac = Array.isArray(d.internosNac) ? d.internosNac : [];
    ingresos = Array.isArray(d.ingresos) ? d.ingresos : [];
    salidas = Array.isArray(d.salidas) ? d.salidas : [];
    observacionesInput.value = d.observaciones || "";
    renderAll();
    mostrarResumen(d);
  };

  // Nuevo registro (reset)
  if (btnNuevo) btnNuevo.onclick = function() {
    limpiarFormulario();
    if(panelResumen) panelResumen.style.display = "none";
  };

  // Resumen del día
  function mostrarResumen(datos) {
    if (!panelResumen || !resumenDiv) return;
    panelResumen.style.display = "block";
    resumenDiv.innerHTML = `
      <b>Fecha:</b> ${formatoFecha(datos.fecha)}<br>
      <b>Nº internos total:</b> ${datos.nInternos}<br>
      <b>Internos por nacionalidad:</b> ${datos.internosNac?.map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ") || "---"}<br>
      <b>Ingresos:</b> ${datos.ingresos?.map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ") || "---"}<br>
      <b>Salidas:</b> ${datos.salidas?.map(i=>`${i.destino}: ${i.numero}`).join(", ") || "---"}<br>
      <b>Observaciones/Incidentes:</b> ${datos.observaciones || "---"}
    `;
  }

  // Inicializar hoy por defecto
  const hoy = new Date().toISOString().slice(0,10);
  if(fechaInput) fechaInput.value = hoy;
  limpiarFormulario();
  if(panelResumen) panelResumen.style.display = "none";

  // ========== RESUMEN AVANZADO ==========
  let resumenFiltrado = [];
  if(btnGenerarResumen) btnGenerarResumen.onclick = async function() {
    const desde = desdeResumen.value;
    const hasta = hastaResumen.value;
    if (!desde || !hasta) {
      showToast("Selecciona rango de fechas.");
      return;
    }
    const col = db.collection("grupo_cie");
    const snapshot = await col.get();
    let resumen = [];
    snapshot.forEach(docSnap => {
      const docId = docSnap.id;
      if (docId >= desde && docId <= hasta) {
        resumen.push({ fecha: docId, ...docSnap.data() });
      }
    });
    resumenFiltrado = resumen;
    mostrarResumenAvanzado(resumen);
  };

  function mostrarResumenAvanzado(resumen) {
    if (!Array.isArray(resumen) || resumen.length === 0) {
      resumenAvanzadoVentana.innerHTML = "<span class='text-muted'>No hay datos en el rango seleccionado.</span>";
      return;
    }
    let html = `<div class='table-responsive'><table class='table table-striped'>
      <thead><tr>
        <th>Fecha</th>
        <th>Nº internos</th>
        <th>Nacionalidades</th>
        <th>Ingresos</th>
        <th>Salidas</th>
        <th>Observaciones</th>
      </tr></thead><tbody>`;
    resumen.forEach(item => {
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td>
        <td>${item.nInternos||0}</td>
        <td>${(item.internosNac||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}</td>
        <td>${(item.ingresos||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}</td>
        <td>${(item.salidas||[]).map(i=>`${i.destino}: ${i.numero}`).join(", ")}</td>
        <td>${item.observaciones||""}</td>
      </tr>`;
    });
    html += "</tbody></table></div>";
    resumenAvanzadoVentana.innerHTML = html;
  }

  // Exportar PDF
  if(btnExportarPDF) btnExportarPDF.onclick = function () {
    if (!resumenFiltrado || resumenFiltrado.length === 0) {
      showToast("Primero genera un resumen.");
      return;
    }
    let html = `<h2>Resumen CIE</h2>
    <h4>Del ${desdeResumen.value} al ${hastaResumen.value}</h4>
    <table border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Nº internos</th>
        <th>Nacionalidades</th>
        <th>Ingresos</th>
        <th>Salidas</th>
        <th>Observaciones</th>
      </tr>
    </thead><tbody>`;
    resumenFiltrado.forEach(item => {
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td>
        <td>${item.nInternos||0}</td>
        <td>${(item.internosNac||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}</td>
        <td>${(item.ingresos||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}</td>
        <td>${(item.salidas||[]).map(i=>`${i.destino}: ${i.numero}`).join(", ")}</td>
        <td>${item.observaciones||""}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Resumen CIE</title></head><body>${html}</body></html>`);
    w.print();
  };

  // Exportar CSV
  if(btnExportarCSV) btnExportarCSV.onclick = function () {
    if (!resumenFiltrado || resumenFiltrado.length === 0) {
      showToast("Primero genera un resumen.");
      return;
    }
    let csv = "Fecha,Nº internos,Nacionalidades,Ingresos,Salidas,Observaciones\n";
    resumenFiltrado.forEach(item => {
      csv += [
        item.fecha,
        item.nInternos||0,
        (item.internosNac||[]).map(i=>`${i.nacionalidad}:${i.numero}`).join("|"),
        (item.ingresos||[]).map(i=>`${i.nacionalidad}:${i.numero}`).join("|"),
        (item.salidas||[]).map(i=>`${i.destino}:${i.numero}`).join("|"),
        (item.observaciones||"").replace(/(\r\n|\n|\r)/gm, " ")
      ].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumen_cie.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };

  // Exportar resumen a WhatsApp
  if(btnWhatsapp) btnWhatsapp.onclick = function () {
    if (!resumenFiltrado || resumenFiltrado.length === 0) {
      showToast("Primero genera un resumen.");
      return;
    }
    let resumen = `Resumen CIE:\n`;
    resumen += `Del ${formatoFecha(desdeResumen.value)} al ${formatoFecha(hastaResumen.value)}\n\n`;
    resumenFiltrado.forEach(item => {
      resumen += `---\n${formatoFecha(item.fecha)}\n`;
      resumen += `Nº internos: ${item.nInternos||0}\n`;
      resumen += `Nacionalidades: ${(item.internosNac||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}\n`;
      resumen += `Ingresos: ${(item.ingresos||[]).map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}\n`;
      resumen += `Salidas: ${(item.salidas||[]).map(i=>`${i.destino}: ${i.numero}`).join(", ")}\n`;
      resumen += `Observaciones: ${(item.observaciones||'---')}\n\n`;
    });
    navigator.clipboard.writeText(resumen)
      .then(() => showToast("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
      .catch(() => showToast("No se pudo copiar. Actualiza el navegador."));
  };
});
