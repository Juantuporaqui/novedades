// ======= Inicialización Firebase =======
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

// ======= Utilidades =======
function showToast(msg) { alert(msg); }
function limpiarFormulario() { form.reset(); }
function formatoFecha(f) {
  if (!f) return ""; const d = new Date(f); return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth()+1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

// ======= Referencias DOM =======
const form = document.getElementById('formPuerto');
const panelResumen = document.getElementById('panelResumenPuerto');
const resumenDiv = document.getElementById('resumenPuerto');
const btnPDF = document.getElementById('btnPDF');
const btnCargar = document.getElementById('btnCargar');
const btnNuevo = document.getElementById('btnNuevo');
const fechaInput = document.getElementById('fechaPuerto');
const adjuntosInput = document.getElementById('adjuntos');

// ======= Helpers Firestore =======
function getDocIdDia(fecha) {
  if (!fecha) return null;
  const fechaISO = new Date(fecha).toISOString().slice(0, 10);
  return `puerto_${fechaISO}`;
}
function getDocRefDia(fecha) {
  return db.collection("grupoPuerto_registros").doc(getDocIdDia(fecha));
}

// ======= Cargar registro =======
btnCargar.addEventListener('click', async () => {
  if (!fechaInput.value) return showToast("Selecciona una fecha.");
  const docSnap = await getDocRefDia(fechaInput.value).get();
  if (!docSnap.exists) return showToast("No hay registro para ese día.");
  cargarFormulario(docSnap.data());
  mostrarResumen(docSnap.data());
});

function cargarFormulario(datos) {
  for (const [k, v] of Object.entries(datos)) {
    if (form[k] && form[k].type !== "file") form[k].value = v;
  }
}

// ======= Nuevo registro =======
btnNuevo.addEventListener('click', () => {
  limpiarFormulario();
  panelResumen.style.display = 'none';
  if (fechaInput) fechaInput.value = '';
});

// ======= Guardar registro =======
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!fechaInput.value) return showToast("Selecciona una fecha.");

  // --- Adjuntar archivos ---
  let adjuntos = [];
  if (adjuntosInput.files && adjuntosInput.files.length > 0) {
    for (const file of adjuntosInput.files) {
      const ref = storage.ref().child(`grupoPuerto/${getDocIdDia(fechaInput.value)}/${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      adjuntos.push({ name: file.name, url });
    }
  }
  // --- Recoger datos del formulario ---
  const datos = {
    fecha: form.fechaPuerto.value,
    tipoControl: form.tipoControl.value,
    marinosArgos: parseInt(form.marinosArgos.value) || 0,
    controlPasaportes: parseInt(form.controlPasaportes.value) || 0,
    cruceros: parseInt(form.cruceros.value) || 0,
    cruceristas: parseInt(form.cruceristas.value) || 0,
    visadosValencia: parseInt(form.visadosValencia.value) || 0,
    visadosCG: parseInt(form.visadosCG.value) || 0,
    ferryEntradas: parseInt(form.ferryEntradas.value) || 0,
    ferrySalidas: parseInt(form.ferrySalidas.value) || 0,
    ferryVehiculos: parseInt(form.ferryVehiculos.value) || 0,
    ferryPasajeros: parseInt(form.ferryPasajeros.value) || 0,
    ferryCulminados: parseInt(form.ferryCulminados.value) || 0,
    ferryExcepcionales: parseInt(form.ferryExcepcionales.value) || 0,
    denegaciones: parseInt(form.denegaciones.value) || 0,
    puertoDeportivo: parseInt(form.puertoDeportivo.value) || 0,
    observaciones: form.observaciones.value.trim(),
    tareaPendiente: form.tareaPendiente.value,
    adjuntos: adjuntos
  };
  await getDocRefDia(fechaInput.value).set(datos, { merge: true });
  showToast("Registro guardado en la nube.");
  mostrarResumen(datos);
  panelResumen.style.display = 'block';
  adjuntosInput.value = '';
});

// ======= Mostrar Resumen =======
function mostrarResumen(datos) {
  panelResumen.style.display = 'block';
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${formatoFecha(datos.fecha)}<br>
    <b>Tipo de control:</b> ${datos.tipoControl}<br>
    <b>Marinos Argos:</b> ${datos.marinosArgos}<br>
    <b>Pasaportes Marinos:</b> ${datos.controlPasaportes}<br>
    <b>Cruceros:</b> ${datos.cruceros} / <b>Cruceristas:</b> ${datos.cruceristas}<br>
    <b>Visados Valencia:</b> ${datos.visadosValencia} / <b>CG:</b> ${datos.visadosCG}<br>
    <b>Ferry - Entradas:</b> ${datos.ferryEntradas}, <b>Salidas:</b> ${datos.ferrySalidas}, <b>Vehículos:</b> ${datos.ferryVehiculos}, <b>Pasajeros:</b> ${datos.ferryPasajeros}<br>
    <b>Culminados EISICS:</b> ${datos.ferryCulminados}, <b>Entradas excepcionales:</b> ${datos.ferryExcepcionales}<br>
    <b>Puerto deportivo:</b> ${datos.puertoDeportivo}<br>
    <b>Denegaciones:</b> ${datos.denegaciones}<br>
    <b>Observaciones:</b> ${datos.observaciones || '---'}<br>
    <b>Archivos adjuntos:</b> ${
      (datos.adjuntos && datos.adjuntos.length)
        ? datos.adjuntos.map(a => `<a href="${a.url}" target="_blank">${a.name}</a>`).join(", ")
        : 'Ninguno'
    }<br>
    <b>Tarea pendiente:</b> ${datos.tareaPendiente}
  `;
}

// ======= PDF/Impresión sólo del resumen =======
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
          <button onclick="window.print()" style="font-size:1.13rem; background:#079cd8; color:#fff; border:none; border-radius:7px; padding:9px 22px; font-weight:bold; box-shadow:0 1px 8px #079cd818; cursor:pointer;">Imprimir o Guardar PDF</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
});
