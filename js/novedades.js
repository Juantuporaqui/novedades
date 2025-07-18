/* ---------------------------------------------------------------------------
   SIREX – Procesamiento de novedades (Grupo 1, Grupo 4 Operativo, Puerto, CECOREX, CIE)
   Profesional 2025 – Auto-importa partes oficiales en DOCX y los guarda en Firebase.
--------------------------------------------------------------------------- */
let parsedDataForConfirmation = null;

document.addEventListener('DOMContentLoaded', () => {

/* ===========================  CONFIG FIREBASE  ============================ */
const firebaseConfig = {
    apiKey:            "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
    authDomain:        "ucrif-5bb75.firebaseapp.com",
    projectId:         "ucrif-5bb75",
    storageBucket:     "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId:             "1:241698436443:web:1f333b3ae3f813b755167e"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* =============================  CONSTANTES  =============================== */
const GROUP1       = "grupo1_expulsiones";
const GROUP4       = "grupo4_operativo";
const GROUPPUERTO  = "grupoPuerto";
const GROUPCECOREX = "cecorex";
const GROUPCIE     = "grupoCIE";

/* ============================  ELEMENTOS DOM  ============================= */
const $ = id => document.getElementById(id);

const inputDocx            = $('inputDocx');
const statusContainer      = $('status-container');
const resultsContainer     = $('results-container');
const confirmationButtons  = $('confirmation-buttons');
const btnConfirmarGuardado = $('btnConfirmarGuardado');
const btnCancelar          = $('btnCancelar');
const fechaEdicionDiv      = $('fecha-edicion');
const fechaManualInput     = $('fechaManualInput');
const fechaDetectadaBadge  = $('fechaDetectadaBadge');
const spinnerArea          = $('spinner-area');

/* ==============================  EVENTOS  ================================= */
if (fechaManualInput) {
  fechaManualInput.addEventListener('input', () => {
    const fechaFinal = obtenerFechaFormateada();
    if (parsedDataForConfirmation && parsedDataForConfirmation.datos) {
      const errores = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
      if (!errores.length) {
        btnConfirmarGuardado.disabled = false;
        showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.','info');
      } else {
        btnConfirmarGuardado.disabled = true;
        showStatus('<ul>'+errores.map(e=>`<li>${e}</li>`).join(''),'danger');
      }
    }
  });
}
if (inputDocx)             inputDocx           .addEventListener('change', handleDocxUpload);
if (btnConfirmarGuardado)  btnConfirmarGuardado.addEventListener('click',   onConfirmSave);
if (btnCancelar)           btnCancelar         .addEventListener('click',   onCancel);

/* ============================  UI HELPERS  ================================ */
const showStatus = (msg, type='info')=>{
    const cls = {
      info:'alert-info',
      success:'alert-success',
      warning:'alert-warning',
      danger:'alert-danger',
      error:'alert-danger'
    };
    statusContainer.innerHTML = `<div class="alert ${cls[type]||cls.info}" role="alert">${msg}</div>`;
};
const showSpinner        = v => spinnerArea.style.display = v ? 'flex' : 'none';
const showConfirmationUI = v => confirmationButtons.style.display = v ? 'block' : 'none';

const showResults = obj =>{
    resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos</h3>';
    Object.entries(obj).forEach(([k,datos])=>{
      if(k==='fecha') return;
      if(Array.isArray(datos) && !datos.length) return;
      if(!Array.isArray(datos) && !Object.keys(datos).length) return;
      const card = document.createElement('div');
      card.className = 'card mb-3 shadow-sm';
      card.innerHTML =
        `<div class="card-header bg-light"><strong>${k.toUpperCase()}</strong></div>
         <div class="card-body"><pre class="results-card">${JSON.stringify(datos,null,2)}</pre></div>`;
      resultsContainer.appendChild(card);
    });
};

const showFechaEditable = iso=>{
    fechaEdicionDiv.style.display = "flex";
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso||'')){
      fechaManualInput.value = iso;
      fechaDetectadaBadge.textContent = "Detectada: "+iso.split('-').reverse().join('/');
      fechaDetectadaBadge.className   = "badge bg-success";
    } else {
      fechaManualInput.value = "";
      fechaDetectadaBadge.textContent = "No detectada";
      fechaDetectadaBadge.className   = "badge bg-secondary";
    }
};
const obtenerFechaFormateada = ()=> fechaManualInput.value || "";

/* ==========================  SUBIR Y PARSEAR  ============================= */
async function handleDocxUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  onCancel();
  showSpinner(true);
  showStatus('Procesando archivo …','info');

  if(!file.name.toLowerCase().endsWith('.docx')){
    showStatus('Solo se admiten archivos DOCX.','danger');
    showSpinner(false);
    return;
  }

  try {
    const arrayBuffer   = await file.arrayBuffer();
    const { value:html} = await mammoth.convertToHtml({arrayBuffer});

    // === Parseo de todos los grupos reconocidos ===
    const r1   = parseGrupo1(html);
    const r4   = parseGrupo4(html);
    const rp   = parseGrupoPuerto(html);
    const rc   = parseGrupoCECOREX(html);
    const rgestion = parseGestion(html);
    const rcie = parseGrupoCIE(html);

    // === Recopilación de resultados ===
    const resultados = {};
    if (Object.keys(r1.datos).length)   resultados[GROUP1]      = r1.datos;
    if (Object.keys(r4.datos).length)   resultados[GROUP4]      = r4.datos;
    if (Object.keys(rp.datos).length)   resultados[GROUPPUERTO] = rp.datos;
    if (Object.keys(rc.datos).length)   resultados[GROUPCECOREX]= rc.datos;
    if (Object.keys(rgestion.datos).length) resultados[GROUPGESTION] = rgestion.datos;
    if (Object.keys(rcie.datos).length) resultados[GROUPCIE]    = rcie.datos;

    // Extrae la fecha más significativa
    const fecha = r1.fecha || r4.fecha || rp.fecha || rc.fecha || rcie.fecha || "";

    if (!Object.keys(resultados).length) {
      throw new Error("No se reconoció el formato del parte DOCX.");
    }

    parsedDataForConfirmation = { datos: resultados, fecha };
    showFechaEditable(fecha);
    showResults({ ...resultados, fecha });

    let erroresValidacion = validarDatosPorTodos(resultados, fecha);
    if (erroresValidacion.length) {
      showStatus('<ul>'+erroresValidacion.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
      btnConfirmarGuardado.disabled = true;
    } else {
      showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.','info');
      btnConfirmarGuardado.disabled = false;
    }
    showConfirmationUI(true);

  } catch(err) {
    console.error(err);
    showStatus('Error: '+err.message,'danger');
  } finally {
    showSpinner(false);
    inputDocx.value = '';
  }
}

/* ==========================  CONFIRMAR GUARDADO  ========================= */
async function onConfirmSave() {
  if (!parsedDataForConfirmation || !parsedDataForConfirmation.datos) {
    showStatus('No hay datos para guardar.','danger');
    return;
  }
  const fechaFinal = obtenerFechaFormateada();
  if (!fechaFinal) {
    showStatus('Selecciona una fecha válida.','danger');
    fechaManualInput.focus();
    return;
  }
  const erroresFinal = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
  if (erroresFinal.length) {
    showStatus('<ul>'+erroresFinal.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
    showConfirmationUI(true);
    return;
  }

  showSpinner(true);
  showConfirmationUI(false);
  statusContainer.innerHTML = '';

  const datosParaGuardar = parsedDataForConfirmation.datos;
  const collectionMap = {
    [GROUP1]:      "grupo1_expulsiones",
    [GROUP4]:      "grupo4_operativo",
    [GROUPPUERTO]: "grupoPuerto_registros",
    [GROUPCECOREX]: "cecorex_registros",
    [GROUPGESTION]: "gestion_registros",
    [GROUPCIE]:    "cie_registros"
  };
  const errores = [];
  const exitos  = [];

  for (const grupo in datosParaGuardar) {
    if (!collectionMap[grupo]) continue;
    const collectionName = collectionMap[grupo];
    const datosDelGrupo  = { ...datosParaGuardar[grupo], fecha: fechaFinal };
    try {
      const ref = db.collection(collectionName).doc(fechaFinal);
      const snapshot = await ref.get();
      if (snapshot.exists) {
        errores.push(`Ya existen datos para el día ${fechaFinal} en ${grupo}.`);
        continue;
      }
      await ref.set(datosDelGrupo, { merge: false });
      exitos.push(`¡Guardado con éxito para ${grupo}!`);
    } catch(err) {
      errores.push(`Error al guardar ${grupo}: ${err.message}`);
    }
  }

  showSpinner(false);

  if (exitos.length && exitos.length === Object.keys(datosParaGuardar).length) {
    showStatus('Todos los grupos han sido guardados correctamente.', 'success');
  } else {
    if (exitos.length) showStatus(exitos.join('<br>'), 'success');
    if (errores.length) showStatus(errores.join('<br>'), 'danger');
  }

  if (errores.length) {
    showConfirmationUI(true);
  } else {
    parsedDataForConfirmation = null;
    fechaEdicionDiv.style.display = "none";
  }
}

function onCancel(){
  resultsContainer.innerHTML = '';
  statusContainer.innerHTML  = '';
  showConfirmationUI(false);
  parsedDataForConfirmation   = null;
  fechaEdicionDiv.style.display = "none";
}
   
/* ========================= 📋 PARSERS POR GRUPO ========================= */

/* ----------- GRUPO 1 ----------- */
function parseGrupo1(html) {
  const root  = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {};

  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

    // DETENIDOS-G1
    if (
      header[0] === "DETENIDOS-DG1" &&
      header[1] === "MOTIVO-DG1" &&
      header[2] === "NACIONALIDAD-DG1" &&
      header[3] === "DILIGENCIAS-DG1" &&
      header[4] === "OBSERVACIONES-DG1"
    ) {
      datos["detenidos_g1"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 5) continue;
        datos["detenidos_g1"].push({
          detenidos_g1:      tds[0].textContent.trim(),
          motivo_g1:         tds[1].textContent.trim(),
          nacionalidad_g1:   tds[2].textContent.trim(),
          diligencias_g1:    tds[3].textContent.trim(),
          observaciones_g1:  tds[4].textContent.trim()
        });
      }
    }

    // EXPULSADOS
    if (
      header[0] === "EXPULSADOS" &&
      header[1] === "NACIONALIDAD-EG1" &&
      header[2] === "DILIGENCIAS-EG1" &&
      header[3] === "CONDUC. POS" &&
      header[4] === "CONDUC. NEG" &&
      header[5] === "OBSERVACIONES-EG1"
    ) {
      datos["expulsados_g1"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 6) continue;
        datos["expulsados_g1"].push({
          expulsados_g1:      tds[0].textContent.trim(),
          nacionalidad_eg1:   tds[1].textContent.trim(),
          diligencias_eg1:    tds[2].textContent.trim(),
          conduc_pos_eg1:     tds[3].textContent.trim(),
          conduc_neg_eg1:     tds[4].textContent.trim(),
          observaciones_eg1:  tds[5].textContent.trim()
        });
      }
    }

    // EXP. FRUSTRADAS
    if (
      header[0] === "EXP. FRUSTRADAS" &&
      header[1] === "NACIONALIDAD-FG1" &&
      header[2] === "DILIGENCIAS-FG1" &&
      header[3] === "MOTIVO-FG1"
    ) {
      datos["exp_frustradas_g1"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 4) continue;
        datos["exp_frustradas_g1"].push({
          exp_frustradas_g1:  tds[0].textContent.trim(),
          nacionalidad_fg1:   tds[1].textContent.trim(),
          diligencias_fg1:    tds[2].textContent.trim(),
          motivo_fg1:         tds[3].textContent.trim()
        });
      }
    }

    // FLETADOS
    if (
      header[0] === "FLETADOS" &&
      header[1] === "DESTINO" &&
      header[2] === "Nº PAX" &&
      header[3] === "OBSERVACIONES-FLG1"
    ) {
      datos["fletados_g1"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 4) continue;
        datos["fletados_g1"].push({
          fletados_g1:         tds[0].textContent.trim(),
          destino_flg1:        tds[1].textContent.trim(),
          pax_flg1:            tds[2].textContent.trim(),
          observaciones_flg1:  tds[3].textContent.trim()
        });
      }
    }

    // Busca fecha: DD-MM-AAAA (en cabecera de parte)
    if (!fecha) {
      let plain = tabla.innerText || tabla.textContent || "";
      let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return { datos, fecha };
}

