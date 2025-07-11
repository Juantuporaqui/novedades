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
let parsedDataForConfirmation = null;   // { [grupoDetectado]: datos, fecha }
let grupoDetectado            = "";     // clave de grupo
let erroresValidacion         = [];

/* ============================  UI HELPERS  ================================ */
const showStatus = (msg, type='info')=>{
    const cls = {info:'alert-info',success:'alert-success',warning:'alert-warning',danger:'alert-danger',error:'alert-danger'};
    statusContainer.innerHTML = `<div class="alert ${cls[type]||cls.info}" role="alert">${msg}</div>`;
};
const showSpinner        = v => spinnerArea.style.display = v?'flex':'none';
const showConfirmationUI = v => confirmationButtons.style.display = v?'block':'none';

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
    fechaEdicionDiv.style.display="flex";
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso||'')){
        fechaManualInput.value = iso;
        fechaDetectadaBadge.textContent = "Detectada: "+iso.split('-').reverse().join('/');
        fechaDetectadaBadge.className   = "badge bg-success";
    }else{
        fechaManualInput.value = "";
        fechaDetectadaBadge.textContent = "No detectada";
        fechaDetectadaBadge.className   = "badge bg-secondary";
    }
};
const obtenerFechaFormateada = ()=> fechaManualInput.value||"";

/* ==============================  EVENTOS  ================================= */
inputDocx           .addEventListener('change', handleDocxUpload);
btnConfirmarGuardado.addEventListener('click',   onConfirmSave);
btnCancelar         .addEventListener('click',   onCancel);

