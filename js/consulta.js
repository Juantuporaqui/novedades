// js/consulta.js
// SIREX · Consulta Global / Resúmenes (Versión 2.2 - Resúmenes Enriquecidos para todos los grupos)

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

// --- NOMBRES Y ETIQUETAS DE GRUPOS ---
const GRUPOS_CONFIG = {
    ucrif: { label: 'UCRIF (Grupos 2, 3 y 4)', icon: '🛡️' },
    grupo1: { label: 'Expulsiones', icon: '🚔' },
    puerto: { label: 'Puerto', icon: '⚓' },
    cecorex: { label: 'CECOREX', icon: '📡' },
    gestion: { label: 'Gestión', icon: '📋' },
    cie: { label: 'CIE', icon: '🏢' }
};

// =================================================================================
// ====== ARQUITECTURA DE CONSULTA Y AGREGACIÓN (MODIFICADA) ======================
// =================================================================================

const QUERY_STRATEGIES = {
    // --- ESTRATEGIAS DE CONSULTA DETALLADA POR GRUPO ---

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
            if (data.ferrys) data.ferrys.forEach(f => {
                if(f.incidencias) res.incidencias.push(f.incidencias)
            });
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
    
    // Las consultas para Gestión y CIE se mantienen numéricas, ya que su naturaleza es de totales.
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
    async getGestion(d, h) { return this.sumarCampos('gestion_registros',d,h,[{name:'ENTRV. ASILO',key:'Entrev. Asilo'},{name:'ASILOS CONCEDIDOS',key:'Asilos OK'},{name:'ASILOS DENEGADOS',key:'Asilos KO'},{name:'CARTAS CONCEDIDAS',key:'Cartas OK'},{name:'CARTAS DENEGADAS',key:'Cartas KO'}]); },
    async getCIE(desde, hasta) {
        const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta, [{ name: 'entradas', key: 'Entradas' }, { name: 'salidas', key: 'Salidas' }]);
        const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
        const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
        return { ...rangeTotals, "Internos (fin)": finalCount };
    }
};

// =================================================================================
// ====== EVENTO PRINCIPAL Y RENDERIZADO ==========================================
// =================================================================================

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
        resumenVentana.innerHTML = renderizarResumenDetalladoHTML(resumen, desde, hasta);
        exportBtns.classList.remove('d-none');

    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally {
        spinner.classList.add('d-none');
    }
});

// --- RENDERIZADO DETALLADO PARA PANTALLA/PDF (ACTUALIZADO) ---
function renderizarResumenDetalladoHTML(resumen, desde, hasta) {
    let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;

    // --- UCRIF ---
    const ucrif = resumen.ucrif;
    if (ucrif) {
        html += `<div class="card mb-3"><div class="card-header"><h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4></div><div class="card-body">`;
        html += `<p><strong>${ucrif.detenidosILE}</strong> detenidos por ILE, <strong>${ucrif.filiadosVarios}</strong> filiados, <strong>${ucrif.traslados}</strong> traslados y <strong>${ucrif.citadosCecorex}</strong> citados a CECOREX.</p><hr/>`;
        if (ucrif.inspeccionesCasasCitas.length > 0) { /* ... */ }
        if (ucrif.detenidosDelito.length > 0) {
            html += `<p><strong>Detenidos por delito (${ucrif.detenidosDelito.length}):</strong></p><ul>`;
            ucrif.detenidosDelito.forEach(d => { html += `<li>1 detenido ${d.descripcion} por ${d.motivo.toLowerCase()}.</li>`; });
            html += `</ul><hr/>`;
        }
        html += `</div></div>`;
    }
    
    html += `<div class="list-group">`;
    
    // --- GRUPO 1 ---
    const g1 = resumen.grupo1;
    if (g1 && (g1.expulsados > 0 || g1.frustradas > 0)) {
        html += `<div class="list-group-item"><h5 class="mb-1">${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h5>
                 <p class="mb-1">Totales: <strong>${g1.expulsados}</strong> expulsiones OK, <strong>${g1.frustradas}</strong> frustradas, <strong>${g1.detenidos}</strong> detenidos.</p>`;
        if (g1.motivos_frustradas.length > 0) html += `<p class="mb-1"><em>Motivos Frustración: ${[...new Set(g1.motivos_frustradas)].join(', ')}</em></p>`;
        if (g1.fletados.length > 0) html += `<p class="mb-0"><em>Vuelos Fletados: ${g1.fletados.join(', ')}</em></p>`;
        html += `</div>`;
    }

    // --- PUERTO ---
    const puerto = resumen.puerto;
    if (puerto && (puerto.denegaciones > 0 || puerto.detenidos > 0)) {
        html += `<div class="list-group-item"><h5 class="mb-1">${GRUPOS_CONFIG.puerto.icon} ${GRUPOS_CONFIG.puerto.label}</h5>
                 <p class="mb-1">Totales: <strong>${puerto.denegaciones}</strong> denegaciones, <strong>${puerto.detenidos}</strong> detenidos, <strong>${puerto.cruceristas}</strong> cruceristas.</p>`;
        if (puerto.incidencias.length > 0) html += `<p class="mb-0"><em>Incidencias: ${[...new Set(puerto.incidencias)].join(', ')}</em></p>`;
        html += `</div>`;
    }

    // --- CECOREX ---
    const cecorex = resumen.cecorex;
    if (cecorex && cecorex.detenidos > 0) {
        html += `<div class="list-group-item"><h5 class="mb-1">${GRUPOS_CONFIG.cecorex.icon} ${GRUPOS_CONFIG.cecorex.label}</h5>
                 <p class="mb-1">Totales: <strong>${cecorex.detenidos}</strong> detenidos, <strong>${cecorex.decretos_exp}</strong> decretos de expulsión, <strong>${cecorex.asist_letrada}</strong> asist. letradas.</p>`;
        if (cecorex.proh_entrada > 0 || cecorex.menas > 0) html += `<p class="mb-0"><em>Otros: ${cecorex.proh_entrada} prohibiciones de entrada, ${cecorex.menas} MENAS gestionados.</em></p>`;
        html += `</div>`;
    }
    
    // --- GESTION Y CIE (formato simple) ---
    ['gestion', 'cie'].forEach(grupoId => {
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        if (datosGrupo && Object.values(datosGrupo).some(v => v > 0 || (v && v !== "N/D"))) {
            html += `<div class="list-group-item"><h5 class="mb-1">${config.icon} ${config.label}</h5>`;
            const items = Object.entries(datosGrupo).map(([key, value]) => `<li>${key}: <strong>${value}</strong></li>`).join('');
            html += `<ul class="list-unstyled mb-0">${items}</ul></div>`;
        }
    });

    html += `</div>`;
    return html;
}

