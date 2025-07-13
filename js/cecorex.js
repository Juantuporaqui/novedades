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
      mostrarRevisionVisualCECOREX(cecorexData, true); // true = resumen avanzado
      showStatus('Datos extraídos. Revisa visualmente y confirma para guardar.', 'info');

    } catch (err) {
      showStatus('Error al procesar DOCX: ' + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  }

  // === GENERADOR DE RESUMEN AVANZADO PARA CECOREX ===
  function resumenAvanzadoCECOREX(data) {
    let out = `<h5 class="mb-2"><i class="bi bi-clipboard-data"></i> Resumen Avanzado CECOREX</h5>`;
    out += `<div class="mb-2 text-muted" style="font-size:1em;">Fecha: <strong>${getFecha() || '—'}</strong></div>`;

    out += `<div class="mb-2"><strong>Consultas y Trámites:</strong>
      <ul class="list-group list-group-flush">`;
    out += `<li class="list-group-item">CONS. TFNO: <b>${data["CONS.TFNO"]||0}</b></li>`;
    out += `<li class="list-group-item">CONS. PRESC: <b>${data["CONS.PRESC"]||0}</b></li>`;
    out += `<li class="list-group-item">CONS. EQUIP: <b>${data["CONS. EQUIP"]||0}</b></li>`;
    out += `<li class="list-group-item">TRÁMITES AUDIENCIA: <b>${data["TRAMITES AUDIENCIA"]||0}</b></li>`;
    out += `</ul></div>`;

    out += `<div class="mb-2"><strong>Resoluciones y Citaciones:</strong>
      <ul class="list-group list-group-flush">`;
    out += `<li class="list-group-item">CITADOS: <b>${data["CITADOS"]||0}</b></li>`;
    out += `<li class="list-group-item">NOTIFICACIONES: <b>${data["NOTIFICACIONES"]||0}</b></li>`;
    out += `<li class="list-group-item">AL. ABOGADOS: <b>${data["AL. ABOGADOS"]||0}</b></li>`;
    out += `<li class="list-group-item">REM. SUBDELEGACIÓN: <b>${data["REM. SUBDELEGACIÓN"]||0}</b></li>`;
    out += `</ul></div>`;

    out += `<div class="mb-2"><strong>Expulsiones y Medidas:</strong>
      <ul class="list-group list-group-flush">`;
    out += `<li class="list-group-item">DECRETOS EXP.: <b>${data["DECRETOS EXP."]||0}</b></li>`;
    out += `<li class="list-group-item">CIE CONCEDIDO: <b>${data["CIE CONCEDIDO"]||0}</b></li>`;
    out += `<li class="list-group-item">CIES DENEGADO: <b>${data["CIES DENEGADO"]||0}</b></li>`;
    out += `<li class="list-group-item">PROH. ENTRADA: <b>${data["PROH. ENTRADA"]||0}</b></li>`;
    out += `</ul></div>`;

    out += `<div class="mb-2"><strong>Otros:</strong>
      <ul class="list-group list-group-flush">`;
    out += `<li class="list-group-item">MENAS: <b>${data["MENAS"]||0}</b></li>`;
    out += `<li class="list-group-item">Dil. INFORME: <b>${data["Dil. INFORME"]||0}</b></li>`;
    out += `<li class="list-group-item">Gestiones Varias: <span>${(data["GESTIONES VARIAS"]||'').replace(/\n/g,'<br>')}</span></li>`;
    out += `</ul></div>`;

    // Detenidos (tabla avanzada)
    const detenidos = data.detenidos || [];
    out += `<div class="mb-2"><strong>Detenidos:</strong> <span class="text-muted ms-2">${detenidos.length}</span>`;
    if (detenidos.length) {
      out += `<div class="table-responsive"><table class="table table-bordered table-sm mt-2">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Detenido</th>
            <th>Motivo</th>
            <th>Nacionalidad</th>
            <th>Presenta</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>`;
      detenidos.forEach((d, i) => {
        out += `<tr>
          <td>${i+1}</td>
          <td>${d.DETENIDOS||''}</td>
          <td>${d.MOTIVO||''}</td>
          <td>${d.NACIONALIDAD||''}</td>
          <td>${d.PRESENTA||''}</td>
          <td>${d.OBSERVACIONES||''}</td>
        </tr>`;
      });
      out += `</tbody></table></div>`;
    } else {
      out += `<div class="text-muted ms-2">Sin detenidos registrados.</div>`;
    }
    out += `</div>`;

    return out;
  }

  // --- Muestra UI de revisión visual para CECOREX ---
  function mostrarRevisionVisualCECOREX(data) {
    resumenContent.innerHTML = resumenAvanzadoCECOREX(data);
    if (!document.getElementById('btnConfirmarGuardado')) {
      // Botones para importación (solo al importar DOCX, no en revisión manual)
      const btnRow = document.createElement('div');
      btnRow.className = "mt-3 mb-2";
      btnRow.innerHTML = `
        <button class="btn btn-success" id="btnConfirmarGuardado">Confirmar y guardar</button>
        <button class="btn btn-secondary ms-2" id="btnCancelarConfirmacion">Cancelar</button>
      `;
      resumenContent.appendChild(btnRow);
      document.getElementById('btnConfirmarGuardado').onclick = onConfirmSave;
      document.getElementById('btnCancelarConfirmacion').onclick = onCancelRevision;
    }
    resumenModal.style.display = "block";
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
    resumenContent.innerHTML = resumenAvanzadoCECOREX(data);
    resumenModal.style.display = "block";
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
  window.onclick = function (event) {
    if (event.target == resumenModal) resumenModal.style.display = "none";
  };
});
