// =====================================================================================
// SIREX - CECOREX (Gestión Integral: Importación DOCX, Validación Visual, Batch Firebase, CRUD Manual, Resúmenes, Multi-detenidos, Integración Completa)
// Profesional · Compatible con cecorex.html y novedades.js · 2025
// =====================================================================================

document.addEventListener('DOMContentLoaded', function () {

  // === CONFIGURACIÓN FIREBASE ===
  const firebaseConfig = {
    apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
    authDomain: "ucrif-5bb75.firebaseapp.com",
    projectId: "ucrif-5bb75",
    storageBucket: "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId: "1:241698436443:web:1f333b3ae3f813b755167e"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // === ELEMENTOS DOM PRINCIPALES ===
  const fechaInput = document.getElementById('fechaDia');
  const btnCargar = document.getElementById('btnCargar');
  const btnGrabar = document.getElementById('btnGrabar');
  const btnBorrar = document.getElementById('btnBorrar');
  const btnNuevo = document.getElementById('btnNuevo');
  const btnImportarDocx = document.getElementById('inputDocx');
  const btnVerResumen = document.getElementById('btnResumen');
  const addBtn = document.getElementById('addDetenidoBtn');
  const detenidosVentana = document.getElementById('detenidosVentana');
  const resumenModal = document.getElementById('resumenModal');
  const resumenContent = document.getElementById('resumenContent');
  const modalClose = document.getElementById('modalClose');

  // === FEEDBACK STATUS ===
  let statusDiv = document.getElementById('statusCECOREX');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'statusCECOREX';
    document.querySelector('.container.mb-5')?.prepend(statusDiv);
  }
  function showStatus(msg, type = 'info') {
    let cls = { info: 'alert-info', success: 'alert-success', error: 'alert-danger', warning: 'alert-warning' };
    statusDiv.innerHTML = `<div class="alert ${cls[type] || cls.info}" role="alert">${msg}</div>`;
  }
  function clearStatus() { statusDiv.innerHTML = ''; }

  // === UTILIDADES ===
  function isoDate() { return (new Date()).toISOString().slice(0, 10); }
  function getFecha() { return fechaInput.value; }
  function setFecha(f) { fechaInput.value = f; }

  // =================================================================================
  // DINÁMICA DE DETENIDOS (Lista dinámica, igual que en grupo1, sincronizada con el formulario)
  // =================================================================================
  window.detenidos = [];
  function renderDetenidos() {
    detenidosVentana.innerHTML = '';
    if (!window.detenidos.length) {
      detenidosVentana.innerHTML = '<span class="text-muted">Sin detenidos.</span>';
      return;
    }
    window.detenidos.forEach((d, i) => {
      const div = document.createElement('div');
      div.className = 'list-group-item d-flex align-items-center justify-content-between mb-2';
      div.innerHTML = `
        <span>
          <strong>${d.DETENIDOS || ''}</strong> - ${d.MOTIVO || ''} - ${d.NACIONALIDAD || ''} - ${d.PRESENTA || ''} - ${d.OBSERVACIONES || ''}
        </span>
        <button class="list-btn-delete" type="button" title="Eliminar" onclick="eliminarDetenido(${i})">&times;</button>
      `;
      detenidosVentana.appendChild(div);
    });
  }
  window.renderDetenidos = renderDetenidos;
  window.eliminarDetenido = function (idx) {
    window.detenidos.splice(idx, 1);
    renderDetenidos();
  };
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      const fields = ['DETENIDOS', 'MOTIVO', 'NACIONALIDAD', 'PRESENTA', 'OBSERVACIONES'];
      const values = {};
      let empty = true;
      fields.forEach(id => {
        const el = document.getElementById(id);
        values[id] = el ? el.value.trim() : '';
        if (values[id]) empty = false;
      });
      if (empty) return;
      window.detenidos.push({ ...values });
      renderDetenidos();
      fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    });
  }

  // =================================================================================
  // FUNCIONES GLOBALES (para integración con novedades.js y otros scripts)
  // =================================================================================
  window.setCECOREXData = function (data) {
    window.detenidos = Array.isArray(data.detenidos) ? data.detenidos : [];
    renderDetenidos();
    [
      "CONS.TFNO", "CONS.PRESC", "CONS. EQUIP", "CITADOS", "NOTIFICACIONES", "AL. ABOGADOS",
      "REM. SUBDELEGACIÓN", "DECRETOS EXP.", "TRAMITES AUDIENCIA",
      "CIE CONCEDIDO", "CIES DENEGADO", "PROH. ENTRADA", "MENAS", "Dil. INFORME"
    ].forEach(k => { if (data[k] !== undefined && document.getElementById(k)) document.getElementById(k).value = data[k]; });
    if (data["GESTIONES VARIAS"] !== undefined && document.getElementById("GESTIONES VARIAS"))
      document.getElementById("GESTIONES VARIAS").value = data["GESTIONES VARIAS"];
  };
  window.getCECOREXData = function () {
    return {
      detenidos: window.detenidos ? [...window.detenidos] : [],
      "CONS.TFNO": Number(document.getElementById("CONS.TFNO").value) || 0,
      "CONS.PRESC": Number(document.getElementById("CONS.PRESC").value) || 0,
      "CONS. EQUIP": Number(document.getElementById("CONS. EQUIP").value) || 0,
      "CITADOS": Number(document.getElementById("CITADOS").value) || 0,
      "NOTIFICACIONES": Number(document.getElementById("NOTIFICACIONES").value) || 0,
      "AL. ABOGADOS": Number(document.getElementById("AL. ABOGADOS").value) || 0,
      "REM. SUBDELEGACIÓN": Number(document.getElementById("REM. SUBDELEGACIÓN").value) || 0,
      "DECRETOS EXP.": Number(document.getElementById("DECRETOS EXP.").value) || 0,
      "TRAMITES AUDIENCIA": Number(document.getElementById("TRAMITES AUDIENCIA").value) || 0,
      "CIE CONCEDIDO": Number(document.getElementById("CIE CONCEDIDO").value) || 0,
      "CIES DENEGADO": Number(document.getElementById("CIES DENEGADO").value) || 0,
      "PROH. ENTRADA": Number(document.getElementById("PROH. ENTRADA").value) || 0,
      "MENAS": Number(document.getElementById("MENAS").value) || 0,
      "Dil. INFORME": Number(document.getElementById("Dil. INFORME").value) || 0,
      "GESTIONES VARIAS": document.getElementById("GESTIONES VARIAS").value
    };
  };

  // =================================================================================
  // LIMPIAR FORMULARIO (Igual que en grupo1, pone todos a cero)
  // =================================================================================
  function limpiarForm() {
    window.setCECOREXData({ detenidos: [] });
    [
      "CONS.TFNO", "CONS.PRESC", "CONS. EQUIP", "CITADOS", "NOTIFICACIONES", "AL. ABOGADOS",
      "REM. SUBDELEGACIÓN", "DECRETOS EXP.", "TRAMITES AUDIENCIA",
      "CIE CONCEDIDO", "CIES DENEGADO", "PROH. ENTRADA", "MENAS", "Dil. INFORME"
    ].forEach(k => { if (document.getElementById(k)) document.getElementById(k).value = 0; });
    if (document.getElementById("GESTIONES VARIAS")) document.getElementById("GESTIONES VARIAS").value = "";
    window.detenidos = [];
    renderDetenidos();
  }

  // =================================================================================
  // CRUD MANUAL: CARGAR / GUARDAR / BORRAR / NUEVO
  // =================================================================================

  btnCargar.addEventListener('click', async () => {
    clearStatus();
    const fecha = getFecha();
    if (!fecha) return showStatus('Selecciona una fecha para cargar.', 'warning');
    try {
      const ref = db.collection("cecorex_registros").doc(fecha);
      const snap = await ref.get();
      if (snap.exists) {
        setCECOREXData(snap.data());
        showStatus('Registro cargado correctamente.', 'success');
      } else {
        limpiarForm();
        showStatus('No hay registro para esa fecha. Formulario limpio.', 'info');
      }
    } catch (err) {
      showStatus('Error al cargar: ' + err.message, 'error');
    }
  });

  btnGrabar.addEventListener('click', async () => {
    clearStatus();
    const fecha = getFecha();
    if (!fecha) return showStatus('Selecciona una fecha válida antes de guardar.', 'warning');
    const data = getCECOREXData();
    try {
      const ref = db.collection("cecorex_registros").doc(fecha);
      await ref.set({ ...data, fecha }, { merge: false });
      showStatus('Guardado correctamente en Firebase.', 'success');
    } catch (err) {
      showStatus('Error al guardar: ' + err.message, 'error');
    }
  });

  btnBorrar.addEventListener('click', async () => {
    clearStatus();
    const fecha = getFecha();
    if (!fecha) return showStatus('Selecciona una fecha para borrar.', 'warning');
    if (!confirm('¿Seguro que quieres borrar este registro CECOREX?')) return;
    try {
      const ref = db.collection("cecorex_registros").doc(fecha);
      await ref.delete();
      limpiarForm();
      showStatus('Registro eliminado.', 'success');
    } catch (err) {
      showStatus('Error al borrar: ' + err.message, 'error');
    }
  });

  btnNuevo.addEventListener('click', () => {
    setFecha(isoDate());
    limpiarForm();
    clearStatus();
  });

  // =================================================================================
  // IMPORTACIÓN Y PARSING DE DOCX COMPLETO · UI DE REVISIÓN Y VALIDACIÓN
  // =================================================================================

  // Estados intermedios para confirmación
  let parsedCECOREXDataForConfirmation = null;

  if (btnImportarDocx) btnImportarDocx.addEventListener('change', handleDocxUpload);

  // --- PARSER DE DOCX SOLO PARA SECCIÓN CECOREX ---
  async function handleDocxUpload(event) {
    clearStatus();
    const file = event.target.files[0];
    if (!file) return;
    showStatus('Procesando archivo DOCX...', 'info');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlRoot = document.createElement('div');
      htmlRoot.innerHTML = result.value;

      // Buscar cabecera y tabla de CECOREX
      const normalized = str => str?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
      const headers = Array.from(htmlRoot.querySelectorAll('h1,h2,h3,h4,p,strong'));
      let ceHeader = headers.find(h => normalized(h.textContent).includes('CECOREX'));
      let ceTable = null;
      if (ceHeader) {
        let next = ceHeader.nextElementSibling;
        while (next && next.tagName !== 'TABLE') next = next.nextElementSibling;
        ceTable = next;
      }
      if (!ceTable) throw new Error('No se encontró la tabla CECOREX en el DOCX.');

      // Mapear tabla: clave-valor
      const rows = ceTable.querySelectorAll('tr');
      const cecorexData = {};
      for (let row of rows) {
        const cells = row.querySelectorAll('td,th');
        if (cells.length < 2) continue;
        const key = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();
        cecorexData[key] = !isNaN(value) && value !== '' ? Number(value) : value;
      }
      // Detenidos: parseo especial si hay tabla detenidos
      let detenidosTable = null;
      let idx = headers.findIndex(h => normalized(h.textContent).includes('CECOREX'));
      for (let i = idx + 1; i < headers.length; i++) {
        if (normalized(headers[i].textContent).includes('DETENIDOS')) {
          let n = headers[i].nextElementSibling;
          while (n && n.tagName !== 'TABLE') n = n.nextElementSibling;
          if (n && n.tagName === 'TABLE') { detenidosTable = n; break; }
        }
      }
      if (detenidosTable) {
        const detRows = detenidosTable.querySelectorAll('tr');
        const detHeader = Array.from(detRows[0].children).map(th => th.textContent.trim().toUpperCase());
        const detenidos = [];
        for (let i = 1; i < detRows.length; i++) {
          const cells = detRows[i].querySelectorAll('td');
          if (!cells.length) continue;
          let obj = {};
          detHeader.forEach((h, j) => obj[h] = cells[j]?.textContent.trim() || '');
          detenidos.push(obj);
        }
        cecorexData.detenidos = detenidos.map(e => ({
          DETENIDOS: e['DETENIDOS'] || '',
          MOTIVO: e['MOTIVO'] || '',
          NACIONALIDAD: e['NACIONALIDAD'] || '',
          PRESENTA: e['PRESENTA'] || '',
          OBSERVACIONES: e['OBSERVACIONES'] || ''
        }));
      }

      // Guarda en buffer y muestra para revisión visual
      parsedCECOREXDataForConfirmation = cecorexData;
      mostrarRevisionVisualCECOREX(cecorexData);
      showStatus('Datos extraídos. Revisa visualmente y confirma para guardar.', 'info');

    } catch (err) {
      showStatus('Error al procesar DOCX: ' + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  }

  // --- Muestra UI de revisión visual para CECOREX ---
  function mostrarRevisionVisualCECOREX(data) {
    // Aquí puedes personalizar el modal/resumen visual a tu gusto (puedes hacerlo tipo card, tabla, etc.)
    let html = '<h5>Datos extraídos de CECOREX</h5><ul class="list-group mb-3">';
    Object.keys(data).forEach(k => {
      if (k === 'detenidos') return;
      html += `<li class="list-group-item d-flex justify-content-between"><span>${k}</span><strong>${data[k]}</strong></li>`;
    });
    html += '</ul>';
    if (data.detenidos && data.detenidos.length) {
      html += '<h6>Detenidos</h6><ul class="list-group">';
      data.detenidos.forEach(d => {
        html += `<li class="list-group-item small">${d.DETENIDOS} - ${d.MOTIVO} - ${d.NACIONALIDAD} - ${d.PRESENTA} - ${d.OBSERVACIONES}</li>`;
      });
      html += '</ul>';
    }
    html += `<div class="mt-3">
      <button class="btn btn-success" id="btnConfirmarGuardado">Confirmar y guardar</button>
      <button class="btn btn-secondary ms-2" id="btnCancelarConfirmacion">Cancelar</button>
    </div>`;
    resumenContent.innerHTML = html;
    resumenModal.style.display = "block";
    document.getElementById('btnConfirmarGuardado').onclick = onConfirmSave;
    document.getElementById('btnCancelarConfirmacion').onclick = onCancelRevision;
  }

  // --- Confirma y guarda en Firebase (batch atómico) ---
  async function onConfirmSave() {
    if (!parsedCECOREXDataForConfirmation) return;
    showStatus('Guardando datos en Firebase, por favor espera...', 'info');
    resumenModal.style.display = "none";
    try {
      const fecha = getFecha() || isoDate();
      const ref = db.collection("cecorex_registros").doc(fecha);
      await ref.set({ ...parsedCECOREXDataForConfirmation, fecha }, { merge: false });
      setCECOREXData(parsedCECOREXDataForConfirmation);
      showStatus('¡Éxito! Datos de CECOREX guardados en Firebase.', 'success');
    } catch (err) {
      showStatus('Error al guardar: ' + err.message, 'error');
    } finally {
      parsedCECOREXDataForConfirmation = null;
    }
  }

  // --- Cancela revisión visual ---
  function onCancelRevision() {
    resumenModal.style.display = "none";
    parsedCECOREXDataForConfirmation = null;
    showStatus('Importación cancelada. No se han guardado cambios.', 'warning');
  }

  // --- Cierra modal de resumen ---
  if (modalClose) modalClose.onclick = function () {
    resumenModal.style.display = "none";
  };

  // --- Resumen visual desde el propio formulario manual ---
  if (btnVerResumen) btnVerResumen.addEventListener('click', function () {
    let data = getCECOREXData();
    mostrarRevisionVisualCECOREX(data);
  });

  // =================================================================================
  // INICIALIZACIÓN AL ABRIR PÁGINA
  // =================================================================================
  setFecha(isoDate());
  limpiarForm();
  renderDetenidos();

  // =================================================================================
  // ESTILOS Y UTILIDAD MODAL (por si usas modal puro, sin librerías)
  // =================================================================================
  // Cierre modal clicando fuera (básico, personalizable)
  window.onclick = function (event) {
    if (event.target == resumenModal) resumenModal.style.display = "none";
  };
});
