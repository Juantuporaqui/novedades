// SIREX · Consulta Global / Resúmenes (Versión Pro 2025 – Visual y Jugoso Todos Grupos)

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
    authDomain: "ucrif-5bb75.firebaseapp.com",
    projectId: "ucrif-5bb75",
    storageBucket: "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldPath = firebase.firestore.FieldPath;

// --- ELEMENTOS DOM ---
const form = document.getElementById('consultaForm');
const spinner = document.getElementById('spinner');
const resumenVentana = document.getElementById('resumenVentana');
const exportBtns = document.getElementById('exportBtns');

// --- ETIQUETAS E ICONOS DE GRUPOS ---
const GRUPOS_CONFIG = {
    ucrif: { label: 'UCRIF (Grupos 2, 3 y 4)', icon: '🛡️', color: 'info' },
    grupo1: { label: 'Expulsiones', icon: '🚔', color: 'primary' },
    puerto: { label: 'Puerto', icon: '⚓', color: 'success' },
    cecorex: { label: 'CECOREX', icon: '📡', color: 'warning' },
    gestion: { label: 'Gestión', icon: '📋', color: 'secondary' },
    cie: { label: 'CIE', icon: '🏢', color: 'danger' }
};

// ======================= AGRUPADORES & FORMATEADORES POR GRUPO =======================

// -------- UCRIF (Grupos 2,3,4) --------
function agruparResumenUCRIF(ucrifData) {
    const tipologias = {};
    const nacionalidadesTotales = {};
    let totalInspecciones = 0, totalFiliados = 0, totalCitados = 0;
    let totalDetenidosILE = ucrifData.detenidosILE || 0;
    let totalFiliadosVarios = ucrifData.filiadosVarios || 0;
    let totalTraslados = ucrifData.traslados || 0;
    let totalCitadosCecorex = ucrifData.citadosCecorex || 0;

    function clasificarTipo(lugar) {
        if (!lugar) return "Otros";
        lugar = lugar.toLowerCase();
        if (/(cita|escort|prost|put|piso)/.test(lugar)) return "Casas de citas";
        if (/masaj/.test(lugar)) return "Salones de masaje";
        if (/estaci[óo]n|autob[úu]s|ave|metro/.test(lugar)) return "Estaciones / Transporte";
        if (/mendicidad/.test(lugar)) return "Mendicidad";
        if (/textil|empresa/.test(lugar)) return "Empresa textil";
        if (/puerto|maritima/.test(lugar)) return "Puerto";
        return "Otros";
    }
    if (ucrifData.inspeccionesCasasCitas) {
        ucrifData.inspeccionesCasasCitas.forEach(insp => {
            const tipo = clasificarTipo(insp.lugar);
            if (!tipologias[tipo]) tipologias[tipo] = { inspecciones: 0, filiados: 0, citados: 0, locales: [] };
            tipologias[tipo].inspecciones++;
            tipologias[tipo].filiados += insp.filiadas || 0;
            tipologias[tipo].citados += insp.citadas || 0;
            totalInspecciones++;
            totalFiliados += insp.filiadas || 0;
            totalCitados += insp.citadas || 0;
            if (insp.nacionalidades) {
                insp.nacionalidades.split(/[ ,;]+/).map(x=>x.trim()).filter(Boolean).forEach(nac=>{
                    nacionalidadesTotales[nac] = (nacionalidadesTotales[nac]||0)+1;
                });
            }
            tipologias[tipo].locales.push({
                lugar: insp.lugar,
                filiados: insp.filiadas,
                citados: insp.citadas,
                nacionalidades: insp.nacionalidades
            });
        });
    }
    const detenidosPorDelito = {};
    if (ucrifData.detenidosDelito && ucrifData.detenidosDelito.length) {
        for (const d of ucrifData.detenidosDelito) {
            const motivo = (d.motivo || "Delito no especificado").toLowerCase();
            if (!detenidosPorDelito[motivo]) detenidosPorDelito[motivo] = [];
            detenidosPorDelito[motivo].push(d.descripcion);
        }
    }
    return {
        tipologias, nacionalidadesTotales, totalInspecciones, totalFiliados,
        totalCitados, totalDetenidosILE, totalFiliadosVarios, totalTraslados, totalCitadosCecorex,
        detenidosPorDelito
    };
}

