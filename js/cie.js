/********************************************************************************
* SIREX · Módulo CIE (Centro de Internamiento de Extranjeros)                 *
* Versión 1.0 - Compatible con importación de DOCX                            *
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
function showToast(msg) { alert(msg); }

function formatoFecha(f) {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}

function limpiarFormulario() {
  $('formCIE')?.reset();
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
    <b>Fecha:</b> ${formatoFecha(datos.fecha)}<br>
    <b>Nº de Internos:</b> ${datos.n_internos}<br>
    <b>Entradas:</b> ${datos.entradas}<br>
    <b>Salidas:</b> ${datos.salidas}<br>
    <b>Observaciones:</b> ${datos.observaciones_cie || "---"}
  `;
}

// ======================= EVENTOS PRINCIPALES ======================
document.addEventListener('DOMContentLoaded', () => {

  // --- Carga de registro ---
  $('btnCargar').addEventListener('click', async () => {
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("Por favor, selecciona una fecha para cargar.");
    
    const docRef = db.collection(NOMBRE_COLECCION).doc(fecha);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const datos = docSnap.data();
      uiPoblarFormulario(datos);
      mostrarResumen(datos);
      showToast("Registro cargado correctamente.");
    } else {
      limpiarFormulario();
      showToast("No se encontró ningún registro para la fecha seleccionada.");
    }
  });

  // --- Guardar registro ---
  $('formCIE').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("La fecha es obligatoria para guardar.");

    const datos = uiLeerDatosDelFormulario();
    
    await db.collection(NOMBRE_COLECCION).doc(fecha).set(datos);
    mostrarResumen(datos);
    showToast("Registro guardado con éxito.");
  });
  
  // --- Nuevo registro ---
  $('btnNuevo').addEventListener('click', () => {
    if (confirm("¿Estás seguro de que quieres limpiar el formulario para un nuevo registro?")) {
      limpiarFormulario();
    }
  });
  
  // --- Eliminar registro ---
  $('btnEliminar').addEventListener('click', async () => {
    const fecha = $('fechaCIE').value;
    if (!fecha) return showToast("Selecciona una fecha para eliminar.");
    if (!confirm(`¿Estás seguro de que quieres eliminar el registro del día ${fecha}? Esta acción no se puede deshacer.`)) return;

    await db.collection(NOMBRE_COLECCION).doc(fecha).delete();
    limpiarFormulario();
    showToast("Registro eliminado correctamente.");
  });

  // ========== RESUMEN AVANZADO Y EXPORTACIONES ==========
  let resumenFiltrado = [];

  $('btnGenerarResumen').addEventListener('click', async () => {
    const desde = $('desdeResumen').value;
    const hasta = $('hastaResumen').value;
    if (!desde || !hasta) return showToast("Selecciona un rango de fechas.");

    const snapshot = await db.collection(NOMBRE_COLECCION).orderBy('fecha').startAt(desde).endAt(hasta).get();
    resumenFiltrado = snapshot.docs.map(doc => doc.data());

    const ventanaResumen = $('resumenAvanzadoVentana');
    if (resumenFiltrado.length === 0) {
      ventanaResumen.innerHTML = "<p class='text-muted'>No hay datos en el rango seleccionado.</p>";
      return;
    }

    let html = `<div class='table-responsive'><table class='table table-striped'>
      <thead><tr>
        <th>Fecha</th><th>Nº Internos</th><th>Entradas</th><th>Salidas</th><th>Observaciones</th>
      </tr></thead><tbody>`;
    resumenFiltrado.forEach(item => {
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td>
        <td>${item.n_internos || 0}</td>
        <td>${item.entradas || 0}</td>
        <td>${item.salidas || 0}</td>
        <td>${item.observaciones_cie || ""}</td>
      </tr>`;
    });
    html += "</tbody></table></div>";
    ventanaResumen.innerHTML = html;
  });

  // --- Exportar a PDF ---
  $('btnExportarPDF').addEventListener('click', () => {
    if (resumenFiltrado.length === 0) return showToast("Primero genera un resumen.");
    let html = `<h2>Resumen CIE</h2><h4>Del ${$('desdeResumen').value} al ${$('hastaResumen').value}</h4>
    <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse: collapse;">
    <thead><tr><th>Fecha</th><th>Nº Internos</th><th>Entradas</th><th>Salidas</th><th>Observaciones</th></tr></thead><tbody>`;
    resumenFiltrado.forEach(item => {
      html += `<tr>
        <td>${formatoFecha(item.fecha)}</td><td>${item.n_internos||0}</td><td>${item.entradas||0}</td>
        <td>${item.salidas||0}</td><td>${item.observaciones_cie||""}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Resumen CIE</title></head><body>${html}</body></html>`);
    w.print();
  });

  // --- Exportar a CSV ---
  $('btnExportarCSV').addEventListener('click', () => {
    if (resumenFiltrado.length === 0) return showToast("Primero genera un resumen.");
    let csv = "Fecha,N_Internos,Entradas,Salidas,Observaciones\n";
    resumenFiltrado.forEach(item => {
      csv += [
        item.fecha, item.n_internos||0, item.entradas||0, item.salidas||0,
        `"${(item.observaciones_cie||"").replace(/"/g, '""')}"`
      ].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "resumen_cie.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  
  // --- Copiar para WhatsApp ---
  $('btnWhatsapp').addEventListener('click', () => {
    if (resumenFiltrado.length === 0) return showToast("Primero genera un resumen.");
    let texto = `*Resumen CIE del ${formatoFecha($('desdeResumen').value)} al ${formatoFecha($('hastaResumen').value)}*\n\n`;
    resumenFiltrado.forEach(item => {
      texto += `*${formatoFecha(item.fecha)}:*\n`;
      texto += `- Internos: ${item.n_internos||0}\n`;
      texto += `- Entradas: ${item.entradas||0}\n`;
      texto += `- Salidas: ${item.salidas||0}\n`;
      if(item.observaciones_cie) texto += `- Obs: ${item.observaciones_cie}\n`;
      texto += "\n";
    });
    navigator.clipboard.writeText(texto)
      .then(() => showToast("Resumen para WhatsApp copiado al portapapeles."))
      .catch(() => showToast("Error al copiar. Es posible que tu navegador no sea compatible."));
  });

});
