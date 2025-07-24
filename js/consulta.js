// ========================= SIREX · Consulta Global / Resúmenes ==========================
// Versión definitiva, profesional, narrativa y multigrupo (UCRIF, Grupo1, Puerto, Cecorex, Gestión, CIE)
// Exportación profesional a WhatsApp y PDF con jsPDF y autoTable.
// =======================================================================================

// --- 1. CONFIGURACIÓN FIREBASE ---
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
const FieldPath = firebase.firestore.FieldPath;

// --- 2. DOM Y ETIQUETAS DE GRUPO ---
const form = document.getElementById('consultaForm');
const spinner = document.getElementById('spinner');
const resumenVentana = document.getElementById('resumenVentana');
const exportBtns = document.getElementById('exportBtns');

const GRUPOS_CONFIG = {
    ucrif: { label: 'UCRIF (Grupos 2, 3 y 4)', icon: '🛡️', color: 'info' },
    grupo1: { label: 'Expulsiones', icon: '🚔', color: 'primary' },
    puerto: { label: 'Puerto', icon: '⚓', color: 'success' },
    cecorex: { label: 'CECOREX', icon: '📡', color: 'warning' },
    gestion: { label: 'Gestión', icon: '📋', color: 'secondary' },
    cie: { label: 'CIE', icon: '🏢', color: 'danger' }
};

// --- 3. QUERIES FIRESTORE: RECOPILA TODO (nada omitido) ---
const QUERY_STRATEGIES = {
    getUcrifNovedades: async (desde, hasta) => {
        const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo'];
        let rawData = [];
        for (const coll of collections) {
            const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            snap.forEach(doc => rawData.push(doc.data()));
        }
        const resultado = {
            detenidosILE: 0, filiadosVarios: 0, traslados: 0, citadosCecorex: 0,
            inspecciones: [], detenidosDelito: [], observaciones: [],
            colaboraciones: [], dispositivos: []
        };
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');
        rawData.forEach(data => {
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4);
            if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);
            const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
            todosDetenidos.forEach(d => {
                const motivo = d.motivo || d.motivo_g4 || '';
                if (isILE(motivo)) {
                    resultado.detenidosILE++;
                } else {
                    resultado.detenidosDelito.push({
                        descripcion: `${d.detenido || d.detenidos_g4 || 'N/A'} (${d.nacionalidad || d.nacionalidad_g4 || 'N/A'})`,
                        motivo: motivo,
                    });
                }
            });
            if (data.inspecciones) resultado.inspecciones.push(...data.inspecciones);
            if (data.inspecciones_g4) resultado.inspecciones.push(...data.inspecciones_g4);
            if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones);
        });
        return resultado;
    },
    getGrupo1Detalles: async (desde, hasta) => {
        const snap = await db.collection('grupo1_expulsiones').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const res = {
            detenidos: [],
            expulsados: [],
            frustradas: [],
            fletados: [],
        };
        snap.forEach(doc => {
            const data = doc.data();
            if (data.detenidos_g1) res.detenidos.push(...data.detenidos_g1);
            if (data.expulsados_g1) res.expulsados.push(...data.expulsados_g1);
            if (data.exp_frustradas_g1) res.frustradas.push(...data.exp_frustradas_g1);
            if (data.fletados_g1) res.fletados.push(...data.fletados_g1);
        });
        return res;
    },
    getPuertoDetalles: async (desde, hasta) => {
        const snap = await db.collection('grupoPuerto_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        let res = { ferrys: [], incidencias: [], ctrlMarinos: 0, marinosArgos: 0 };
        snap.forEach(doc => {
            const data = doc.data();
            if (data.ferrys) res.ferrys.push(...data.ferrys);
            if (data.incidencias) res.incidencias.push(...data.incidencias);
            if (data.ctrlMarinos) res.ctrlMarinos += Number(data.ctrlMarinos) || 0;
            if (data.marinosArgos) res.marinosArgos += Number(data.marinosArgos) || 0;
        });
        return res;
    },
    getCecorexDetalles: async (desde, hasta) => {
        const snap = await db.collection('cecorex_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        let res = { gestiones: [], incidencias: [], detenidos: 0 };
        snap.forEach(doc => {
            const data = doc.data();
            if (data.gestiones_cecorex) res.gestiones.push(...data.gestiones_cecorex);
            if (data.incidencias) res.incidencias.push(...data.incidencias);
            if (data.detenidos_cc) res.detenidos += data.detenidos_cc.length || 0;
        });
        return res;
    },
    sumarCampos: async (collection, desde, hasta) => {
        const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        let res = {};
        snap.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(key => {
                if (key !== 'fecha') res[key] = (res[key] || 0) + (Number(data[key]) || 0);
            });
        });
        return res;
    },
    async getCIE(desde, hasta) {
        const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta);
        const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
        const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
        return { ...rangeTotals, "Internos (fin)": finalCount };
    }
};

