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
const storage = firebase.storage();

// ========== Utilidades ==========
function showToast(msg) { alert(msg); }
function formatoFecha(f) {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}
function limpiarFormulario() {
  if (form) form.reset();
  limpiarFerrys();
  if (adjuntosInput) adjuntosInput.value = "";
}
function formatoHora(h) {
  if (!h) return "";
  if (h.length === 5 && h[2] === ":") return h;
  return h;
}

// ========== FERRYS DINÁMICOS Y GESTIÓN VISUAL ==========
let ferrys = [];

// Referencias DOM
let form, fechaInput, btnCargar, btnNuevo, btnBorrarRegistro, adjuntosInput, observacionesInput;
let ferryTipo, ferryDestino, ferryFecha, ferryHora, ferryPasajeros, ferryVehiculos, ferryIncidencia, btnAddFerry, ferrysListWindow;
let totalFerrysSpan, totalPasajerosSpan, totalVehiculosSpan;
let desdeResumen, hastaResumen, btnGenerarResumen, btnExportarPDF, btnExportarCSV, btnWhatsapp, resumenAvanzadoVentana;
let panelResumen, resumenDiv;

// ========== FUNCIONES FERRYS ==========
function limpiarFerrys() {
  ferrys = [];
  renderFerrysList();
  actualizarTotalesFerrys();
}

function renderFerrysList() {
  if (!ferrysListWindow) return;
  ferrysListWindow.innerHTML = "";
  if (!ferrys.length) {
    ferrysListWindow.innerHTML = `<div class="ferry-empty">No hay ferrys añadidos.</div>`;
    return;
  }
  ferrys
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .forEach((ferry, idx) => {
      const div = document.createElement('div');
      div.className = "dato-item";
      div.innerHTML = `
        <span class="ferry-chip ferry-${ferry.tipo === "Salida" ? "salida" : "llegada"}">${ferry.tipo}</span>
        <span><b>${ferry.destino || "—"}</b></span>
        <span>${formatoFecha(ferry.fecha)} ${formatoHora(ferry.hora)}</span>
        <span>🧑‍🤝‍🧑 ${ferry.pasajeros}</span>
        <span>🚗 ${ferry.vehiculos}</span>
        ${ferry.incidencia ? `<span class="ferry-incidencia">${ferry.incidencia}</span>` : ""}
        <button class="btn-ferry-del btn btn-police-red" title="Eliminar ferry" data-idx="${idx}">✖️</button>
      `;
      ferrysListWindow.appendChild(div);
    });
  ferrysListWindow.querySelectorAll('.btn-ferry-del').forEach(btn => {
    btn.onclick = function () {
      const i = parseInt(btn.getAttribute('data-idx'));
      ferrys.splice(i, 1);
      renderFerrysList();
      actualizarTotalesFerrys();
    };
  });
  actualizarTotalesFerrys();
}

function actualizarTotalesFerrys() {
  if (!totalFerrysSpan || !totalPasajerosSpan || !totalVehiculosSpan) return;
  totalFerrysSpan.textContent = ferrys.length;
  totalPasajerosSpan.textContent = ferrys.reduce((ac, f) => ac + (parseInt(f.pasajeros) || 0), 0);
  totalVehiculosSpan.textContent = ferrys.reduce((ac, f) => ac + (parseInt(f.vehiculos) || 0), 0);
}

function addFerry() {
  if (!ferryTipo || !ferryDestino || !ferryFecha || !ferryHora || !ferryPasajeros || !ferryVehiculos || !ferryIncidencia) {
    showToast("Error interno en los campos del ferry.");
    return;
  }
  const tipo = ferryTipo.value;
  const destino = ferryDestino.value.trim();
  const fecha = ferryFecha.value;
  const hora = ferryHora.value;
  const pasajeros = parseInt(ferryPasajeros.value) || 0;
  const vehiculos = parseInt(ferryVehiculos.value) || 0;
  const incidencia = ferryIncidencia.value.trim();
  if (!fecha || !hora) {
    showToast("Indica fecha y hora del ferry.");
    return;
  }
  ferrys.push({ tipo, destino, fecha, hora, pasajeros, vehiculos, incidencia });
  renderFerrysList();
  actualizarTotalesFerrys();
  // Limpiar mini-formulario tras añadir
  ferryDestino.value = "";
  ferryFecha.value = "";
  ferryHora.value = "";
  ferryPasajeros.value = "";
  ferryVehiculos.value = "";
  ferryIncidencia.value = "";
}

