// SIREX · Consulta Global / Resúmenes

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e",
  measurementId: "G-S2VPQNWZ21"
};
if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ELEMENTOS DOM ---
const form = document.getElementById('consultaForm');
const spinner = document.getElementById('spinner');
const resumenVentana = document.getElementById('resumenVentana');
const exportBtns = document.getElementById('exportBtns');
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnWhatsapp = document.getElementById('btnWhatsapp');

// --- NOMBRES Y ETIQUETAS DE GRUPOS ---
const GRUPOS = [
  { id: 'grupo1', label: 'Expulsiones', icon: '🚔' },
  { id: 'grupo2', label: 'Investigación 1', icon: '🕵️' },
  { id: 'grupo3', label: 'Investigación 2', icon: '🕵️‍♂️' },
  { id: 'grupo4', label: 'Operativo', icon: '🚨' },
  { id: 'puerto', label: 'Puerto', icon: '⚓' },
  { id: 'gestion', label: 'Gestión', icon: '📋' },
  { id: 'cecorex', label: 'CECOREX', icon: '📡' },
  { id: 'cie', label: 'CIE', icon: '🏢' },
  { id: 'estadistica', label: 'Estadística', icon: '📊' }
];

// --- GESTIÓN DEL FORMULARIO ---
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  resumenVentana.innerHTML = '';
  mostrarSpinner(true);
  exportBtns.classList.add('d-none');

  const desde = form.fechaDesde.value;
  const hasta = form.fechaHasta.value;
  if (desde > hasta) {
    mostrarError('La fecha de inicio no puede ser posterior a la de fin.');
    mostrarSpinner(false);
    return;
  }

  try {
    // Consulta todos los grupos en paralelo
    const gruposDatos = await Promise.all(GRUPOS.map(g =>
      getDatosGrupo(g.id, desde, hasta)
    ));
    // Estructura resultado
    const resumen = {};
    GRUPOS.forEach((g, idx) => {
      resumen[g.id] = gruposDatos[idx];
    });

    // Renderiza resumen visual
    resumenVentana.innerHTML = renderizarResumenHTML(resumen, desde, hasta);
    mostrarSpinner(false);
    exportBtns.classList.remove('d-none');
    // Guarda para exportación
    window._ultimoResumen = { resumen, desde, hasta };
  } catch (err) {
    mostrarError('Error al consultar los datos: ' + err.message);
    mostrarSpinner(false);
  }
});

// --- CONSULTA FIRESTORE DE UN GRUPO (adaptado para los nombres correctos) ---
async function getDatosGrupo(grupo, desde, hasta) {
  // grupo1: grupo1_expulsiones (docId: expulsiones_YYYY-MM-DD)
  if (grupo === "grupo1") {
    let col = db.collection("grupo1_expulsiones");
    let snap = await col.get();
    let datos = [];
    snap.forEach(doc => {
      const docId = doc.id;
      const fechaStr = docId.replace("expulsiones_", "");
      if (fechaStr >= desde && fechaStr <= hasta) {
        datos.push({ fecha: fechaStr, ...doc.data() });
      }
    });
    return datos;
  }

  // grupo4: grupo4_gestion (docId: gestion_YYYYMMDD)
  if (grupo === "grupo4") {
    let col = db.collection("grupo4_gestion");
    let snap = await col.get();
    let datos = [];
    snap.forEach(doc => {
      const docId = doc.id;
      // Extrae fecha: gestion_YYYYMMDD
      let fechaStr = docId.replace("gestion_", "");
      // Formato a YYYY-MM-DD
      if (fechaStr.length === 8) fechaStr = `${fechaStr.slice(0,4)}-${fechaStr.slice(4,6)}-${fechaStr.slice(6,8)}`;
      if (fechaStr >= desde && fechaStr <= hasta) {
        datos.push({ fecha: fechaStr, ...doc.data() });
      }
    });
    return datos;
  }

  // puerto: grupoPuerto_registros (docId: puerto_YYYY-MM-DD)
  if (grupo === "puerto") {
    let col = db.collection("grupoPuerto_registros");
    let snap = await col.get();
    let datos = [];
    snap.forEach(doc => {
      const docId = doc.id;
      const fechaStr = docId.replace("puerto_", "");
      if (fechaStr >= desde && fechaStr <= hasta) {
        datos.push({ fecha: fechaStr, ...doc.data() });
      }
    });
    return datos;
  }

  // cie: grupo_cie (docId: YYYY-MM-DD)
  if (grupo === "cie") {
    let col = db.collection("grupo_cie");
    let snap = await col.get();
    let datos = [];
    snap.forEach(doc => {
      const docId = doc.id; // Fecha directamente
      if (docId >= desde && docId <= hasta) {
        datos.push({ fecha: docId, ...doc.data() });
      }
    });
    return datos;
  }

  // grupo2 y grupo3: solo detenidos e inspecciones (inspecciones solo grupo3)
  if (grupo === "grupo2" || grupo === "grupo3") {
    const nombreColeccion = grupo + "_operaciones";
    let operacionesSnap = await db.collection(nombreColeccion).get();
    let resultado = [];

    for (const opDoc of operacionesSnap.docs) {
      const opId = opDoc.id;
      const opData = opDoc.data();

      // --- DETENIDOS ---
      const detenidosSnap = await db.collection(nombreColeccion).doc(opId)
        .collection("detenidos")
        .where("fechaDetenido", ">=", desde)
        .where("fechaDetenido", "<=", hasta)
        .get();
      detenidosSnap.forEach(det => {
        resultado.push({
          tipo: "detenido",
          operacion: opData.nombreOperacion || opId,
          ...det.data()
        });
      });

      // --- INSPECCIONES (solo grupo3, extiende a grupo2 si implementas ahí) ---
      if (grupo === "grupo3") {
        const inspeccionesSnap = await db.collection(nombreColeccion).doc(opId)
          .collection("inspecciones")
          .where("fechaInspeccion", ">=", desde)
          .where("fechaInspeccion", "<=", hasta)
          .get();
        inspeccionesSnap.forEach(ins => {
          resultado.push({
            tipo: "inspeccion",
            operacion: opData.nombreOperacion || opId,
            ...ins.data()
          });
        });
      }
    }
    return resultado;
  }

  // resto de grupos: filtro estándar por campo fecha
  let col = db.collection(grupo);
  let q = col.where('fecha', '>=', desde).where('fecha', '<=', hasta);
  let snap = await q.get();
  return snap.docs.map(doc => doc.data());
}

