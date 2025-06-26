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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// ========== Utilidades ==========
function showToast(msg) { alert(msg); }
function formatoFecha(f) {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}
function limpiarFormulario() { form.reset(); limpiarFerrys(); }
function formatoHora(h) {
  if (!h) return "";
  if (h.length === 5 && h[2] === ":") return h;
  return h;
}

// ========== Referencias DOM ==========
const form = document.getElementById('formPuerto');
const fechaInput = document.getElementById('fechaPuerto');
const btnCargar = document.getElementById('btnCargar');
const btnNuevo = document.getElementById('btnNuevo');
const btnGuardarRegistro = document.getElementById('btnGuardarRegistro');
const adjuntosInput = document.getElementById('adjuntos');
const observacionesInput = document.getElementById('observaciones');

// Ferry mini-formulario
const ferryTipo = document.getElementById('ferryTipo');
const ferryFecha = document.getElementById('ferryFecha');
const ferryHora = document.getElementById('ferryHora');
const ferryPasajeros = document.getElementById('ferryPasajeros');
const ferryVehiculos = document.getElementById('ferryVehiculos');
const btnAddFerry = document.getElementById('btnAddFerry');
const ferrysListWindow = document.getElementById('ferrysListWindow');

const totalFerrysSpan = document.getElementById('totalFerrys');
const totalPasajerosSpan = document.getElementById('totalPasajeros');
const totalVehiculosSpan = document.getElementById('totalVehiculos');

// Resumen avanzado
const desdeResumen = document.getElementById('desdeResumen');
const hastaResumen = document.getElementById('hastaResumen');
const btnGenerarResumen = document.getElementById('btnGenerarResumen');
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnExportarCSV = document.getElementById('btnExportarCSV');
const btnWhatsapp = document.getElementById('btnWhatsapp');
const resumenAvanzadoVentana = document.getElementById('resumenAvanzadoVentana');

// Resumen del día
const panelResumen = document.getElementById('panelResumenPuerto');
const resumenDiv = document.getElementById('resumenPuerto');

// ========== Helpers Firestore ==========
function getDocIdDia(fecha) {
  if (!fecha) return null;
  const fechaISO = new Date(fecha).toISOString().slice(0, 10);
  return `puerto_${fechaISO}`;
}
function getDocRefDia(fecha) {
  return db.collection("grupoPuerto_registros").doc(getDocIdDia(fecha));
}

// ========== FERRYS DINÁMICOS Y GESTIÓN VISUAL ==========
let ferrys = [];

function limpiarFerrys() {
  ferrys = [];
  renderFerrysList();
  actualizarTotalesFerrys();
}

function renderFerrysList() {
  ferrysListWindow.innerHTML = "";
  if (!ferrys.length) {
    ferrysListWindow.innerHTML = `<div class="ferry-empty">No hay ferrys añadidos.</div>`;
    return;
  }
  ferrys
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .forEach((ferry, idx) => {
      const div = document.createElement('div');
      div.className = "ferry-list-item";
      div.innerHTML = `
        <span class="ferry-chip ferry-${ferry.tipo === "Salida" ? "salida" : "llegada"}">${ferry.tipo}</span>
        <span class="ferry-fecha">${formatoFecha(ferry.fecha)}</span>
        <span class="ferry-hora">${formatoHora(ferry.hora)}</span>
        <span class="ferry-pasajeros">🧑‍🤝‍🧑 ${ferry.pasajeros}</span>
        <span class="ferry-vehiculos">🚗 ${ferry.vehiculos}</span>
        <button class="btn-ferry-del" title="Eliminar ferry" data-idx="${idx}">✖️</button>
      `;
      ferrysListWindow.appendChild(div);
    });
  // Listener eliminar ferry
  ferrysListWindow.querySelectorAll('.btn-ferry-del').forEach(btn => {
    btn.onclick = function() {
      const i = parseInt(btn.getAttribute('data-idx'));
      ferrys.splice(i, 1);
      renderFerrysList();
      actualizarTotalesFerrys();
    };
  });
  actualizarTotalesFerrys();
}

function actualizarTotalesFerrys() {
  totalFerrysSpan.textContent = ferrys.length;
  totalPasajerosSpan.textContent = ferrys.reduce((ac, f) => ac + (parseInt(f.pasajeros)||0), 0);
  totalVehiculosSpan.textContent = ferrys.reduce((ac, f) => ac + (parseInt(f.vehiculos)||0), 0);
}