/* ----------- GRUPO 4 ----------- */
function parseGrupo4(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {};

  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

    // N. DETENIDOS-G4
    if (
      header[0] === "N. DETENIDOS-G4" &&
      header[1] === "MOTIVO–G4" &&
      header[2] === "NACIONALIDAD-G4" &&
      header[3] === "DILIGENCIAS-G4" &&
      header[4] === "OBSERVACIONES-DG4"
    ) {
      datos["detenidos_g4"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 5) continue;
        datos["detenidos_g4"].push({
          detenidos_g4:         tds[0].textContent.trim(),
          motivo_g4:            tds[1].textContent.trim(),
          nacionalidad_g4:      tds[2].textContent.trim(),
          diligencias_g4:       tds[3].textContent.trim(),
          observaciones_dg4:    tds[4].textContent.trim()
        });
      }
    }

    // IDENTIFICADOS
    if (
      header[0] === "IDENTIFICADOS"
    ) {
      datos["identificados_g4"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 1) continue;
        datos["identificados_g4"].push({
          identificados_g4: tds[0].textContent.trim()
        });
      }
    }

    // GESTIONES VARIAS
    if (
      header[0] === "GESTIONES VARIAS"
    ) {
      datos["gestiones_varias_g4"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (!tds.length) continue;
        datos["gestiones_varias_g4"].push({
          gestiones_varias_g4: tds[0].textContent.trim()
        });
      }
    }

    // TRASLADOS-G4
    if (
      header[0] === "TRASLADOS-G4" &&
      header[1] === "DESTINO" &&
      header[2] === "OBSERVACIONES-TRASLADO"
    ) {
      datos["traslados_g4"] = [];
      for (let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 3) continue;
        datos["traslados_g4"].push({
          traslados_g4:        tds[0].textContent.trim(),
          destino_traslado:    tds[1].textContent.trim(),
          observaciones_traslado: tds[2].textContent.trim()
        });
      }
    }

    // Busca fecha: DD-MM-AAAA (en tabla)
    if (!fecha) {
      let plain = tabla.innerText || tabla.textContent || "";
      let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return { datos, fecha };
}

