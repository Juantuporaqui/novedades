/* ---------------------------------------------------------------------------
   SIREX – Procesamiento de novedades (Grupo 1, Grupo 4 Operativo, Puerto, CECOREX, CIE)
   Profesional 2025 – Auto-importa partes oficiales en DOCX y los guarda en Firebase.
   Versión 2.2: Añadido control de duplicados en sincronización con G2/G3.
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
      const hasData = Object.values(datos).some(val => (Array.isArray(val) && val.length > 0) || (typeof val === 'string' && val) || (typeof val === 'number' && val > 0));
      if (!hasData) return;

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
      const checkHasData = dataObj => Object.values(dataObj).some(val => (Array.isArray(val) && val.length > 0) || (typeof val === 'string' && val) || (typeof val === 'number' && val > 0));

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

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("EXP. FRUSTRADAS") && header.includes("NACIONALIDAD-FG1")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 4 || !tds[0].textContent.trim()) continue;
                datos.exp_frustradas_g1.push({
                    exp_frustradas_g1: tds[0].textContent.trim(),
                    nacionalidad_fg1: tds[1].textContent.trim(),
                    diligencias_fg1: tds[2].textContent.trim(),
                    motivo_fg1: tds[3].textContent.trim()
                });
            }
        } else if (header.includes("GESTIONES")) {
            // Se usa un selector más específico para evitar conflictos
            const gestionesTitle = rows[0]?.cells[0]?.textContent.trim();
            if (gestionesTitle === 'GESTIONES') {
                 for (let i = 1; i < rows.length; i++) {
                    const cellText = rows[i].cells[0]?.textContent.trim();
                    if (cellText) {
                        datos.pendientes_g1.push({
                            descripcion: cellText
                        });
                    }
                }
            }
        }

        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
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
        inspecciones: [],
        actuaciones: [],
        varios: ""
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("OPERACION D G2") && header.includes("MOTIVO G2")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 5 || !tds[0]?.textContent.trim()) continue;

                const operacion = tds[0]?.textContent.trim() || "";
                const detenido = tds[1]?.textContent.trim() || "";
                const motivo = tds[2]?.textContent.trim() || "";
                const nacionalidad = tds[3]?.textContent.trim() || "";
                const observaciones = tds[4]?.textContent.trim() || "";

                datos.actuaciones.push({ operacion: operacion, delito: motivo, descripcion: observaciones });
                if (detenido) {
                    datos.detenidos.push({ operacion_d: operacion, detenido: detenido, motivo: motivo, nacionalidad: nacionalidad, observaciones: observaciones });
                }
            }
        }
        
        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
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
        inspecciones: [],
        actuaciones: [],
        varios: ""
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("OPERACION D G3") && header.includes("MOTIVO G3")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 5 || !tds[0]?.textContent.trim()) continue;

                const operacion = tds[0]?.textContent.trim() || "";
                const detenido = tds[1]?.textContent.trim() || "";
                const motivo = tds[2]?.textContent.trim() || "";
                const nacionalidad = tds[3]?.textContent.trim() || "";
                const observaciones = tds[4]?.textContent.trim() || "";

                datos.actuaciones.push({ operacion: operacion, delito: motivo, descripcion: observaciones });
                if (detenido) {
                    datos.detenidos.push({ operacion_d: operacion, detenido: detenido, motivo: motivo, nacionalidad: nacionalidad, observaciones: observaciones });
                }
            }
        } else if (header.includes("INSPECCION G3 LUGAR")) {
             for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 4 || !tds[0]?.textContent.trim()) continue;
                datos.inspecciones.push({
                    lugar: tds[0]?.textContent.trim() || "",
                    identificadas: tds[1]?.textContent.trim() || "",
                    citadas: tds[2]?.textContent.trim() || "",
                    nacionalidades: tds[3]?.textContent.trim() || ""
                });
            }
        }
        
        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
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
        identificados_g4: 0,
        citadosCecorex_g4: 0,
        observaciones_g4: ""
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("N. DETENIDOS-G4") && header.includes("MOTIVO–G4")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 4 || !tds[0].textContent.trim()) continue;
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
                datos.identificados_g4 = parseInt(rowData[0]?.textContent.trim() || "0", 10);
                datos.citadosCecorex_g4 = parseInt(rowData[1]?.textContent.trim() || "0", 10);
                datos.observaciones_g4 = rowData[3]?.textContent.trim() || "";
            }
        } else if (header.includes("COLABORACION") && header.includes("UNIDAD C.")) {
             for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 3 || !tds[0].textContent.trim()) continue;
                datos.colaboraciones_g4.push({
                    colaboracionDesc: tds[0].textContent.trim(),
                    colaboracionUnidad: tds[1].textContent.trim(),
                    colaboracionResultado: tds[2].textContent.trim()
                });
            }
        }

        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
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
        if (rows.length < 2) continue;
        const cabeceras = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim());
        const valores = Array.from(rows[1].querySelectorAll('td,th')).map(td => td.textContent.trim());
        
        let processed = false;
        cabeceras.forEach((cab, idx) => {
            for (const clave in mapCampos) {
                if (mapCampos[clave].test(cab)) {
                    datos[clave] = parseInt(valores[idx]) || 0;
                    processed = true;
                }
            }
        });

        if (processed) {
             const gestionesText = valores[valores.length -1];
             if (gestionesText && cabeceras.length < valores.length) {
                datos.gestiones_puerto.push({ gestion: gestionesText });
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
        menas: '', dil_informe: '', gestiones_cecorex: ''
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("DETENIDOS-CC")) {
            for (let i = 1; i < rows.length; i++) {
                const tds = Array.from(rows[i].querySelectorAll('td'));
                if (tds.length < 5 || !tds[0].textContent.trim()) continue;
                datos.detenidos_cc.push({
                    detenidos_cc: tds[0].textContent.trim(), motivo_cc: tds[1].textContent.trim(),
                    nacionalidad_cc: tds[2].textContent.trim(), presenta: tds[3].textContent.trim(),
                    observaciones_cc: tds[4].textContent.trim()
                });
            }
        } else if (header.includes("CONS.TFNO")) {
            const tds = rows[1]?.querySelectorAll('td');
            if (tds) {
                datos.cons_tfno = tds[0]?.textContent.trim() || '';
                datos.notificaciones = tds[4]?.textContent.trim() || '';
            }
        } else if (header.includes("REM. SUBDELEGACIÓN")) {
            const tds = rows[1]?.querySelectorAll('td');
            if (tds) {
                datos.rem_subdelegacion = tds[0]?.textContent.trim() || '';
                datos.decretos_exp = tds[1]?.textContent.trim() || '';
                datos.tramites_audiencia = tds[2]?.textContent.trim() || '';
            }
        } else if (header.includes("CIE CONCEDIDO")) {
            const tds = rows[1]?.querySelectorAll('td');
            if (tds) {
                datos.proh_entrada = tds[2]?.textContent.trim() || '';
                datos.menas = tds[3]?.textContent.trim() || '';
                datos.dil_informe = tds[4]?.textContent.trim() || '';
            }
        } else if (header.includes("GESTIONES CECOREX")) {
            const cellText = rows[1]?.cells[0]?.textContent.trim();
            if(cellText) datos.gestiones_cecorex = cellText;
        }

        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
        }
    }
    return { datos, fecha };
}

function parseGestion(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const tablas = Array.from(root.querySelectorAll('table'));
    let datos = {};
    let fecha = '';
 
    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (rows.length < 2) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
        const values = Array.from(rows[1].querySelectorAll('td,th')).map(td => td.textContent.trim());

        if(header.includes('CITAS-G')) {
            datos['CITAS-G'] = parseInt(values[0]) || 0;
            datos['FALLOS ASILO'] = parseInt(values[3]) || 0;
            datos['ASILOS CONCEDIDOS'] = parseInt(values[4]) || 0;
        } else if (header.includes('CARTAS CONCEDIDAS')) {
            datos['CARTAS CONCEDIDAS'] = parseInt(values[0]) || 0;
            datos['TARJET. SUBDELEG'] = parseInt(values[4]) || 0;
        } else if (header.includes('NOTIFICACIONES DENEGADAS')) {
            datos['NOTIFICACIONES DENEGADAS'] = parseInt(values[1]) || 0;
            datos['PRESENTADOS'] = parseInt(values[2]) || 0;
            datos['CORREOS UCRANIA'] = parseInt(values[3]) || 0;
        } else if (header.includes('TELE. FAVO')) {
             datos['TELE. FAVO'] = parseInt(values[0]) || 0;
             datos['TELE. DESFAV'] = parseInt(values[1]) || 0;
             datos['CITAS TLFN ASILO'] = parseInt(values[2]) || 0;
        }

        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
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
        internos: '',
        entradas: '',
        salidas: '',
        incidencias_cie: ''
    };

    for (const tabla of tablas) {
        const rows = Array.from(tabla.querySelectorAll('tr'));
        if (!rows.length) continue;
        const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

        if (header.includes("INTERNOS") && header.includes("ENTRADAS") && header.includes("SALIDAS")) {
            const rowData = rows[1]?.children;
            if (rowData) {
                datos.internos = rowData[0]?.textContent.trim() || '';
            }
        } else if (header.includes("INCIDENCIAS CIE")) {
            const rowData = rows[1]?.cells[0];
            if (rowData && rowData.textContent.trim()) {
                datos.incidencias_cie = rowData.textContent.trim();
            }
        }

        if (!fecha) {
            let m = tabla.innerText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
        }
    }
    return { datos, fecha };
}

/* =========================== VALIDACIÓN ================================ */
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
