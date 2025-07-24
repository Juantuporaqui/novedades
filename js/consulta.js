// SIREX · Consulta Global / Resúmenes (Versión Pro 2025 – Visual y Funcional, Mejorada por GPT)
// =============================================
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

// ==========================
// PARTE 1: CONSULTA FIREBASE
// ==========================
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
            inspeccionesCasasCitas: [], detenidosDelito: [], observaciones: [],
            colaboraciones: [], dispositivos: []
        };
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');
        rawData.forEach(data => {
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4.map(c => c.colaboracionDesc));
            if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);
            const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
            todosDetenidos.forEach(d => {
                const motivo = d.motivo || d.motivo_g4 || '';
                if (isILE(motivo)) resultado.detenidosILE++;
                else resultado.detenidosDelito.push({
                    descripcion: `${d.detenido || d.detenidos_g4 || 'N/A'} (${d.nacionalidad || d.nacionalidad_g4 || 'N/A'})`,
                    motivo: motivo,
                });
            });
            if (data.inspecciones) resultado.inspeccionesCasasCitas.push(...data.inspecciones.map(i => ({...i, filiadas: Number(i.identificadas), citadas: Number(i.citadas)})));
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
        let res = { incidencias: [] };
        snap.forEach(doc => {
            const data = doc.data();
            Object.keys(data).forEach(key => {
                if (key === 'ferrys') data.ferrys.forEach(f => { if(f.incidencias) res.incidencias.push(f.incidencias) });
                else if (key !== 'fecha') res[key] = (res[key] || 0) + (Number(data[key]) || 0);
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
                if (key === 'detenidos_cc') res['detenidos'] = (res['detenidos'] || 0) + (data.detenidos_cc?.length || 0);
                else if (key === 'gestiones_cecorex') data.gestiones_cecorex.forEach(g => res.incidencias.push(g.gestion));
                else if (key !== 'fecha') res[key] = (res[key] || 0) + (Number(data[key]) || 0);
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

// =============================================
// PARTE 2: SUBMIT Y PINTADO
// =============================================
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

// =============================================
// PARTE 3: AGRUPACIÓN Y RENDERIZADO
// =============================================
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
// ... el resto de funciones de agrupación y renderizado (idéntico a tu actual, ver mensaje anterior) ...

// =============================================
// PARTE 4: EXPORTACIÓN A WHATSAPP MEJORADA
// =============================================
function generarResumenUCRIFNarrativo(resumen, desde, hasta) {
    if (!resumen.ucrif) return "";
    const ag = agruparResumenUCRIF(resumen.ucrif);
    if (ag.totalInspecciones === 0 && ag.totalDetenidosILE === 0 && Object.keys(ag.detenidosPorDelito).length === 0) return "";
    let msg = `*${GRUPOS_CONFIG.ucrif.icon} NOVEDADES UCRIF (${desde} a ${hasta})*\n\n`;
    if (ag.totalInspecciones > 0) {
        msg += `Durante este periodo se han realizado *${ag.totalInspecciones} inspecciones* en locales de distintas tipologías:\n\n`;
        for (const tipo in ag.tipologias) {
            ag.tipologias[tipo].locales.forEach((loc) => {
                msg += `• ${tipo} en ${loc.lugar ? "*" + loc.lugar + "*" : "local no especificado"}`;
                if (typeof loc.filiados === 'number') msg += `: *${loc.filiados} filiadas*`;
                if (typeof loc.citados === 'number' && loc.citados > 0) msg += `, *${loc.citados} citadas*`;
                if (loc.nacionalidades && loc.nacionalidades.trim()) msg += ` (${loc.nacionalidades.trim()})`;
                msg += `\n`;
            });
        }
        if (Object.keys(ag.nacionalidadesTotales).length > 0) {
            const nacs = Object.entries(ag.nacionalidadesTotales).map(([nac, count]) => `${count} ${nac}`).join(', ');
            msg += `\n_Totales por nacionalidad:_ ${nacs}\n`;
        }
    }
    if (ag.totalDetenidosILE > 0) msg += `\n*${ag.totalDetenidosILE} personas detenidas* por infracción a la Ley de Extranjería (ILE).\n`;
    if (Object.keys(ag.detenidosPorDelito).length > 0) {
        msg += `\n*Detenidos por delito:*\n`;
        Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
            lista.forEach(desc => { msg += `• ${desc} — *${delito.charAt(0).toUpperCase() + delito.slice(1)}*\n`; });
        });
    }
    if (ag.dispositivos && ag.dispositivos.length > 0) {
        msg += `\n*Dispositivos especiales:*\n`;
        ag.dispositivos.forEach(d => msg += `• ${d}\n`);
    }
    if (ag.colaboraciones && ag.colaboraciones.length > 0) {
        msg += `\n*Colaboraciones realizadas* con:\n`;
        ag.colaboraciones.forEach(c => msg += `• ${c}\n`);
    }
    if (ag.totalCitadosCecorex > 0) msg += `\n*${ag.totalCitadosCecorex} personas* han sido citadas para comparecencia en CECOREX.\n`;
    if (ag.observaciones && ag.observaciones.length > 0) {
        msg += `\n_Observaciones destacadas:_\n`;
        ag.observaciones.forEach(o => { if (o && typeof o === 'string' && o.trim()) msg += `- ${o.trim()}\n`; });
    }
    msg += `\n_Operativo coordinado por UCRIF Valencia. Parte cerrado._`;
    return msg.trim();
}

document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    let msg = `*🇪🇸 SIREX Resumen Operativo*\n*Periodo:* ${desde} al ${hasta}\n`;
    msg += '\n' + generarResumenUCRIFNarrativo(resumen, desde, hasta) + '\n';
    ['grupo1', 'puerto', 'cecorex', 'gestion', 'cie'].forEach(id => {
        if (resumen[id] && Object.keys(resumen[id]).length > 0){
            const config = GRUPOS_CONFIG[id];
            const data = resumen[id];
            const total = Object.values(data).reduce((acc, val) => acc + (Array.isArray(val) ? 0 : Number(val) || 0), 0);
            if(total > 0 || (id === 'cie' && data['Internos (fin)'])){
                msg += `\n*${config.icon} ${config.label}*\n`;
                let line = [];
                for(const [key, value] of Object.entries(data)){
                    if(!Array.isArray(value) && value !== 0 && value !== "N/D") line.push(`${key}: *${value}*`);
                }
                msg += line.join(', ') + '\n';
            }
        }
    });
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

// =============================================
// PARTE 5: EXPORTACIÓN PDF PROFESIONAL MEJORADA
// =============================================
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let finalY = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SIREX - Resumen Operativo Global", 105, finalY, { align: "center" });
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodo: ${desde} al ${hasta}`, 105, finalY, { align: "center" });
    finalY += 15;
    // UCRIF detallado en PDF
    if (resumen.ucrif) {
        const ag = agruparResumenUCRIF(resumen.ucrif);
        doc.setFontSize(12);
        doc.text(`${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}`, 14, finalY);
        finalY += 8;
        doc.setFontSize(10);
        // Narrativa detallada
        doc.text("Narrativa operativa:", 14, finalY);
        finalY += 6;
        let narrativa = generarResumenUCRIFNarrativo(resumen, desde, hasta).replace(/\*/g,'');
        let split = doc.splitTextToSize(narrativa, 180);
        doc.text(split, 14, finalY);
        finalY += split.length * 6 + 4;
        doc.autoTable({
            startY: finalY,
            head: [['Concepto General', 'Total']],
            body: [
                ["Inspecciones Realizadas", ag.totalInspecciones],
                ["Personas Filiadas", ag.totalFiliados],
                ["Detenidos por ILE", ag.totalDetenidosILE],
                ["Citados a CECOREX", ag.totalCitadosCecorex],
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
        finalY = doc.autoTable.previous.finalY + 10;
        if (Object.keys(ag.detenidosPorDelito).length > 0) {
            doc.text("Detalle de Detenidos por Delito", 14, finalY);
            finalY += 8;
            const body = [];
            Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
                lista.forEach(desc => body.push([delito, desc]));
            });
            doc.autoTable({ startY: finalY, head: [['Motivo', 'Descripción']], body: body, theme: 'striped' });
            finalY = doc.autoTable.previous.finalY + 10;
        }
    }
    // El resto igual que tu PDF original...
    // Grupo 1
    if (resumen.grupo1) {
        const ag = agruparResumenGrupo1(resumen.grupo1);
        if (ag.total_expulsados > 0 || ag.total_frustradas > 0) {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(12);
            doc.text(`${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}`, 14, finalY);
            finalY += 8;
            doc.autoTable({
                startY: finalY,
                head: [['Concepto', 'Total']],
                body: [
                    ['Expulsiones Materializadas', ag.total_expulsados],
                    ['Expulsiones Frustradas', ag.total_frustradas],
                    ['Detenidos', ag.total_detenidos],
                ],
                theme: 'grid',
                headStyles: { fillColor: [52, 152, 219] }
            });
            finalY = doc.autoTable.previous.finalY + 10;
        }
    }
    doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});