function parseGrupoPuerto(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {};

  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

    // Tabla principal de Puerto
    if (header.includes("CTRL.MARINOS") && header.includes("CRUCERISTAS")) {
      const campos = [
        "CTRL.MARINOS", "MARINOS ARGOS", "CRUCEROS", "CRUCERISTAS",
        "VISAS. CG", "VISAS VAL.", "VISAS. EXP", "VEH. CHEQUEADOS",
        "PERS. CHEQUEADAS", "DETENIDOS", "DENEGACIONES", "ENTR. EXCEP",
        "EIXICS", "PTOS. DEPORTIVOS"
      ];
      const values = Array.from(rows[1]?.querySelectorAll('td')).map(td => td.textContent.trim());
      campos.forEach((campo, idx) => {
        const key = campo.toLowerCase().replace(/[\.\s]/g,'_').replace('visas_cg', 'visadosCgef').replace('visas_val', 'visadosValencia').replace('visas_exp', 'visadosExp')
                        .replace('veh_chequeados','vehChequeados').replace('pers_chequeadas','paxChequeadas')
                        .replace('detenidos','detenidos').replace('denegaciones','denegaciones')
                        .replace('entr_excep','entrExcep').replace('eixics','eixics').replace('ptos_deportivos','ptosDeportivos')
                        .replace('ctrl_marinos','ctrlMarinos').replace('marinos_argos','marinosArgos')
                        .replace('cruceros','cruceros').replace('cruceristas','cruceristas');
        datos[key] = values[idx] || '';
      });
    }

    // Tabla FERRYS
    if (/FERRYS?/i.test(header[0])) {
      datos.ferrys = [];
      for(let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length<6) continue;
        datos.ferrys.push({
          destino:     tds[0].textContent.trim(),
          hora:        tds[1].textContent.trim(),
          pasajeros:   tds[2].textContent.trim(),
          vehiculos:   tds[3].textContent.trim(),
          incidencias: tds[4].textContent.trim()
        });
      }
    }

    // Tabla GESTIONES PUERTO
    if (/GESTIONES PUERTO/i.test(header[0])) {
      datos.gestiones_puerto = [];
      for(let i=1; i<rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (!tds.length) continue;
        datos.gestiones_puerto.push({
          gestion: tds[0].textContent.trim()
        });
      }
    }

    // Busca fecha: DD-MM-AAAA (en tabla)
    if (!fecha) {
      let plain = tabla.innerText || tabla.textContent || "";
      let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return { datos, fecha };
}

