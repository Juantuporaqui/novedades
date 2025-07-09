<!-- SIREX - SCRIPT CENTRAL DE PROCESAMIENTO DE NOVEDADES - GRUPOS 1, 4 y PUERTO -->
<!-- Profesional 2025 · Importa Grupo 1 (menos Gestiones), Grupo 4 Operativo y Puerto · DOCX oficial -->
<script type="module">
document.addEventListener('DOMContentLoaded', () => {

/* -------------------------------------------------------------------------- */
/*  CONFIGURACIÓN FIREBASE                                                    */
/* -------------------------------------------------------------------------- */
const firebaseConfig = {/* …tus credenciales… */};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* -------------------------------------------------------------------------- */
/*  REFERENCIAS A LOS ELEMENTOS DOM                                           */
/* -------------------------------------------------------------------------- */
const $ = id => document.getElementById(id);
const inputDocx           = $('inputDocx');
const statusContainer     = $('status-container');
const resultsContainer    = $('results-container');
const confirmationButtons = $('confirmation-buttons');
const btnConfirmarGuardado= $('btnConfirmarGuardado');
const btnCancelar         = $('btnCancelar');
const fechaEdicionDiv     = $('fecha-edicion');
const fechaManualInput    = $('fechaManualInput');
const fechaDetectadaBadge = $('fechaDetectadaBadge');
const spinner             = $('spinner-area');

/* -------------------------------------------------------------------------- */
/*  VARIABLES DE ESTADO                                                       */
/* -------------------------------------------------------------------------- */
let parsedDataForConfirmation = null;
let erroresValidacion         = [];
let grupoDetectado            = "";   // "grupo1_expulsiones" | "grupo4_operativo" | "grupoPuerto"

/* -------------------------------------------------------------------------- */
/*  UTILIDADES UI                                                             */
/* -------------------------------------------------------------------------- */
function showStatus(msg, type='info'){
  const map = {success:'alert-success', danger:'alert-danger',
               error:'alert-danger', warning:'alert-warning', info:'alert-info'};
  statusContainer.innerHTML =
    `<div class="alert ${map[type]??'alert-info'}" role="alert">${msg}</div>`;
}
const showSpinner       = v => spinner.style.display = v?'flex':'none';
const showConfirmationUI= v => confirmationButtons.style.display = v?'block':'none';

function showResults(obj){
  resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos</h3>';
  Object.entries(obj).forEach(([k,v])=>{
    if(k==='fecha') return;
    if(v && ((Array.isArray(v)&&v.length)||(!Array.isArray(v)&&Object.keys(v).length))){
      resultsContainer.insertAdjacentHTML('beforeend',`
        <div class="card mb-3 shadow-sm">
          <div class="card-header bg-light"><strong>${k.toUpperCase()}</strong></div>
          <div class="card-body"><pre class="results-card">${JSON.stringify(v,null,2)}</pre></div>
        </div>`);
    }
  });
}

function showFechaEditable(fechaISO){
  fechaEdicionDiv.style.display='flex';
  if(/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)){
    fechaManualInput.value = fechaISO;
    fechaDetectadaBadge.textContent = 'Detectada: '+fechaISO.split('-').reverse().join('/');
    fechaDetectadaBadge.className   = 'badge bg-success';
  }else{
    fechaManualInput.value='';
    fechaDetectadaBadge.textContent='No detectada';
    fechaDetectadaBadge.className   = 'badge bg-secondary';
  }
}
const obtenerFechaFormateada = () => fechaManualInput.value||"";

/* -------------------------------------------------------------------------- */
/*  EVENTOS                                                                   */
/* -------------------------------------------------------------------------- */
inputDocx     && inputDocx.addEventListener('change', handleDocxUpload);
btnConfirmarGuardado&&btnConfirmarGuardado.addEventListener('click',onConfirmSave);
btnCancelar   && btnCancelar.addEventListener('click',onCancel);

/* -------------------------------------------------------------------------- */
/*  SUBIDA Y ANÁLISIS DEL DOCX                                                */
/* -------------------------------------------------------------------------- */
async function handleDocxUpload(e){
  const file=e.target.files[0];
  if(!file) return;
  onCancel();
  showSpinner(true);
  showStatus('Procesando archivo…');
  if(!file.name.toLowerCase().endsWith('.docx')){
    showStatus('Solo se admiten archivos DOCX.','danger'); showSpinner(false); return;
  }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const html=(await mammoth.convertToHtml({arrayBuffer})).value;
    const {detectado,datos,fecha}=autoDetectAndParse(html);
    grupoDetectado=detectado;
    if(!Object.keys(datos||{}).length) throw Error('No se han extraído datos válidos.');

    parsedDataForConfirmation={ [detectado]:datos, fecha };
    showFechaEditable(fecha);
    showResults({[detectado]:datos});

    erroresValidacion=validarDatos(datos,detectado);
    if(erroresValidacion.length){
      showStatus('<ul>'+erroresValidacion.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
      btnConfirmarGuardado.disabled=true;
    }else{
      showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.');
      btnConfirmarGuardado.disabled=false;
    }
    showConfirmationUI(true);

  }catch(err){ console.error(err); showStatus(err.message,'danger'); }
  finally{ showSpinner(false); inputDocx.value=''; }
}

/* -------------------------------------------------------------------------- */
/*  GUARDADO                                                                  */
/* -------------------------------------------------------------------------- */
async function onConfirmSave(){
  if(!parsedDataForConfirmation){ showStatus('No hay datos para guardar.','danger'); return;}
  const fechaFinal=obtenerFechaFormateada();
  if(!fechaFinal){ showStatus('Selecciona una fecha válida.','danger'); fechaManualInput.focus(); return;}

  parsedDataForConfirmation.fecha=fechaFinal;

  const datosAValidar=getFirstDataBlock(parsedDataForConfirmation);
  erroresValidacion=validarDatos(datosAValidar,grupoDetectado);
  if(erroresValidacion.length){
    showStatus('<ul>'+erroresValidacion.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
    btnConfirmarGuardado.disabled=true; return;
  }

  showSpinner(true); showConfirmationUI(false); showStatus('Guardando en Firebase…'); resultsContainer.innerHTML='';
  try{
    const colName={grupo1_expulsiones:'grupo1_expulsiones',
                   grupo4_operativo:'grupo4_operativo',
                   grupoPuerto:'grupoPuerto_registros'}[grupoDetectado];
    if(!colName) throw Error('Grupo no reconocido.');
    const ref=db.collection(colName).doc(fechaFinal);
    if((await ref.get()).exists){
      showStatus('Ya existen datos para ese día.','danger');
      showResults({[grupoDetectado]:datosAValidar}); showConfirmationUI(true); return;
    }
    await ref.set(datosAValidar);
    showStatus('¡Guardado con éxito!','success');
  }catch(err){ console.error(err); showStatus(err.message,'danger');
               showResults({[grupoDetectado]:datosAValidar}); showConfirmationUI(true);}
  finally{ showSpinner(false); parsedDataForConfirmation=null; fechaEdicionDiv.style.display='none';}
}

/* -------------------------------------------------------------------------- */
function onCancel(){ resultsContainer.innerHTML=''; statusContainer.innerHTML='';
                     showConfirmationUI(false); parsedDataForConfirmation=null;
                     grupoDetectado=''; fechaEdicionDiv.style.display='none'; }

/* ============================  PARSERS  ==================================== */
/*  (… parseGrupo1Completo, parseGrupo4Completo, parseGrupoPuertoCompleto …   */
/*     SIN CAMBIOS – los que ya tenías funcionan bien)                        */
/* ========================================================================== */
/*              IMPORTANTE: autoDetect cambia de orden                        */
/* ========================================================================== */
function autoDetectAndParse(html){
  const t=html.toUpperCase();
  if(t.includes('ARGOS')&&t.includes('FERRYS')){             // ♦ PUERTO primero
    const {grupoPuerto,fecha}=parseGrupoPuertoCompleto(html);
    return{detectado:'grupoPuerto',datos:grupoPuerto,fecha};
  }
  if(t.includes('COLABORACIONES')&&t.includes('CITADOS')){   // ♦ luego G-4
    const {grupo4_operativo,fecha}=parseGrupo4Completo(html);
    return{detectado:'grupo4_operativo',datos:grupo4_operativo,fecha};
  }
  if(t.includes('DETENIDOS')&&t.includes('EXPULSADOS')){     // ♦ por último G-1
    const {grupo1,fecha}=parseGrupo1Completo(html);
    return{detectado:'grupo1_expulsiones',datos:grupo1,fecha};
  }
  return{detectado:'',datos:{},fecha:''};
}

/* -------------------------------------------------------------------------- */
/*  VALIDACIÓN                                                                */
/* -------------------------------------------------------------------------- */
function validarDatos(d,grupo){
  const err=[];
  if(!d||typeof d!=='object'){ err.push('No se han extraído datos válidos.'); return err;}

  if(grupo==='grupo1_expulsiones'){
    if(!(d.detenidos?.length||d.expulsados?.length||d.fletados?.length))
      err.push('Debe haber al menos un detenido, expulsado o fletado.');
  }
  if(grupo==='grupo4_operativo'){
    const faltan=[]; if(!d.colaboraciones?.length)faltan.push('Colaboraciones');
    if(!d.detenidos?.length)faltan.push('Detenidos');
    if(!d.inspeccionesTrabajo?.length)faltan.push('Inspecciones Trabajo');
    if(faltan.length===3)       err.push('Debe haber al menos un registro relevante.');
    else if(faltan.length)      err.push('⚠️ Faltan registros en: '+faltan.join(', '));
  }
  if(grupo==='grupoPuerto'){
    const algo=[
      d.marinosArgos,d.controlPasaportes,d.cruceros,d.cruceristas,d.visadosValencia,
      d.visadosCG,d.puertoDeportivo,d.denegaciones,d.certificadosEixics,
      (d.ferrys?.length), (d.observaciones||'').trim()
    ].some(x=>x&&x!=='');
    if(!algo) err.push('Debe haber al menos un campo con información en el parte de Puerto.');
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(obtenerFechaFormateada()))
    err.push('La fecha es obligatoria y debe ser válida.');

  return err;
}

/* -------------------------------------------------------------------------- */
/*  HELPER: PRIMER BLOQUE DE DATOS DENTRO DE parsedDataForConfirmation        */
/* -------------------------------------------------------------------------- */
function getFirstDataBlock(obj){
  for(const [k,v] of Object.entries(obj)){ if(k!=='fecha') return v; }
  return {};
}

}); // DOMContentLoaded
</script>