// --- 4. SUBMIT PRINCIPAL ---
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    resumenVentana.innerHTML = '';
    spinner.classList.remove('d-none');
    exportBtns.classList.add('d-none');
    const desde = form.fechaDesde.value;
    const hasta = form.fechaHasta.value;
    if (desde > hasta) {
        resumenVentana.innerHTML = `<div class="alert alert-danger">La fecha de inicio no puede ser posterior a la de fin.</div>`;
        spinner.classList.add('d-none');
        return;
    }
    try {
        const promesas = {
            ucrif: QUERY_STRATEGIES.getUcrifNovedades(desde, hasta),
            grupo1: QUERY_STRATEGIES.getGrupo1Detalles(desde, hasta),
            puerto: QUERY_STRATEGIES.getPuertoDetalles(desde, hasta),
            cecorex: QUERY_STRATEGIES.getCecorexDetalles(desde, hasta),
            gestion: QUERY_STRATEGIES.sumarCampos('gestion_registros', desde, hasta),
            cie: QUERY_STRATEGIES.getCIE(desde, hasta),
        };
        const resultados = await Promise.all(Object.values(promesas));
        const resumen = Object.keys(promesas).reduce((acc, key, index) => { acc[key] = resultados[index]; return acc; }, {});
        window._ultimoResumen = { resumen, desde, hasta };
        resumenVentana.innerHTML = renderizarResumenGlobalHTML(resumen, desde, hasta);
        exportBtns.classList.remove('d-none');
    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally { spinner.classList.add('d-none'); }
});
function normalizarDetenido(obj) {
    // Para un solo detenido, saca los campos clave, sea formato manual o parser
    return {
        nombre: obj.detenidos_g1 || obj.numero || obj.nombre || "-",
        motivo: obj.motivo_g1 || obj.motivo || "-",
        nacionalidad: obj.nacionalidad_g1 || obj.nacionalidad || "-",
        diligencias: obj.diligencias_g1 || obj.diligencias || "",
        observaciones: obj.observaciones_g1 || obj.observaciones || ""
    };
}
function normalizarExpulsado(obj) {
    return {
        nombre: obj.expulsados_g1 || obj.nombre || "-",
        nacionalidad: obj.nacionalidad_eg1 || obj.nacionalidad || "-",
        diligencias: obj.diligencias_eg1 || obj.diligencias || "",
        nConduccionesPos: obj.conduc_pos_eg1 || obj.nConduccionesPos || "",
        nConduccionesNeg: obj.conduc_neg_eg1 || obj.nConduccionesNeg || "",
        observaciones: obj.observaciones_eg1 || obj.observaciones || ""
    };
}
function normalizarFletado(obj) {
    return {
        nombre: obj.fletados_g1 || obj.nombre || "-",
        destino: obj.destino_flg1 || obj.destino || "-",
        pax: obj.pax_flg1 || obj.pax || 0,
        fecha: obj.fecha || "",
        observaciones: obj.observaciones_flg1 || obj.observaciones || ""
    };
}


// --- 5. RENDERIZADORES POR GRUPO: PROFESIONALES Y NARRATIVOS ---

function renderizarResumenGlobalHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-3 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span class="fs-6">Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;
    if (resumen.ucrif) html += renderizarResumenDetalladoUCRIF(resumen.ucrif);
    if (resumen.grupo1) html += renderizarResumenDetalladoGrupo1(resumen.grupo1);
    if (resumen.puerto) html += renderizarResumenDetalladoPuerto(resumen.puerto);
    if (resumen.cecorex) html += renderizarResumenDetalladoCecorex(resumen.cecorex);
    if (resumen.gestion) html += renderizarResumenDetalladoGestion(resumen.gestion);
    if (resumen.cie) html += renderizarResumenDetalladoCIE(resumen.cie);
    return html;
}

