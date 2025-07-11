/* --------------------------------------------------------------------------- */
/*  SIREX – Procesamiento de novedades (Grupo 1, Grupo 4 Operativo y Puerto)   */
/*  Profesional 2025 – Auto-importa partes oficiales en DOCX y los guarda en  */
/*  Firebase.                                                                 */
/* --------------------------------------------------------------------------- */

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
  const GROUP1      = "grupo1_expulsiones";
  const GROUP4      = "grupo4_operativo";
  const GROUPPUERTO = "grupoPuerto";

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

  /* ===============================  STATE  ================================== */
  let parsedDataForConfirmation = null;   // { datos: { [grupo]: datos }, fecha }
  let erroresValidacion         = [];

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

  /* ==============================  EVENTOS  ================================= */
  inputDocx            .addEventListener('change', handleDocxUpload);
  btnConfirmarGuardado .addEventListener('click',   onConfirmSave);
  btnCancelar          .addEventListener('click',   onCancel);

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

      // Detectar y parsear todos los grupos posibles
      const r1 = parseGrupo1(html);
      const r4 = parseGrupo4(html);
      const rp = parseGrupoPuerto(html);

      const resultados = {};
      if (Object.keys(r1.datos).length) resultados[GROUP1] = r1.datos;
      if (Object.keys(r4.datos).length) resultados[GROUP4] = r4.datos;
      if (Object.keys(rp.datos).length) resultados[GROUPPUERTO] = rp.datos;

      const fecha = r1.fecha || r4.fecha || rp.fecha || "";

      if (!Object.keys(resultados).length) {
        throw new Error("No se reconoció el formato del parte DOCX.");
      }

      parsedDataForConfirmation = { datos: resultados, fecha };
      showFechaEditable(fecha);
      showResults({ ...resultados, fecha });

      erroresValidacion = validarDatosPorTodos(resultados);
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

    showSpinner(true);
    showConfirmationUI(false);
    statusContainer.innerHTML = '';

    const datosParaGuardar = parsedDataForConfirmation.datos;
    const collectionMap = {
      [GROUP1]:      "grupo1_expulsiones",
      [GROUP4]:      "grupo4_operativo",
      [GROUPPUERTO]: "grupoPuerto_registros"
    };
    const errores = [];
    const exitos  = [];

    for (const grupo in datosParaGuardar) {
      if (!collectionMap[grupo]) continue;
      const collectionName = collectionMap[grupo];
      const datosDelGrupo  = datosParaGuardar[grupo];
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

  /* ======================  AUTO-DETECCIÓN Y PARSERS  ======================== */
  function parseGrupo1(html){
    const root  = document.createElement('div'); root.innerHTML = html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText || root.textContent || "";
    let m       = plain.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';

    const data = {};
    const sinGestiones = t=>{
      const head = t.querySelector('tr')?.textContent.toUpperCase()||'';
      return !head.includes('GESTIONES');
    };

    // DETENIDOS
    const detenidos = [];
    tablas.filter(sinGestiones).forEach(tabla=>{
      const rows = Array.from(tabla.querySelectorAll('tr'));
      const head = rows[0].textContent.toUpperCase();
      if (head.includes('DETENIDOS') && head.includes('MOTIVO')) {
        rows.slice(1).forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length < 4) return;
          const obj = {
            numero:        parseInt(td[0].textContent.trim())||'',
            motivo:        td[1].textContent.trim()||'',
            nacionalidad:  td[2].textContent.trim()||'',
            diligencias:   td[3].textContent.trim()||'',
            observaciones: td[4]?.textContent.trim()||''
          };
          if (Object.values(obj).some(v=>v!==''))
            detenidos.push(obj);
        });
      }
    });
    if (detenidos.length) data.detenidos = detenidos;

    // EXPULSADOS
    const expulsados = [];
    tablas.filter(sinGestiones).forEach(tabla=>{
      const rows = Array.from(tabla.querySelectorAll('tr'));
      const head = rows[0].textContent.toUpperCase();
      if (head.includes('EXPULSADOS') && head.includes('NACIONALIDAD')) {
        rows.slice(1).forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length < 2) return;
          const obj = {
            nombre:           td[0].textContent.trim()||'',
            nacionalidad:     td[1].textContent.trim()||'',
            diligencias:      td[2]?.textContent.trim()||'',
            nConduccionesPos: parseInt(td[3]?.textContent.trim())||0,
            conduccionesNeg:  parseInt(td[4]?.textContent.trim())||0,
            observaciones:    td[5]?.textContent.trim()||''
          };
          if (obj.nombre||obj.nacionalidad)
            expulsados.push(obj);
        });
      }
    });
    if (expulsados.length) data.expulsados = expulsados;

    // FLETADOS
    const fletados = [];
    const fletadosFuturos = [];
    tablas.filter(sinGestiones).forEach(tabla=>{
      const rows = Array.from(tabla.querySelectorAll('tr'));
      const head = rows[0].textContent.toUpperCase();
      if (head.includes('FLETADOS') && head.includes('DESTINO') && !head.includes('FUTUROS')) {
        rows.slice(1).forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length < 2) return;
          const obj = {
            destino:       td[0].textContent.trim()||'',
            pax:           parseInt(td[1].textContent.trim())||0,
            observaciones: td[2]?.textContent.trim()||''
          };
          if (obj.destino) fletados.push(obj);
        });
      }
      if (head.includes('FLETADOS FUTUROS')) {
        rows.slice(1).forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length < 2) return;
          const obj = {
            destino: td[0].textContent.trim()||'',
            pax:     parseInt(td[1].textContent.trim())||0,
            fecha:   td[2]?.textContent.trim()||''
          };
          if (obj.destino) fletadosFuturos.push(obj);
        });
      }
    });
    if (fletados.length) data.fletados = fletados;
    if (fletadosFuturos.length) data.fletadosFuturos = fletadosFuturos;

    // CONDUCCIONES
    ['POSITIVAS','NEGATIVAS'].forEach(tipo=>{
      const key = tipo==='POSITIVAS'?'conduccionesPositivas':'conduccionesNegativas';
      const arr = [];
      tablas.filter(sinGestiones).forEach(tabla=>{
        const rows = Array.from(tabla.querySelectorAll('tr'));
        const head = rows[0].textContent.toUpperCase();
        if (head.includes(`CONDUCCIONES ${tipo}`)) {
          rows.slice(1).forEach(tr=>{
            const td = Array.from(tr.querySelectorAll('td'));
            if (!td.length) return;
            const obj = {
              numero: parseInt(td[0].textContent.trim())||0,
              fecha:  td[1]?.textContent.trim()||''
            };
            if (obj.numero) arr.push(obj);
          });
        }
      });
      if (arr.length) data[key] = arr;
    });

    // PENDIENTES
    const pendientes = [];
    tablas.filter(sinGestiones).forEach(tabla=>{
      const rows = Array.from(tabla.querySelectorAll('tr'));
      const head = rows[0].textContent.toUpperCase();
      if (head.includes('PENDIENTES')) {
        rows.slice(1).forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (!td.length) return;
          const obj = {
            descripcion: td[0].textContent.trim()||'',
            fecha:       td[1]?.textContent.trim()||''
          };
          if (obj.descripcion) pendientes.push(obj);
        });
      }
    });
    if (pendientes.length) data.pendientes = pendientes;

    return { datos: data, fecha };
  }

  function parseGrupo4(html){
    const root  = document.createElement('div'); root.innerHTML = html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText || root.textContent || "";
    let m       = plain.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';

    const data = {};
    const mapSeccion = (keywords, fields, parser)=>{
      for (const t of tablas) {
        const cab = t.querySelector('tr')?.textContent.toUpperCase()||'';
        if (!keywords.every(k=>cab.includes(k))) continue;
        const rows = Array.from(t.querySelectorAll('tr')).slice(1);
        const arr  = [];
        rows.forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length < fields.length) return;
          const obj = {};
          fields.forEach((f,i)=> obj[f] = td[i].textContent.trim()||'');
          if (parser) Object.assign(obj, parser(obj));
          if (Object.values(obj).some(v=>v!=='')) arr.push(obj);
        });
        return arr;
      }
      return [];
    };

    const col = mapSeccion(['COLABORACION'],                ['desc','cantidad'], o=>({descripcion:o.desc, cantidad:parseInt(o.cantidad)||0}));
    const det = mapSeccion(['DETENIDOS'],                   ['motivo','nacionalidad','cantidad'], o=>({motivo:o.motivo, nacionalidad:o.nacionalidad, cantidad:parseInt(o.cantidad)||0}));
    const cit = mapSeccion(['CITADOS'],                     ['desc','cantidad'], o=>({descripcion:o.desc, cantidad:parseInt(o.cantidad)||0}));
    const ges = mapSeccion(['GESTIONES VARIAS'],            ['desc','cantidad'], o=>({descripcion:o.desc, cantidad:parseInt(o.cantidad)||0}));
    const ins = mapSeccion(['INS.TRABAJO'],                 ['desc','cantidad'], o=>({descripcion:o.desc, cantidad:parseInt(o.cantidad)||0}));
    const ois = mapSeccion(['INSPECCIONES'],                ['desc','cantidad'], o=>({descripcion:o.desc, cantidad:parseInt(o.cantidad)||0}));

    if (col.length) data.colaboraciones       = col;
    if (det.length) data.detenidos            = det;
    if (cit.length) data.citados              = cit;
    if (ges.length) data.gestiones            = ges;
    if (ins.length) data.inspeccionesTrabajo  = ins;
    if (ois.length) data.otrasInspecciones    = ois;

    // Observaciones
    tablas.forEach(t=>{
      const cab = t.querySelector('tr')?.textContent.toUpperCase()||'';
      if (!cab.includes('OBSERVACIONES')) return;
      const txt = Array.from(t.querySelectorAll('tr td')).slice(1).map(td=>td.textContent.trim()).join(' ');
      if (txt) data.observaciones = txt;
    });

    return { datos: data, fecha };
  }

  function parseGrupoPuerto(html){
    const root  = document.createElement('div'); root.innerHTML = html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText || root.textContent || "";
    let m       = plain.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})|(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m
      ? (m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5].padStart(2,'0')}-${m[4].padStart(2,'0')}`)
      : '';

    const data = {
      ctrlMarinos:'', marinosArgos:'', cruceros:'', cruceristas:'',
      visadosCgef:'', visadosValencia:'', visadosExp:'',
      vehChequeados:'', paxChequeadas:'', detenidos:'',
      denegaciones:'', entrExcep:'', eixics:'', ptosDeportivos:'',
      ferrys:[], observaciones:''
    };

    tablas.forEach(tabla=>{
      const head = tabla.querySelector('tr')?.textContent.toUpperCase()||'';
      // Stats
      if ((head.includes('CTRL.MARINOS')||head.includes('CTRL. MARINOS'))
          && head.includes('MARINOS ARGOS')
          && head.includes('CRUCEROS')) {
        const rows = Array.from(tabla.querySelectorAll('tr')).slice(1);
        rows.forEach(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          if (td.length>=14) {
            data.ctrlMarinos     = td[0]?.textContent.trim()||'';
            data.marinosArgos    = td[1]?.textContent.trim()||'';
            data.cruceros        = td[2]?.textContent.trim()||'';
            data.cruceristas     = td[3]?.textContent.trim()||'';
            data.visadosCgef     = td[4]?.textContent.trim()||'';
            data.visadosValencia = td[5]?.textContent.trim()||'';
            data.visadosExp      = td[6]?.textContent.trim()||'';
            data.vehChequeados   = td[7]?.textContent.trim()||'';
            data.paxChequeadas   = td[8]?.textContent.trim()||'';
            data.detenidos       = td[9]?.textContent.trim()||'';
            data.denegaciones    = td[10]?.textContent.trim()||'';
            data.entrExcep       = td[11]?.textContent.trim()||'';
            data.eixics          = td[12]?.textContent.trim()||'';
            data.ptosDeportivos  = td[13]?.textContent.trim()||'';
          }
        });
      }
      // Ferrys
      if (head.includes('FERRYS')) {
        const rows = Array.from(tabla.querySelectorAll('tr')).slice(1);
        data.ferrys = rows.map(tr=>{
          const td = Array.from(tr.querySelectorAll('td'));
          return {
            tipo:       td[0]?.textContent.trim()||'',
            destino:    td[1]?.textContent.trim()||'',
            fecha:      td[2]?.textContent.trim()||'',
            hora:       td[3]?.textContent.trim()||'',
            pasajeros:  td[4]?.textContent.trim()||'',
            vehiculos:  td[5]?.textContent.trim()||'',
            incidencia: td[6]?.textContent.trim()||''
          };
        }).filter(o=>Object.values(o).some(v=>v));
      }
      // Observaciones
      if (head.includes('OBSERVACIONES')) {
        const txt = Array.from(tabla.querySelectorAll('tr td')).slice(1).map(td=>td.textContent.trim()).join(' ');
        if (txt) data.observaciones = txt;
      }
    });

    // Eliminar vacíos
    Object.keys(data).forEach(k=>{
      if (Array.isArray(data[k]) ? data[k].length===0 : data[k]==='') {
        delete data[k];
      }
    });

    return { datos: data, fecha };
  }

  /* ===========================  VALIDACIÓN  ================================ */
  function validarDatos(data, grupo) {
    if (!data || typeof data!=='object') {
      return ['No se han extraído datos válidos para este grupo.'];
    }
    const errores = [];
    const advert  = [];

    if (grupo === GROUP1) {
      if (!(data.detenidos||[]).length && !(data.expulsados||[]).length && !(data.fletados||[]).length) {
        errores.push('Debe haber al menos un detenido, expulsado o fletado.');
      }
    }
    if (grupo === GROUP4) {
      const keys = ['colaboraciones','detenidos','inspeccionesTrabajo','citados','gestiones','otrasInspecciones','observaciones'];
      if (!keys.some(k=> data[k] && ((Array.isArray(data[k])?data[k].length:!!data[k])))) {
        errores.push('Debe haber al menos un campo con datos en Grupo 4.');
      }
    }
    if (grupo === GROUPPUERTO) {
      const keys = ['ctrlMarinos','cruceros','ferrys'];
      if (!keys.some(k=> data[k] && ((Array.isArray(data[k])?data[k].length:!!data[k])))) {
        errores.push('Debe haber al menos control de marinos, cruceros o ferrys en Puerto.');
      }
    }

    const fechaVal = obtenerFechaFormateada();
    if (!fechaVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errores.push('La fecha es obligatoria y debe ser válida.');
    }

    return errores.length? errores : [];
  }

  function validarDatosPorTodos(allData) {
    let errs = [];
    Object.entries(allData).forEach(([grupo,d])=>{
      errs = errs.concat(validarDatos(d, grupo));
    });
    return errs;
  }

}); // DOMContentLoaded