function parseGrupoCECOREX(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {
    detenidos_cc: [],
    cons_tfno: '',
    cons_presc: '',
    cons_equip: '',
    citados: '',
    notificaciones: '',
    al_abogados: '',
    rem_subdelegacion: '',
    decretos_exp: '',
    tramites_audiencia: '',
    cie_concedido: '',
    cies_denegado: '',
    proh_entrada: '',
    menas: '',
    dil_informe: '',
    gestiones_cecorex: [],
    citas_g: '',
    fallos: '',
    citas: '',
    entrv_asilo: '',
    fallos_asilo: '',
    asilos_concedidos: '',
    asilos_denegados: '',
    cartas_concedidas: '',
    cartas_denegadas: '',
    prot_internacional: '',
    citas_subdeleg: '',
    tarjet_subdeleg: '',
    notificaciones_concedidas: '',
    notificaciones_denegadas: '',
    presentados: '',
    correos_ucrania: '',
    tele_favo: '',
    tele_desfav: '',
    citas_tlfn_asilo: '',
    citas_tlfn_cartas: '',
    oficios: ''
  };

  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());

    // DETENIDOS-CC
    if (
      header[0] === "DETENIDOS-CC" &&
      header[1] === "MOTIVO-CC" &&
      header[2] === "NACIONALIDAD-CC" &&
      header[3] === "PRESENTA" &&
      header[4] === "OBSERVACIONES-CC"
    ) {
      for (let i = 1; i < rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (tds.length < 5) continue;
        if (tds[0].textContent.trim() === '') continue; // Ignora líneas vacías
        datos.detenidos_cc.push({
          detenidos_cc:      tds[0].textContent.trim(),
          motivo_cc:         tds[1].textContent.trim(),
          nacionalidad_cc:   tds[2].textContent.trim(),
          presenta:          tds[3].textContent.trim(),
          observaciones_cc:  tds[4].textContent.trim()
        });
      }
    }

    // CONS. TFNO, PRESC, EQUIP, CITADOS, NOTIFICACIONES, AL. ABOGADOS
    if (
      header[0] === "CONS.TFNO" &&
      header[1] === "CONS.PRESC" &&
      header[2] === "CONS. EQUIP" &&
      header[3] === "CITADOS" &&
      header[4] === "NOTIFICACIONES" &&
      header[5] === "AL. ABOGADOS"
    ) {
      const tds = Array.from(rows[1]?.querySelectorAll('td'));
      datos.cons_tfno        = tds[0]?.textContent.trim() || '';
      datos.cons_presc       = tds[1]?.textContent.trim() || '';
      datos.cons_equip       = tds[2]?.textContent.trim() || '';
      datos.citados          = tds[3]?.textContent.trim() || '';
      datos.notificaciones   = tds[4]?.textContent.trim() || '';
      datos.al_abogados      = tds[5]?.textContent.trim() || '';
    }

    // REM. SUBDELEGACIÓN, DECRETOS EXP., TRAMITES AUDIENCIA
    if (
      header[0] === "REM. SUBDELEGACIÓN" &&
      header[1] === "DECRETOS EXP." &&
      header[2] === "TRAMITES AUDIENCIA"
    ) {
      const tds = Array.from(rows[1]?.querySelectorAll('td'));
      datos.rem_subdelegacion  = tds[0]?.textContent.trim() || '';
      datos.decretos_exp       = tds[1]?.textContent.trim() || '';
      datos.tramites_audiencia = tds[2]?.textContent.trim() || '';
    }

    // CIE CONCEDIDO, CIES DENEGADO, PROH. ENTRADA, MENAS, Dil. INFORME
    if (
      header[0] === "CIE CONCEDIDO" &&
      header[1] === "CIES DENEGADO" &&
      header[2] === "PROH. ENTRADA" &&
      header[3] === "MENAS" &&
      header[4] === "DIL. INFORME"
    ) {
      const tds = Array.from(rows[1]?.querySelectorAll('td'));
      datos.cie_concedido  = tds[0]?.textContent.trim() || '';
      datos.cies_denegado  = tds[1]?.textContent.trim() || '';
      datos.proh_entrada   = tds[2]?.textContent.trim() || '';
      datos.menas          = tds[3]?.textContent.trim() || '';
      datos.dil_informe    = tds[4]?.textContent.trim() || '';
    }

    // GESTIONES CECOREX
    if (/GESTIONES CECOREX/i.test(header[0])) {
      for (let i = 1; i < rows.length; i++) {
        const tds = Array.from(rows[i].querySelectorAll('td'));
        if (!tds.length) continue;
        datos.gestiones_cecorex.push({ gestion: tds[0].textContent.trim() });
      }
    }

    // GESTION (todos los indicadores de GESTIÓN abajo)
    if (
      header.includes("CITAS-G") &&
      header.includes("FALLOS") &&
      header.includes("CITAS") &&
      header.includes("ENTRV. ASILO") &&
      header.includes("FALLOS ASILO")
    ) {
      const idx = header.reduce((acc, h, i) => { acc[h] = i; return acc; }, {});
      const tds = Array.from(rows[1]?.querySelectorAll('td'));
      datos.citas_g             = tds[idx["CITAS-G"]]?.textContent.trim() || '';
      datos.fallos              = tds[idx["FALLOS"]]?.textContent.trim() || '';
      datos.citas               = tds[idx["CITAS"]]?.textContent.trim() || '';
      datos.entrv_asilo         = tds[idx["ENTRV. ASILO"]]?.textContent.trim() || '';
      datos.fallos_asilo        = tds[idx["FALLOS ASILO"]]?.textContent.trim() || '';
      datos.asilos_concedidos   = tds[idx["ASILOS CONCEDIDOS"]]?.textContent.trim() || '';
      datos.asilos_denegados    = tds[idx["ASILOS DENEGADOS"]]?.textContent.trim() || '';
      datos.cartas_concedidas   = tds[idx["CARTAS CONCEDIDAS"]]?.textContent.trim() || '';
      datos.cartas_denegadas    = tds[idx["CARTAS DENEGADAS"]]?.textContent.trim() || '';
      datos.prot_internacional  = tds[idx["PROT. INTERNACIONAL"]]?.textContent.trim() || '';
      datos.citas_subdeleg      = tds[idx["CITAS SUBDELEG"]]?.textContent.trim() || '';
      datos.tarjet_subdeleg     = tds[idx["TARJET. SUBDELEG"]]?.textContent.trim() || '';
      datos.notificaciones_concedidas = tds[idx["NOTIFICACIONES CONCEDIDAS"]]?.textContent.trim() || '';
      datos.notificaciones_denegadas  = tds[idx["NOTIFICACIONES DENEGADAS"]]?.textContent.trim() || '';
      datos.presentados         = tds[idx["PRESENTADOS"]]?.textContent.trim() || '';
      datos.correos_ucrania     = tds[idx["CORREOS UCRANIA"]]?.textContent.trim() || '';
      datos.tele_favo           = tds[idx["TELE. FAVO"]]?.textContent.trim() || '';
      datos.tele_desfav         = tds[idx["TELE. DESFAV"]]?.textContent.trim() || '';
      datos.citas_tlfn_asilo    = tds[idx["CITAS TLFN ASILO"]]?.textContent.trim() || '';
      datos.citas_tlfn_cartas   = tds[idx["CITAS TLFN CARTAS"]]?.textContent.trim() || '';
      datos.oficios             = tds[idx["OFICIOS"]]?.textContent.trim() || '';
    }

    // Busca fecha: DD-MM-AAAA (en tabla)
    if (!fecha) {
      let plain = tabla.innerText || tabla.textContent || "";
      let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  return { datos, fecha };
}
  
