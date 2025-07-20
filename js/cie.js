/********************************************************************************
* SIREX · Módulo CIE (Centro de Internamiento de Extranjeros)                 *
* Versión 2.0 - Compatible con importación de DOCX                            *
* Gestiona internos, entradas, salidas y observaciones.                       *
* Incluye resúmenes avanzados, exportación a PDF, CSV y formato para WhatsApp.*
*********************************************************************************/

// =================== CONFIGURACIÓN Y CONSTANTES ===================
const NOMBRE_COLECCION = "cie_registros";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};

// =================== INICIALIZACIÓN DE FIREBASE ===================
if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
const $ = id => document.getElementById(id);

// ======================== FUNCIONES HELPERS =======================
function showToast(msg, type = 'info') {
    const toastContainer = $('toast');
    if(toastContainer) {
        toastContainer.textContent = msg;
        toastContainer.className = `toast show toast-${type}`;
        setTimeout(() => { toastContainer.className = 'toast'; }, 3000);
    } else {
        alert(msg);
    }
}

function formatoFecha(f) {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime()) || f.length < 10) return f;
  const [year, month, day] = f.split('-');
  return `${day}/${month}/${year}`;
}

function limpiarFormulario() {
  $('formCIE')?.reset();
  const hoy = new Date().toISOString().slice(0, 10);
  $('fechaCIE').value = hoy;
  if ($('panelResumenCIE')) $('panelResumenCIE').style.display = "none";
}

// ======================= GESTIÓN DEL REGISTRO =====================
function uiPoblarFormulario(datos) {
  $('n_internos').value = datos.n_internos || 0;
  $('entradas').value = datos.entradas || 0;
  $('salidas').value = datos.salidas || 0;
  $('observaciones_cie').value = datos.observaciones_cie || "";
}

function uiLeerDatosDelFormulario() {
  return {
    fecha: $('fechaCIE').value,
    n_internos: parseInt($('n_internos').value) || 0,
    entradas: parseInt($('entradas').value) || 0,
    salidas: parseInt($('salidas').value) || 0,
    observaciones_cie: $('observaciones_cie').value.trim()
  };
}

function mostrarResumen(datos) {
  const panel = $('panelResumenCIE');
  const div = $('resumenCIE');
  if (!panel || !div) return;
  
  panel.style.display = 'block';
  div.innerHTML = `
    <p><strong>Fecha:</strong> ${formatoFecha(datos.fecha)}</p>
    <p><strong>Nº de Internos:</strong> ${datos.n_internos}</p>
    <p><strong>Entradas:</strong> ${datos.entradas}</p>
    <p><strong>Salidas:</strong> ${datos.salidas}</p>
    <p><strong>Observaciones:</strong> ${datos.observaciones_cie || "---"}</p>
  `;
}