/* ==========================  SUBIR Y PARSEAR  ============================= */
async function handleDocxUpload(e){
    const file = e.target.files[0];
    if(!file) return;
    onCancel();
    showSpinner(true);
    showStatus('Procesando archivo …','info');

    if(!file.name.toLowerCase().endsWith('.docx')){
        showStatus('Solo se admiten archivos DOCX.','danger');
        showSpinner(false); return;
    }

    try{
        const arrayBuffer   = await file.arrayBuffer();
        const { value:html} = await mammoth.convertToHtml({arrayBuffer});
        const { detectado, datos, fecha } = autoDetectAndParse(html);

        if(!detectado) throw new Error("No se reconoció el formato del parte DOCX.");

        grupoDetectado            = detectado;
        parsedDataForConfirmation = { [detectado]: datos, fecha };

        showFechaEditable(fecha);
        showResults(parsedDataForConfirmation);

        erroresValidacion = validarDatos(datos, detectado);
        if(erroresValidacion.length){
            showStatus('<ul>'+erroresValidacion.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
            btnConfirmarGuardado.disabled = true;
        }else{
            showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.','info');
            btnConfirmarGuardado.disabled = false;
        }
        showConfirmationUI(true);

    }catch(err){
        console.error(err);
        showStatus('Error: '+err.message,'danger');
    }finally{
        showSpinner(false);
        inputDocx.value='';
    }
}

/* ==========================  CONFIRMAR GUARDADO  ========================= */
async function onConfirmSave(){
    if(!parsedDataForConfirmation || !grupoDetectado){
        showStatus('No hay datos para guardar.','danger'); return;
    }
    const fechaFinal = obtenerFechaFormateada();
    if(!fechaFinal){
        showStatus('Selecciona una fecha válida.','danger');
        fechaManualInput.focus(); return;
    }
    parsedDataForConfirmation.fecha = fechaFinal;

    const datosAValidar = parsedDataForConfirmation[grupoDetectado];
    erroresValidacion   = validarDatos(datosAValidar, grupoDetectado);
    if(erroresValidacion.length){
        showStatus('<ul>'+erroresValidacion.map(e=>`<li>${e}</li>`).join('')+'</ul>','danger');
        btnConfirmarGuardado.disabled=true; return;
    }

    showSpinner(true); showConfirmationUI(false); showStatus('Guardando en Firebase …','info'); resultsContainer.innerHTML='';

    try{
        const collectionName = ({
            [GROUP1]:      "grupo1_expulsiones",
            [GROUP4]:      "grupo4_operativo",
            [GROUPPUERTO]: "grupoPuerto_registros"})[grupoDetectado];

        const ref  = db.collection(collectionName).doc(fechaFinal);
        if((await ref.get()).exists){
            showStatus(`Ya existen datos para ese día en ${grupoDetectado}.`,'danger');
            showResults({ [grupoDetectado]: datosAValidar }); showConfirmationUI(true); return;
        }
        await ref.set(datosAValidar,{merge:false});
        showStatus('¡Guardado con éxito en Firebase!','success');
    }catch(err){
        console.error(err);
        showStatus('Error: '+err.message,'danger');
        showResults({ [grupoDetectado]: datosAValidar }); showConfirmationUI(true);
    }finally{
        showSpinner(false);
        parsedDataForConfirmation=null;
        fechaEdicionDiv.style.display="none";
    }
}

function onCancel(){
    resultsContainer.innerHTML='';
    statusContainer.innerHTML='';
    showConfirmationUI(false);
    parsedDataForConfirmation=null;
    grupoDetectado="";
    fechaEdicionDiv.style.display="none";
}

/* ======================  AUTO-DETECCIÓN Y PARSERS  ======================== */
function autoDetectAndParse(html){
    const txt = html.toUpperCase();

    if(txt.includes("DETENIDOS") && txt.includes("EXPULSADOS")){
        const { datos, fecha } = parseGrupo1(html);
        return { detectado: GROUP1, datos, fecha };
    }
    if(txt.includes("COLABORACION") && txt.includes("CITADOS")){
        const { datos, fecha } = parseGrupo4(html);
        return { detectado: GROUP4, datos, fecha };
    }
    if(txt.includes("PUERTO") && (txt.includes("CTRL.MARINOS") || txt.includes("MARINOS ARGOS") || txt.includes("FERRYS"))){
        const { datos, fecha } = parseGrupoPuerto(html);
        return { detectado: GROUPPUERTO, datos, fecha };
    }
    return { detectado:'', datos:{}, fecha:'' };
}

/* ------------------------------------------------------------------------- */
/*                            PARSER GRUPO 1                                 */
/* ------------------------------------------------------------------------- */
function parseGrupo1(html){
    const root  = document.createElement('div'); root.innerHTML=html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText||root.textContent||"";
    let m       = plain.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';

    const grupo1 = {};

    const sinGestiones = t=>{
        const head = t.querySelector('tr')?.textContent?.toUpperCase()||'';
        return !head.includes('GESTIONES');
    };

    /* -------------------  Detenidos  ------------------- */
    grupo1.detenidos=[];
    tablas.filter(sinGestiones).forEach(tabla=>{
        const rows = Array.from(tabla.querySelectorAll('tr'));
        const encabezado = rows[0].textContent.toUpperCase();
        if(encabezado.includes('DETENIDOS') && encabezado.includes('MOTIVO')){
            rows.slice(1).forEach(tr=>{
                const td=Array.from(tr.querySelectorAll('td'));
                if(td.length<4) return;
                const obj={
                    numero:        parseInt(td[0].textContent.trim())||'',
                    motivo:        td[1].textContent.trim()||'',
                    nacionalidad:  td[2].textContent.trim()||'',
                    diligencias:   td[3].textContent.trim()||'',
                    observaciones: td[4]?.textContent.trim()||''
                };
                if(Object.values(obj).some(x=>x!==''))
                    grupo1.detenidos.push(obj);
            });
        }
    });
    if(!grupo1.detenidos.length) delete grupo1.detenidos;

    /* -------------------  Expulsados  ------------------ */
    grupo1.expulsados=[];
    tablas.filter(sinGestiones).forEach(tabla=>{
        const rows = Array.from(tabla.querySelectorAll('tr'));
        const head = rows[0].textContent.toUpperCase();
        if(head.includes('EXPULSADOS') && head.includes('NACIONALIDAD')){
            rows.slice(1).forEach(tr=>{
                const td = Array.from(tr.querySelectorAll('td'));
                if(td.length<2) return;
                const obj={
                    nombre:            td[0].textContent.trim()||'',
                    nacionalidad:      td[1].textContent.trim()||'',
                    diligencias:       td[2]?.textContent.trim()||'',
                    nConduccionesPos:  parseInt(td[3]?.textContent.trim())||0,
                    conduccionesNeg:   parseInt(td[4]?.textContent.trim())||0,
                    observaciones:     td[5]?.textContent.trim()||''
                };
                if(obj.nombre || obj.nacionalidad) grupo1.expulsados.push(obj);
            });
        }
    });
    if(!grupo1.expulsados.length) delete grupo1.expulsados;

    /* -------------------  Fletados actuales ------------- */
    grupo1.fletados=[];
    tablas.filter(sinGestiones).forEach(tabla=>{
        const rows=Array.from(tabla.querySelectorAll('tr'));
        const head=rows[0].textContent.toUpperCase();
        if(head.includes('FLETADOS') && head.includes('DESTINO') && !head.includes('FUTUROS')){
            rows.slice(1).forEach(tr=>{
                const td=Array.from(tr.querySelectorAll('td'));
                if(td.length<2) return;
                const obj={
                    destino:       td[0].textContent.trim()||'',
                    pax:           parseInt(td[1].textContent.trim())||0,
                    observaciones: td[2]?.textContent.trim()||''
                };
                if(obj.destino) grupo1.fletados.push(obj);
            });
        }
    });
    if(!grupo1.fletados.length) delete grupo1.fletados;

    /* -------------------  Fletados futuros ------------- */
    grupo1.fletadosFuturos=[];
    tablas.filter(sinGestiones).forEach(tabla=>{
        const rows=Array.from(tabla.querySelectorAll('tr'));
        const head=rows[0].textContent.toUpperCase();
        if(head.includes('FLETADOS FUTUROS')){
            rows.slice(1).forEach(tr=>{
                const td=Array.from(tr.querySelectorAll('td'));
                if(td.length<2) return;
                const obj={
                    destino: td[0].textContent.trim()||'',
                    pax:     parseInt(td[1].textContent.trim())||0,
                    fecha:   td[2]?.textContent.trim()||''
                };
                if(obj.destino) grupo1.fletadosFuturos.push(obj);
            });
        }
    });
    if(!grupo1.fletadosFuturos.length) delete grupo1.fletadosFuturos;

    /* -------------  Conducciones positivas/negativas --------------- */
    const extraerConducciones = (clave, palabra)=>{
        grupo1[clave]=[];
        tablas.filter(sinGestiones).forEach(tabla=>{
            const rows=Array.from(tabla.querySelectorAll('tr'));
            const head=rows[0].textContent.toUpperCase();
            if(head.includes(palabra)){
                rows.slice(1).forEach(tr=>{
                    const td=Array.from(tr.querySelectorAll('td'));
                    if(!td.length) return;
                    const obj={
                        numero: parseInt(td[0].textContent.trim())||0,
                        fecha : td[1]?.textContent.trim()||''
                    };
                    if(obj.numero) grupo1[clave].push(obj);
                });
            }
        });
        if(!grupo1[clave].length) delete grupo1[clave];
    };
    extraerConducciones('conduccionesPositivas','CONDUCCIONES POSITIVAS');
    extraerConducciones('conduccionesNegativas','CONDUCCIONES NEGATIVAS');

    /* -------------------  Pendientes  ------------------ */
    grupo1.pendientes=[];
    tablas.filter(sinGestiones).forEach(tabla=>{
        const rows=Array.from(tabla.querySelectorAll('tr'));
        const head=rows[0].textContent.toUpperCase();
        if(head.includes('PENDIENTES')){
            rows.slice(1).forEach(tr=>{
                const td=Array.from(tr.querySelectorAll('td'));
                if(!td.length) return;
                const obj={
                    descripcion: td[0].textContent.trim()||'',
                    fecha:       td[1]?.textContent.trim()||''
                };
                if(obj.descripcion) grupo1.pendientes.push(obj);
            });
        }
    });
    if(!grupo1.pendientes.length) delete grupo1.pendientes;

    return { datos: grupo1, fecha };
}

/* ------------------------------------------------------------------------- */
/*                           PARSER GRUPO 4 OPERATIVO                        */
/* ------------------------------------------------------------------------- */
function parseGrupo4(html){
    const root  = document.createElement('div'); root.innerHTML=html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText||root.textContent||"";
    let m       = plain.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';

    const grupo4={};

    const mapSeccion = (palabras, campos, parseFn)=>{
        for(const t of tablas){
            const cab = t.querySelector('tr')?.textContent?.toUpperCase()||'';
            if(!palabras.every(p=>cab.includes(p.toUpperCase()))) continue;
            const filas = Array.from(t.querySelectorAll('tr')).slice(1);
            const arr   = [];
            filas.forEach(tr=>{
                const td = Array.from(tr.querySelectorAll('td'));
                if(td.length < campos.length) return;
                const obj={};
                campos.forEach((campo,i)=> obj[campo]=td[i].textContent.trim()||'');
                if(parseFn) Object.assign(obj,parseFn(obj));
                if(Object.values(obj).some(v=>v!=='')) arr.push(obj);
            });
            return arr;
        }
        return [];
    };

    grupo4.colaboraciones      = mapSeccion(['COLABORACIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.colaboraciones.length) delete grupo4.colaboraciones;

    grupo4.detenidos           = mapSeccion(['DETENIDOS'],['motivo','nacionalidad','cantidad'],
                                            o=>({motivo:o.motivo,nacionalidad:o.nacionalidad,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.detenidos.length) delete grupo4.detenidos;

    grupo4.citados             = mapSeccion(['CITADOS'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.citados.length) delete grupo4.citados;

    grupo4.gestiones           = mapSeccion(['OTRAS GESTIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.gestiones.length) delete grupo4.gestiones;

    grupo4.inspeccionesTrabajo = mapSeccion(['INSPECCIONES TRABAJO'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.inspeccionesTrabajo.length) delete grupo4.inspeccionesTrabajo;

    grupo4.otrasInspecciones   = mapSeccion(['OTRAS INSPECCIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
    if(!grupo4.otrasInspecciones.length) delete grupo4.otrasInspecciones;

    tablas.forEach(t=>{
        const cab = t.querySelector('tr')?.textContent?.toUpperCase()||'';
        if(!cab.includes('OBSERVACIONES')) return;
        const txt = Array.from(t.querySelectorAll('tr td')).slice(1).map(td=>td.textContent.trim()).join(' ');
        if(txt) grupo4.observaciones = txt;
    });

    return { datos: grupo4, fecha };
}

/* ------------------------------------------------------------------------- */
/*                           PARSER GRUPO PUERTO (ADAPTADO)                  */
/* ------------------------------------------------------------------------- */
function parseGrupoPuerto(html){
    const root  = document.createElement('div'); root.innerHTML=html;
    const tablas= Array.from(root.querySelectorAll('table'));
    const plain = root.innerText||root.textContent||"";
    let m       = plain.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})|(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const fecha = m
        ? (m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5].padStart(2,'0')}-${m[4].padStart(2,'0')}`)
        : '';

    // Aquí añadimos TODOS los campos del nuevo formato de PUERTO
    const puerto={
        ctrlMarinos:'', marinosArgos:'', cruceros:'', cruceristas:'', visadosCgef:'', visadosValencia:'',
        visadosExp:'', vehChequeados:'', paxChequeadas:'', detenidos:'', denegaciones:'',
        entrExcep:'', eixics:'', ptosDeportivos:'', ferrys:[], observaciones:''
    };

    tablas.forEach(tabla=>{
        const head = tabla.querySelector('tr')?.textContent?.toUpperCase()||'';

        // --- Estadísticas principales ---
        if(head.includes('CTRL. MARINOS') || head.includes('CRUCEROS') || head.includes('VISADOS')){
            const filas = Array.from(tabla.querySelectorAll('tr')).slice(1);
            filas.forEach(tr=>{
                const td = Array.from(tr.querySelectorAll('td'));
                if(td.length>=14){
                    puerto.ctrlMarinos     = td[0]?.textContent.trim()||'';
                    puerto.marinosArgos    = td[1]?.textContent.trim()||'';
                    puerto.cruceros        = td[2]?.textContent.trim()||'';
                    puerto.cruceristas     = td[3]?.textContent.trim()||'';
                    puerto.visadosCgef     = td[4]?.textContent.trim()||'';
                    puerto.visadosValencia = td[5]?.textContent.trim()||'';
                    puerto.visadosExp      = td[6]?.textContent.trim()||'';
                    puerto.vehChequeados   = td[7]?.textContent.trim()||'';
                    puerto.paxChequeadas   = td[8]?.textContent.trim()||'';
                    puerto.detenidos       = td[9]?.textContent.trim()||'';
                    puerto.denegaciones    = td[10]?.textContent.trim()||'';
                    puerto.entrExcep       = td[11]?.textContent.trim()||'';
                    puerto.eixics          = td[12]?.textContent.trim()||'';
                    puerto.ptosDeportivos  = td[13]?.textContent.trim()||'';
                }
            });
        }

        // --- FERRYS ---
        if(head.includes('FERRYS')){
            const filas = Array.from(tabla.querySelectorAll('tr')).slice(1);
            puerto.ferrys = filas.map(tr=>{
                const td=Array.from(tr.querySelectorAll('td'));
                return {
                    tipo:       td[0]?.textContent.trim()||'',
                    destino:    td[1]?.textContent.trim()||'',
                    fecha:      td[2]?.textContent.trim()||'',
                    hora:       td[3]?.textContent.trim()||'',
                    pasajeros:  td[4]?.textContent.trim()||'',
                    vehiculos:  td[5]?.textContent.trim()||'',
                    incidencia: td[6]?.textContent.trim()||''
                };
            }).filter(f=>Object.values(f).some(v=>v));
        }

        // --- OBSERVACIONES ---
        if(head.includes('OBSERVACIONES')){
            puerto.observaciones = Array.from(tabla.querySelectorAll('tr td')).slice(1).map(td=>td.textContent.trim()).join(' ').trim();
        }
    });

    // Eliminar vacíos
    Object.keys(puerto).forEach(k=>{
        if(Array.isArray(puerto[k]) && !puerto[k].length)          delete puerto[k];
        else if(!Array.isArray(puerto[k]) && puerto[k]==='')       delete puerto[k];
    });

    return { datos: puerto, fecha };
}

/* ------------------------------------------------------------------------- */
/*                               VALIDACIÓN                                  */
/* ------------------------------------------------------------------------- */
function validarDatos(data, grupo) {
    if (!data || typeof data !== 'object') {
        return ['No se han extraído datos válidos para este grupo.'];
    }
    let errores = [];
    let advertencias = [];

    // --- Grupo 1 ---
    if (grupo === "grupo1_expulsiones") {
        if (
            (!data.detenidos || data.detenidos.length === 0) &&
            (!data.expulsados || data.expulsados.length === 0) &&
            (!data.fletados || data.fletados.length === 0)
        ) {
            errores.push('Debe haber al menos un detenido, expulsado o fletado.');
        } else {
            if (!data.detenidos || data.detenidos.length === 0) advertencias.push('No hay detenidos.');
            if (!data.expulsados || data.expulsados.length === 0) advertencias.push('No hay expulsados.');
            if (!data.fletados || data.fletados.length === 0) advertencias.push('No hay fletados.');
        }
    }

    // --- Grupo 4 ---
    if (grupo === "grupo4_operativo") {
        const camposClave = [
            'colaboraciones', 'detenidos', 'inspeccionesTrabajo', 
            'citados', 'gestiones', 'otrasInspecciones', 'observaciones'
        ];
        const hayAlMenosUno = camposClave.some(k => data[k] && (
            (Array.isArray(data[k]) && data[k].length > 0) ||
            (typeof data[k] === 'string' && data[k].trim() !== '')
        ));
        if (!hayAlMenosUno) {
            errores.push('Debe haber al menos un dato en algún campo relevante de Grupo 4.');
        } else {
            if (!data.colaboraciones || data.colaboraciones.length === 0) advertencias.push('No hay colaboraciones.');
            if (!data.detenidos || data.detenidos.length === 0) advertencias.push('No hay detenidos.');
            if (!data.inspeccionesTrabajo || data.inspeccionesTrabajo.length === 0) advertencias.push('No hay inspecciones de trabajo.');
        }
    }

    // --- Grupo Puerto ---
    if (grupo === "grupoPuerto") {
        const camposClave = [
            'ctrlMarinos', 'marinosArgos', 'cruceros', 'cruceristas', 'visadosCgef', 'visadosValencia',
            'visadosExp', 'vehChequeados', 'paxChequeadas', 'detenidos', 'denegaciones', 'entrExcep', 'eixics', 'ptosDeportivos',
            'ferrys', 'observaciones'
        ];
        const hayAlMenosUno = camposClave.some(k => data[k] && (
            (Array.isArray(data[k]) && data[k].length > 0) ||
            (typeof data[k] === 'string' && data[k].trim() !== '')
        ));
        if (!hayAlMenosUno) {
            errores.push('Debe haber al menos un campo con información en el parte de Puerto.');
        } else {
            if (!data.ctrlMarinos) advertencias.push('No hay control de marinos.');
            if (!data.ferrys || data.ferrys.length === 0) advertencias.push('No hay ferrys.');
            if (!data.cruceros) advertencias.push('No hay cruceros.');
        }
    }

    // --- Fecha válida para todos los grupos ---
    if (typeof obtenerFechaFormateada === 'function') {
        const fechaValida = obtenerFechaFormateada();
        if (!fechaValida || !/^\d{4}-\d{2}-\d{2}$/.test(fechaValida)) {
            errores.push('La fecha es obligatoria y debe ser válida.');
        }
    }

    if (errores.length > 0) return errores;
    if (advertencias.length > 0) return advertencias.map(a => '⚠️ ' + a);
    return [];
}
}); // DOMContentLoaded