// -------- EXPULSIONES (GRUPO 1) --------
function agruparResumenGrupo1(g1) {
    let expulsados = g1.expulsados || 0;
    let frustradas = g1.frustradas || 0;
    let detenidos = g1.detenidos || 0;
    let motivosFrustradas = g1.motivos_frustradas || [];
    let fletados = g1.fletados || [];
    return { expulsados, frustradas, detenidos, motivosFrustradas, fletados };
}

// -------- PUERTO --------
function agruparResumenPuerto(puerto) {
    let denegaciones = puerto.denegaciones || 0;
    let detenidos = puerto.detenidos || 0;
    let cruceristas = puerto.cruceristas || 0;
    let incidencias = puerto.incidencias || [];
    return { denegaciones, detenidos, cruceristas, incidencias };
}

// -------- CECOREX --------
function agruparResumenCecorex(cc) {
    let detenidos = cc.detenidos || 0;
    let decretosExp = cc.decretos_exp || 0;
    let asistLetrada = cc.asist_letrada || 0;
    let prohEntrada = cc.proh_entrada || 0;
    let menas = cc.menas || 0;
    return { detenidos, decretosExp, asistLetrada, prohEntrada, menas };
}

// -------- GESTIÓN Y CIE --------
function agruparResumenBasico(grupo) {
    return grupo || {};
}

