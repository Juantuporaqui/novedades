// SIREX · Consulta Global / Resúmenes (Versión Pro 2025 – Visual y Funcional)
// Versión Mejorada con Narrativas y Exportación PDF Profesional

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


// ==================================================================
// PARTE 1: LÓGICA PARA BUSCAR DATOS EN FIREBASE (EL "MOTOR")
// ==================================================================

const QUERY_STRATEGIES = {
    /**
     * Obtiene y procesa todas las novedades de UCRIF (G2, G3, G4).
     * Recopila datos detallados en lugar de solo sumarlos para permitir narrativas ricas.
     * @param {string} desde - Fecha de inicio en formato YYYY-MM-DD.
     * @param {string} hasta - Fecha de fin en formato YYYY-MM-DD.
     * @returns {Promise<object>} Un objeto con todos los datos detallados de UCRIF.
     */
    getUcrifNovedades: async (desde, hasta) => {
        const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo'];
        const rawData = [];
        for (const coll of collections) {
            const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            snap.forEach(doc => rawData.push(doc.data()));
        }

        const resultado = {
            detenidosILE: [],
            detenidosDelito: [],
            inspecciones: [],
            colaboraciones: [],
            dispositivos: [],
            observaciones: [],
            filiadosVarios: 0,
            traslados: 0,
            citadosCecorex: 0,
        };
        
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');

        rawData.forEach(data => {
            // Datos de G4 que son sumatorios directos
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            
            // Datos de G4 que son listas
            if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4);
            if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones);
            if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);

            // Unificar detenidos de G2, G3 y G4
            const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
            todosDetenidos.forEach(d => {
                const motivo = d.motivo || d.motivo_g4 || '';
                const descripcion = `${d.detenido || d.detenidos_g4 || 'N/A'} (${d.nacionalidad || d.nacionalidad_g4 || 'N/A'})`;
                
                if (isILE(motivo)) {
                    resultado.detenidosILE.push({ descripcion, motivo });
                } else {
                    resultado.detenidosDelito.push({ descripcion, motivo });
                }
            });
            
            // Inspecciones (principalmente G2 y G3)
            if (data.inspecciones) {
                resultado.inspecciones.push(...data.inspecciones.map(i => ({
                    ...i,
                    filiadas: Number(i.identificadas) || 0,
                    citadas: Number(i.citadas) || 0
                })));
            }
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
        let res = { incidencias: [] };
        snap.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(key => {
                if (key === 'ferrys') {
                    data.ferrys.forEach(f => { if(f.incidencias) res.incidencias.push(f.incidencias) });
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
// PARTE 2: PROCESO PRINCIPAL QUE SE ACTIVA CON EL BOTÓN (EL "INTERRUPTOR")
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

        // Guardar el último resumen en el objeto window para que las funciones de exportación puedan acceder a él
        window._ultimoResumen = { resumen, desde, hasta };
        
        // Renderizar el resumen en la página
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
// PARTE 3: FUNCIONES PARA AGRUPAR Y MOSTRAR DATOS
// ========================================================================

/**
 * Agrupa y procesa los datos detallados de UCRIF en un formato estructurado para su fácil renderizado.
 * @param {object} ucrifData - El objeto de datos crudos de UCRIF devuelto por getUcrifNovedades.
 * @returns {object} Un objeto con los datos agregados y listos para mostrar.
 */
function agruparResumenUCRIF(ucrifData) {
    if (!ucrifData) return {};
    
    // --- CLASIFICACIÓN Y AGRUPACIÓN DE INSPECCIONES ---
    const tipologias = {};
    let totalFiliados = 0;
    let totalCitados = 0;
    const nacionalidadesTotales = {};

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

    ucrifData.inspecciones.forEach(insp => {
        const tipo = clasificarTipo(insp.lugar);
        if (!tipologias[tipo]) {
            tipologias[tipo] = { inspecciones: 0, filiados: 0, citados: 0, locales: [] };
        }
        tipologias[tipo].inspecciones++;
        tipologias[tipo].filiados += insp.filiadas || 0;
        tipologias[tipo].citados += insp.citadas || 0;
        totalFiliados += insp.filiadas || 0;
        totalCitados += insp.citadas || 0;
        
        // Agregar nacionalidades al cómputo total
        if (insp.nacionalidades) {
            insp.nacionalidades.split(/[ ,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean).forEach(nac => {
                nacionalidadesTotales[nac] = (nacionalidadesTotales[nac] || 0) + 1;
            });
        }
        
        tipologias[tipo].locales.push({
            lugar: insp.lugar || "Lugar no especificado",
            filiados: insp.filiadas || 0,
            citados: insp.citadas || 0,
            nacionalidades: insp.nacionalidades || "N/A"
        });
    });

    // --- AGRUPACIÓN DE DETENIDOS POR DELITO ---
    const detenidosPorDelito = {};
    ucrifData.detenidosDelito.forEach(d => {
        const motivo = (d.motivo || "Delito no especificado").trim();
        if (!detenidosPorDelito[motivo]) {
            detenidosPorDelito[motivo] = [];
        }
        detenidosPorDelito[motivo].push(d.descripcion);
    });

    return {
        // Totales generales
        totalInspecciones: ucrifData.inspecciones.length,
        totalFiliados: totalFiliados,
        totalCitados: totalCitados,
        totalDetenidosILE: ucrifData.detenidosILE.length,
        totalCitadosCecorex: ucrifData.citadosCecorex || 0,
        
        // Datos agrupados y detallados
        tipologias: tipologias,
        nacionalidadesTotales: nacionalidadesTotales,
        detenidosPorDelito: detenidosPorDelito,
        detenidosILE_detalle: ucrifData.detenidosILE,
        
        // Listas directas
        colaboraciones: ucrifData.colaboraciones.map(c => c.colaboracionDesc || c),
        dispositivos: ucrifData.dispositivos.map(a => a.descripcion || a),
        observaciones: ucrifData.observaciones,
    };
}


// -------- EXPULSIONES (GRUPO 1) --------
function agruparResumenGrupo1(g1) {
    return {
        total_expulsados: g1.expulsados?.length || 0,
        total_detenidos: g1.detenidos?.length || 0,
        total_frustradas: g1.frustradas?.length || 0,
        total_fletados: g1.fletados?.length || 0,
        
        expulsados_detalle: g1.expulsados?.map(e => `${e.expulsados_g1} (${e.nacionalidad_eg1})`) || [],
        detenidos_detalle: g1.detenidos?.map(d => `${d.detenidos_g1} (${d.nacionalidad_g1}) por ${d.motivo_g1}`) || [],
        frustradas_detalle: g1.frustradas?.map(f => `${f.exp_frustradas_g1} (${f.nacionalidad_fg1}) - Motivo: ${f.motivo_fg1}`) || [],
        fletados_detalle: g1.fletados?.map(f => `${f.fletados_g1} a ${f.destino_flg1} con ${f.pax_flg1} PAX`) || [],
    };
}


// =========== RENDERIZADORES HTML PARA LA PÁGINA WEB ===========

/**
 * Renderiza el contenedor principal del resumen en HTML.
 * @param {object} resumen - El objeto con los datos de todos los grupos.
 * @param {string} desde - Fecha de inicio.
 * @param {string} hasta - Fecha de fin.
 * @returns {string} El HTML completo del resumen.
 */
function renderizarResumenGlobalHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-2 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span>Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;

    if (resumen.ucrif) html += renderizarResumenDetalladoUCRIF_HTML(resumen, desde, hasta);
    if (resumen.grupo1) html += renderizarResumenDetalladoGrupo1_HTML(resumen);
    if (resumen.puerto) html += renderizarResumenDetalladoBasico_HTML(resumen, 'puerto', 'success');
    if (resumen.cecorex) html += renderizarResumenDetalladoBasico_HTML(resumen, 'cecorex', 'warning');
    if (resumen.gestion) html += renderizarResumenDetalladoBasico_HTML(resumen, 'gestion', 'secondary');
    if (resumen.cie) html += renderizarResumenDetalladoBasico_HTML(resumen, 'cie', 'danger');

    return html;
}

/**
 * Renderiza la sección de UCRIF en formato HTML narrativo y detallado.
 * @param {object} resumen - El objeto de resumen completo.
 * @returns {string} El bloque HTML para la sección de UCRIF.
 */
function renderizarResumenDetalladoUCRIF_HTML(resumen) {
    const datosAgrupados = agruparResumenUCRIF(resumen.ucrif);
    if (Object.keys(datosAgrupados).every(k => !datosAgrupados[k] || datosAgrupados[k].length === 0 || Object.keys(datosAgrupados[k]).length === 0)) return "";

    const {
        totalInspecciones, totalFiliados, totalDetenidosILE, totalCitadosCecorex,
        tipologias, nacionalidadesTotales, detenidosPorDelito, dispositivos, colaboraciones, observaciones
    } = datosAgrupados;

    let html = `<div class="card border-info mb-4 shadow">
        <div class="card-header bg-info text-white text-center">
          <h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4>
          <div>
            <b>${totalInspecciones}</b> insp. · 
            <b>${totalFiliados}</b> filiados/as · 
            <b>${totalDetenidosILE}</b> ILE · 
            <b>${totalCitadosCecorex}</b> citados CECOREX
          </div>
        </div>
        <div class="card-body p-3">`;

    // Introducción
    html += `<p>Durante el periodo analizado, los grupos operativos de UCRIF han desarrollado una notable actividad, destacando las siguientes actuaciones:</p>`;

    // Inspecciones
    if (totalInspecciones > 0) {
        html += `<h5>Inspecciones y Controles (${totalInspecciones})</h5>`;
        html += `<ul class="list-group list-group-flush mb-3">`;
        Object.entries(tipologias).forEach(([tipo, data]) => {
            html += `<li class="list-group-item"><b>${tipo}:</b> Se realizaron <b>${data.inspecciones}</b> inspecciones, resultando en <b>${data.filiados}</b> personas identificadas y <b>${data.citados}</b> citadas.<ul>`;
            data.locales.forEach(l => {
                html += `<li><i>${l.lugar}</i>: ${l.filiados} filiados, ${l.citados} citados. ${l.nacionalidades ? `(Nacionalidades: ${l.nacionalidades})` : ''}</li>`;
            });
            html += `</ul></li>`;
        });
        html += `</ul>`;
        if(Object.keys(nacionalidadesTotales).length > 0){
             html += `<div class="alert alert-light p-2"><b>Resumen de nacionalidades:</b> ${Object.entries(nacionalidadesTotales).map(([nac, count]) => `${nac} (${count})`).join(', ')}.</div>`;
        }
    }

    // Detenidos
    if (totalDetenidosILE > 0 || Object.keys(detenidosPorDelito).length > 0) {
        html += `<h5 class="mt-3">Detenciones</h5>`;
        if (totalDetenidosILE > 0) {
            html += `<div class="alert alert-danger p-2"><b>${totalDetenidosILE}</b> persona(s) detenida(s) por infracción a la Ley de Extranjería (ILE).</div>`;
        }
        if (Object.keys(detenidosPorDelito).length > 0) {
            html += `<p>Además, se practicaron las siguientes detenciones por diversos delitos:</p><ul class="list-group list-group-flush mb-3">`;
            Object.entries(detenidosPorDelito).forEach(([delito, lista]) => {
                html += `<li class="list-group-item"><b>${lista.length} por ${delito}:</b><ul>${lista.map(desc=>`<li>${desc}</li>`).join('')}</ul></li>`;
            });
            html += `</ul>`;
        }
    }

    // Otros apartados
    if (dispositivos.length > 0) {
        html += `<h5 class="mt-3">Dispositivos Especiales</h5><div class="alert alert-secondary p-2"><ul>${dispositivos.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
    }
    if (colaboraciones.length > 0) {
        html += `<h5 class="mt-3">Colaboraciones</h5><div class="alert alert-secondary p-2"><ul>${colaboraciones.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    }
    if (observaciones.length > 0) {
        html += `<h5 class="mt-3">Observaciones Relevantes</h5><div class="alert alert-warning p-2"><ul>${observaciones.map(o => `<li>${o}</li>`).join('')}</ul></div>`;
    }

    html += `</div></div>`;
    return html;
}

function renderizarResumenDetalladoGrupo1_HTML(resumen) {
    const datosAgrupados = agruparResumenGrupo1(resumen.grupo1);
    if (datosAgrupados.total_expulsados === 0 && datosAgrupados.total_detenidos === 0 && datosAgrupados.total_frustradas === 0) return "";

    let html = `<div class="card border-primary mb-4 shadow">
        <div class="card-header bg-primary text-white text-center">
            <h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4>
            <div><b>${datosAgrupados.total_expulsados}</b> Expulsados · <b>${datosAgrupados.total_frustradas}</b> Frustradas · <b>${datosAgrupados.total_detenidos}</b> Detenidos</div>
        </div>
        <div class="card-body p-3">`;
    if (datosAgrupados.detenidos_detalle.length > 0) html += `<div class="alert alert-light p-2 mb-2"><b>Detenidos (${datosAgrupados.total_detenidos}):</b><ul>${datosAgrupados.detenidos_detalle.map(d => `<li>${d}</li>`).join('')}</ul></div>`;
    if (datosAgrupados.expulsados_detalle.length > 0) html += `<div class="alert alert-light p-2 mb-2"><b>Expulsados (${datosAgrupados.total_expulsados}):</b><ul>${datosAgrupados.expulsados_detalle.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
    if (datosAgrupados.frustradas_detalle.length > 0) html += `<div class="alert alert-warning p-2 mb-2"><b>Expulsiones Frustradas (${datosAgrupados.total_frustradas}):</b><ul>${datosAgrupados.frustradas_detalle.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    if (datosAgrupados.fletados_detalle.length > 0) html += `<div class="alert alert-info p-2 mb-2"><b>Vuelos Fletados:</b><ul>${datosAgrupados.fletados_detalle.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
    html += `</div></div>`;
    return html;
}

function renderizarResumenDetalladoBasico_HTML(resumen, grupoId, color) {
    const config = GRUPOS_CONFIG[grupoId];
    const datos = resumen[grupoId];
    if (!datos || Object.keys(datos).length === 0 || Object.values(datos).every(v => !v || v.length === 0)) return "";
    
    // Función para renderizar una tabla multicolumna a partir de un objeto
    const renderizarTabla = (obj) => {
        const keys = Object.keys(obj).filter(k => obj[k] !== 0 && obj[k] !== "" && obj[k] !== null && obj[k] !== "N/D" && !Array.isArray(obj[k]));
        if (!keys.length) return "";
        let html = '<ul class="list-group">';
        keys.forEach(k => {
            let keyText = k.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
            keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
            html += `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${keyText}</span><span class="fw-bold">${obj[k]}</span></li>`;
        });
        html += '</ul>';
        return html;
    };
    
    // Función para renderizar listas de incidencias u observaciones
    const renderizarListas = (obj) => {
        let html = '';
        if (obj.incidencias && obj.incidencias.length) html += `<div class="alert alert-light mt-2 p-2"><b>Gestiones/Observaciones:</b><ul>${obj.incidencias.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
        return html;
    };

    let html = `<div class="card border-${config.color || color} mb-4 shadow">
        <div class="card-header bg-${config.color || color} text-white text-center">
            <h4>${config.icon} ${config.label}</h4>
        </div>
        <div class="card-body p-3">
            ${renderizarTabla(datos)}
            ${renderizarListas(datos)}
        </div>
    </div>`;
    return html;
}


// ========================================================================
// PARTE 4: FUNCIONES DE EXPORTACIÓN
// ========================================================================

/**
 * Genera el texto narrativo de UCRIF en formato plano con marcadores.
 * @param {object} datosAgrupados - Datos de UCRIF procesados por agruparResumenUCRIF.
 * @returns {string} Texto narrativo listo para ser formateado.
 */
function generarNarrativaUCRIF_Texto(datosAgrupados) {
    const {
        totalInspecciones, totalFiliados, totalDetenidosILE, totalCitadosCecorex,
        tipologias, nacionalidadesTotales, detenidosPorDelito, dispositivos, colaboraciones, observaciones
    } = datosAgrupados;

    if (totalInspecciones === 0 && totalDetenidosILE === 0 && Object.keys(detenidosPorDelito).length === 0 && dispositivos.length === 0) {
        return ""; // No hay datos relevantes de UCRIF
    }
    
    let texto = `*${GRUPOS_CONFIG.ucrif.icon} NOVEDADES UCRIF*\n\n`;
    texto += `Durante este periodo se han realizado un total de *${totalInspecciones}* inspecciones, con *${totalFiliados}* personas filiadas y *${totalCitadosCecorex}* citaciones a CECOREX.\n\n`;

    if (totalInspecciones > 0) {
        texto += `_Inspecciones por tipología:_\n`;
        Object.values(tipologias).forEach(data => {
            data.locales.forEach(l => {
                texto += ` • ${l.lugar}: *${l.filiados}* filiadas y *${l.citadas}* citadas. ${l.nacionalidades !== 'N/A' ? `(${l.nacionalidades})` : ''}\n`;
            });
        });
        if (Object.keys(nacionalidadesTotales).length > 0) {
            texto += `\n_Totales por nacionalidad:_ ${Object.entries(nacionalidadesTotales).map(([nac, count]) => `${count} ${nac}`).join(', ')}.\n`;
        }
        texto += '\n';
    }

    if (totalDetenidosILE > 0) {
        texto += `Se ha detenido a *${totalDetenidosILE}* persona(s) por infracción a la Ley de Extranjería (ILE).\n\n`;
    }

    if (Object.keys(detenidosPorDelito).length > 0) {
        texto += `_Detenidos por otros delitos:_\n`;
        Object.entries(detenidosPorDelito).forEach(([delito, lista]) => {
            texto += ` • *${lista.length} por ${delito}:*\n`;
            lista.forEach(desc => {
                texto += `   - ${desc}\n`;
            });
        });
        texto += '\n';
    }

    if (dispositivos.length > 0) {
        texto += `_Dispositivos especiales:_\n`;
        dispositivos.forEach(d => { texto += ` • ${d}\n`; });
        texto += '\n';
    }

    if (colaboraciones.length > 0) {
        texto += `_Colaboraciones realizadas con:_\n`;
        colaboraciones.forEach(c => { texto += ` • ${c}\n`; });
        texto += '\n';
    }
    
    if (observaciones.length > 0) {
        texto += `_Observaciones:_\n`;
        observaciones.forEach(o => { texto += ` • ${o}\n`; });
        texto += '\n';
    }
    
    texto += `_Operativo coordinado por UCRIF. Parte cerrado._`;
    return texto;
}

// --- EXPORTACIÓN A WHATSAPP ---
document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const textoWhatsapp = generarTextoWhatsapp(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(textoWhatsapp)}`;
    window.open(url, '_blank');
});

function generarTextoWhatsapp(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX Resumen Operativo*\n*Periodo:* ${desde} al ${hasta}\n\n`;
    
    // UCRIF (Narrativa detallada)
    const datosAgrupadosUCRIF = agruparResumenUCRIF(resumen.ucrif);
    msg += generarNarrativaUCRIF_Texto(datosAgrupadosUCRIF);

    // Grupo 1
    const g1 = agruparResumenGrupo1(resumen.grupo1);
    if (g1.total_expulsados > 0 || g1.total_frustradas > 0 || g1.total_detenidos > 0) {
        msg += `\n\n*${GRUPOS_CONFIG.grupo1.icon} EXPULSIONES*\n`;
        msg += `Totales: *${g1.total_expulsados}* materializadas, *${g1.total_frustradas}* frustradas, *${g1.total_detenidos}* detenidos.\n`;
        if (g1.fletados_detalle.length > 0) {
            msg += `_Vuelos Fletados:_\n`;
            g1.fletados_detalle.forEach(f => msg += ` • ${f}\n`);
        }
    }
    
    // Resto de grupos (simplificado)
    ['puerto', 'cecorex', 'gestion', 'cie'].forEach(id => {
        if (resumen[id] && Object.keys(resumen[id]).length > 1) {
             const data = resumen[id];
             const tieneDatos = Object.values(data).some(val => (typeof val === 'number' && val > 0) || (Array.isArray(val) && val.length > 0));

            if(tieneDatos || (id === 'cie' && data['Internos (fin)'] !== 'N/D')){
                const config = GRUPOS_CONFIG[id];
                msg += `\n\n*${config.icon} ${config.label}*\n`;
                let line = [];
                for(const [key, value] of Object.entries(data)){
                    if(!Array.isArray(value) && value !== 0 && value !== "N/D" && value !== null) {
                         let keyText = key.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
                         keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
                         line.push(`${keyText}: *${value}*`);
                    }
                }
                msg += line.join(', ') + '\n';
                 if(data.incidencias && data.incidencias.length > 0){
                    msg += `_Incidencias:_ ${data.incidencias.join(', ')}\n`
                 }
            }
        }
    });

    return msg;
}

// --- EXPORTACIÓN A PDF PROFESIONAL ---
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        return alert("Error: La librería jsPDF no está cargada.");
    }
    // Verificación clave: ¿Existe el plugin autoTable?
    if (typeof jsPDF.API.autoTable !== 'function') {
        return alert("Error: El plugin jsPDF-AutoTable no está cargado. Revisa la consola para más detalles.");
    }

    const { resumen, desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let finalY = 15; // Margen superior inicial

    // --- CABECERA DEL DOCUMENTO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SIREX - Resumen Operativo Global", 105, finalY, { align: "center" });
    finalY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Periodo analizado: ${desde} al ${hasta}`, 105, finalY, { align: "center" });
    finalY += 15;

    // --- SECCIÓN UCRIF NARRATIVA Y CON TABLAS ---
    const ucrifAgrupado = agruparResumenUCRIF(resumen.ucrif);
    if (ucrifAgrupado.totalInspecciones > 0 || ucrifAgrupado.totalDetenidosILE > 0 || Object.keys(ucrifAgrupado.detenidosPorDelito).length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}`, 14, finalY);
        finalY += 8;

        // Párrafo introductorio
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const introText = `Durante el periodo analizado, se han llevado a cabo un total de ${ucrifAgrupado.totalInspecciones} inspecciones, resultando en la identificación de ${ucrifAgrupado.totalFiliados} personas. A continuación se detallan las actuaciones más relevantes.`;
        const introLines = doc.splitTextToSize(introText, 180); // 180mm de ancho
        doc.text(introLines, 14, finalY);
        finalY += introLines.length * 5 + 5;

        // Tabla de Inspecciones
        if (ucrifAgrupado.totalInspecciones > 0) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Detalle de Inspecciones Realizadas", 14, finalY);
            finalY += 6;
            const bodyInspecciones = [];
            Object.values(ucrifAgrupado.tipologias).forEach(data => {
                data.locales.forEach(l => {
                    bodyInspecciones.push([l.lugar, l.filiados, l.citados, l.nacionalidades]);
                });
            });
            doc.autoTable({
                startY: finalY,
                head: [['Lugar/Dirección', 'Filiadas', 'Citadas', 'Nacionalidades']],
                body: bodyInspecciones,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] } // Azul UCRIF
            });
            finalY = doc.autoTable.previous.finalY + 10;
        }

        // Tabla de Detenidos
        if (ucrifAgrupado.totalDetenidosILE > 0 || Object.keys(ucrifAgrupado.detenidosPorDelito).length > 0) {
             if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Relación de Detenidos", 14, finalY);
            finalY += 6;
            const bodyDetenidos = [];
            if(ucrifAgrupado.totalDetenidosILE > 0) {
                bodyDetenidos.push([`Infracción Ley Extranjería (ILE)`, `${ucrifAgrupado.totalDetenidosILE} persona(s)`]);
            }
            Object.entries(ucrifAgrupado.detenidosPorDelito).forEach(([delito, lista]) => {
                bodyDetenidos.push([delito, lista.join('\n')]);
            });
            doc.autoTable({
                startY: finalY,
                head: [['Motivo de Detención', 'Descripción']],
                body: bodyDetenidos,
                theme: 'striped',
                headStyles: { fillColor: [192, 57, 43] } // Rojo para detenciones
            });
            finalY = doc.autoTable.previous.finalY + 10;
        }
    }
    
    // --- RESTO DE GRUPOS (TABLAS RESUMEN) ---
    const otrosGrupos = ['grupo1', 'puerto', 'cecorex', 'gestion', 'cie'];
    otrosGrupos.forEach(id => {
        if(resumen[id] && Object.keys(resumen[id]).length > 0) {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            const config = GRUPOS_CONFIG[id];
            const data = resumen[id];
            
            let bodyData = [];
            if(id === 'grupo1') {
                const g1 = agruparResumenGrupo1(data);
                if(g1.total_expulsados > 0 || g1.total_frustradas > 0 || g1.total_detenidos > 0) {
                   bodyData.push(['Expulsiones Materializadas', g1.total_expulsados]);
                   bodyData.push(['Expulsiones Frustradas', g1.total_frustradas]);
                   bodyData.push(['Detenidos', g1.total_detenidos]);
                   bodyData.push(['Vuelos Fletados', g1.total_fletados]);
                }
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    if(!Array.isArray(value) && value !== 0 && value !== null && value !== 'N/D') {
                        let keyText = key.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
                        keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
                        bodyData.push([keyText, value]);
                    }
                });
            }

            if(bodyData.length > 0) {
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(`${config.icon} ${config.label}`, 14, finalY);
                finalY += 8;
                doc.autoTable({
                    startY: finalY,
                    head: [['Concepto', 'Total']],
                    body: bodyData,
                    theme: 'grid',
                    headStyles: { fillColor: [44, 62, 80] } // Gris oscuro por defecto
                });
                finalY = doc.autoTable.previous.finalY + 10;
            }
        }
    });
    
    doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});