// =================================================================================
// ====== EXPORTACIÓN A WHATSAPP (ACTUALIZADA) ====================================
// =================================================================================

function generarTextoWhatsapp(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX Resumen Global*\n*Periodo:* ${desde} al ${hasta}\n`;

    // --- UCRIF ---
    const ucrif = resumen.ucrif;
    if (ucrif && (ucrif.detenidosILE > 0 || ucrif.filiadosVarios > 0)) {
        msg += `\n*${GRUPOS_CONFIG.ucrif.icon} Novedades UCRIF*\n`;
        let totales = [];
        if (ucrif.detenidosILE > 0) totales.push(`*${ucrif.detenidosILE}* ILE`);
        if (ucrif.filiadosVarios > 0) totales.push(`*${ucrif.filiadosVarios}* filiados`);
        if (ucrif.traslados > 0) totales.push(`*${ucrif.traslados}* traslados`);
        if (ucrif.citadosCecorex > 0) totales.push(`*${ucrif.citadosCecorex}* citados`);
        if (totales.length > 0) msg += `- _Totales:_ ${totales.join(', ')}\n`;
        if (ucrif.detenidosDelito.length > 0) {
            msg += `- _Detenidos por Delito (*${ucrif.detenidosDelito.length}*):_\n`;
            ucrif.detenidosDelito.forEach(d => { msg += `  • 1 por *${d.motivo.toLowerCase()}* (${d.descripcion})\n`; });
        }
        const totalCasas = ucrif.inspeccionesCasasCitas.length;
        if (totalCasas > 0) {
            const totalFiliadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.filiadas, 0);
            const totalCitadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.citadas, 0);
            msg += `- _Inspecciones:_ *${totalCasas}* casas de citas (*${totalFiliadas}* filiadas, *${totalCitadas}* citadas)\n`;
        }
    }

    // --- GRUPO 1 ---
    const g1 = resumen.grupo1;
    if (g1 && (g1.expulsados > 0 || g1.frustradas > 0)) {
        msg += `\n*${GRUPOS_CONFIG.grupo1.icon} Expulsiones*\n`;
        msg += `- _Totales:_ *${g1.expulsados}* OK, *${g1.frustradas}* KO, *${g1.detenidos}* detenidos\n`;
        if (g1.motivos_frustradas.length > 0) msg += `- _Motivos KO:_ ${[...new Set(g1.motivos_frustradas)].join(', ')}\n`;
        if (g1.fletados.length > 0) msg += `- _Vuelos Fletados:_ ${g1.fletados.join(', ')}\n`;
    }

    // --- PUERTO ---
    const puerto = resumen.puerto;
    if (puerto && (puerto.denegaciones > 0 || puerto.detenidos > 0)) {
        msg += `\n*${GRUPOS_CONFIG.puerto.icon} Puerto*\n`;
        msg += `- _Totales:_ *${puerto.denegaciones}* denegaciones, *${puerto.detenidos}* detenidos\n`;
        if (puerto.incidencias.length > 0) msg += `- _Incidencias:_ ${[...new Set(puerto.incidencias)].join(', ')}\n`;
    }

    // --- CECOREX ---
    const cecorex = resumen.cecorex;
    if (cecorex && cecorex.detenidos > 0) {
        msg += `\n*${GRUPOS_CONFIG.cecorex.icon} CECOREX*\n`;
        msg += `- _Totales:_ *${cecorex.detenidos}* detenidos, *${cecorex.decretos_exp}* decretos, *${cecorex.asist_letrada}* asist. letradas\n`;
        if (cecorex.proh_entrada > 0 || cecorex.menas > 0) msg += `- _Otros:_ *${cecorex.proh_entrada}* prohib. entrada, *${cecorex.menas}* MENAS\n`;
    }

    // --- GESTION Y CIE (formato simple) ---
    ['gestion', 'cie'].forEach(grupoId => {
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        if (datosGrupo && Object.values(datosGrupo).some(v => v > 0 || (v && v !== "N/D"))) {
            msg += `\n*${config.icon} ${config.label}*\n`;
            for (const [key, value] of Object.entries(datosGrupo)) {
                msg += `- ${key}: *${value}*\n`;
            }
        }
    });
    
    return msg;
}

document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const msg = generarTextoWhatsapp(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const source = document.getElementById('resumenVentana');
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    doc.html(source, {
        callback: function (doc) { doc.save(`SIREX-Resumen_Detallado_${desde}_a_${hasta}.pdf`); },
        x: 15, y: 15, width: 550, windowWidth: source.scrollWidth
    });
});