btnAddFerry.onclick = () => {
  const tipo = ferryTipo.value;
  const fecha = ferryFecha.value;
  const hora = ferryHora.value;
  const pasajeros = parseInt(ferryPasajeros.value) || 0;
  const vehiculos = parseInt(ferryVehiculos.value) || 0;
  if (!fecha || !hora) {
    showToast("Indica fecha y hora del ferry.");
    return;
  }
  ferrys.push({ tipo, fecha, hora, pasajeros, vehiculos });
  renderFerrysList();
  actualizarTotalesFerrys();
  // Limpiar mini-formulario
  ferryFecha.value = "";
  ferryHora.value = "";
  ferryPasajeros.value = "";
  ferryVehiculos.value = "";
};

// ========== CARGAR REGISTRO ==========
btnCargar.addEventListener('click', async () => {
  if (!fechaInput.value) return showToast("Selecciona una fecha.");
  const docSnap = await getDocRefDia(fechaInput.value).get();
  if (!docSnap.exists) return showToast("No hay registro para ese día.");
  cargarFormulario(docSnap.data());
  mostrarResumen(docSnap.data());
});

function cargarFormulario(datos) {
  // Campos simples
  const campos = [
    "marinosArgos","controlPasaportes","cruceros","cruceristas","visadosValencia","visadosCG",
    "puertoDeportivo","denegaciones","certificadosEixics","observaciones"
  ];
  campos.forEach(k=>{
    if(form[k]) form[k].value = datos[k]||"";
  });
  // Ferrys
  ferrys = Array.isArray(datos.ferrys) ? datos.ferrys : [];
  renderFerrysList();
  // Adjuntos: no se cargan los archivos como FileList, pero pueden listarse en el resumen
}

// ========== NUEVO REGISTRO ==========
btnNuevo.addEventListener('click', () => {
  limpiarFormulario();
  panelResumen.style.display = 'none';
  if(fechaInput) fechaInput.value = '';
});