// ========== Helpers Firestore ==========
function getDocIdDia(fecha) {
  if (!fecha) return null;
  const fechaISO = new Date(fecha).toISOString().slice(0, 10);
  return `puerto_${fechaISO}`;
}
function getDocRefDia(fecha) {
  return db.collection("grupoPuerto_registros").doc(getDocIdDia(fecha));
}

// ========== FUNCIONES DOMContentLoaded ==========
window.addEventListener('DOMContentLoaded', () => {
  form = document.getElementById('formPuerto');
  fechaInput = document.getElementById('fechaPuerto');
  btnCargar = document.getElementById('btnCargar');
  btnNuevo = document.getElementById('btnNuevo');
  btnBorrarRegistro = document.getElementById('btnBorrarRegistro');
  adjuntosInput = document.getElementById('adjuntos');
  observacionesInput = document.getElementById('observaciones');
  ferryTipo = document.getElementById('ferryTipo');
  ferryDestino = document.getElementById('ferryDestino');
  ferryFecha = document.getElementById('ferryFecha');
  ferryHora = document.getElementById('ferryHora');
  ferryPasajeros = document.getElementById('ferryPasajeros');
  ferryVehiculos = document.getElementById('ferryVehiculos');
  ferryIncidencia = document.getElementById('ferryIncidencia');
  btnAddFerry = document.getElementById('btnAddFerry');
  ferrysListWindow = document.getElementById('ferrysListWindow');
  totalFerrysSpan = document.getElementById('totalFerrys');
  totalPasajerosSpan = document.getElementById('totalPasajeros');
  totalVehiculosSpan = document.getElementById('totalVehiculos');
  desdeResumen = document.getElementById('desdeResumen');
  hastaResumen = document.getElementById('hastaResumen');
  btnGenerarResumen = document.getElementById('btnGenerarResumen');
  btnExportarPDF = document.getElementById('btnExportarPDF');
  btnExportarCSV = document.getElementById('btnExportarCSV');
  btnWhatsapp = document.getElementById('btnWhatsapp');
  resumenAvanzadoVentana = document.getElementById('resumenAvanzadoVentana');
  panelResumen = document.getElementById('panelResumenPuerto');
  resumenDiv = document.getElementById('resumenPuerto');

  limpiarFerrys();

  if (btnAddFerry) btnAddFerry.onclick = addFerry;

  if (btnCargar) btnCargar.addEventListener('click', async () => {
    if (!fechaInput.value) return showToast("Selecciona una fecha.");
    const docSnap = await getDocRefDia(fechaInput.value).get();
    if (!docSnap.exists) return showToast("No hay registro para ese día.");
    cargarFormulario(docSnap.data());
    mostrarResumen(docSnap.data());
  });

  if (btnNuevo) btnNuevo.addEventListener('click', () => {
    limpiarFormulario();
    if (panelResumen) panelResumen.style.display = 'none';
  });

  if (btnBorrarRegistro) btnBorrarRegistro.addEventListener('click', async () => {
    if (!fechaInput.value) return showToast("Selecciona una fecha para borrar.");
    if (!confirm("¿Seguro que deseas borrar el registro de este día? Esta acción no se puede deshacer.")) return;
    await getDocRefDia(fechaInput.value).delete();
    limpiarFormulario();
    showToast("Registro eliminado.");
    if (panelResumen) panelResumen.style.display = 'none';
  });

  if (form) form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!fechaInput.value) return showToast("Selecciona una fecha.");
    let adjuntos = [];
    if (adjuntosInput && adjuntosInput.files && adjuntosInput.files.length > 0) {
      for (const file of adjuntosInput.files) {
        const ref = storage.ref().child(`grupoPuerto/${getDocIdDia(fechaInput.value)}/${file.name}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        adjuntos.push({ name: file.name, url });
      }
    }
    const datos = {
      fecha: form.fechaPuerto.value,
      ctrlMarinos: parseInt(form.ctrlMarinos.value) || 0,
      marinosArgos: parseInt(form.marinosArgos.value) || 0,
      cruceros: parseInt(form.cruceros.value) || 0,
      cruceristas: parseInt(form.cruceristas.value) || 0,
      visadosCgef: parseInt(form.visadosCgef.value) || 0,
      visadosValencia: parseInt(form.visadosValencia.value) || 0,
      visadosExp: parseInt(form.visadosExp.value) || 0,
      vehChequeados: parseInt(form.vehChequeados.value) || 0,
      paxChequeadas: parseInt(form.paxChequeadas.value) || 0,
      detenidos: parseInt(form.detenidos.value) || 0,
      denegaciones: parseInt(form.denegaciones.value) || 0,
      entrExcep: parseInt(form.entrExcep.value) || 0,
      eixics: parseInt(form.eixics.value) || 0,
      ptosDeportivos: parseInt(form.ptosDeportivos.value) || 0,
      observaciones: observacionesInput.value.trim(),
      ferrys: ferrys,
      adjuntos: adjuntos
    };
    await getDocRefDia(fechaInput.value).set(datos, { merge: true });
    showToast("Registro guardado en la nube.");
    mostrarResumen(datos);
    if (panelResumen) panelResumen.style.display = 'block';
    if (adjuntosInput) adjuntosInput.value = '';
  });

  // ========== RESUMEN AVANZADO Y EXPORTACIONES ==========
  let resumenFiltrado = [];
  function handleGenerarResumen() {
    if (!desdeResumen || !hastaResumen) return;
    const desde = desdeResumen.value;
    const hasta = hastaResumen.value;
    if (!desde || !hasta) {
      showToast("Selecciona rango de fechas.");
      return;
    }
    db.collection("grupoPuerto_registros").get().then(snapshot => {
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
  }
  if (btnGenerarResumen) btnGenerarResumen.addEventListener('click', handleGenerarResumen);

  function mostrarResumenAvanzado(resumen) {
    if (!Array.isArray(resumen) || resumen.length === 0) {
      resumenAvanzadoVentana.innerHTML = "<span class='text-muted'>No hay datos en el rango seleccionado.</span>";
      return;
    }
    let html = `<div class='table-responsive'><table class='table table-striped'>
      <thead><tr>
        <th>Fecha</th>
        <th>Ctrl. Marinos</th>
        <th>Argos</th>
        <th>Cruceros</th>
        <th>Cruceristas</th>
        <th>Vis.CGEF</th>
        <th>Vis.Valencia</th>
        <th>Vis.Exp.</th>
        <th>Veh.Chq.</th>
        <th>Pax.Chq.</th>
        <th>Detenidos</th>
        <th>Denegaciones</th>
        <th>Entr.Excep</th>
        <th>EIXICS</th>
        <th>Ptos.Deportivos</th>
        <th>Ferrys</th>
        <th>Pasaj.</th>
        <th>Vehíc.</th>
        <th>Obs.</th>
      </tr></thead><tbody>`;
    resumen.forEach(item => {
      const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
      const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td>
        <td>${item.ctrlMarinos||0}</td>
        <td>${item.marinosArgos||0}</td>
        <td>${item.cruceros||0}</td>
        <td>${item.cruceristas||0}</td>
        <td>${item.visadosCgef||0}</td>
        <td>${item.visadosValencia||0}</td>
        <td>${item.visadosExp||0}</td>
        <td>${item.vehChequeados||0}</td>
        <td>${item.paxChequeadas||0}</td>
        <td>${item.detenidos||0}</td>
        <td>${item.denegaciones||0}</td>
        <td>${item.entrExcep||0}</td>
        <td>${item.eixics||0}</td>
        <td>${item.ptosDeportivos||0}</td>
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
  if (btnExportarPDF) btnExportarPDF.onclick = function () {
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
        <th>Ctrl. Marinos</th>
        <th>Argos</th>
        <th>Cruceros</th>
        <th>Cruceristas</th>
        <th>Vis.CGEF</th>
        <th>Vis.Valencia</th>
        <th>Vis.Exp.</th>
        <th>Veh.Chq.</th>
        <th>Pax.Chq.</th>
        <th>Detenidos</th>
        <th>Denegaciones</th>
        <th>Entr.Excep</th>
        <th>EIXICS</th>
        <th>Ptos.Deportivos</th>
        <th>Ferrys</th>
        <th>Pasaj.</th>
        <th>Vehíc.</th>
        <th>Obs.</th>
      </tr>
    </thead><tbody>`;
    resumenFiltrado.forEach(item => {
      const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
      const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td>
        <td>${item.ctrlMarinos||0}</td>
        <td>${item.marinosArgos||0}</td>
        <td>${item.cruceros||0}</td>
        <td>${item.cruceristas||0}</td>
        <td>${item.visadosCgef||0}</td>
        <td>${item.visadosValencia||0}</td>
        <td>${item.visadosExp||0}</td>
        <td>${item.vehChequeados||0}</td>
        <td>${item.paxChequeadas||0}</td>
        <td>${item.detenidos||0}</td>
        <td>${item.denegaciones||0}</td>
        <td>${item.entrExcep||0}</td>
        <td>${item.eixics||0}</td>
        <td>${item.ptosDeportivos||0}</td>
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
  if (btnExportarCSV) btnExportarCSV.onclick = function () {
    if (!resumenFiltrado || resumenFiltrado.length === 0) {
      showToast("Primero genera un resumen.");
      return;
    }
    let csv = "Fecha,CtrlMarinos,Argos,Cruceros,Cruceristas,VisCGEF,VisValencia,VisExp,VehChequeados,PaxChequeadas,Detenidos,Denegaciones,EntrExcep,EIXICS,PtosDeportivos,Ferrys,Pasaj,Vehic,Obs\n";
    resumenFiltrado.forEach(item => {
      const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
      const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
      csv += [
        item.fecha,
        item.ctrlMarinos||0,
        item.marinosArgos||0,
        item.cruceros||0,
        item.cruceristas||0,
        item.visadosCgef||0,
        item.visadosValencia||0,
        item.visadosExp||0,
        item.vehChequeados||0,
        item.paxChequeadas||0,
        item.detenidos||0,
        item.denegaciones||0,
        item.entrExcep||0,
        item.eixics||0,
        item.ptosDeportivos||0,
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
  if (btnWhatsapp) btnWhatsapp.onclick = function () {
    if (!resumenFiltrado || resumenFiltrado.length === 0) {
      showToast("Primero genera un resumen.");
      return;
    }
    let resumen = `Resumen grupo puerto:\n`;
    resumen += `Del ${formatoFecha(desdeResumen.value)} al ${formatoFecha(hastaResumen.value)}\n\n`;
    resumenFiltrado.forEach(item => {
      const totalPasajeros = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.pasajeros)||0,0);
      const totalVehiculos = (item.ferrys||[]).reduce((a,f)=>a+parseInt(f.vehiculos)||0,0);
      resumen += `---\n${formatoFecha(item.fecha)}\n`;
      resumen += `Ferrys: ${(item.ferrys||[]).length}\n`;
      resumen += `Pasajeros ferry: ${totalPasajeros}\n`;
      resumen += `Vehículos ferry: ${totalVehiculos}\n`;
      resumen += `Cruceros: ${item.cruceros||0}\n`;
      resumen += `Cruceristas: ${item.cruceristas||0}\n`;
      resumen += `Marinos Argos: ${item.marinosArgos||0}\n`;
      resumen += `Control marinos: ${item.ctrlMarinos||0}\n`;
      resumen += `Visados Valencia: ${item.visadosValencia||0}\n`;
      resumen += `Visados CGEF: ${item.visadosCgef||0}\n`;
      resumen += `Visados Expedidos: ${item.visadosExp||0}\n`;
      resumen += `Vehículos chequeados: ${item.vehChequeados||0}\n`;
      resumen += `Pasajeros chequeados: ${item.paxChequeadas||0}\n`;
      resumen += `Puerto deportivo: ${item.ptosDeportivos||0}\n`;
      resumen += `Denegaciones: ${item.denegaciones||0}\n`;
      resumen += `EIXICS: ${item.eixics||0}\n`;
      resumen += `Observaciones: ${(item.observaciones||'---')}\n\n`;
    });
    navigator.clipboard.writeText(resumen)
      .then(() => showToast("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
      .catch(() => showToast("No se pudo copiar. Actualiza el navegador."));
  };
}); // FIN DOMContentLoaded

// ========== CARGAR FORMULARIO ==========
function cargarFormulario(datos) {
  if (!form) return;
  const campos = [
    "ctrlMarinos", "marinosArgos", "cruceros", "cruceristas", "visadosCgef",
    "visadosValencia", "visadosExp", "vehChequeados", "paxChequeadas", "detenidos",
    "denegaciones", "entrExcep", "eixics", "ptosDeportivos", "observaciones"
  ];
  campos.forEach(k => {
    if (form[k]) form[k].value = datos[k] || "";
  });
  ferrys = Array.isArray(datos.ferrys) ? datos.ferrys : [];
  renderFerrysList();
}

// ========== MOSTRAR RESUMEN DÍA ==========
function mostrarResumen(datos) {
  if (!panelResumen || !resumenDiv) return;
  panelResumen.style.display = 'block';
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${formatoFecha(datos.fecha)}<br>
    <b>Ctrl. Marinos:</b> ${datos.ctrlMarinos}<br>
    <b>Marinos Argos:</b> ${datos.marinosArgos}<br>
    <b>Cruceros:</b> ${datos.cruceros} / <b>Cruceristas:</b> ${datos.cruceristas}<br>
    <b>Visados CGEF:</b> ${datos.visadosCgef} / <b>Valencia:</b> ${datos.visadosValencia} / <b>Exp:</b> ${datos.visadosExp}<br>
    <b>Vehículos chequeados:</b> ${datos.vehChequeados} / <b>Pasajeros chequeados:</b> ${datos.paxChequeadas}<br>
    <b>Detenidos:</b> ${datos.detenidos} / <b>Denegaciones:</b> ${datos.denegaciones}<br>
    <b>Entr. Excep.:</b> ${datos.entrExcep} / <b>EIXICS:</b> ${datos.eixics} / <b>Ptos. deportivos:</b> ${datos.ptosDeportivos}<br>
    <b>Ferrys:</b>
    <ul style="margin-top:4px;">
    ${
      (Array.isArray(datos.ferrys) && datos.ferrys.length)
        ? datos.ferrys
            .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
            .map(f =>
              `<li>
                ${f.tipo} - <b>${f.destino || "—"}</b> ${formatoFecha(f.fecha)} ${formatoHora(f.hora)}, 
                Pasaj.: ${f.pasajeros}, Vehíc.: ${f.vehiculos}
                ${f.incidencia ? `<span class="ferry-incidencia"> [${f.incidencia}]</span>` : ""}
              </li>`
            )
            .join("")
        : "Sin registros"
    }
    </ul>
    <b>Ferrys:</b> ${Array.isArray(datos.ferrys) ? datos.ferrys.length : 0} |
    <b>Pasaj.:</b> ${Array.isArray(datos.ferrys) ? datos.ferrys.reduce((a, f) => a + parseInt(f.pasajeros) || 0, 0) : 0} |
    <b>Vehíc.:</b> ${Array.isArray(datos.ferrys) ? datos.ferrys.reduce((a, f) => a + parseInt(f.vehiculos) || 0, 0) : 0}
    <br>
    <b>Observaciones:</b> ${datos.observaciones || '---'}<br>
    <b>Adjuntos:</b> ${ (datos.adjuntos && datos.adjuntos.length)
      ? datos.adjuntos.map(a => `<a href="${a.url}" target="_blank">${a.name}</a>`).join(", ")
      : 'Ninguno'
    }
  `;
}
