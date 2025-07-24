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
    let colaboraciones = ucrifData.colaboraciones || [];
    let dispositivos = ucrifData.dispositivos || [];
    let observaciones = ucrifData.observaciones || [];

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
        detenidosPorDelito, colaboraciones, dispositivos, observaciones
    };
}


// -------- EXPULSIONES (GRUPO 1) --------
function agruparResumenGrupo1(g1) {
    let expulsados = g1.expulsados || 0;
    let frustradas = g1.frustradas || 0;
    let detenidos = g1.detenidos || 0;
    let motivosFrustradas = g1.motivos_frustradas || [];
    let fletados = g1.fletados || [];
    let nacionalidades = (g1.nacionalidades || []).map(x=>x.trim()).filter(Boolean);
    let menores = g1.menores || 0;
    let observaciones = g1.observaciones || "";
    return { expulsados, frustradas, detenidos, motivosFrustradas, fletados, nacionalidades, menores, observaciones };
}

// -------- PUERTO --------
function agruparResumenPuerto(puerto) {
    let out = {...puerto};
    out.incidencias = puerto.incidencias || [];
    return out;
}

// -------- CECOREX --------
function agruparResumenCecorex(cc) {
    let out = {...cc};
    return out;
}

// -------- GESTIÓN Y CIE --------
function agruparResumenBasico(grupo) {
    return grupo || {};
}