// ------------------- UCRIF (Narrativo) -------------------
function renderizarResumenDetalladoUCRIF(ucrif) {
    // LITERATURA ÉPICA DE CABECERA
    let html = `<div class="card border-info mb-4 shadow-sm">
    <div class="card-header bg-info text-white">
        <h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4>
    </div>
    <div class="card-body p-3">`;

    // Frase épica contextual
    html += `<div class="mb-2 fst-italic text-info-emphasis" style="font-size:1.1em;">
        "Resultados notables tras la intervención coordinada de los grupos UCRIF..."
    </div>`;

    // Totales generales
    html += `<p class="mb-2"><b>Totales:</b> 
        <span class="badge bg-info text-dark ms-2">${ucrif.detenidosILE} ILE</span> 
        <span class="badge bg-secondary ms-2">${ucrif.filiadosVarios} filiados</span> 
        <span class="badge bg-warning text-dark ms-2">${ucrif.traslados} traslados</span> 
        <span class="badge bg-primary ms-2">${ucrif.citadosCecorex} citados CECOREX</span>
    </p>`;

    // Inspecciones
    if (ucrif.inspecciones?.length) {
        html += `<h5 class="mt-3">Inspecciones en casas de citas y establecimientos</h5>
        <ul class="list-group mb-3">`;
        ucrif.inspecciones.forEach(ins => {
            let linea = [];
            if (ins.lugar) linea.push(`<b>${ins.lugar}</b>`);
            if (ins.tipo) linea.push(`(${ins.tipo})`);
            if (ins.identificadas) linea.push(`<b>${ins.identificadas}</b> filiadas`);
            if (ins.nacionalidades) linea.push(`(${ins.nacionalidades})`);
            if (ins.citadas) linea.push(`${ins.citadas} citadas`);
            if (ins.detenciones) linea.push(`${ins.detenciones} detenidas`);
            if (ins.incautaciones) linea.push(`Incautaciones: ${ins.incautaciones}`);
            if (ins.observaciones) linea.push(`<i>${ins.observaciones}</i>`);
            html += `<li class="list-group-item">${linea.join(' · ')}</li>`;
        });
        html += `</ul>`;
    }

    // Detenidos por delito (no ILE)
    if (ucrif.detenidosDelito?.length) {
        html += `<h5 class="mt-3">Detenidos por Delito</h5>
        <ul class="list-group mb-3">`;
        ucrif.detenidosDelito.forEach(det => {
            let linea = [];
            if (det.descripcion) linea.push(det.descripcion);
            if (det.motivo) linea.push(`<span class="text-danger">(${det.motivo})</span>`);
            if (det.observaciones) linea.push(`<i>${det.observaciones}</i>`);
            html += `<li class="list-group-item">${linea.join(' - ')}</li>`;
        });
        html += `</ul>`;
    }

    // Dispositivos y actuaciones especiales
    if (ucrif.dispositivos?.length) {
        html += `<h5 class="mt-3">Dispositivos Operativos Destacados</h5>
        <ul class="list-group mb-3">`;
        ucrif.dispositivos.forEach(act => {
            if (act) html += `<li class="list-group-item">${act}</li>`;
        });
        html += `</ul>`;
    }

    // Colaboraciones institucionales
    if (ucrif.colaboraciones?.length) {
        html += `<h5 class="mt-3">Colaboraciones institucionales</h5>
        <ul class="list-group mb-3">`;
        ucrif.colaboraciones.forEach(c => {
            if (c) html += `<li class="list-group-item">${typeof c === 'string' ? c : (c.colaboracionDesc || JSON.stringify(c))}</li>`;
        });
        html += `</ul>`;
    }

    // Observaciones
    if (ucrif.observaciones?.length) {
        html += `<h5 class="mt-3">Notas y Observaciones</h5>
        <ul class="list-group mb-3">`;
        ucrif.observaciones.forEach(o => {
            if (o) html += `<li class="list-group-item"><i>${o}</i></li>`;
        });
        html += `</ul>`;
    }

    // Cierre épico
    html += `<div class="mt-4 text-end fst-italic text-info">
        “Respuesta eficaz ante las amenazas detectadas.”
    </div>`;
    html += `</div></div>`;
    return html;
}