// =========== NUEVA FUNCIÓN DE TABLA MULTICOLUMNA (puedes añadirla tras los agrupadores) ===========
function renderizarTablaMulticolumna(obj, columnas = 2, colTitles = []) {
    const keys = Object.keys(obj).filter(k => obj[k] !== 0 && obj[k] !== "" && obj[k] !== null && obj[k] !== "N/D");
    if (!keys.length) return "<div class='text-muted'>Sin datos.</div>";
    let html = `<div class="row">`;
    const perCol = Math.ceil(keys.length / columnas);
    for (let c = 0; c < columnas; c++) {
        html += `<div class="col-md-${12/columnas}"><ul class="list-group">`;
        for (let i = c*perCol; i < (c+1)*perCol && i < keys.length; i++) {
            const k = keys[i], t = colTitles[i] || k;
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${t}</span><span class="fw-bold">${obj[k]}</span>
            </li>`;
        }
        html += `</ul></div>`;
    }
    html += `</div>`;
    return html;
}

// ======================= RENDERIZADORES HTML/PDF AVANZADOS =======================

function renderizarResumenGlobalHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-2 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span>Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;

    // UCRIF
    html += renderizarResumenDetalladoUCRIF(resumen, desde, hasta);

    // GRUPO 1
    html += renderizarResumenDetalladoGrupo1(resumen, desde, hasta);

    // PUERTO
    html += renderizarResumenDetalladoPuerto(resumen, desde, hasta);

    // CECOREX
    html += renderizarResumenDetalladoCecorex(resumen, desde, hasta);

    // GESTIÓN
    html += renderizarResumenDetalladoBasico(resumen, 'gestion');

    // CIE
    html += renderizarResumenDetalladoBasico(resumen, 'cie');

    return html;
}

function renderizarResumenDetalladoUCRIF(resumen, desde, hasta) {
    const ucrif = resumen.ucrif;
    if (!ucrif) return "";
    const ag = agruparResumenUCRIF(ucrif);
    // --- Resumen narrativo profesional ---
    let html = `<div class="card border-info mb-4 shadow">
    <div class="card-header bg-info text-white text-center">
      <h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4>
      <div>
        <b>${ag.totalInspecciones} inspecciones</b> · 
        <b>${ag.totalFiliados} filiados/as</b> · 
        <b>${ag.totalDetenidosILE} ILE</b> · 
        <b>${ag.totalCitadosCecorex} citados CECOREX</b>
      </div>
    </div>
    <div class="card-body p-3">
    <div class="alert alert-info mb-3">
        <b>Balance Operativo UCRIF (${desde} a ${hasta})</b><br>
        Se realizaron <b>${ag.totalInspecciones}</b> inspecciones (casas de citas, salones de masaje, estaciones de transporte, empresas textiles y otros ámbitos), identificando a <b>${ag.totalFiliados}</b> personas y citando a <b>${ag.totalCitadosCecorex}</b> para CECOREX. Se priorizó la detección de víctimas, la lucha contra delitos de extranjería y trata, y se articularon dispositivos especiales según necesidades operativas.
    </div>
    <ul>`;
    for (const tipo in ag.tipologias) {
        const t = ag.tipologias[tipo];
        html += `<li><b>${tipo}:</b> ${t.inspecciones} inspecciones`;
        if (t.filiados) html += `, ${t.filiados} filiados`;
        if (t.citados) html += `, ${t.citados} citados CECOREX`;
        if (t.locales.length > 0) {
            html += `<ul>`;
            t.locales.forEach(l => {
                html += `<li>${l.lugar || tipo}: `;
                if (l.filiados) html += `${l.filiados} filiados`;
                if (l.nacionalidades) html += ` (${l.nacionalidades})`;
                if (l.citados) html += `, ${l.citados} citados`;
                html += `</li>`;
            });
            html += `</ul>`;
        }
        html += `</li>`;
    }
    html += `</ul>`;
    // Nacionalidades
    if (Object.keys(ag.nacionalidadesTotales).length) {
        html += `<div class="mb-2"><b>Nacionalidades filiadas:</b> `;
        html += Object.entries(ag.nacionalidadesTotales).map(([nac, num]) => `<span class="badge bg-secondary me-1">${nac}: ${num}</span>`).join(' ');
        html += "</div>";
    }
    // Detenidos
    if (Object.keys(ag.detenidosPorDelito).length || ag.totalDetenidosILE) {
        html += `<div class="alert alert-danger mt-3 p-2"><b>Detenidos:</b><ul>`;
        if (ag.totalDetenidosILE)
            html += `<li><b>${ag.totalDetenidosILE}</b> por infracción a la Ley de Extranjería (ILE).</li>`;
        Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
            html += `<li><b>${lista.length}</b> por ${delito}:
                <ul>${lista.map(desc=>`<li>${desc}</li>`).join('')}</ul></li>`;
        });
        html += "</ul></div>";
    }
    // Hechos destacados
    html += `<div class="alert alert-warning mt-3 p-2"><b>Hechos destacados:</b><ul>
        <li>Colaboración eficaz con CECOREX en entrevistas a posibles víctimas.</li>
        <li>Dispositivo RAILPOL: 3 detenidos ILE, 28 identificados, 3 traslados y 5 citaciones CECOREX.</li>
        <li>En la casa de C/ Pinazos: posible víctima de trata trasladada a CECOREX.</li>
    </ul></div>`;
    html += `<div class="alert alert-primary text-center mt-3 p-2"><b>RESUMEN:</b> ${ag.totalInspecciones} inspecciones, ${ag.totalFiliados} filiados/as, ${ag.totalCitadosCecorex} citados CECOREX, ${ag.totalDetenidosILE + Object.values(ag.detenidosPorDelito).reduce((s, l) => s + l.length, 0)} detenidos</div>
    </div></div>`;
    return html;
}

function renderizarResumenDetalladoGrupo1(resumen, desde, hasta) {
    const g1 = resumen.grupo1;
    if (!g1) return "";
    const ag = agruparResumenGrupo1(g1);
    let html = `<div class="card border-primary mb-4 shadow">
    <div class="card-header bg-primary text-white text-center">
      <h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4>
    </div>
    <div class="card-body p-3">
      <ul class="list-group mb-2">
        <li class="list-group-item"><b>Expulsados OK:</b> ${ag.expulsados}</li>
        <li class="list-group-item"><b>Expulsiones frustradas:</b> ${ag.frustradas} ${ag.motivosFrustradas.length ? `<br><small>Motivos: ${[...new Set(ag.motivosFrustradas)].join(', ')}</small>` : ""}</li>
        <li class="list-group-item"><b>Detenidos:</b> ${ag.detenidos}</li>
        ${ag.fletados.length ? `<li class="list-group-item"><b>Vuelos Fletados:</b> ${ag.fletados.join(', ')}</li>` : ""}
      </ul>
      <div class="alert alert-primary text-center"><b>TOTAL EXPULSIONES:</b> ${ag.expulsados} OK · ${ag.frustradas} KO · ${ag.detenidos} detenidos</div>
    </div></div>`;
    return html;
}

function renderizarResumenDetalladoPuerto(resumen, desde, hasta) {
    const puerto = resumen.puerto;
    if (!puerto) return "";
    const ag = agruparResumenPuerto(puerto);
    let html = `<div class="card border-success mb-4 shadow">
    <div class="card-header bg-success text-white text-center">
      <h4>${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(ag, 3, ['Denegaciones', 'Detenidos', 'Cruceristas', 'Incidencias'])}
      ${ag.incidencias && ag.incidencias.length ? `
        <div class="alert alert-warning mt-2 p-2"><b>Incidencias detalladas:</b>
        <ul>${ag.incidencias.map(x=>`<li>${x}</li>`).join('')}</ul></div>` : ''}
      <div class="alert alert-success text-center mt-3"><b>TOTAL PUERTO:</b> ${ag.denegaciones} denegaciones · ${ag.detenidos} detenidos · ${ag.cruceristas} cruceristas</div>
    </div></div>`;
    return html;
}

function renderizarResumenDetalladoCecorex(resumen, desde, hasta) {
    const cc = resumen.cecorex;
    if (!cc) return "";
    const ag = agruparResumenCecorex(cc);
    let html = `<div class="card border-warning mb-4 shadow">
    <div class="card-header bg-warning text-dark text-center">
      <h4>${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(ag, 3, [
        'Detenidos','Decretos expulsión','Asistencias letradas',
        'Prohibiciones de entrada','MENAS gestionados'
      ])}
      <div class="alert alert-warning text-center mt-3"><b>TOTAL CECOREX:</b> ${ag.detenidos} detenidos · ${ag.decretosExp} decretos · ${ag.asistLetrada} asistencias letradas · ${ag.prohEntrada} prohib. entrada · ${ag.menas} MENAS</div>
    </div></div>`;
    return html;
}
function renderizarResumenDetalladoBasico(resumen, grupoId) {
    const config = GRUPOS_CONFIG[grupoId];
    const datos = resumen[grupoId];
    if (!datos || !Object.keys(datos).length) return "";
    let html = `<div class="card border-${config.color} mb-4 shadow">
    <div class="card-header bg-${config.color} text-white text-center">
      <h4>${config.icon} ${config.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(datos, 2)}
    </div></div>`;
    return html;
}

// ======================= GENERADOR RESUMEN WHATSAPP AVANZADO =======================

function generarTextoWhatsappUCRIF(resumen, desde, hasta) {
    const ucrif = resumen.ucrif;
    if (!ucrif) return "No hay datos UCRIF para el periodo.";
    const ag = agruparResumenUCRIF(ucrif);
    let msg = `*🛡️ NOVEDADES UCRIF* (${desde} a ${hasta})\n\n`;

    msg += `*${ag.totalDetenidosILE}* detenidos ILE · *${ag.totalFiliados}* filiados · *${ag.totalCitadosCecorex}* citados CECOREX\n`;
    Object.keys(ag.tipologias).forEach(tipo => {
        const t = ag.tipologias[tipo];
        msg += `\n*${t.inspecciones}* ${tipo.toUpperCase()}:\n`;
        t.locales.forEach(l => {
            msg += `- ${l.lugar}: ${l.filiados} filiadas${l.nacionalidades ? ` (${l.nacionalidades})` : ''}${l.citados ? `, ${l.citados} citadas` : ''}\n`;
        });
        msg += `  _Total:_ ${t.inspecciones} inspecciones, ${t.filiados} filiados${t.citados ? `, ${t.citados} citados` : ""}\n`;
    });
    if (Object.keys(ag.nacionalidadesTotales).length) {
        msg += `\n*Nacionalidades Filiados/as:*\n`;
        Object.entries(ag.nacionalidadesTotales).forEach(([nac, num]) => {
            msg += `- ${nac}: ${num}\n`;
        });
    }
    if (Object.keys(ag.detenidosPorDelito).length) {
        msg += `\n*Detenidos por Delito:*\n`;
        Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
            msg += `- ${lista.length} por ${delito}:\n`;
            lista.forEach(desc => { msg += `  • ${desc}\n`; });
        });
    }
    msg += `\n*TOTAL UCRIF*: ${ag.totalInspecciones} inspecciones, ${ag.totalFiliados} filiados, ${ag.totalCitadosCecorex} citados CECOREX, ${ag.totalDetenidosILE} detenidos ILE\n`;
    return msg;
}

function generarTextoWhatsappGrupo1(resumen) {
    const g1 = resumen.grupo1;
    if (!g1) return "";
    const ag = agruparResumenGrupo1(g1);
    let msg = `*🚔 EXPULSIONES*\n`;
    msg += `- Expulsados OK: *${ag.expulsados}*\n- Expulsiones frustradas: *${ag.frustradas}*\n- Detenidos: *${ag.detenidos}*\n`;
    if (ag.motivosFrustradas.length) msg += `- Motivos KO: ${[...new Set(ag.motivosFrustradas)].join(', ')}\n`;
    if (ag.fletados.length) msg += `- Vuelos Fletados: ${ag.fletados.join(', ')}\n`;
    return msg;
}

function generarTextoWhatsappPuerto(resumen) {
    const puerto = resumen.puerto;
    if (!puerto) return "";
    const ag = agruparResumenPuerto(puerto);
    let msg = `*⚓ PUERTO*\n- Denegaciones: *${ag.denegaciones}*\n- Detenidos: *${ag.detenidos}*\n- Cruceristas: *${ag.cruceristas}*\n`;
    if (ag.incidencias.length) msg += `- Incidencias: ${ag.incidencias.join(', ')}\n`;
    return msg;
}

function generarTextoWhatsappCecorex(resumen) {
    const cc = resumen.cecorex;
    if (!cc) return "";
    const ag = agruparResumenCecorex(cc);
    let msg = `*📡 CECOREX*\n- Detenidos: *${ag.detenidos}*\n- Decretos expulsión: *${ag.decretosExp}*\n- Asistencias letradas: *${ag.asistLetrada}*\n- Prohibiciones de entrada: *${ag.prohEntrada}*\n- MENAS gestionados: *${ag.menas}*\n`;
    return msg;
}

function generarTextoWhatsappBasico(resumen, grupoId) {
    const config = GRUPOS_CONFIG[grupoId];
    const datos = resumen[grupoId];
    if (!datos) return "";
    let msg = `*${config.icon} ${config.label}*\n`;
    Object.entries(datos).forEach(([k,v]) => {
        if (v !== 0 && v !== "" && v !== null && v !== "N/D") {
            msg += `- ${k}: *${v}*\n`;
        }
    });
    return msg;
}

function generarTextoWhatsappGlobal(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX RESUMEN GLOBAL*\n*Periodo:* ${desde} a ${hasta}\n\n`;
    msg += generarTextoWhatsappUCRIF(resumen, desde, hasta) + "\n";
    msg += generarTextoWhatsappGrupo1(resumen) + "\n";
    msg += generarTextoWhatsappPuerto(resumen) + "\n";
    msg += generarTextoWhatsappCecorex(resumen) + "\n";
    msg += generarTextoWhatsappBasico(resumen, 'gestion') + "\n";
    msg += generarTextoWhatsappBasico(resumen, 'cie');
    return msg;
}

// ======================= CONSULTA PRINCIPAL Y EVENTOS =======================

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
            gestion: QUERY_STRATEGIES.getGestion(desde, hasta),
            cie: QUERY_STRATEGIES.getCIE(desde, hasta),
        };
        const resultados = await Promise.all(Object.values(promesas));
        const resumen = Object.keys(promesas).reduce((acc, key, index) => {
            acc[key] = resultados[index];
            return acc;
        }, {});
        window._ultimoResumen = { resumen, desde, hasta };
        resumenVentana.innerHTML = renderizarResumenGlobalHTML(resumen, desde, hasta);
        exportBtns.classList.remove('d-none');
    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally {
        spinner.classList.add('d-none');
    }
});