// ========== GUARDAR REGISTRO ==========
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!fechaInput.value) return showToast("Selecciona una fecha.");
  // Adjuntos
  let adjuntos = [];
  if (adjuntosInput.files && adjuntosInput.files.length > 0) {
    for (const file of adjuntosInput.files) {
      const ref = storage.ref().child(`grupoPuerto/${getDocIdDia(fechaInput.value)}/${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      adjuntos.push({ name: file.name, url });
    }
  }
  // Datos
  const datos = {
    fecha: form.fechaPuerto.value,
    marinosArgos: parseInt(form.marinosArgos.value) || 0,
    controlPasaportes: parseInt(form.controlPasaportes.value) || 0,
    cruceros: parseInt(form.cruceros.value) || 0,
    cruceristas: parseInt(form.cruceristas.value) || 0,
    visadosValencia: parseInt(form.visadosValencia.value) || 0,
    visadosCG: parseInt(form.visadosCG.value) || 0,
    puertoDeportivo: parseInt(form.puertoDeportivo.value) || 0,
    denegaciones: parseInt(form.denegaciones.value) || 0,
    certificadosEixics: parseInt(form.certificadosEixics.value) || 0,
    observaciones: observacionesInput.value.trim(),
    ferrys: ferrys,
    adjuntos: adjuntos
  };
  await getDocRefDia(fechaInput.value).set(datos, { merge: true });
  showToast("Registro guardado en la nube.");
  mostrarResumen(datos);
  panelResumen.style.display = 'block';
  adjuntosInput.value = '';
});

// ========== MOSTRAR RESUMEN DÍA ==========
function mostrarResumen(datos) {
  panelResumen.style.display = 'block';
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${formatoFecha(datos.fecha)}<br>
    <b>Marinos Argos:</b> ${datos.marinosArgos}<br>
    <b>Pasaportes Marinos:</b> ${datos.controlPasaportes}<br>
    <b>Cruceros:</b> ${datos.cruceros} / <b>Cruceristas:</b> ${datos.cruceristas}<br>
    <b>Visados Valencia:</b> ${datos.visadosValencia} / <b>CG:</b> ${datos.visadosCG}<br>
    <b>Puerto deportivo:</b> ${datos.puertoDeportivo}<br>
    <b>Denegaciones:</b> ${datos.denegaciones}<br>
    <b>Certificados EIXICS:</b> ${datos.certificadosEixics}<br>
    <b>Ferrys:</b>
    <ul style="margin-top:4px;">
    ${
      (Array.isArray(datos.ferrys) && datos.ferrys.length)
        ? datos.ferrys
            .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
            .map(f=>`<li>${f.tipo} - ${formatoFecha(f.fecha)} ${formatoHora(f.hora)}, Pasajeros: ${f.pasajeros}, Vehículos: ${f.vehiculos}</li>`)
            .join("")
        : "Sin registros"
    }
    </ul>
    <b>Total ferrys:</b> ${Array.isArray(datos.ferrys)?datos.ferrys.length:0} |
    <b>Total pasajeros:</b> ${Array.isArray(datos.ferrys)?datos.ferrys.reduce((a,f)=>a+parseInt(f.pasajeros)||0,0):0} |
    <b>Total vehículos:</b> ${Array.isArray(datos.ferrys)?datos.ferrys.reduce((a,f)=>a+parseInt(f.vehiculos)||0,0):0}
    <br>
    <b>Observaciones:</b> ${datos.observaciones || '---'}<br>
    <b>Archivos adjuntos:</b> ${ (datos.adjuntos && datos.adjuntos.length)
      ? datos.adjuntos.map(a => `<a href="${a.url}" target="_blank">${a.name}</a>`).join(", ")
      : 'Ninguno'
    }
  `;
}

// ========== PDF/Impresión solo del resumen ==========
const btnPDF = document.getElementById('btnPDF');
if (btnPDF) {
  btnPDF.addEventListener('click', () => {
    if (!panelResumen.style.display || panelResumen.style.display === 'none') {
      showToast("Guarda o carga un registro primero.");
      return;
    }
    // Imprime solo el resumen del día, no el formulario
    const win = window.open("", "Resumen", "width=800,height=700,scrollbars=yes");
    win.document.write(`
      <html>
        <head>
          <title>Resumen Grupo Puerto</title>
          <meta charset="utf-8">
          <style>
            body { background: #eef7fa; font-family: 'Inter', Arial, sans-serif; padding: 24px;}
            h3 { color: #079cd8; }
            a { color: #114c75; text-decoration: underline;}
          </style>
        </head>
        <body>
          <h3>Resumen Grupo Puerto</h3>
          ${resumenDiv.innerHTML}
          <hr>
          <div style="text-align:right; margin-top:28px">
            <button onclick="window.print()" style="font-size:1.13rem; background:#079cd8; color:#fff; border:none; border-radius:7px; padding:9px 22px; font-weight:bold; box-shadow:0 1px 8px #079cd829;">Imprimir PDF</button>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  });
}

// ========== RESUMEN AVANZADO (por rango de fechas) ==========
let resumenFiltrado = [];
btnGenerarResumen.addEventListener('click', async () => {
  const desde = desdeResumen.value;
  const hasta = hastaResumen.value;
  if (!desde || !hasta) {
    showToast("Selecciona rango de fechas.");
    return;
  }
  const col = db.collection("grupoPuerto_registros");
  const snapshot = await col.get();
  let resumen = [];
  snapshot.forEach(docSnap => {
    const docId = docSnap.id;
    const fechaStr = docId.replace("puerto_", "");
    if (fechaStr >= desde && fechaStr <= hasta) {
      resumen.push({ fecha: fechaStr, ...docSnap.data() });
    }
  });
  resumenFiltrado = resumen;
  mostrarResumenAvanzado(resumen);
});

function mostrarResumenAvanzado(resumen) {
  if (!Array.isArray(resumen) || resumen.length === 0) {
    resumenAvanzadoVentana.innerHTML = "<span class='text-muted'>No hay datos en el rango seleccionado.</span>";
    return;
  }
  let html = `<div class='table-responsive'><table class='table table-striped'>
    <thead><tr>
      <th>Fecha</th>
      <th>Marinos Argos</th>
      <th>Pasaportes</th>
      <th>Cruceros</th>
      <th>Cruceristas</th>
      <th>Visados V</th>
      <th>Visados CG</th>
      <th>Puerto Deportivo</th>
      <th>Denegaciones</th>
      <th>Cert. EIXICS</th>
      <th>Ferrys</th>
      <th>Pasajeros ferrys</th>
      <th>Vehículos ferrys</th>
      <th>Observaciones</th>
    </tr></thead><tbody>`;
  resumen.forEach(item => {
    const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
    const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
    html += `<tr>
      <td>${formatoFecha(item.fecha)}</td>
      <td>${item.marinosArgos||0}</td>
      <td>${item.controlPasaportes||0}</td>
      <td>${item.cruceros||0}</td>
      <td>${item.cruceristas||0}</td>
      <td>${item.visadosValencia||0}</td>
      <td>${item.visadosCG||0}</td>
      <td>${item.puertoDeportivo||0}</td>
      <td>${item.denegaciones||0}</td>
      <td>${item.certificadosEixics||0}</td>
      <td>${(item.ferrys||[]).length}</td>
      <td>${totalPasajeros}</td>
      <td>${totalVehiculos}</td>
      <td>${item.observaciones||""}</td>
    </tr>`;
  });
  html += "</tbody></table></div>";
  resumenAvanzadoVentana.innerHTML = html;
}

// ========== Exportar PDF (resumen avanzado) ==========
btnExportarPDF.onclick = function () {
  if (!resumenFiltrado || resumenFiltrado.length === 0) {
    showToast("Primero genera un resumen.");
    return;
  }
  let html = `<h2>Resumen Puerto</h2>
  <h4>Del ${desdeResumen.value} al ${hastaResumen.value}</h4>
  <table border="1" cellpadding="5" cellspacing="0">
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Marinos Argos</th>
      <th>Pasaportes</th>
      <th>Cruceros</th>
      <th>Cruceristas</th>
      <th>Visados V</th>
      <th>Visados CG</th>
      <th>Puerto Deportivo</th>
      <th>Denegaciones</th>
      <th>Cert. EIXICS</th>
      <th>Ferrys</th>
      <th>Pasajeros ferrys</th>
      <th>Vehículos ferrys</th>
      <th>Observaciones</th>
    </tr>
  </thead><tbody>`;
  resumenFiltrado.forEach(item => {
    const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
    const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
    html += `<tr>
      <td>${formatoFecha(item.fecha)}</td>
      <td>${item.marinosArgos||0}</td>
      <td>${item.controlPasaportes||0}</td>
      <td>${item.cruceros||0}</td>
      <td>${item.cruceristas||0}</td>
      <td>${item.visadosValencia||0}</td>
      <td>${item.visadosCG||0}</td>
      <td>${item.puertoDeportivo||0}</td>
      <td>${item.denegaciones||0}</td>
      <td>${item.certificadosEixics||0}</td>
      <td>${(item.ferrys||[]).length}</td>
      <td>${totalPasajeros}</td>
      <td>${totalVehiculos}</td>
      <td>${item.observaciones||""}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Resumen Puerto</title></head><body>${html}</body></html>`);
  w.print();
};

// ========== Exportar CSV ==========
btnExportarCSV.onclick = function () {
  if (!resumenFiltrado || resumenFiltrado.length === 0) {
    showToast("Primero genera un resumen.");
    return;
  }
  let csv = "Fecha,MarinosArgos,Pasaportes,Cruceros,Cruceristas,VisadosV,VisadosCG,PuertoDeportivo,Denegaciones,CertEIXICS,Ferrys,PasajerosFerrys,VehiculosFerrys,Observaciones\n";
  resumenFiltrado.forEach(item => {
    const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
    const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
    csv += [
      item.fecha,
      item.marinosArgos||0,
      item.controlPasaportes||0,
      item.cruceros||0,
      item.cruceristas||0,
      item.visadosValencia||0,
      item.visadosCG||0,
      item.puertoDeportivo||0,
      item.denegaciones||0,
      item.certificadosEixics||0,
      (item.ferrys||[]).length,
      totalPasajeros,
      totalVehiculos,
      (item.observaciones||"").replace(/(\r\n|\n|\r)/gm, " ")
    ].join(",") + "\n";
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumen_puerto.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
};

// ========== Exportar resumen a WhatsApp ==========
btnWhatsapp.onclick = function () {
  if (!resumenFiltrado || resumenFiltrado.length === 0) {
    showToast("Primero genera un resumen.");
    return;
  }
  let resumen = `Resumen Puerto SIREX\n${desdeResumen.value} al ${hastaResumen.value}:\n`;
  resumenFiltrado.forEach(item => {
    const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
    const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
    resumen += `${formatoFecha(item.fecha)}: Ferrys=${(item.ferrys||[]).length}, Pasajeros=${totalPasajeros}, Vehículos=${totalVehiculos}, Cruceros=${item.cruceros||0}, Cruceristas=${item.cruceristas||0}, Marinos=${item.marinosArgos||0}, Observ: ${(item.observaciones||"")}\n`;
  });
  navigator.clipboard.writeText(resumen)
    .then(() => showToast("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
    .catch(() => showToast("No se pudo copiar. Actualiza el navegador."));
};

// ========== Inicialización automática ==========
window.addEventListener('DOMContentLoaded', () => {
  limpiarFerrys();
  // Modo oscuro persistente (ya gestionado en HTML)
});