// ------------------- Grupo 1 Expulsiones (Narrativo) -------------------
function renderizarResumenDetalladoGrupo1(g1) {
    function clean(text) {
        if (text === undefined || text === null) return "";
        return ("" + text).trim();
    }
    function isNonEmptyDetenido(d) {
        return clean(d.numero) || clean(d.detenidos_g1) || clean(d.nombre);
    }
    function isNonEmptyExpulsado(e) {
        return clean(e.nombre) || clean(e.expulsados_g1);
    }
    function isNonEmptyFrustrada(f) {
        return clean(f.nombre) || clean(f.exp_frustradas_g1);
    }
    function isNonEmptyFletado(f) {
        return clean(f.destino) || clean(f.destino_flg1) || clean(f.pax) || clean(f.pax_flg1);
    }
    const detenidos = (g1.detenidos || g1.detenidos_g1 || []).filter(isNonEmptyDetenido);
    const expulsados = (g1.expulsados || g1.expulsados_g1 || []).filter(isNonEmptyExpulsado);
    const frustradas = (g1.frustradas || g1.exp_frustradas_g1 || []).filter(isNonEmptyFrustrada);
    const fletados = (g1.fletados || g1.fletados_g1 || []).filter(isNonEmptyFletado);

    let html = `<div class="card border-primary mb-4 shadow-sm">
    <div class="card-header bg-primary text-white"><h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4></div>
    <div class="card-body p-3">`;

    // Detenidos
    if (detenidos.length > 0) {
        html += `<h5>Detenidos (${detenidos.length})</h5><ul class="list-group mb-3">`;
        detenidos.forEach(d => {
            const nombre = clean(d.numero) || clean(d.detenidos_g1) || clean(d.nombre);
            const motivo = clean(d.motivo) || clean(d.motivo_g1);
            const nacionalidad = clean(d.nacionalidad) || clean(d.nacionalidad_g1);
            const diligencias = clean(d.diligencias) || clean(d.diligencias_g1);
            const observaciones = clean(d.observaciones) || clean(d.observaciones_g1);

            let linea = "";
            if (nombre) linea += `Nº <b>${nombre}</b>`;
            if (motivo) linea += ` — <b>${motivo}</b>`;
            if (nacionalidad) linea += ` (<b>${nacionalidad}</b>)`;
            if (diligencias) linea += ` · [${diligencias}]`;
            if (observaciones) linea += ` · ${observaciones}`;

            html += `<li class="list-group-item">${linea}</li>`;
        });
        html += `</ul>`;
    }

    // Expulsados
    if (expulsados.length > 0) {
        html += `<h5>Expulsados (${expulsados.length})</h5><ul class="list-group mb-3">`;
        expulsados.forEach(e => {
            const nombre = clean(e.nombre) || clean(e.expulsados_g1);
            const nacionalidad = clean(e.nacionalidad) || clean(e.nacionalidad_eg1);
            const diligencias = clean(e.diligencias) || clean(e.diligencias_eg1);
            const nConduccionesPos = clean(e.nConduccionesPos) || clean(e.conduc_pos_eg1);
            const nConduccionesNeg = clean(e.nConduccionesNeg) || clean(e.conduc_neg_eg1);
            const observaciones = clean(e.observaciones) || clean(e.observaciones_eg1);

            let linea = "";
            if (nombre) linea += `<b>${nombre}</b>`;
            if (nacionalidad) linea += ` (<b>${nacionalidad}</b>)`;
            if (diligencias) linea += ` · [${diligencias}]`;
            if (nConduccionesPos) linea += ` · Conducciones positivas: ${nConduccionesPos}`;
            if (nConduccionesNeg) linea += ` · Conducciones negativas: ${nConduccionesNeg}`;
            if (observaciones) linea += ` · ${observaciones}`;

            html += `<li class="list-group-item">${linea}</li>`;
        });
        html += `</ul>`;
    }

    // Frustradas
    if (frustradas.length > 0) {
        html += `<h5>Frustradas (${frustradas.length})</h5><ul class="list-group mb-3">`;
        frustradas.forEach(f => {
            const nombre = clean(f.nombre) || clean(f.exp_frustradas_g1);
            const nacionalidad = clean(f.nacionalidad) || clean(f.nacionalidad_fg1);
            const motivo = clean(f.motivo) || clean(f.motivo_fg1);
            const diligencias = clean(f.diligencias) || clean(f.diligencias_fg1);

            let linea = "";
            if (nombre) linea += `<b>${nombre}</b>`;
            if (nacionalidad) linea += ` (<b>${nacionalidad}</b>)`;
            if (motivo) linea += ` — Motivo: <b>${motivo}</b>`;
            if (diligencias) linea += ` · [${diligencias}]`;

            html += `<li class="list-group-item">${linea}</li>`;
        });
        html += `</ul>`;
    }

    // Fletados
    if (fletados.length > 0) {
        html += `<h5>Vuelos Fletados (${fletados.length})</h5><ul class="list-group mb-3">`;
        fletados.forEach(f => {
            const destino = clean(f.destino) || clean(f.destino_flg1);
            const pax = clean(f.pax) || clean(f.pax_flg1);
            const fecha = clean(f.fecha);
            const observaciones = clean(f.observaciones) || clean(f.observaciones_flg1);

            let linea = "";
            if (destino) linea += `<b>${destino}</b>`;
            if (pax) linea += ` — ${pax} pax`;
            if (fecha) linea += ` · ${formatoFecha(fecha)}`;
            if (observaciones) linea += ` · ${observaciones}`;

            html += `<li class="list-group-item">${linea}</li>`;
        });
        html += `</ul>`;
    }

    html += `</div></div>`;
    return html;
}