// ======================= EVENTOS PRINCIPALES ======================
document.addEventListener('DOMContentLoaded', () => {
  limpiarFormulario(); // Pone la fecha de hoy al cargar

  $('btnCargar').addEventListener('click', async () => {
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("Por favor, selecciona una fecha para cargar.", 'warning');
    const doc = await db.collection(NOMBRE_COLECCION).doc(fecha).get();
    if (doc.exists) {
      uiPoblarFormulario(doc.data());
      mostrarResumen(doc.data());
    } else {
      showToast("No se encontró ningún registro para la fecha seleccionada.", 'info');
      limpiarFormulario();
      $('fechaCIE').value = fecha;
    }
  });

  $('formCIE').addEventListener('submit', async (e) => {
    e.preventDefault(); // El botón de grabar es de tipo submit
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("La fecha es obligatoria para guardar.", 'danger');
    const datos = uiLeerDatosDelFormulario();
    await db.collection(NOMBRE_COLECCION).doc(fecha).set(datos);
    mostrarResumen(datos);
    showToast("Registro guardado con éxito.", 'success');
  });
  
  $('btnNuevo').addEventListener('click', () => {
    if (confirm("¿Estás seguro? Se borrarán los datos del formulario actual.")) {
      limpiarFormulario();
    }
  });
  
  $('btnEliminar').addEventListener('click', async () => {
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("Selecciona una fecha para eliminar.", 'warning');
    if (!confirm(`¿ELIMINAR el registro del día ${formatoFecha(fecha)}? Esta acción no se puede deshacer.`)) return;
    await db.collection(NOMBRE_COLECCION).doc(fecha).delete();
    limpiarFormulario();
    showToast("Registro eliminado.", 'danger');
  });

  // ========== RESUMEN AVANZADO Y EXPORTACIONES ==========
  let resumenFiltrado = [];

  $('btnGenerarResumen').addEventListener('click', async () => {
    const desde = $('desdeResumen').value;
    const hasta = $('hastaResumen').value;
    if (!desde || !hasta) return showToast("Selecciona un rango de fechas.", 'warning');
    const snapshot = await db.collection(NOMBRE_COLECCION).where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
    resumenFiltrado = snapshot.docs.map(doc => doc.data());
    resumenFiltrado.sort((a,b) => a.fecha.localeCompare(b.fecha)); // Ordenar por fecha

    const ventanaResumen = $('resumenAvanzadoVentana');
    if (resumenFiltrado.length === 0) {
      ventanaResumen.innerHTML = "<p class='text-muted mt-2'>No hay datos en el rango seleccionado.</p>";
      return;
    }
    let html = `<div class='table-responsive mt-3'><table class='table table-striped table-hover'>
      <thead class="table-dark"><tr><th>Fecha</th><th>Internos</th><th>Entradas</th><th>Salidas</th><th>Observaciones</th></tr></thead><tbody>`;
    resumenFiltrado.forEach(item => {
      html += `<tr><td>${formatoFecha(item.fecha)}</td><td>${item.n_internos||0}</td><td>${item.entradas||0}</td><td>${item.salidas||0}</td><td>${item.observaciones_cie||""}</td></tr>`;
    });
    html += "</tbody></table></div>";
    ventanaResumen.innerHTML = html;
  });

  const exportar = (tipo) => {
    if (resumenFiltrado.length === 0) return showToast("Primero genera un resumen.", 'warning');
    const desde = $('desdeResumen').value, hasta = $('hastaResumen').value;
    const titulo = `<h2>Resumen CIE del ${formatoFecha(desde)} al ${formatoFecha(hasta)}</h2>`;
    if (tipo === 'pdf') {
        const headers = "<th>Fecha</th><th>Internos</th><th>Entradas</th><th>Salidas</th><th>Observaciones</th>";
        const rows = resumenFiltrado.map(item => `<tr><td>${formatoFecha(item.fecha)}</td><td>${item.n_internos||0}</td><td>${item.entradas||0}</td><td>${item.salidas||0}</td><td>${item.observaciones_cie||""}</td></tr>`).join('');
        const win = window.open();
        win.document.write(`<html><head><title>Resumen CIE</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"></head><body><div class="container">${titulo}<table class="table table-bordered">${headers}${rows}</table></div></body></html>`);
        setTimeout(() => win.print(), 500);
    } else if (tipo === 'csv') {
        let csv = "Fecha,Internos,Entradas,Salidas,Observaciones\n";
        resumenFiltrado.forEach(r => { csv += [r.fecha, r.n_internos||0, r.entradas||0, r.salidas||0, `"${(r.observaciones_cie||"").replace(/"/g,'""')}"`].join(",") + "\n"; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `resumen_cie_${desde}_${hasta}.csv`;
        link.click();
    } else if (tipo === 'whatsapp') {
        let texto = `*Resumen CIE del ${formatoFecha(desde)} al ${formatoFecha(hasta)}*\n\n`;
        resumenFiltrado.forEach(item => { texto += `*${formatoFecha(item.fecha)}:*\n- Internos: ${item.n_internos||0}\n- Entradas: ${item.entradas||0}\n- Salidas: ${item.salidas||0}\n${item.observaciones_cie ? `- Obs: ${item.observaciones_cie}\n` : ''}\n`; });
        navigator.clipboard.writeText(texto).then(() => showToast('Resumen copiado para WhatsApp.', 'success'), () => showToast('Error al copiar.', 'danger'));
    }
  };
  $('btnExportarPDF').addEventListener('click', () => exportar('pdf'));
  $('btnExportarCSV').addEventListener('click', () => exportar('csv'));
  $('btnWhatsapp').addEventListener('click', () => exportar('whatsapp'));
});