document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const msg = generarTextoWhatsappGlobal(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const sourceHTML = renderizarResumenGlobalHTML(resumen, desde, hasta);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sourceHTML;
    document.body.appendChild(tempDiv);
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    doc.html(tempDiv, {
        callback: function (doc) {
            doc.save(`SIREX-Resumen_${desde}_a_${hasta}.pdf`);
            document.body.removeChild(tempDiv);
        },
        x: 15, y: 15, width: 550, windowWidth: tempDiv.scrollWidth
    });
});

// =================== ESTRATEGIAS DE CONSULTA DETALLADA (NO MODIFICADAS) ===================

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
            inspeccionesCasasCitas: [], detenidosDelito: []
        };
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');
        rawData.forEach(data => {
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
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
            if (data.inspecciones) {
                data.inspecciones.forEach(insp => {
                    resultado.inspeccionesCasasCitas.push({
                        lugar: insp.lugar || "Lugar no especificado", filiadas: Number(insp.identificadas) || 0,
                        citadas: Number(insp.citadas) || 0, nacionalidades: insp.nacionalidades || ""
                    });
                });
            }
        });
        return resultado;
    },

    getGrupo1Detalles: async (desde, hasta) => {
        const snap = await db.collection('grupo1_expulsiones').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const res = { detenidos: 0, expulsados: 0, frustradas: 0, fletados: [], motivos_frustradas: [] };
        snap.forEach(doc => {
            const data = doc.data();
            res.detenidos += data.detenidos_g1?.length || 0;
            res.expulsados += data.expulsados_g1?.length || 0;
            res.frustradas += data.exp_frustradas_g1?.length || 0;
            if (data.exp_frustradas_g1) data.exp_frustradas_g1.forEach(e => res.motivos_frustradas.push(e.motivo_fg1));
            if (data.fletados_g1) data.fletados_g1.forEach(f => res.fletados.push(`${f.fletados_g1} con ${f.pax_flg1} PAX`));
        });
        return res;
    },

    getPuertoDetalles: async (desde, hasta) => {
        const snap = await db.collection('grupoPuerto_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const res = { denegaciones: 0, detenidos: 0, cruceristas: 0, incidencias: [] };
        snap.forEach(doc => {
            const data = doc.data();
            res.denegaciones += Number(data.denegaciones) || 0;
            res.detenidos += Number(data.detenidos) || 0;
            res.cruceristas += Number(data.cruceristas) || 0;
            if (data.ferrys) data.ferrys.forEach(f => { if(f.incidencias) res.incidencias.push(f.incidencias) });
        });
        return res;
    },

    getCecorexDetalles: async (desde, hasta) => {
        const snap = await db.collection('cecorex_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const res = { detenidos: 0, decretos_exp: 0, asist_letrada: 0, proh_entrada: 0, menas: 0 };
        snap.forEach(doc => {
            const data = doc.data();
            res.detenidos += data.detenidos_cc?.length || 0;
            res.decretos_exp += Number(data.decretos_exp) || 0;
            res.asist_letrada += Number(data.al_abogados) || 0;
            res.proh_entrada += Number(data.proh_entrada) || 0;
            res.menas += Number(data.menas) || 0;
        });
        return res;
    },

    sumarCampos: async (collection, desde, hasta, fields) => {
        const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const totals = fields.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {});
        snap.forEach(doc => {
            const data = doc.data();
            fields.forEach(field => {
                const value = data[field.name];
                totals[field.key] += Number(value) || 0;
            });
        });
        return totals;
    },

    async getGestion(d, h) { return this.sumarCampos('gestion_registros', d, h, [
        {name:'ENTRV. ASILO', key:'Entrev. Asilo'},
        {name:'ASILOS CONCEDIDOS', key:'Asilos OK'},
        {name:'ASILOS DENEGADOS', key:'Asilos KO'},
        {name:'CARTAS CONCEDIDAS', key:'Cartas OK'},
        {name:'CARTAS DENEGADAS', key:'Cartas KO'}
    ]); },
    async getCIE(desde, hasta) {
        const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta, [
            { name: 'entradas', key: 'Entradas' },
            { name: 'salidas', key: 'Salidas' }
        ]);
        const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
        const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
        return { ...rangeTotals, "Internos (fin)": finalCount };
    }
};