// ------------------- Puerto (Narrativo) -------------------
function renderizarResumenDetalladoPuerto(puerto) {
    let html = `<div class="card border-success mb-4 shadow-sm">
    <div class="card-header bg-success text-white"><h4>${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}</h4></div>
    <div class="card-body p-3">`;
    html += `<p><b>Total Marinos Controlados:</b> ${puerto.ctrlMarinos || 0}<br>`;
    html += `<b>Total Marinos Argos:</b> ${puerto.marinosArgos || 0}<br>`;
    html += `<b>Incidencias detectadas:</b> ${puerto.incidencias?.length || 0}</p>`;
    if (puerto.ferrys && puerto.ferrys.length > 0) {
        html += `<h5 class="mt-3">Ferrys controlados</h5><ul class="list-group">`;
        puerto.ferrys.forEach(f => {
            html += `<li class="list-group-item">
                Ferry: <b>${f.nombre || 'N/D'}</b> | Destino: ${f.destino || 'N/D'}<br>
                Pasajeros: ${f.pasajeros || 0}, Vehículos: ${f.vehiculos || 0}
                ${f.incidencias ? `<br><span class="text-danger">Incidencias: ${f.incidencias}</span>` : ""}
            </li>`;
        });
        html += `</ul>`;
    }
    if (puerto.incidencias && puerto.incidencias.length > 0) {
        html += `<h5 class="mt-3">Incidencias Relevantes</h5><ul class="list-group">`;
        puerto.incidencias.forEach(inc => {
            html += `<li class="list-group-item">${inc}</li>`;
        });
        html += `</ul>`;
    }
    html += `<div class="mt-3 text-muted"><i>Actividad portuaria controlada conforme a protocolo. Parte cerrado.</i></div>`;
    html += `</div></div>`;
    return html;
}

// ------------------- CECOREX (Narrativo) -------------------
function renderizarResumenDetalladoCecorex(cecorex) {
    let html = `<div class="card border-warning mb-4 shadow-sm">
    <div class="card-header bg-warning text-dark"><h4>${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}</h4></div>
    <div class="card-body p-3">`;
    html += `<p><b>Gestiones realizadas:</b> ${cecorex.gestiones?.length || 0}<br>`;
    html += `<b>Incidencias registradas:</b> ${cecorex.incidencias?.length || 0}<br>`;
    html += `<b>Detenidos gestionados:</b> ${cecorex.detenidos || 0}</p>`;
    if (cecorex.gestiones && cecorex.gestiones.length > 0) {
        html += `<h5 class="mt-3">Gestiones destacadas</h5><ul class="list-group">`;
        cecorex.gestiones.forEach(g => {
            html += `<li class="list-group-item">${g.gestion || g}</li>`;
        });
        html += `</ul>`;
    }
    if (cecorex.incidencias && cecorex.incidencias.length > 0) {
        html += `<h5 class="mt-3">Incidencias</h5><ul class="list-group">`;
        cecorex.incidencias.forEach(inc => {
            html += `<li class="list-group-item">${inc}</li>`;
        });
        html += `</ul>`;
    }
    html += `<div class="mt-3 text-muted"><i>Parte cerrado.</i></div>`;
    html += `</div></div>`;
    return html;
}

// ------------------- Gestión (Ficha rápida) -------------------
function renderizarResumenDetalladoGestion(gestion) {
    let html = `<div class="card border-secondary mb-4 shadow-sm">
    <div class="card-header bg-secondary text-white"><h4>${GRUPOS_CONFIG.gestion.icon} ${GRUPOS_CONFIG.gestion.label}</h4></div>
    <div class="card-body p-3">`;
    html += `<ul class="list-group">`;
    Object.keys(gestion).forEach(k => {
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">
            ${k.replace(/_/g, " ")}<span class="badge bg-secondary rounded-pill">${gestion[k]}</span>
        </li>`;
    });
    html += `</ul></div></div>`;
    return html;
}

// ------------------- CIE (Ficha rápida) -------------------
function renderizarResumenDetalladoCIE(cie) {
    let html = `<div class="card border-danger mb-4 shadow-sm">
    <div class="card-header bg-danger text-white"><h4>${GRUPOS_CONFIG.cie.icon} ${GRUPOS_CONFIG.cie.label}</h4></div>
    <div class="card-body p-3">`;
    html += `<ul class="list-group">`;
    Object.keys(cie).forEach(k => {
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">
            ${k.replace(/_/g, " ")}<span class="badge bg-danger rounded-pill">${cie[k]}</span>
        </li>`;
    });
    html += `</ul></div></div>`;
    return html;
}

