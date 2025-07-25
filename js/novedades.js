/* ---------------------------------------------------------------------------
   SIREX – Procesamiento de novedades (Grupo 1, Grupo 4 Operativo, Puerto, CECOREX, CIE)
   Profesional 2025 – Auto-importa partes oficiales en DOCX y los guarda en Firebase.
   Versión 2.5: Mejorada la validación y el parsing para todos los grupos (G4, Puerto, Cecorex, Gestión).
--------------------------------------------------------------------------- */
let parsedDataForConfirmation = null;

document.addEventListener('DOMContentLoaded', () => {

  /* ===========================  CONFIG FIREBASE  ============================ */
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

  /* =============================  CONSTANTES  =============================== */
  const GROUP1 = "grupo1_expulsiones";
  const GROUP2 = "grupo2";
  const GROUP3 = "grupo3";
  const GROUP4 = "grupo4_operativo";
  const GROUPPUERTO = "grupoPuerto";
  const GROUPCECOREX = "cecorex";
  const GROUPGESTION = "gestion";
  const GROUPCIE = "grupoCIE";

  /* ============================  ELEMENTOS DOM  ============================= */
  const $ = id => document.getElementById(id);
  const inputDocx = $('inputDocx');
  const statusContainer = $('status-container');
  const resultsContainer = $('results-container');
  const confirmationButtons = $('confirmation-buttons');
  const btnConfirmarGuardado = $('btnConfirmarGuardado');
  const btnCancelar = $('btnCancelar');
  const fechaEdicionDiv = $('fecha-edicion');
  const fechaManualInput = $('fechaManualInput');
  const fechaDetectadaBadge = $('fechaDetectadaBadge');
  const spinnerArea = $('spinner-area');

  /* ==============================  EVENTOS  ================================= */
  if (fechaManualInput) {
    fechaManualInput.addEventListener('input', () => {
      const fechaFinal = obtenerFechaFormateada();
      if (parsedDataForConfirmation && parsedDataForConfirmation.datos) {
        const errores = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
        if (!errores.length) {
          btnConfirmarGuardado.disabled = false;
          showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.', 'info');
        } else {
          btnConfirmarGuardado.disabled = true;
          showStatus('<ul>' + errores.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
        }
      }
    });
  }
  if (inputDocx) inputDocx.addEventListener('change', handleDocxUpload);
  if (btnConfirmarGuardado) btnConfirmarGuardado.addEventListener('click', onConfirmSave);
  if (btnCancelar) btnCancelar.addEventListener('click', onCancel);

  /* ============================  UI HELPERS  ================================ */
  const showStatus = (msg, type = 'info') => {
    const cls = {
      info: 'alert-info',
      success: 'alert-success',
      warning: 'alert-warning',
      danger: 'alert-danger',
      error: 'alert-danger'
    };
    statusContainer.innerHTML = `<div class="alert ${cls[type]||cls.info}" role="alert">${msg}</div>`;
  };
  const showSpinner = v => spinnerArea.style.display = v ? 'flex' : 'none';
  const showConfirmationUI = v => confirmationButtons.style.display = v ? 'block' : 'none';

  const showResults = obj => {
    resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos</h3>';
    Object.entries(obj).forEach(([k, datos]) => {
      if (k === 'fecha') return;
      if (!checkHasData(datos)) return;

      const card = document.createElement('div');
      card.className = 'card mb-3 shadow-sm';
      card.innerHTML =
        `<div class="card-header bg-light"><strong>${k.toUpperCase()}</strong></div>
         <div class="card-body"><pre class="results-card">${JSON.stringify(datos,null,2)}</pre></div>`;
      resultsContainer.appendChild(card);
    });
  };

  const showFechaEditable = iso => {
    fechaEdicionDiv.style.display = "flex";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) {
      fechaManualInput.value = iso;
      fechaDetectadaBadge.textContent = "Detectada: " + iso.split('-').reverse().join('/');
      fechaDetectadaBadge.className = "badge bg-success";
    } else {
      fechaManualInput.value = "";
      fechaDetectadaBadge.textContent = "No detectada";
      fechaDetectadaBadge.className = "badge bg-secondary";
    }
  };

  function normalizarOperacion(nombre) {
    if (!nombre) return "";
    return nombre
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/^[A-Z]\.\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const obtenerFechaFormateada = () => fechaManualInput.value || "";

  function onCancel() {
    parsedDataForConfirmation = null;
    resultsContainer.innerHTML = "";
    fechaEdicionDiv.style.display = "none";
    showConfirmationUI(false);
    statusContainer.innerHTML = "";
    inputDocx.value = '';
    showSpinner(false);
  }

  /* ==========================  SUBIR Y PARSEAR  ============================= */
  async function handleDocxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    onCancel();
    showSpinner(true);
    showStatus('Procesando archivo …', 'info');

    if (!file.name.toLowerCase().endsWith('.docx')) {
      showStatus('Solo se admiten archivos DOCX.', 'danger');
      showSpinner(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

      const r1 = parseGrupo1(html);
      const r2 = parseGrupo2(html);
      const r3 = parseGrupo3(html);
      const r4 = parseGrupo4(html);
      const rp = parseGrupoPuerto(html);
      const rc = parseGrupoCECOREX(html);
      const rgestion = parseGestion(html);
      const rcie = parseGrupoCIE(html);

      const resultados = {};
      
      if (r1 && checkHasData(r1.datos)) resultados[GROUP1] = r1.datos;
      if (r2 && checkHasData(r2.datos)) resultados[GROUP2] = r2.datos;
      if (r3 && checkHasData(r3.datos)) resultados[GROUP3] = r3.datos;
      if (r4 && checkHasData(r4.datos)) resultados[GROUP4] = r4.datos;
      if (rp && checkHasData(rp.datos)) resultados[GROUPPUERTO] = rp.datos;
      if (rc && checkHasData(rc.datos)) resultados[GROUPCECOREX] = rc.datos;
      if (rgestion && checkHasData(rgestion.datos)) resultados[GROUPGESTION] = rgestion.datos;
      if (rcie && checkHasData(rcie.datos)) resultados[GROUPCIE] = rcie.datos;

      const fecha = r1.fecha || r2.fecha || r3.fecha || r4.fecha || rp.fecha || rc.fecha || rcie.fecha || "";

      if (!Object.keys(resultados).length) {
        throw new Error("No se reconoció el formato del parte DOCX o está completamente vacío.");
      }

      parsedDataForConfirmation = { datos: resultados, fecha };
      showFechaEditable(fecha);
      showResults({ ...resultados, fecha });

      let erroresValidacion = validarDatosPorTodos(resultados, fecha);
      if (erroresValidacion.length) {
        showStatus('<ul>' + erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
        btnConfirmarGuardado.disabled = true;
      } else {
        showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.', 'info');
        btnConfirmarGuardado.disabled = false;
      }
      showConfirmationUI(true);

    } catch (err) {
      console.error(err);
      showStatus('Error: ' + err.message, 'danger');
    } finally {
      showSpinner(false);
      inputDocx.value = '';
    }
  }

  /* ==========================  CONFIRMAR GUARDADO  ========================= */
  async function onConfirmSave() {
    if (!parsedDataForConfirmation || !parsedDataForConfirmation.datos) {
      showStatus('No hay datos para guardar.', 'danger');
      return;
    }
    const fechaFinal = obtenerFechaFormateada();
    if (!fechaFinal) {
      showStatus('Selecciona una fecha válida.', 'danger');
      fechaManualInput.focus();
      return;
    }
    const erroresFinal = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
    if (erroresFinal.length) {
      showStatus('<ul>' + erroresFinal.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
      showConfirmationUI(true);
      return;
    }

    showSpinner(true);
    showConfirmationUI(false);
    statusContainer.innerHTML = '';

    const datosParaGuardar = parsedDataForConfirmation.datos;
    const collectionMap = {
      [GROUP1]: "grupo1_expulsiones",
      [GROUP2]: "grupo2_registros",
      [GROUP3]: "grupo3_registros",
      [GROUP4]: "grupo4_operativo",
      [GROUPPUERTO]: "grupoPuerto_registros",
      [GROUPCECOREX]: "cecorex_registros",
      [GROUPGESTION]: "gestion_registros",
      [GROUPCIE]: "cie_registros",
    };
    const errores = [];
    const exitos = [];

    for (const grupo in datosParaGuardar) {
      if (!collectionMap[grupo]) continue;
      const collectionName = collectionMap[grupo];
      let datosDelGrupo = { ...datosParaGuardar[grupo], fecha: fechaFinal };

      try {
        // 1. GUARDADO DEL PARTE DIARIO (SOBRESCRIBE POR FECHA)
        const ref = db.collection(collectionName).doc(fechaFinal);
        await ref.set(datosDelGrupo, { merge: false });
        exitos.push(`Parte diario de <b>${grupo.toUpperCase()}</b> guardado para la fecha <b>${fechaFinal}</b>.`);

        // 2. LÓGICA DE SINCRONIZACIÓN PARA GRUPO 2 Y 3
        if ([GROUP2, GROUP3].includes(grupo)) {
          const coleccionOp = grupo === GROUP2 ? "grupo2_operaciones" : "grupo3_operaciones";
          let actuacionesSincronizadas = 0;
          let actuacionesOmitidas = 0;
          let detenidosSincronizados = 0;
          let detenidosOmitidos = 0;

          // --- 2.1 Sincronizar ACTUACIONES con CRONOLOGÍA (CON CONTROL DE DUPLICADOS) ---
          if (Array.isArray(datosDelGrupo.actuaciones) && datosDelGrupo.actuaciones.length) {
            for (const actuacion of datosDelGrupo.actuaciones) {
              const nombreOperacion = normalizarOperacion(actuacion.operacion);
              if (!nombreOperacion) continue;
              const opRef = db.collection(coleccionOp).doc(nombreOperacion);
              const doc = await opRef.get();
              if (doc.exists) {
                // Comprobar si ya existe una entrada idéntica para la misma fecha
                const q = opRef.collection("cronologia")
                  .where("fecha", "==", fechaFinal)
                  .where("descripcionCronologia", "==", actuacion.descripcion || "Actuación sin descripción");
                const existing = await q.get();

                if (existing.empty) {
                  await opRef.collection("cronologia").add({
                    descripcionCronologia: actuacion.descripcion || "Actuación sin descripción",
                    fecha: fechaFinal,
                    origen: 'Parte Diario',
                    ts: new Date().toISOString()
                  });
                  actuacionesSincronizadas++;
                } else {
                  actuacionesOmitidas++;
                }
              }
            }
            if (actuacionesSincronizadas > 0) exitos.push(`&nbsp;&nbsp;&nbsp;↳ Sincronizadas ${actuacionesSincronizadas} actuaciones nuevas con sus operaciones.`);
            if (actuacionesOmitidas > 0) exitos.push(`&nbsp;&nbsp;&nbsp;↳ Omitidas ${actuacionesOmitidas} actuaciones por ser duplicados.`);
          }

          // --- 2.2 Sincronizar DETENIDOS con la operación (CON CONTROL DE DUPLICADOS) ---
          if (Array.isArray(datosDelGrupo.detenidos) && datosDelGrupo.detenidos.length) {
            for (const detenido of datosDelGrupo.detenidos) {
              const nombreOperacion = normalizarOperacion(detenido.operacion_d);
              if (nombreOperacion) {
                const opRef = db.collection(coleccionOp).doc(nombreOperacion);
                const doc = await opRef.get();
                if (doc.exists) {
                   // Comprobar si ya existe un detenido con el mismo nombre en la misma fecha
                   const q = opRef.collection("detenidos")
                     .where("fechaDetenido", "==", fechaFinal)
                     .where("nombreDetenido", "==", detenido.detenido || "N/A");
                   const existing = await q.get();

                   if(existing.empty){
                      await opRef.collection("detenidos").add({
                        nombreDetenido: detenido.detenido || "N/A",
                        fechaDetenido: fechaFinal,
                        delitoDetenido: detenido.motivo || "",
                        nacionalidadDetenido: detenido.nacionalidad || "",
                        observaciones: detenido.observaciones || "",
                        origen: 'Parte Diario',
                        ts: new Date().toISOString()
                      });
                      detenidosSincronizados++;
                   } else {
                      detenidosOmitidos++;
                   }
                }
              }
            }
            if (detenidosSincronizados > 0) exitos.push(`&nbsp;&nbsp;&nbsp;↳ Sincronizados ${detenidosSincronizados} detenidos nuevos con sus operaciones.`);
            if (detenidosOmitidos > 0) exitos.push(`&nbsp;&nbsp;&nbsp;↳ Omitidos ${detenidosOmitidos} detenidos por ser duplicados.`);
          }

          // --- 2.3 Sincronizar INSPECCIONES con el control de casas de citas ---
          if (Array.isArray(datosDelGrupo.inspecciones) && datosDelGrupo.inspecciones.length) {
            const docRef = db.collection('control_casas_citas').doc(fechaFinal);
            const dataToUnion = datosDelGrupo.inspecciones.map(insp => ({
              casa: insp.lugar,
              numFiliadas: parseInt(insp.identificadas) || 0,
              numCitadas: parseInt(insp.citadas) || 0,
              nacionalidadesFiliadas: insp.nacionalidades.split(',').map(n => n.trim()).filter(Boolean),
              origen: 'Parte Diario',
              idEntrada: `parte_${Date.now()}_${Math.random()}`,
              ts: new Date().toISOString()
            }));

            await docRef.set({ datos: firebase.firestore.FieldValue.arrayUnion(...dataToUnion) }, { merge: true });
            exitos.push(`&nbsp;&nbsp;&nbsp;↳ Sincronizadas ${datosDelGrupo.inspecciones.length} inspecciones rutinarias.`);
          }
        }
      } catch (err) {
        console.error(`Error procesando ${grupo}:`, err);
        errores.push(`Error al guardar/sincronizar ${grupo}: ${err.message}`);
      }
    }

    showSpinner(false);
    if (errores.length === 0) {
      showStatus('Todos los grupos han sido guardados y sincronizados correctamente.', 'success');
      parsedDataForConfirmation = null;
      fechaEdicionDiv.style.display = "none";
    } else {
      let finalMessage = "";
      if (exitos.length) finalMessage += `<div class="alert alert-success">${exitos.join('<br>')}</div>`;
      if (errores.length) finalMessage += `<div class="alert alert-danger">${errores.join('<br>')}</div>`;
      statusContainer.innerHTML = finalMessage;
      showConfirmationUI(true);
    }
  }
  
  /**
   * CORREGIDO: Función de ayuda para comprobar si un objeto de datos tiene contenido real.
   */
  const checkHasData = (dataObj) => {
    if (!dataObj || typeof dataObj !== 'object') return false;
    for (const key in dataObj) {
        const value = dataObj[key];
        if (Array.isArray(value) && value.length > 0) return true;
        if (typeof value === 'string' && value.trim() !== '' && value.trim() !== '—') return true;
        if (typeof value === 'number' && !isNaN(value) && value !== 0) return true;
    }
    return false;
  };

  /* ========================= 📋 PARSERS POR GRUPO ========================= */

  function parseGrupo1(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
      detenidos_g1: [],
      expulsados_g1: [],
      exp_frustradas_g1: [],
      fletados_g1: [],
      pendientes_g1: []
    };

    const allElements = Array.from(root.children);
    for(let i = 0; i < allElements.length; i++) {
        const elem = allElements[i];
        const text = elem.textContent.trim().toUpperCase();
        
        if (elem.tagName === 'P' && text === 'GESTIONES') {
            let nextIndex = i + 1;
            while(nextIndex < allElements.length && allElements[nextIndex].tagName === 'P') {
                const gestionText = allElements[nextIndex].textContent.trim();
                if (gestionText) datos.pendientes_g1.push({ descripcion: gestionText });
                nextIndex++;
            }
            i = nextIndex - 1;
        }
    }
    
    for (const tabla of tablas) {
      const rows = Array.from(tabla.querySelectorAll('tr'));
      if (!rows.length) continue;
      const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

      if (header[0] === "DETENIDOS-DG1" && header[1] === "MOTIVO-DG1") {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 5 || tds.every(td => !td.textContent.trim())) continue;
          datos.detenidos_g1.push({
            detenidos_g1: tds[0].textContent.trim(),
            motivo_g1: tds[1].textContent.trim(),
            nacionalidad_g1: tds[2].textContent.trim(),
            diligencias_g1: tds[3].textContent.trim(),
            observaciones_g1: tds[4].textContent.trim()
          });
        }
      } else if (header[0] === "EXPULSADOS" && header[1] === "NACIONALIDAD-EG1") {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 6 || tds.every(td => !td.textContent.trim())) continue;
          datos.expulsados_g1.push({
            expulsados_g1: tds[0].textContent.trim(),
            nacionalidad_eg1: tds[1].textContent.trim(),
            diligencias_eg1: tds[2].textContent.trim(),
            conduc_pos_eg1: tds[3].textContent.trim(),
            conduc_neg_eg1: tds[4].textContent.trim(),
            observaciones_eg1: tds[5].textContent.trim()
          });
        }
      } else if (header[0] === "EXP. FRUSTRADAS" && header[1] === "NACIONALIDAD-FG1") {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 4 || tds.every(td => !td.textContent.trim())) continue;
          datos.exp_frustradas_g1.push({
            exp_frustradas_g1: tds[0].textContent.trim(),
            nacionalidad_fg1: tds[1].textContent.trim(),
            diligencias_fg1: tds[2].textContent.trim(),
            motivo_fg1: tds[3].textContent.trim()
          });
        }
      } else if (header[0] === "FLETADOS" && header[1] === "DESTINO") {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 4 || tds.every(td => !td.textContent.trim())) continue;
          datos.fletados_g1.push({
            fletados_g1: tds[0].textContent.trim(),
            destino_flg1: tds[1].textContent.trim(),
            pax_flg1: tds[2].textContent.trim(),
            observaciones_flg1: tds[3].textContent.trim()
          });
        }
      }

      if (!fecha) {
        let plain = tabla.innerText || tabla.textContent || "";
        let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
      }
    }
    return { datos, fecha };
  }

  function parseGrupo2(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
        detenidos: [],
        actuaciones: [],
        inspecciones: [],
        varios: ""
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("OPERACION D G2") && header.includes("OBSERVACIONES G2")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 5 || tds.every(td => !td.textContent.trim())) continue;

                const operacion = tds[0]?.textContent.trim() || "";
                const detenido = tds[1]?.textContent.trim() || "";
                const motivo = tds[2]?.textContent.trim() || "";
                const nacionalidad = tds[3]?.textContent.trim() || "";
                const observaciones = tds[4]?.textContent.trim() || "";

                if (detenido) {
                    datos.detenidos.push({
                        operacion_d: operacion,
                        detenido: detenido,
                        motivo: motivo,
                        nacionalidad: nacionalidad,
                        observaciones: observaciones
                    });
                } else if (observaciones) { 
                    datos.actuaciones.push({
                        operacion: operacion,
                        delito: motivo,
                        descripcion: observaciones
                    });
                }
            }
        } 
        else if (header.includes("OPERACION G2") && header.includes("ACTUACION G2")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 3 || !tds[2]?.textContent.trim()) continue;
                datos.actuaciones.push({
                    operacion: tds[0]?.textContent.trim() || "",
                    delito: tds[1]?.textContent.trim() || "",
                    descripcion: tds[2]?.textContent.trim() || ""
                });
            }
        }
        else if (header.includes("INSPECCION G2 LUGAR") && header.includes("IDENTIFICADAS")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 1 || tds.every(td => !td.textContent.trim())) continue;
                let rowObj = {};
                header.forEach((col, idx) => {
                    if (col === "INSPECCION G2 LUGAR") rowObj.lugar = tds[idx]?.textContent.trim() || "";
                    if (col === "IDENTIFICADAS") rowObj.identificadas = tds[idx]?.textContent.trim() || "";
                    if (col === "CITADAS") rowObj.citadas = tds[idx]?.textContent.trim() || "";
                    if (col === "NACIONALIDADES") rowObj.nacionalidades = tds[idx]?.textContent.trim() || "";
                });
                if (rowObj.lugar) datos.inspecciones.push(rowObj);
            }
        } else if (header.includes("VARIOS GRUPO 2")) {
            for (let i = 1; i < rows.length; i++) {
                const txt = rows[i].cells[0]?.textContent.trim();
                if (txt) datos.varios += (datos.varios ? "\n" : "") + txt;
            }
        }

        if (!fecha) {
            let plain = tabla.innerText || tabla.textContent || "";
            let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
        }
    }
    return { datos, fecha };
  }

  function parseGrupo3(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
        detenidos: [],
        actuaciones: [],
        inspecciones: [],
        varios: ""
    };
    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("OPERACION D G3") && header.includes("OBSERVACIONES G3")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 5 || tds.every(td => !td.textContent.trim())) continue;

                const operacion = tds[0]?.textContent.trim() || "";
                const detenido = tds[1]?.textContent.trim() || "";
                const motivo = tds[2]?.textContent.trim() || "";
                const nacionalidad = tds[3]?.textContent.trim() || "";
                const observaciones = tds[4]?.textContent.trim() || "";

                if (detenido) {
                    datos.detenidos.push({
                        operacion_d: operacion,
                        detenido: detenido,
                        motivo: motivo,
                        nacionalidad: nacionalidad,
                        observaciones: observaciones
                    });
                } else if (observaciones) { 
                    datos.actuaciones.push({
                        operacion: operacion,
                        delito: motivo,
                        descripcion: observaciones
                    });
                }
            }
        } 
        else if (header.includes("OPERACION G3") && header.includes("ACTUACION G3")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 3 || !tds[2]?.textContent.trim()) continue;
                datos.actuaciones.push({
                    operacion: tds[0]?.textContent.trim() || "",
                    delito: tds[1]?.textContent.trim() || "",
                    descripcion: tds[2]?.textContent.trim() || ""
                });
            }
        }
        else if (header.includes("INSPECCION G3 LUGAR") && header.includes("IDENTIFICADAS")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 1 || tds.every(td => !td.textContent.trim())) continue;
                let rowObj = {};
                header.forEach((col, idx) => {
                    if (col === "INSPECCION G3 LUGAR") rowObj.lugar = tds[idx]?.textContent.trim() || "";
                    if (col === "IDENTIFICADAS") rowObj.identificadas = tds[idx]?.textContent.trim() || "";
                    if (col === "CITADAS") rowObj.citadas = tds[idx]?.textContent.trim() || "";
                    if (col === "NACIONALIDADES") rowObj.nacionalidades = tds[idx]?.textContent.trim() || "";
                });
                if (rowObj.lugar) datos.inspecciones.push(rowObj);
            }
        } else if (header.includes("VARIOS GRUPO 3")) {
            for (let i = 1; i < rows.length; i++) {
                const txt = rows[i].cells[0]?.textContent.trim();
                if (txt) datos.varios += (datos.varios ? "\n" : "") + txt;
            }
        }

        if (!fecha) {
            let plain = tabla.innerText || tabla.textContent || "";
            let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
        }
    }
    return { datos, fecha };
  }

  function parseGrupo4(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
      detenidos_g4: [],
      colaboraciones_g4: [],
      inspecciones_g4: [],
      gestiones_varias_g4: [],
      identificados_g4: 0,
      citadosCecorex_g4: 0,
      traslados_g4: "",
      observaciones_g4: ""
    };

    for (const tabla of tablas) {
      const rows = Array.from(tabla.querySelectorAll('tr'));
      if (!rows.length) continue;
      const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

      if (header.includes("N. DETENIDOS-G4") && header.includes("MOTIVO–G4")) {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 4 || tds.every(td => !td.textContent.trim())) continue;
          datos.detenidos_g4.push({
            detenidos_g4: tds[0].textContent.trim(),
            motivo_g4: tds[1].textContent.trim(),
            nacionalidad_g4: tds[2].textContent.trim(),
            observaciones_dg4: tds[3].textContent.trim()
          });
        }
      } else if (header.includes("IDENTIFICADOS") && header.includes("CITADOS CECOREX")) {
        const rowData = rows[1]?.querySelectorAll('td');
        if (rowData) {
          datos.identificados_g4 = parseInt(rowData[0]?.textContent.trim().replace('—', '0') || "0", 10) || 0;
          datos.citadosCecorex_g4 = parseInt(rowData[1]?.textContent.trim().replace('—', '0') || "0", 10) || 0;
          datos.traslados_g4 = rowData[2]?.textContent.trim().replace('—', '') || "";
          datos.observaciones_g4 = rowData[3]?.textContent.trim().replace('—', '') || "";
        }
      } else if (header.includes("COLABORACION") && header.includes("UNIDAD C.")) {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 3 || tds.every(td => !td.textContent.trim())) continue;
          datos.colaboraciones_g4.push({
            colaboracionDesc: tds[0].textContent.trim(),
            colaboracionUnidad: tds[1].textContent.trim(),
            colaboracionResultado: tds[2].textContent.trim()
          });
        }
      } else if (header.includes("INS.TRABAJO") && header.includes("LUGAR INS.")) {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 3 || tds.every(td => !td.textContent.trim())) continue;
          datos.inspecciones_g4.push({
            inspeccion: tds[0].textContent.trim(),
            lugar: tds[1].textContent.trim(),
            resultado: tds[2].textContent.trim()
          });
        }
      } else if (header.includes("GESTIONES VARIAS")) {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (!tds.length || !tds[0].textContent.trim()) continue;
          datos.gestiones_varias_g4.push({
            gestionDesc: tds[0].textContent.trim()
          });
        }
      }

      if (!fecha) {
        let plain = tabla.innerText || tabla.textContent || "";
        let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
      }
    }
    return { datos, fecha };
  }

  function parseGrupoPuerto(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
      ctrlMarinos: 0, marinosArgos: 0, cruceros: 0, cruceristas: 0,
      visadosCg: 0, visadosVal: 0, visadosExp: 0, vehChequeados: 0, persChequeadas: 0,
      detenidos: 0, denegaciones: 0, entrExcep: 0, eixics: 0, ptosDeportivos: 0,
      ferrys: [], gestiones_puerto: []
    };
    const mapCampos = {
      ctrlMarinos: /^CTRL\.MARINOS$/i, marinosArgos: /^MARINOS ARGOS$/i, cruceros: /^CRUCEROS$/i, cruceristas: /^CRUCERISTAS$/i,
      visadosCg: /^VISAS\. CG$/i, visadosVal: /^VISAS VAL\.$/i, visadosExp: /^VISAS\. EXP$/i, vehChequeados: /^VEH\. CHEQUEADOS$/i, persChequeadas: /^PERS\. CHEQUEADAS$/i,
      detenidos: /^DETENIDOS$/i, denegaciones: /^DENEGACIONES$/i, entrExcep: /^ENTR\. EXCEP$/i, eixics: /^EIXICS$/i, ptosDeportivos: /^PTOS\. DEPORTIVOS$/i
    };

    for (const tabla of tablas) {
      const rows = Array.from(tabla.querySelectorAll('tr'));
      if (rows.length < 1) continue;
      const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
      
      let isDataRowTable = false;
      for(const key in mapCampos) {
          if(header.some(h => mapCampos[key].test(h))) {
              isDataRowTable = true;
              break;
          }
      }

      if (isDataRowTable && rows.length > 1) {
        const cabeceras = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim());
        const valores = Array.from(rows[1].querySelectorAll('td,th')).map(td => td.textContent.trim());
        cabeceras.forEach((cab, idx) => {
            for (const clave in mapCampos) {
            if (mapCampos[clave].test(cab)) {
                datos[clave] = parseInt(valores[idx] || '0') || 0;
                break;
            }
            }
        });
      }
      
      if (header[0] === 'FERRYS' || (header.includes('DESTINO') && header.includes('PASAJEROS'))) {
        for (let i = 1; i < rows.length; i++) {
          const ftds = Array.from(rows[i].querySelectorAll('td,th')).map(td => td.textContent.trim());
          if (ftds.every(td => td === '')) continue;
          const ferryData = {};
          const cabeceras = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
          cabeceras.forEach((cab, idx) => {
            if (/^DESTINO$/i.test(cab)) ferryData.destino = ftds[idx] || "";
            if (/^HORA$/i.test(cab)) ferryData.hora = ftds[idx] || "";
            if (/^PASAJEROS$/i.test(cab)) ferryData.pasajeros = ftds[idx] || "";
            if (/^VEHICULOS$/i.test(cab)) ferryData.vehiculos = ftds[idx] || "";
            if (/^INCIDENCIAS$/i.test(cab)) ferryData.incidencias = ftds[idx] || "";
          });
          if (Object.values(ferryData).some(v => v)) datos.ferrys.push(ferryData);
        }
      } else if (header[0] === 'GESTIONES PUERTO') {
        for (let i = 1; i < rows.length; i++) {
          const gtds = Array.from(rows[i].querySelectorAll('td,th')).map(td => td.textContent.trim());
          if (gtds[0]) datos.gestiones_puerto.push({ gestion: gtds[0] });
        }
      }
      if (!fecha) {
        const plainText = tabla.innerText || tabla.textContent || "";
        const match = plainText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (match) fecha = `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
    return { datos, fecha };
  }

  function parseGrupoCECOREX(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
      detenidos_cc: [], cons_tfno: '', cons_presc: '', cons_equip: '', citados: '',
      notificaciones: '', al_abogados: '', rem_subdelegacion: '', decretos_exp: '',
      tramites_audiencia: '', cie_concedido: '', cies_denegado: '', proh_entrada: '',
      menas: '', dil_informe: '', gestiones_cecorex: []
    };
    for (const tabla of tablas) {
      const rows = Array.from(tabla.querySelectorAll('tr'));
      if (!rows.length) continue;
      const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

      if (header[0] === "DETENIDOS-CC") {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length < 5 || tds.every(td => !td.textContent.trim())) continue;
          datos.detenidos_cc.push({
            detenidos_cc: tds[0].textContent.trim(), motivo_cc: tds[1].textContent.trim(),
            nacionalidad_cc: tds[2].textContent.trim(), presenta: tds[3].textContent.trim(),
            observaciones_cc: tds[4].textContent.trim()
          });
        }
      } else if (header[0] === "CONS.TFNO") {
        const tds = Array.from(rows[1]?.querySelectorAll('td'));
        if (tds) {
          datos.cons_tfno = tds[0]?.textContent.trim() || '';
          datos.cons_presc = tds[1]?.textContent.trim() || '';
          datos.cons_equip = tds[2]?.textContent.trim() || '';
          datos.citados = tds[3]?.textContent.trim() || '';
          datos.notificaciones = tds[4]?.textContent.trim() || '';
          datos.al_abogados = tds[5]?.textContent.trim() || '';
        }
      } else if (header[0] === "REM. SUBDELEGACIÓN") {
        const tds = Array.from(rows[1]?.querySelectorAll('td'));
        if (tds) {
          datos.rem_subdelegacion = tds[0]?.textContent.trim() || '';
          datos.decretos_exp = tds[1]?.textContent.trim() || '';
          datos.tramites_audiencia = tds[2]?.textContent.trim() || '';
        }
      } else if (header[0] === "CIE CONCEDIDO") {
        const tds = Array.from(rows[1]?.querySelectorAll('td'));
        if (tds) {
          datos.cie_concedido = tds[0]?.textContent.trim() || '';
          datos.cies_denegado = tds[1]?.textContent.trim() || '';
          datos.proh_entrada = tds[2]?.textContent.trim() || '';
          datos.menas = tds[3]?.textContent.trim() || '';
          datos.dil_informe = tds[4]?.textContent.trim() || '';
        }
      } else if (/GESTIONES CECOREX/i.test(header[0])) {
        for (let i = 1; i < rows.length; i++) {
          const tds = Array.from(rows[i].querySelectorAll('td'));
          if (tds.length > 0 && tds[0].textContent.trim()) {
            datos.gestiones_cecorex.push({ gestion: tds[0].textContent.trim() });
          }
        }
      }

      if (!fecha) {
        let plain = tabla.innerText || tabla.textContent || "";
        let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
      }
    }
    return { datos, fecha };
  }

  function parseGestion(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    let datos = {};
    let fecha = '';
    
    const allElements = Array.from(root.children);
    let gestionFound = false;
    for(const elem of allElements) {
        if(elem.tagName === 'P' && elem.textContent.trim().toUpperCase() === 'GESTION') {
            gestionFound = true;
        }
        if(gestionFound && elem.tagName === 'TABLE') {
            const rows = Array.from(elem.querySelectorAll('tr'));
            if (rows.length < 2) continue;

            const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
            const values = Array.from(rows[1].querySelectorAll('td,th')).map(td => td.textContent.trim());

            header.forEach((campo, index) => {
                if (values[index] && values[index].trim() !== '' && values[index].trim() !== '—') {
                    const key = campo.toLowerCase()
                                     .replace(/\./g, '')
                                     .replace(/\s+/g, '_')
                                     .replace(/[^a-z0-9_]/g, '');
                    datos[key] = values[index];
                }
            });
            if (!fecha) {
                let plain = elem.innerText || elem.textContent || "";
                let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
                if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
            }
        }
    }
    return { datos, fecha };
  }

  function parseGrupoCIE(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let fecha = '';
    let datos = {
        internos: '0',
        entradas: '0',
        salidas: '0',
        incidencias_cie: ''
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header[0] === "INTERNOS" && header[1] === "ENTRADAS" && header[2] === "SALIDAS") {
            const rowData = rows[1]?.querySelectorAll('td');
            if (rowData && rowData.length > 0) {
                datos.internos = rowData[0]?.textContent.trim() || '0';
                datos.entradas = rowData[1]?.textContent.trim() || '0';
                datos.salidas = rowData[2]?.textContent.trim() || '0';
            }
        }
        else if (header[0] === "INCIDENCIAS CIE") {
            let incidenciasText = "";
            for (let i = 1; i < rows.length; i++) {
                const txt = rows[i].cells[0]?.textContent.trim();
                if (txt) incidenciasText += (incidenciasText ? "\n" : "") + txt;
            }
            datos.incidencias_cie = incidenciasText;
        }

        if (!fecha) {
            let plain = tabla.innerText || tabla.textContent || "";
            let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
        }
    }
    return { datos, fecha };
  }

  /* ===========================  VALIDACIÓN  ================================ */
  function validarDatos(data, grupo, fecha) {
    if (!data || typeof data !== 'object') {
      return [`No se han extraído datos válidos para ${grupo.toUpperCase()}.`];
    }
    const errores = [];
    if (!fecha || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errores.push('La fecha es obligatoria y debe ser válida.');
    }
    return errores;
  }

  function validarDatosPorTodos(datosPorGrupo, fecha) {
    let errores = [];
    for (const grupo in datosPorGrupo) {
      const errs = validarDatos(datosPorGrupo[grupo], grupo, fecha);
      if (errs.length) errores = [...errores, ...errs];
    }
    return [...new Set(errores)];
  }

}); // DOMContentLoaded