// ----------- GESTIÓN -----------
function parseGestion(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {};
  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
    if (header[0] === "CITAS-G" && header.length >= 5) {
      const campos = [
        "CITAS-G", "FALLOS", "CITAS", "ENTRV. ASILO", "FALLOS ASILO",
        "ASILOS CONCEDIDOS", "ASILOS DENEGADOS", "CARTAS CONCEDIDAS", "CARTAS DENEGADAS",
        "PROT. INTERNACIONAL", "CITAS SUBDELEG", "TARJET. SUBDELEG", "NOTIFICACIONES CONCEDIDAS",
        "NOTIFICACIONES DENEGADAS", "PRESENTADOS", "CORREOS UCRANIA", "TELE. FAVO",
        "TELE. DESFAV", "CITAS TLFN ASILO", "CITAS TLFN CARTAS", "OFICIOS"
      ];
      const tds = Array.from(rows[1]?.querySelectorAll('td'));
      campos.forEach((campo, idx) => {
        datos[campo.replace(/\./g,'').replace(/\s+/g,'_').toLowerCase()] =
          tds && tds[idx] ? tds[idx].textContent.trim() : '';
      });
      if (!fecha) {
        let plain = tabla.innerText || tabla.textContent || "";
        let m = plain.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (m) fecha = `${m[3]}-${m[2]}-${m[1]}`;
      }
      break;
    }
  }
  return { datos, fecha };
}