// --- 6. EXPORTACIÓN WHATSAPP/PDF: BLOQUE GLOBAL (¡Narrativo y completo!) ---
// (Aquí puedes replicar la lógica avanzada que ya tienes para WhatsApp y PDF, usando estos bloques narrativos.)

// ...Aquí iría el bloque WhatsApp/PDF, igual que el de tu archivo consulta(3).js...
// Si necesitas que también te lo pase, dímelo.

// ====================== 6. EXPORTACIÓN WHATSAPP/PDF: COMPLETO ======================

// ------ BOTÓN EXPORTAR A WHATSAPP ------
document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const msg = generarTextoWhatsappNarrativo(resumen, desde, hasta);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
});

// ------ FUNCIÓN: GENERA TEXTO NARRATIVO MULTIGRUPO PARA WHATSAPP ------
function generarTextoWhatsappNarrativo(resumen, desde, hasta) {
    let out = `*🇪🇸 SIREX Resumen Operativo*\n*Periodo:* ${desde} al ${hasta}\n`;

    // UCRIF
    if (resumen.ucrif) {
        const u = resumen.ucrif;
        out += `\n*${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}*\n`;
        out += `Detenidos ILE: *${u.detenidosILE}*, Filiados: *${u.filiadosVarios}*, Traslados: *${u.traslados}*, Citados CECOREX: *${u.citadosCecorex}*\n`;
        if (u.inspecciones.length > 0) {
            out += `\n*Inspecciones*\n`;
            u.inspecciones.forEach(i => {
                out += `• ${i.lugar || 'Lugar no especificado'}: ${i.identificadas || 0} filiadas (${i.nacionalidades || 'N/A'}), ${i.citadas || 0} citadas.\n`;
            });
        }
        if (u.detenidosDelito.length > 0) {
            out += `\n*Detenidos por Delito*\n`;
            u.detenidosDelito.forEach(d => {
                out += `• ${d.descripcion} por ${d.motivo}\n`;
            });
        }
        if (u.colaboraciones.length > 0) {
            out += `\n*Colaboraciones*\n`;
            u.colaboraciones.forEach(c => {
                out += `• ${typeof c === 'string' ? c : (c.colaboracionDesc || 'N/A')}\n`;
            });
        }
    }

    // GRUPO 1 (EXPULSIONES)
    if (resumen.grupo1) {
    const g1 = resumen.grupo1;
    out += `\n*${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}*\n`;
    if (g1.detenidos && g1.detenidos.length > 0) {
        out += `Detenidos (${g1.detenidos.length}):\n`;
        g1.detenidos.forEach(d => {
            const det = normalizarDetenido(d);
            out += `• ${det.nombre} (${det.nacionalidad}) por ${det.motivo}\n`;
        });
    }
    if (g1.expulsados && g1.expulsados.length > 0) {
        out += `Expulsados (${g1.expulsados.length}):\n`;
        g1.expulsados.forEach(e => {
            const exp = normalizarExpulsado(e);
            out += `• ${exp.nombre} (${exp.nacionalidad})\n`;
        });
    }
    if (g1.frustradas && g1.frustradas.length > 0) {
        out += `Frustradas (${g1.frustradas.length}):\n`;
        g1.frustradas.forEach(f => {
            const fru = normalizarFrustrada(f);
            out += `• ${fru.nombre} (${fru.nacionalidad}) - Motivo: ${fru.motivo}\n`;
        });
    }
    if (g1.fletados && g1.fletados.length > 0) {
        out += `Vuelos Fletados:\n`;
        g1.fletados.forEach(f => {
            const fle = normalizarFletado(f);
            out += `• ${fle.destino} — ${fle.pax || 0} pax${fle.fecha ? " · " + formatoFecha(fle.fecha) : ""}\n`;
        });
    }
}

    // PUERTO
    if (resumen.puerto) {
        const p = resumen.puerto;
        out += `\n*${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}*\n`;
        out += `Marinos controlados: ${p.ctrlMarinos || 0}, Marinos Argos: ${p.marinosArgos || 0}, Incidencias: ${p.incidencias?.length || 0}\n`;
        if (p.ferrys && p.ferrys.length > 0) {
            out += `Ferrys:\n`;
            p.ferrys.forEach(f => {
                out += `• Ferry: ${f.nombre || 'N/D'}, Destino: ${f.destino || 'N/D'}, Pasajeros: ${f.pasajeros || 0}, Vehículos: ${f.vehiculos || 0}`;
                if (f.incidencias) out += `, Incidencias: ${f.incidencias}`;
                out += `\n`;
            });
        }
        if (p.incidencias && p.incidencias.length > 0) {
            out += `Incidencias:\n`;
            p.incidencias.forEach(inc => out += `• ${inc}\n`);
        }
    }

    // CECOREX
    if (resumen.cecorex) {
        const c = resumen.cecorex;
        out += `\n*${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}*\n`;
        out += `Gestiones: ${c.gestiones?.length || 0}, Incidencias: ${c.incidencias?.length || 0}, Detenidos: ${c.detenidos || 0}\n`;
        if (c.gestiones && c.gestiones.length > 0) {
            out += `Gestiones destacadas:\n`;
            c.gestiones.forEach(g => out += `• ${g.gestion || g}\n`);
        }
        if (c.incidencias && c.incidencias.length > 0) {
            out += `Incidencias:\n`;
            c.incidencias.forEach(inc => out += `• ${inc}\n`);
        }
    }

    // GESTIÓN
    if (resumen.gestion && Object.keys(resumen.gestion).length > 0) {
        out += `\n*${GRUPOS_CONFIG.gestion.icon} ${GRUPOS_CONFIG.gestion.label}*\n`;
        Object.keys(resumen.gestion).forEach(k => {
            out += `• ${k.replace(/_/g, " ")}: ${resumen.gestion[k]}\n`;
        });
    }

    // CIE
    if (resumen.cie && Object.keys(resumen.cie).length > 0) {
        out += `\n*${GRUPOS_CONFIG.cie.icon} ${GRUPOS_CONFIG.cie.label}*\n`;
        Object.keys(resumen.cie).forEach(k => {
            out += `• ${k.replace(/_/g, " ")}: ${resumen.cie[k]}\n`;
        });
    }

    out += `\n_Parte cerrado SIREX._`;
    return out;
}

