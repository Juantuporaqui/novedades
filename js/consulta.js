// SIREX · Consulta Global / Resúmenes (Versión Pro 2025 – Visual y Funcional)
// VERSIÓN DEFINITIVA 3.0: Corrige error de PDF, restaura columnas y muestra todos los datos detallados
// gracias al análisis de la estructura de datos de `novedades.js`.

// --- CONFIGURACIÓN FIREBASE ---
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


// ==================================================================
// PARTE 1: LÓGICA PARA BUSCAR DATOS EN FIREBASE (EL "MOTOR")
// ==================================================================
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
            if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4.map(c => c.colaboracionDesc));
            if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);

            // Unificamos detenidos de G2, G3 y G4 usando sus nombres de campo específicos
            const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
            todosDetenidos.forEach(d => {
                // Los nombres de campo son diferentes entre G2/3 y G4, los unificamos aquí
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
            // Las inspecciones vienen de G2/G3/G4, las unificamos.
            if (data.inspecciones) resultado.inspecciones.push(...data.inspecciones.map(i => ({...i, filiadas: Number(i.identificadas), citadas: Number(i.citadas)})));
            if (data.inspecciones_g4) resultado.inspecciones.push(...data.inspecciones_g4.map(i => ({...i, lugar: i.lugar, filiadas: 0, citadas: 0}))); // Adaptar G4
            
            // Las 'actuaciones' de G2/G3 son 'dispositivos' para el resumen
            if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones.map(a => a.descripcion));
        });
        return resultado;
    },
    getGrupo1Detalles: async (desde, hasta) => {
        const snap = await db.collection('grupo1_expulsiones').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const res = { detenidos: [], expulsados: [], frustradas: [], fletados: [] };
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
        let res = { incidencias: [], gestiones_puerto: [] };
        snap.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(key => {
                if (key === 'ferrys') {
                    data.ferrys.forEach(f => { if (f.incidencias) res.incidencias.push(f.incidencias) });
                } else if(key === 'gestiones_puerto') {
                    data.gestiones_puerto.forEach(g => res.gestiones_puerto.push(g.gestion));
                } else if (key !== 'fecha') {
                    res[key] = (res[key] || 0) + (Number(data[key]) || 0);
                }
            });
        });
        return res;
    },
    getCecorexDetalles: async (desde, hasta) => {
        const snap = await db.collection('cecorex_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        let res = { incidencias: [] };
        snap.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(key => {
                if (key === 'detenidos_cc') {
                    res['detenidos'] = (res['detenidos'] || 0) + (data.detenidos_cc?.length || 0);
                } else if (key === 'gestiones_cecorex') {
                    data.gestiones_cecorex.forEach(g => res.incidencias.push(g.gestion));
                } else if (key !== 'fecha') {
                    res[key] = (res[key] || 0) + (Number(data[key]) || 0);
                }
            });
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

// =========================================================================
// PARTE 2: PROCESO PRINCIPAL
// =========================================================================
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


// ========================================================================
// PARTE 3: FUNCIONES DE AGRUPACIÓN DE DATOS
// ========================================================================

// -------- UCRIF (Grupos 2, 3, 4) --------
function agruparResumenUCRIF(ucrifData) {
    let totalInspecciones = ucrifData.inspecciones?.length || 0;
    let totalFiliados = ucrifData.inspecciones?.reduce((sum, i) => sum + (i.filiadas || 0), 0) || 0;
    let totalCitados = ucrifData.inspecciones?.reduce((sum, i) => sum + (i.citadas || 0), 0) || 0;
    
    return {
        totalInspecciones,
        totalFiliados,
        totalCitados,
        totalDetenidosILE: ucrifData.detenidosILE || 0,
        totalCitadosCecorex: ucrifData.citadosCecorex || 0,
        detenidosPorDelito: ucrifData.detenidosDelito || [],
        inspecciones_detalle: ucrifData.inspecciones || [],
        colaboraciones: ucrifData.colaboraciones || [],
        dispositivos: ucrifData.dispositivos || [],
        observaciones: ucrifData.observaciones || []
    };
}

// -------- EXPULSIONES (GRUPO 1) - AHORA CON TODOS LOS DETALLES --------
function agruparResumenGrupo1(g1) {
    if (!g1) return {};
    return {
        total_expulsados: g1.expulsados?.length || 0,
        total_detenidos: g1.detenidos?.length || 0,
        total_frustradas: g1.frustradas?.length || 0,
        
        // Se crean textos detallados usando los nombres de campo de `novedades.js`
        detenidos_detalle: g1.detenidos?.map(d => `${d.detenidos_g1} (${d.nacionalidad_g1 || 'N/D'}) por ${d.motivo_g1 || 'motivo no especificado'}`) || [],
        expulsados_detalle: g1.expulsados?.map(e => `${e.expulsados_g1} (${e.nacionalidad_eg1 || 'N/D'})`) || [],
        frustradas_detalle: g1.frustradas?.map(f => `${f.exp_frustradas_g1} (${f.nacionalidad_fg1 || 'N/D'}) - Motivo: ${f.motivo_fg1 || 'N/D'}`) || [],
        fletados_detalle: g1.fletados?.map(f => `${f.fletados_g1} a ${f.destino_flg1} con ${f.pax_flg1} PAX`) || [],
    };
}

// ========================================================================
// PARTE 4: FUNCIONES DE RENDERIZADO HTML
// ========================================================================

/**
 * Función restaurada para generar una tabla multicolumna para datos numéricos.
 * @param {object} obj - Objeto con pares clave-valor numéricos.
 * @param {number} maxCol - Número máximo de columnas a generar.
 * @returns {string} HTML de la tabla multicolumna.
 */
function renderizarTablaMulticolumna(obj, maxCol = 3) {
    const keys = Object.keys(obj).filter(
        k => typeof obj[k] === 'number' && obj[k] !== 0
    );
    if (!keys.length) return "<div class='text-muted small'>Sin datos numéricos que mostrar.</div>";
    
    let columnas = Math.min(maxCol, Math.ceil(keys.length/5)+1);
    let html = `<div class="row">`;
    const perCol = Math.ceil(keys.length / columnas);

    for (let c = 0; c < columnas; c++) {
        html += `<div class="col-md-${Math.floor(12/columnas)}"><ul class="list-group mb-2">`;
        for (let i = c * perCol; i < (c + 1) * perCol && i < keys.length; i++) {
            const k = keys[i];
            let keyText = k.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
            keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
            html += `<li class="list-group-item d-flex justify-content-between align-items-center p-2">
                <span class="small">${keyText}</span><span class="fw-bold badge bg-secondary rounded-pill">${obj[k]}</span>
            </li>`;
        }
        html += `</ul></div>`;
    }
    html += `</div>`;
    return html;
}

/**
 * Renderizador principal que elige la vista correcta para cada grupo.
 */
function renderizarResumenGlobalHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-2 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span>Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;

    if (resumen.ucrif) html += renderizarResumenDetalladoUCRIF(resumen);
    if (resumen.grupo1) html += renderizarResumenDetalladoGrupo1(resumen);
    // Usamos el renderizador tabular para estos grupos
    if (resumen.puerto) html += renderizarResumenTabular(resumen, 'puerto');
    if (resumen.cecorex) html += renderizarResumenTabular(resumen, 'cecorex');
    if (resumen.gestion) html += renderizarResumenTabular(resumen, 'gestion');
    if (resumen.cie) html += renderizarResumenTabular(resumen, 'cie');

    return html;
}

// --- Renderizador narrativo para UCRIF ---
function renderizarResumenDetalladoUCRIF(resumen) {
    const ag = agruparResumenUCRIF(resumen.ucrif);
    if (ag.totalInspecciones === 0 && ag.totalDetenidosILE === 0 && ag.detenidosPorDelito.length === 0) return "";
    
    let html = `<div class="card border-info mb-4 shadow-sm">
        <div class="card-header bg-info text-white text-center">
            <h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4>
            <div><b>${ag.totalInspecciones}</b> insp. · <b>${ag.totalFiliados}</b> filiados · <b>${ag.totalDetenidosILE}</b> ILE</div>
        </div>
        <div class="card-body p-3">`;

    if (ag.inspecciones_detalle.length > 0) {
        html += `<h6>Inspecciones</h6><ul class="list-group list-group-flush mb-3">`;
        ag.inspecciones_detalle.forEach(insp => {
            html += `<li class="list-group-item small"><b>${insp.lugar}:</b> ${insp.filiadas} filiadas, ${insp.citadas} citadas. ${insp.nacionalidades ? `(Nac: ${insp.nacionalidades})` : ''}</li>`;
        });
        html += `</ul>`;
    }

    if (ag.detenidosPorDelito.length > 0 || ag.totalDetenidosILE > 0) {
        html += `<h6 class="mt-3">Detenidos</h6>`;
        if (ag.totalDetenidosILE > 0) html += `<div class="alert alert-light p-2"><b>${ag.totalDetenidosILE}</b> por Infracción a Ley de Extranjería (ILE).</div>`;
        if (ag.detenidosPorDelito.length > 0) {
            html += `<ul class="list-group list-group-flush">`;
            ag.detenidosPorDelito.forEach(d => {
                html += `<li class="list-group-item small"><b>${d.motivo}:</b> ${d.descripcion}</li>`;
            });
            html += `</ul>`;
        }
    }
    // Añadir otros detalles si existen
    html += `</div></div>`;
    return html;
}

// --- Renderizador narrativo para Grupo 1 ---
function renderizarResumenDetalladoGrupo1(resumen) {
    const ag = agruparResumenGrupo1(resumen.grupo1);
    if (ag.total_expulsados === 0 && ag.total_detenidos === 0 && ag.total_frustradas === 0) return "";

    let html = `<div class="card border-primary mb-4 shadow-sm">
        <div class="card-header bg-primary text-white text-center">
            <h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4>
            <div><b>${ag.total_expulsados}</b> Expulsados · <b>${ag.total_frustradas}</b> Frustradas · <b>${ag.total_detenidos}</b> Detenidos</div>
        </div>
        <div class="card-body p-3">`;

    if (ag.detenidos_detalle.length > 0) html += `<div class="alert alert-light p-2 mb-2"><b>Detenidos (${ag.total_detenidos}):</b><ul class="small">${ag.detenidos_detalle.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
    if (ag.expulsados_detalle.length > 0) html += `<div class="alert alert-success p-2 mb-2"><b>Expulsados (${ag.total_expulsados}):</b><ul class="small">${ag.expulsados_detalle.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
    if (ag.frustradas_detalle.length > 0) html += `<div class="alert alert-warning p-2 mb-2"><b>Expulsiones Frustradas (${ag.total_frustradas}):</b><ul class="small">${ag.frustradas_detalle.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    if (ag.fletados_detalle.length > 0) html += `<div class="alert alert-info p-2 mb-2"><b>Vuelos Fletados:</b><ul class="small">${ag.fletados_detalle.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    
    html += `</div></div>`;
    return html;
}

// --- Renderizador tabular (multicolumna) para Puerto, Cecorex, etc. ---
function renderizarResumenTabular(resumen, grupoId) {
    const config = GRUPOS_CONFIG[grupoId];
    const datos = resumen[grupoId];
    if (!datos || Object.keys(datos).length === 0 || Object.values(datos).every(v => !v || v.length === 0)) return "";
    
    // Extraer listas de texto para mostrarlas por separado
    const listasDeTexto = {};
    Object.keys(datos).forEach(key => {
        if (Array.isArray(datos[key]) && datos[key].length > 0) {
            listasDeTexto[key] = datos[key];
        }
    });

    let html = `<div class="card border-${config.color} mb-4 shadow-sm">
        <div class="card-header bg-${config.color} text-white text-center">
          <h4>${config.icon} ${config.label}</h4>
        </div>
        <div class="card-body p-3">
          ${renderizarTablaMulticolumna(datos, 3)}
          ${Object.entries(listasDeTexto).map(([key, lista]) => `
            <div class="alert alert-light mt-2 p-2">
                <b>${key.replace(/_/g, " ")}:</b>
                <ul class="small mb-0">${lista.map(x => `<li>${x}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
    </div>`;
    return html;
}

// ========================================================================
// PARTE 5: FUNCIONES DE EXPORTACIÓN
// ========================================================================

// --- EXPORTACIÓN A WHATSAPP ---
document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    let msg = `*🇪🇸 SIREX Resumen Operativo*\n*Periodo:* ${desde} al ${hasta}\n`;

    // UCRIF
    const ucrif = agruparResumenUCRIF(resumen.ucrif);
    if (ucrif.totalInspecciones > 0 || ucrif.totalDetenidosILE > 0 || ucrif.detenidosPorDelito.length > 0) {
        msg += `\n*${GRUPOS_CONFIG.ucrif.icon} Novedades UCRIF*\n`;
        msg += `Totales: ${ucrif.totalInspecciones} insp, ${ucrif.totalFiliados} filiados, ${ucrif.totalDetenidosILE} ILE\n`;
        if (ucrif.detenidosPorDelito.length > 0) {
            msg += `_Detenidos por Delito:_\n`;
            ucrif.detenidosPorDelito.forEach(d => {
                msg += ` • ${d.motivo}: ${d.descripcion}\n`;
            });
        }
    }
    
    // Grupo 1
    const g1 = agruparResumenGrupo1(resumen.grupo1);
    if (g1.total_expulsados > 0 || g1.total_frustradas > 0 || g1.total_detenidos > 0) {
        msg += `\n*${GRUPOS_CONFIG.grupo1.icon} Expulsiones*\n`;
        msg += `Totales: ${g1.total_expulsados} OK, ${g1.total_frustradas} KO, ${g1.total_detenidos} detenidos\n`;
        if (g1.expulsados_detalle.length > 0) g1.expulsados_detalle.forEach(e => msg += ` • Expulsado: ${e}\n`);
        if (g1.frustradas_detalle.length > 0) g1.frustradas_detalle.forEach(f => msg += ` • Frustrada: ${f}\n`);
    }
    
    // Resto de grupos (simplificado)
    ['puerto', 'cecorex', 'gestion', 'cie'].forEach(id => {
        if (resumen[id] && Object.keys(resumen[id]).length > 0){
            const config = GRUPOS_CONFIG[id];
            const data = resumen[id];
            const hasData = Object.values(data).some(v => (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length > 0));
            if(hasData){
                msg += `\n*${config.icon} ${config.label}*\n`;
                let line = [];
                for(const [key, value] of Object.entries(data)){
                    if(typeof value === 'number' && value > 0) {
                        let keyText = key.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
                        keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
                        line.push(`${keyText}: *${value}*`);
                    }
                }
                msg += line.join(', ') + '\n';
            }
        }
    });

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

// --- EXPORTACIÓN A PDF PROFESIONAL (CORREGIDO Y MEJORADO) ---
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");

    // Verificaciones cruciales de librerías
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        return alert("Error Crítico: La librería jsPDF no está cargada en la página.");
    }
    if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
        return alert("Error Crítico: El plugin jsPDF-AutoTable no está cargado.");
    }

    const { resumen, desde, hasta } = window._ultimoResumen;
    
    // CORRECCIÓN DEL ERROR: Instanciar jsPDF directamente desde el objeto window.
    const doc = new window.jspdf.jsPDF();
    
    let finalY = 20;

    // Cabecera del documento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SIREX - Resumen Operativo Global", 105, finalY, { align: "center" });
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodo: ${desde} al ${hasta}`, 105, finalY, { align: "center" });
    finalY += 15;

    // --- Función interna para añadir una sección de grupo al PDF ---
    function addSectionToPdf(title, icon, data, color) {
        if (finalY > 250) { // Añadir nueva página si no hay espacio
            doc.addPage();
            finalY = 20;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${icon} ${title}`, 14, finalY);
        finalY += 8;
        
        doc.autoTable({
            startY: finalY,
            head: [['Concepto', 'Detalle']],
            body: data,
            theme: 'grid',
            headStyles: { fillColor: color }
        });
        finalY = doc.autoTable.previous.finalY + 10;
    }

    // --- Procesamiento de cada grupo para el PDF ---

    // UCRIF
    const ucrif = agruparResumenUCRIF(resumen.ucrif);
    if (ucrif.totalInspecciones > 0 || ucrif.totalDetenidosILE > 0 || ucrif.detenidosPorDelito.length > 0) {
        const ucrifData = [
            ['Inspecciones Realizadas', ucrif.totalInspecciones],
            ['Personas Filiadas', ucrif.totalFiliados],
            ['Detenidos por ILE', ucrif.totalDetenidosILE],
            ['Detenidos por otros delitos', ucrif.detenidosPorDelito.map(d => `${d.motivo}: ${d.descripcion}`).join('\n')]
        ];
        addSectionToPdf('UCRIF', '🛡️', ucrifData, [41, 128, 185]);
    }
    
    // Grupo 1
    const g1 = agruparResumenGrupo1(resumen.grupo1);
    if (g1.total_expulsados > 0 || g1.total_frustradas > 0 || g1.total_detenidos > 0) {
        const g1Data = [
            ['Expulsiones Materializadas', `${g1.total_expulsados}\n${g1.expulsados_detalle.join('\n')}`],
            ['Expulsiones Frustradas', `${g1.total_frustradas}\n${g1.frustradas_detalle.join('\n')}`],
            ['Detenidos', `${g1.total_detenidos}\n${g1.detenidos_detalle.join('\n')}`],
            ['Vuelos Fletados', g1.fletados_detalle.join('\n')]
        ];
        addSectionToPdf('Expulsiones', '🚔', g1Data.filter(row => row[1] && row[1] != '0\n'), [52, 152, 219]);
    }
    
    // Otros grupos (formato tabular simple)
    ['puerto', 'cecorex', 'gestion', 'cie'].forEach(id => {
        const datos = resumen[id];
        if (datos && Object.values(datos).some(v => (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length > 0))) {
            const config = GRUPOS_CONFIG[id];
            const bodyData = Object.entries(datos)
                .map(([key, value]) => {
                    if (typeof value === 'number' && value > 0) {
                        let keyText = key.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
                        keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
                        return [keyText, value];
                    }
                    return null;
                }).filter(Boolean); // Filtrar nulos
            
            if (bodyData.length > 0) {
                addSectionToPdf(config.label, config.icon, bodyData, [44, 62, 80]);
            }
        }
    });
    
    doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});