// --- RENDER HTML DEL RESUMEN ---
function renderizarResumenHTML(resumen, desde, hasta) {
  let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;
  html += `<div class="table-responsive"><table class="table table-striped align-middle">
    <thead><tr><th>Grupo</th><th>Detenidos / Inspecciones</th></tr></thead><tbody>`;
  let total = 0;
  GRUPOS.forEach(g => {
    const cantidad = resumen[g.id].length;
    total += cantidad;
    html += `<tr><td>${g.icon} <b>${g.label}</b></td><td class="text-end">${cantidad}</td></tr>`;
  });
  html += `<tr class="table-info"><td><b>Total general</b></td><td class="text-end"><b>${total}</b></td></tr>`;
  html += `</tbody></table></div>`;
  // Detalle extra opcional
  html += `<details><summary>Ver detalle por grupo</summary>`;
  GRUPOS.forEach(g => {
    if (resumen[g.id].length > 0) {
      html += `<h6 class="mt-3">${g.icon} ${g.label}</h6><ul>`;
      resumen[g.id].forEach((item, idx) => {
        html += `<li>${formatearItem(item, g.id)}</li>`;
      });
      html += `</ul>`;
    }
  });
  html += `</details>`;
  return html;
}

// --- FORMATEA ITEM (ajusta según tus campos por grupo) ---
function formatearItem(item, grupoId) {
  // Solo detenidos e inspecciones para grupo2 y grupo3
  if ((grupoId === "grupo2" || grupoId === "grupo3") && item.tipo === "detenido") {
    return `Detenido: ${item.filiacionDelito||''} (${item.nacionalidadDetenido||'-'}) - Motivo: ${item.motivo||item.filiacionDelito||'-'} - Fecha: ${item.fechaDetenido||'-'} [${item.operacion}]`;
  }
  if (grupoId === "grupo3" && item.tipo === "inspeccion") {
    return `Inspección: ${item.casa} (${item.fechaInspeccion}) - Filiadas: ${item.numFiliadas} [${(item.nacionalidadesFiliadas||[]).join(", ")}] [${item.operacion}]`;
  }
  // Otros grupos, genérico
  if (item.nombre) return `${item.nombre} (${item.nacionalidad||'-'}) - ${item.diligencias||'-'} - ${item.fecha||''}`;
  if (item.descripcion) return `${item.descripcion} [${item.fecha||''}]`;
  return Object.entries(item).map(([k,v])=>`${k}: ${v}`).join(', ');
}

// --- SPINNER Y ERROR ---
function mostrarSpinner(mostrar) {
  spinner.classList.toggle('d-none', !mostrar);
}
function mostrarError(msg) {
  resumenVentana.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

// --- EXPORTAR PDF ---
btnExportarPDF.addEventListener('click', () => {
  const { resumen, desde, hasta } = window._ultimoResumen;
  exportarPDF(resumen, desde, hasta);
});

function exportarPDF(resumen, desde, hasta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.text(`SIREX - Resumen Global`, 10, 18);
  doc.setFontSize(12);
  doc.text(`Desde: ${desde}    Hasta: ${hasta}`, 10, 28);

  let y = 38;
  GRUPOS.forEach(g => {
    const cantidad = resumen[g.id].length;
    doc.setFont(undefined, 'bold');
    doc.text(`${g.icon} ${g.label}:`, 10, y);
    doc.setFont(undefined, 'normal');
    doc.text(`Total: ${cantidad}`, 55, y);
    y += 8;
    if (cantidad > 0) {
      resumen[g.id].forEach((item, idx) => {
        doc.setFontSize(10);
        doc.text(`- ${formatearItem(item, g.id)}`, 15, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      doc.setFontSize(12);
    }
    y += 4;
  });
  doc.save(`SIREX-Resumen_${desde}_a_${hasta}.pdf`);
}

// --- EXPORTAR WHATSAPP ---
btnWhatsapp.addEventListener('click', () => {
  const { resumen, desde, hasta } = window._ultimoResumen;
  const mensaje = crearMensajeWhatsapp(resumen, desde, hasta);
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
});

function crearMensajeWhatsapp(resumen, desde, hasta) {
  let msg = `SIREX Resumen Global\n(${desde} a ${hasta})\n`;
  let total = 0;
  GRUPOS.forEach(g => {
    const cantidad = resumen[g.id].length;
    total += cantidad;
    msg += `\n${g.icon} ${g.label}: ${cantidad}`;
    if (cantidad > 0) {
      resumen[g.id].forEach(item => {
        msg += `\n- ${formatearItem(item, g.id)}`;
      });
    }
  });
  msg += `\n\nTotal general: ${total}`;
  return msg;
}