// ------ BOTÓN EXPORTAR A PDF ------
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");

    const { resumen, desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let finalY = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SIREX - Resumen Operativo Global", doc.internal.pageSize.getWidth() / 2, finalY, { align: "center" });
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodo: ${desde} al ${hasta}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: "center" });
    finalY += 12;

    // UCRIF
    if (resumen.ucrif) {
        const u = resumen.ucrif;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}`, 14, finalY);
        finalY += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Detenidos ILE: ${u.detenidosILE}, Filiados: ${u.filiadosVarios}, Traslados: ${u.traslados}, Citados CECOREX: ${u.citadosCecorex}`, 14, finalY);
        finalY += 6;
        if (u.inspecciones.length > 0) {
            doc.text("Inspecciones:", 14, finalY); finalY += 5;
            u.inspecciones.forEach(i => {
                doc.text(`- ${i.lugar || 'Lugar no especificado'}: ${i.identificadas || 0} filiadas (${i.nacionalidades || 'N/A'}), ${i.citadas || 0} citadas.`, 16, finalY);
                finalY += 5;
            });
        }
        if (u.detenidosDelito.length > 0) {
            doc.text("Detenidos por Delito:", 14, finalY); finalY += 5;
            u.detenidosDelito.forEach(d => {
                doc.text(`- ${d.descripcion} por ${d.motivo}`, 16, finalY);
                finalY += 5;
            });
        }
        if (u.colaboraciones.length > 0) {
            doc.text("Colaboraciones:", 14, finalY); finalY += 5;
            u.colaboraciones.forEach(c => {
                doc.text(`- ${typeof c === 'string' ? c : (c.colaboracionDesc || 'N/A')}`, 16, finalY);
                finalY += 5;
            });
        }
        finalY += 8;
    }

    // GRUPO 1
    if (resumen.grupo1) {
    const g1 = resumen.grupo1;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}`, 14, finalY);
    finalY += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (g1.detenidos && g1.detenidos.length > 0) {
        doc.text(`Detenidos (${g1.detenidos.length}):`, 14, finalY); finalY += 5;
        g1.detenidos.forEach(d => {
            const det = normalizarDetenido(d);
            doc.text(`- ${det.nombre} (${det.nacionalidad}) por ${det.motivo}`, 16, finalY);
            finalY += 5;
        });
    }
    if (g1.expulsados && g1.expulsados.length > 0) {
        doc.text(`Expulsados (${g1.expulsados.length}):`, 14, finalY); finalY += 5;
        g1.expulsados.forEach(e => {
            const exp = normalizarExpulsado(e);
            doc.text(`- ${exp.nombre} (${exp.nacionalidad})`, 16, finalY);
            finalY += 5;
        });
    }
    if (g1.frustradas && g1.frustradas.length > 0) {
        doc.text(`Frustradas (${g1.frustradas.length}):`, 14, finalY); finalY += 5;
        g1.frustradas.forEach(f => {
            const fru = normalizarFrustrada(f);
            doc.text(`- ${fru.nombre} (${fru.nacionalidad}) - Motivo: ${fru.motivo}`, 16, finalY);
            finalY += 5;
        });
    }
    if (g1.fletados && g1.fletados.length > 0) {
        doc.text("Vuelos Fletados:", 14, finalY); finalY += 5;
        g1.fletados.forEach(f => {
            const fle = normalizarFletado(f);
            doc.text(`- ${fle.destino} — ${fle.pax || 0} pax${fle.fecha ? " · " + formatoFecha(fle.fecha) : ""}`, 16, finalY);
            finalY += 5;
        });
    }
    finalY += 8;
}


    // PUERTO
    if (resumen.puerto) {
        const p = resumen.puerto;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}`, 14, finalY);
        finalY += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Marinos controlados: ${p.ctrlMarinos || 0}, Marinos Argos: ${p.marinosArgos || 0}, Incidencias: ${p.incidencias?.length || 0}`, 14, finalY);
        finalY += 6;
        if (p.ferrys && p.ferrys.length > 0) {
            doc.text("Ferrys:", 14, finalY); finalY += 5;
            p.ferrys.forEach(f => {
                doc.text(`- Ferry: ${f.nombre || 'N/D'}, Destino: ${f.destino || 'N/D'}, Pasajeros: ${f.pasajeros || 0}, Vehículos: ${f.vehiculos || 0}${f.incidencias ? ', Incidencias: ' + f.incidencias : ''}`, 16, finalY);
                finalY += 5;
            });
        }
        if (p.incidencias && p.incidencias.length > 0) {
            doc.text("Incidencias:", 14, finalY); finalY += 5;
            p.incidencias.forEach(inc => {
                doc.text(`- ${inc}`, 16, finalY);
                finalY += 5;
            });
        }
        finalY += 8;
    }

    // CECOREX
    if (resumen.cecorex) {
        const c = resumen.cecorex;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}`, 14, finalY);
        finalY += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Gestiones: ${c.gestiones?.length || 0}, Incidencias: ${c.incidencias?.length || 0}, Detenidos: ${c.detenidos || 0}`, 14, finalY);
        finalY += 6;
        if (c.gestiones && c.gestiones.length > 0) {
            doc.text("Gestiones destacadas:", 14, finalY); finalY += 5;
            c.gestiones.forEach(g => {
                doc.text(`- ${g.gestion || g}`, 16, finalY);
                finalY += 5;
            });
        }
        if (c.incidencias && c.incidencias.length > 0) {
            doc.text("Incidencias:", 14, finalY); finalY += 5;
            c.incidencias.forEach(inc => {
                doc.text(`- ${inc}`, 16, finalY);
                finalY += 5;
            });
        }
        finalY += 8;
    }

    // GESTIÓN
    if (resumen.gestion && Object.keys(resumen.gestion).length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.gestion.icon} ${GRUPOS_CONFIG.gestion.label}`, 14, finalY);
        finalY += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        Object.keys(resumen.gestion).forEach(k => {
            doc.text(`- ${k.replace(/_/g, " ")}: ${resumen.gestion[k]}`, 16, finalY);
            finalY += 5;
        });
        finalY += 8;
    }

    // CIE
    if (resumen.cie && Object.keys(resumen.cie).length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.cie.icon} ${GRUPOS_CONFIG.cie.label}`, 14, finalY);
        finalY += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        Object.keys(resumen.cie).forEach(k => {
            doc.text(`- ${k.replace(/_/g, " ")}: ${resumen.cie[k]}`, 16, finalY);
            finalY += 5;
        });
        finalY += 8;
    }

      doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});