// =========== TABLA MULTICOLUMNA FLEXIBLE (ajusta columnas según campos) ===========
function renderizarTablaMulticolumna(obj, maxCol = 3, colTitles = []) {
    const keys = Object.keys(obj).filter(
        k => obj[k] !== 0 && obj[k] !== "" && obj[k] !== null && obj[k] !== "N/D" && !Array.isArray(obj[k])
    );
    if (!keys.length) return "<div class='text-muted'>Sin datos.</div>";
    let columnas = Math.min(maxCol, Math.ceil(keys.length/6)+1);
    let html = `<div class="row">`;
    const perCol = Math.ceil(keys.length / columnas);
    for (let c = 0; c < columnas; c++) {
        html += `<div class="col-md-${12/columnas}"><ul class="list-group mb-2">`;
        for (let i = c*perCol; i < (c+1)*perCol && i < keys.length; i++) {
            const k = keys[i], t = colTitles[i] || k;
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${t.replace(/_/g, " ")}</span><span class="fw-bold">${obj[k]}</span>
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

// --- UCRIF Detallado y Narrativo ---
function renderizarResumenDetalladoUCRIF(resumen, desde, hasta) {
    const ucrif = resumen.ucrif;
    if (!ucrif) return "";
    const ag = agruparResumenUCRIF(ucrif);
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
        Durante este periodo se han realizado <b>${ag.totalInspecciones}</b> actuaciones en <b>${Object.keys(ag.tipologias).length}</b> tipologías diferentes. Destacan las inspecciones en casas de citas, salones de masaje, estaciones de transporte y empresas textiles. El dispositivo ha incluido la identificación de <b>${ag.totalFiliados}</b> personas y la citación de <b>${ag.totalCitadosCecorex}</b> para CECOREX. Se ha priorizado la detección de víctimas, la lucha contra la trata y delitos documentales, además de una estrecha colaboración con otros servicios.
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
    if (Object.keys(ag.nacionalidadesTotales).length) {
        html += `<div class="mb-2"><b>Nacionalidades filiadas:</b> `;
        html += Object.entries(ag.nacionalidadesTotales).map(([nac, num]) => `<span class="badge bg-secondary me-1">${nac}: ${num}</span>`).join(' ');
        html += "</div>";
    }
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
    if (ag.dispositivos && ag.dispositivos.length) {
        html += `<div class="alert alert-secondary mt-3 p-2"><b>Dispositivos Especiales:</b><ul>`;
        ag.dispositivos.forEach(d => html += `<li>${d}</li>`);
        html += "</ul></div>";
    }
    if (ag.colaboraciones && ag.colaboraciones.length) {
        html += `<div class="alert alert-secondary mt-2 p-2"><b>Colaboraciones:</b><ul>`;
        ag.colaboraciones.forEach(c => html += `<li>${c}</li>`);
        html += "</ul></div>";
    }
    if (ag.observaciones && ag.observaciones.length) {
        html += `<div class="alert alert-light mt-2 p-2"><b>Observaciones:</b><ul>`;
        ag.observaciones.forEach(c => html += `<li>${c}</li>`);
        html += "</ul></div>";
    }
    html += `<div class="alert alert-warning mt-3 p-2"><b>Hechos destacados:</b><ul>
        <li>Colaboración eficaz con CECOREX en entrevistas a posibles víctimas.</li>
        <li>Dispositivo RAILPOL: 3 detenidos ILE, 28 identificados, 3 traslados y 5 citaciones CECOREX.</li>
        <li>En la casa de C/ Pinazos: posible víctima de trata trasladada a CECOREX.</li>
    </ul></div>`;
    html += `<div class="alert alert-primary text-center mt-3 p-2"><b>RESUMEN:</b> ${ag.totalInspecciones} inspecciones, ${ag.totalFiliados} filiados/as, ${ag.totalCitadosCecorex} citados CECOREX, ${ag.totalDetenidosILE + Object.values(ag.detenidosPorDelito).reduce((s, l) => s + l.length, 0)} detenidos</div>
    </div></div>`;
    return html;
}

// --- Grupo 1 Expulsiones: Redacción ampliada con nacionalidades, menores y vuelos ---
function renderizarResumenDetalladoGrupo1(resumen, desde, hasta) {
    const g1 = resumen.grupo1;
    if (!g1) return "";
    const ag = agruparResumenGrupo1(g1);
    let html = `<div class="card border-primary mb-4 shadow">
    <div class="card-header bg-primary text-white text-center">
      <h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4>
    </div>
    <div class="card-body p-3">
      <div class="alert alert-info mb-2">
        <b>Resumen Expulsiones:</b><br>
        Se han materializado <b>${ag.expulsados}</b> expulsiones, ${ag.menores ? ag.menores + ' de ellos menores. ' : ''} 
        ${ag.nacionalidades && ag.nacionalidades.length ? `Nacionalidades: <span class="badge bg-light text-dark">${ag.nacionalidades.join('</span> <span class="badge bg-light text-dark">')}</span>. ` : ''}
        Además, se han frustrado <b>${ag.frustradas}</b> por motivos como: ${[...new Set(ag.motivosFrustradas)].join(', ') || 'no especificados'}. 
        Se han realizado <b>${ag.detenidos}</b> detenciones vinculadas a las actuaciones. 
        ${ag.fletados.length ? `<br><b>Vuelos Fletados:</b> ${ag.fletados.join(', ')}.` : ''}
        ${ag.observaciones ? `<br><b>Observaciones:</b> ${ag.observaciones}` : ''}
      </div>
      <ul class="list-group mb-2">
        <li class="list-group-item"><b>Expulsados OK:</b> ${ag.expulsados}</li>
        <li class="list-group-item"><b>Expulsiones frustradas:</b> ${ag.frustradas} ${ag.motivosFrustradas.length ? `<br><small>Motivos: ${[...new Set(ag.motivosFrustradas)].join(', ')}</small>` : ""}</li>
              <li class="list-group-item"><b>Detenidos:</b> ${ag.detenidos}</li>
        ${ag.nacionalidades && ag.nacionalidades.length ? `<li class="list-group-item"><b>Nacionalidades implicadas:</b> ${ag.nacionalidades.join(', ')}</li>` : ""}
        ${ag.menores ? `<li class="list-group-item"><b>Menores expulsados:</b> ${ag.menores}</li>` : ""}
        ${ag.fletados.length ? `<li class="list-group-item"><b>Vuelos Fletados:</b> ${ag.fletados.join(', ')}</li>` : ""}
      </ul>
      <div class="alert alert-primary text-center"><b>TOTAL EXPULSIONES:</b> ${ag.expulsados} OK · ${ag.frustradas} KO · ${ag.detenidos} detenidos</div>
    </div></div>`;
    return html;
}

// --- PUERTO: Incluye todos los campos del formulario, incidencias como bloque destacado ---
function renderizarResumenDetalladoPuerto(resumen, desde, hasta) {
    const puerto = resumen.puerto;
    if (!puerto) return "";
    const ag = agruparResumenPuerto(puerto);
    let html = `<div class="card border-success mb-4 shadow">
    <div class="card-header bg-success text-white text-center">
      <h4>${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(ag, 3)}
      ${ag.incidencias && ag.incidencias.length ? `
        <div class="alert alert-warning mt-2 p-2"><b>Incidencias detalladas:</b>
        <ul>${ag.incidencias.map(x=>`<li>${x}</li>`).join('')}</ul></div>` : ''}
      <div class="alert alert-success text-center mt-3"><b>TOTAL PUERTO:</b> 
        ${(ag.denegaciones || 0)} denegaciones · 
        ${(ag.detenidos || 0)} detenidos · 
        ${(ag.cruceristas || 0)} cruceristas
      </div>
    </div></div>`;
    return html;
}

// --- CECOREX: Todos los campos, incidencias y MENAS visibles ---
function renderizarResumenDetalladoCecorex(resumen, desde, hasta) {
    const cc = resumen.cecorex;
    if (!cc) return "";
    const ag = agruparResumenCecorex(cc);
    let html = `<div class="card border-warning mb-4 shadow">
    <div class="card-header bg-warning text-dark text-center">
      <h4>${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(ag, 3)}
      ${(ag.incidencias && ag.incidencias.length) ? `<div class="alert alert-warning mt-2 p-2"><b>Incidencias/observaciones:</b><ul>${ag.incidencias.map(x=>`<li>${x}</li>`).join('')}</ul></div>` : ''}
      <div class="alert alert-warning text-center mt-3"><b>TOTAL CECOREX:</b> 
        ${(ag.detenidos || 0)} detenidos · 
        ${(ag.decretosExp || ag.decretos_exp || 0)} decretos · 
        ${(ag.asistLetrada || ag.asist_letrada || 0)} asistencias letradas · 
        ${(ag.prohEntrada || ag.proh_entrada || 0)} prohib. entrada · 
        ${(ag.menas || 0)} MENAS
      </div>
    </div></div>`;
    return html;
}

// --- GESTIÓN y CIE: Todos los campos multicolumna ---
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
