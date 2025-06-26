// js/consulta.js
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
    <thead><tr><th>Grupo</th><th>Actuaciones / Registros</th></tr></thead><tbody>`;
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
  if (grupoId === "grupo1") {
    const expulsados = item.expulsados ? item.expulsados.length : 0;
    const fletados = item.fletados ? item.fletados.length : 0;
    const fletadosFuturos = item.fletadosFuturos ? item.fletadosFuturos.length : 0;
    const conPos = (item.conduccionesPositivas||[]).map(c=>c.numero).reduce((a,b)=>a+b,0);
    const conNeg = (item.conduccionesNegativas||[]).map(c=>c.numero).reduce((a,b)=>a+b,0);
    const pendientes = item.pendientes ? item.pendientes.length : 0;
    return `Fecha: ${item.fecha}, Expulsados: ${expulsados}, Fletados: ${fletados}, Fletados Futuros: ${fletadosFuturos}, Conducciones +: ${conPos}, Conducciones -: ${conNeg}, Pendientes: ${pendientes}`;
  }
  if (grupoId === "grupo4") {
    const colabs = item.colaboraciones ? item.colaboraciones.length : 0;
    const detenidos = item.detenidos ? item.detenidos.length : 0;
    const citados = item.citados ? item.citados.length : 0;
    const gestiones = item.gestiones ? item.gestiones.length : 0;
    const inspecciones = item.inspeccionesTrabajo ? item.inspeccionesTrabajo.length : 0;
    const otrasInsp = item.otrasInspecciones ? item.otrasInspecciones.length : 0;
    return `Fecha: ${item.fecha}, Colaboraciones: ${colabs}, Detenidos: ${detenidos}, Citados: ${citados}, Otras gestiones: ${gestiones}, Inspecciones Trabajo: ${inspecciones}, Otras inspecciones: ${otrasInsp}`;
  }
  if (grupoId === "puerto") {
    const ferrys = item.ferrys ? item.ferrys.length : 0;
    const totalPasajeros = ferrys > 0 ? item.ferrys.map(f => parseInt(f.pasajeros)||0).reduce((a,b)=>a+b,0) : 0;
    const totalVehiculos = ferrys > 0 ? item.ferrys.map(f => parseInt(f.vehiculos)||0).reduce((a,b)=>a+b,0) : 0;
    return `Fecha: ${item.fecha}, Ferrys: ${ferrys}, Pasajeros: ${totalPasajeros}, Vehículos: ${totalVehiculos}`;
  }
  if (grupoId === "cie") {
    const internosNac = item.internosNac ? item.internosNac.length : 0;
    const ingresos = item.ingresos ? item.ingresos.length : 0;
    const salidas = item.salidas ? item.salidas.length : 0;
    return `Fecha: ${item.fecha}, Internos nacionales: ${internosNac}, Ingresos: ${ingresos}, Salidas: ${salidas}`;
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
  GRUPOS.forEach(g => {
    const cantidad = resumen[g.id].length;
    msg += `${g.icon} ${g.label}: ${cantidad}\n`;
  });
  return msg + 'Total general: ' +
    GRUPOS.reduce((acc,g)=>acc+resumen[g.id].length,0);
}