/* ----------- CIE ----------- */
function parseGrupoCIE(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  let fecha = '';
  let datos = {};
  for (const tabla of tablas) {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    if (!rows.length) continue;
    const header = Array.from(rows[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toUpperCase());
    if (
      header[0] === "N. INTERNOS" &&
      header[1] === "SALIDAS" &&
      header[2] === "ENTRADAS" &&
      header[3] === "OBSERVACIONES-CIE"
    ) {
      datos = {
        n_internos:         rows[1]?.children[0]?.textContent.trim() || '',
        salidas:            rows[1]?.children[1]?.textContent.trim() || '',
        entradas:           rows[1]?.children[2]?.textContent.trim() || '',
        observaciones_cie:  rows[1]?.children[3]?.textContent.trim() || ''
      };
    }
    // Busca fecha: DD-MM-AAAA (en tabla)
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
    return ['No se han extraído datos válidos para este grupo.'];
  }
  const errores = [];
  if (!fecha || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errores.push('La fecha es obligatoria y debe ser válida.');
  }
  if (grupo === GROUP1 && !Object.keys(data).length) errores.push('No hay datos de Grupo 1.');
  if (grupo === GROUP4 && !Object.keys(data).length) errores.push('No hay datos de Grupo 4.');
  if (grupo === GROUPPUERTO && !Object.keys(data).length) errores.push('No hay datos de Puerto.');
  if (grupo === GROUPCECOREX && !data.detenidos_cc && (!data.gestiones_cecorex || !data.gestiones_cecorex.length)) {
    errores.push('No hay datos de CECOREX.');
  }
  if (grupo === GROUPCIE && !Object.keys(data).length) errores.push('No hay datos de CIE.');
  if (grupo === GROUPGESTION && !Object.keys(data).length) errores.push('No hay datos de Gestión.');
  return errores.length ? errores : [];
}


}); // DOMContentLoaded
