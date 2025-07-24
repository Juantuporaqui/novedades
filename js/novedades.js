// SIREX · Consulta Global / Resúmenes (Versión Pro 2025 · Narrativo, Extensible, Sin Omisiones)

// =========================== 1. CONFIGURACIÓN FIREBASE ===========================
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

// ============================== 2. DOM Y GRUPOS ==============================
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

// ============= 3. QUERIES FIRESTORE: RECOPILA TODO LO POSIBLE, SIN OMITIR =============

const QUERY_STRATEGIES = {
    // --- UCRIF: Inspecciones, Detenidos, Citados, Colaboraciones, Observaciones, etc.
    getUcrifNovedades: async (desde, hasta) => {
        const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo'];
        let rawData = [];
        for (const coll of collections) {
            const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            snap.forEach(doc => rawData.push(doc.data()));
        }
        // Estructura TOTAL
        const resultado = {
            detenidosILE: 0, filiadosVarios: 0, traslados: 0, citadosCecorex: 0,
            inspeccionesCasasCitas: [], detenidosDelito: [], observaciones: [],
            colaboraciones: [], dispositivos: [], // Nuevos campos extraídos
            todasNacionalidades: [], // para suma global
        };
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');

        rawData.forEach(data => {
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4.map(c => c.colaboracionDesc));
            if (data.colaboraciones) resultado.colaboraciones.push(...data.colaboraciones.map(c => c.colaboracionDesc || c));
            if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);
            if (data.observaciones) resultado.observaciones.push(data.observaciones);

            // Detenidos (ILE y DELITO)
            const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
            todosDetenidos.forEach(d => {
                const motivo = d.motivo || d.motivo_g4 || '';
                if (isILE(motivo)) resultado.detenidosILE++;
                else resultado.detenidosDelito.push({
                    nombre: d.detenido || d.detenidos_g4 || '',
                    nacionalidad: d.nacionalidad || d.nacionalidad_g4 || '',
                    motivo: motivo,
                });
            });

            // Inspecciones: sumar todas y todas las nacionalidades
            if (data.inspecciones) {
                resultado.inspeccionesCasasCitas.push(...data.inspecciones.map(i => {
                    // Añade cada nacionalidad para sumatorio global
                    if (i.nacionalidades)
                        i.nacionalidades.split(/[ ,;]+/).map(n=>n.trim()).filter(Boolean).forEach(nac => resultado.todasNacionalidades.push(nac));
                    return {
                        tipo: i.tipo || '', lugar: i.lugar || '', filiadas: Number(i.identificadas) || 0,
                        citadas: Number(i.citadas) || 0, nacionalidades: i.nacionalidades || ''
                    };
                }));
            }
            // Dispositivos/macroperativos: actuaciones
            if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones.map(a => a.descripcion));
        });

        return resultado;
    },
    // --- Expulsiones Grupo 1
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
    // --- Puerto
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
    // --- Cecorex
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
    // --- Genérico: sumar todos los campos de cualquier colección (gestión, cie...)
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
    // --- CIE: añade dato "internos a fin de periodo"
    async getCIE(desde, hasta) {
        const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta);
        const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
        const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
        return { ...rangeTotals, "Internos (fin)": finalCount };
    }
};

// ========== 4. SUBMIT: RECOPILA TODO Y PINTA EN PANTALLA ==========

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
        resumenVentana.innerHTML = renderizarResumenNarrativoHTML(resumen, desde, hasta);
        exportBtns.classList.remove('d-none');
    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally { spinner.classList.add('d-none'); }
});

// ================== 5. AGRUPADOR UCRIF: SUMATORIO, NACIONALIDADES, ETC ==================

function agruparResumenUCRIF(ucrifData) {
    // Agrupa inspecciones por tipología, suma nacionalidades, y todos los totales
    const tipologias = {};
    const nacionalidadesTotales = {};
    let totalInspecciones = 0, totalFiliados = 0, totalCitados = 0;
    let totalDetenidosILE = ucrifData.detenidosILE || 0;
    let totalFiliadosVarios = ucrifData.filiadosVarios || 0;
    let totalTraslados = ucrifData.traslados || 0;
    let totalCitadosCecorex = ucrifData.citadosCecorex || 0;
    let colaboraciones = ucrifData.colaboraciones?.filter(Boolean) || [];
    let dispositivos = ucrifData.dispositivos?.filter(Boolean) || [];
    let observaciones = ucrifData.observaciones?.filter(Boolean) || [];
    let avisoNac = '';

    function clasificarTipo(lugar) {
        if (!lugar) return "Otros";
        lugar = lugar.toLowerCase();
        if (/(cita|escort|prost|put|piso)/.test(lugar)) return "Casas de citas";
        if (/masaj/.test(lugar)) return "Salones de masaje";
        if (/estaci[óo]n|autob[úu]s|ave|metro/.test(lugar)) return "Estaciones/Transporte";
        if (/mendicidad/.test(lugar)) return "Mendicidad";
        if (/textil|empresa/.test(lugar)) return "Empresa textil";
        if (/puerto|maritima/.test(lugar)) return "Puerto";
        return "Otros";
    }
    // Inspecciones
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
            // Nacionalidades individuales por local
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
    // Nacionalidades globales (de todas las inspecciones)
    (ucrifData.todasNacionalidades||[]).forEach(nac => {
        if (nac) nacionalidadesTotales[nac] = (nacionalidadesTotales[nac]||0)+1;
    });
    if (Object.keys(nacionalidadesTotales).length === 0) avisoNac = "No se han podido extraer nacionalidades automáticamente, revisa los partes para completarlas manualmente.";
    // Detenidos por delito: agrupados por motivo
    const detenidosPorDelito = {};
    if (ucrifData.detenidosDelito && ucrifData.detenidosDelito.length) {
        for (const d of ucrifData.detenidosDelito) {
            const motivo = (d.motivo || "Delito no especificado").toLowerCase();
            if (!detenidosPorDelito[motivo]) detenidosPorDelito[motivo] = [];
            let desc = '';
            if (d.nombre && d.nacionalidad) desc = `${d.nombre} (${d.nacionalidad})`;
            else if (d.nombre) desc = d.nombre;
            else desc = d.nacionalidad;
            detenidosPorDelito[motivo].push(desc);
        }
    }
    return {
        tipologias, nacionalidadesTotales, avisoNac, totalInspecciones, totalFiliados, totalCitados,
        totalDetenidosILE, totalFiliadosVarios, totalTraslados, totalCitadosCecorex,
        detenidosPorDelito, colaboraciones, dispositivos, observaciones
    };
}

// =================== 6. RENDER UCRIF (Narrativo, profesional, jugoso) ===================

function renderizarResumenNarrativoHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-2 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span>Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;
    if (resumen.ucrif) html += renderizarUCRIFNarrativo(resumen.ucrif, desde, hasta);
    if (resumen.grupo1) html += renderizarResumenDetalladoGrupo1(resumen, desde, hasta);
    if (resumen.puerto) html += renderizarResumenDetalladoPuerto(resumen, desde, hasta);
    if (resumen.cecorex) html += renderizarResumenDetalladoCecorex(resumen, desde, hasta);
    if (resumen.gestion) html += renderizarResumenDetalladoBasico(resumen, 'gestion');
    if (resumen.cie) html += renderizarResumenDetalladoBasico(resumen, 'cie');
    return html;
}

function renderizarUCRIFNarrativo(ucrif, desde, hasta) {
    const ag = agruparResumenUCRIF(ucrif);
    let out = `<div class="card border-info mb-4 shadow"><div class="card-header bg-info text-white text-center">
        <h4>${GRUPOS_CONFIG.ucrif.icon} NOVEDADES UCRIF</h4></div><div class="card-body p-3">`;
    out += `<div class="alert alert-info"><b>Operativo UCRIF Valencia (${desde} a ${hasta})</b><br>`;
    if (ag.totalInspecciones > 0) {
        out += `Durante este periodo se han realizado <b>${ag.totalInspecciones}</b> inspecciones en locales de distintas tipologías:`;
        Object.entries(ag.tipologias).forEach(([tipo, val]) => {
            out += `<br>• <b>${tipo}:</b> ${val.inspecciones} locales (${val.locales.map(l => l.lugar).join("; ")})`;
            val.locales.forEach(l => {
                out += `<br style="margin-left:1em"/>- ${l.lugar}: ${l.filiados ?? 0} filiadas`;
                if (l.citados) out += `, ${l.citados} citadas`;
                if (l.nacionalidades) out += ` (${l.nacionalidades})`;
            });
        });
    }
    if (Object.keys(ag.nacionalidadesTotales).length > 0) {
        out += `<br><br><u><b>Totales por nacionalidad:</b></u> `;
        let nacString = Object.entries(ag.nacionalidadesTotales)
            .filter(([n]) => !n.startsWith('_'))
            .map(([n, v]) => `${v} ${n}`)
            .join(', ');
        out += nacString || "<span class='text-muted'>Sin nacionalidades extraídas automáticamente.</span>";
    } else if (ag.avisoNac) {
        out += `<br><span class="text-danger"><b>Aviso:</b> ${ag.avisoNac}</span>`;
    }
    if (ag.totalDetenidosILE > 0) out += `<br><br><b>${ag.totalDetenidosILE}</b> personas detenidas por infracción a la Ley de Extranjería (ILE).`;
    if (Object.keys(ag.detenidosPorDelito).length > 0) {
        out += `<br><u><b>Detenidos por delito:</b></u>`;
        Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
            out += `<br>• ${lista.length} por ${delito}:<ul style="margin-bottom:0">${lista.map(d => `<li>${d}</li>`).join('')}</ul>`;
        });
    }
    if (ag.dispositivos?.length) {
        out += `<br><u><b>Dispositivos especiales:</b></u>`;
        ag.dispositivos.forEach(d => out += `<br>• ${d}`);
    }
    if (ag.colaboraciones?.length) {
        out += `<br><u><b>Colaboraciones realizadas con:</b></u> `;
        out += ag.colaboraciones.map(c => `<span>${c}</span>`).join(', ');
    }
    if (ag.totalCitadosCecorex > 0) out += `<br><b>${ag.totalCitadosCecorex} personas citadas para comparecencia en CECOREX.</b>`;
    if (ag.observaciones?.length) {
        out += `<br><u><b>Observaciones y comentarios relevantes:</b></u>`;
        ag.observaciones.forEach(o => out += `<br>• ${o}`);
    }
    out += `<br><br><i>Operativo coordinado por UCRIF Valencia. Parte cerrado.</i>`;
    out += `</div></div></div>`;
    return out;
}

// =================== 7. EXPORTACIÓN WHATSAPP (Narrativo, detallado) ===================
document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const msg = generarTextoWhatsappNarrativo(resumen, desde, hasta);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
});

function generarTextoWhatsappNarrativo(resumen, desde, hasta) {
    const ag = agruparResumenUCRIF(resumen.ucrif);
    let out = `🛡️ *NOVEDADES UCRIF* (${desde} a ${hasta})\n\n`;
    if (ag.totalInspecciones > 0) {
        out += `Durante este periodo se han realizado *${ag.totalInspecciones}* inspecciones:\n`;
        Object.entries(ag.tipologias).forEach(([tipo, val]) => {
            out += `  • *${tipo}:* ${val.inspecciones} locales (${val.locales.map(l => l.lugar).join("; ")})\n`;
            val.locales.forEach(l => {
                out += `      - ${l.lugar}: ${l.filiados ?? 0} filiadas`;
                if (l.citados) out += `, ${l.citados} citadas`;
                if (l.nacionalidades) out += ` (${l.nacionalidades})`;
                out += `\n`;
            });
        });
    }
    if (Object.keys(ag.nacionalidadesTotales).length > 0) {
        out += `\n_Totales por nacionalidad:_ `;
        out += Object.entries(ag.nacionalidadesTotales)
            .filter(([n]) => !n.startsWith('_'))
            .map(([n, v]) => `${v} ${n}`).join(', ') || "Sin nacionalidades auto-extraídas.";
        out += `\n`;
    }
    if (ag.totalDetenidosILE > 0) out += `\n*${ag.totalDetenidosILE}* detenidos por ILE.\n`;
    if (Object.keys(ag.detenidosPorDelito).length > 0) {
        out += `\n_Detenidos por delito:_\n`;
        Object.entries(ag.detenidosPorDelito).forEach(([delito, lista]) => {
            out += ` • ${lista.length} por ${delito}:\n`;
            lista.forEach(d => out += `    - ${d}\n`);
        });
    }
    if (ag.dispositivos?.length) {
        out += `\n_Dispositivos especiales:_\n`;
        ag.dispositivos.forEach(d => out += ` • ${d}\n`);
    }
    if (ag.colaboraciones?.length) {
        out += `\n_Colaboraciones:_ `;
        out += ag.colaboraciones.join(', ') + "\n";
    }
    if (ag.totalCitadosCecorex > 0) out += `\n*${ag.totalCitadosCecorex}* personas citadas para CECOREX.\n`;
    if (ag.observaciones?.length) {
        out += `\n_Observaciones:_\n`;
        ag.observaciones.forEach(o => out += ` • ${o}\n`);
    }
    out += `\n_Operativo coordinado por UCRIF Valencia. Parte cerrado._\n`;
    return out;
}

// =================== 8. EXPORTACIÓN PDF (Texto narrativo, idéntico a WhatsApp) ===================
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
    let y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("SIREX - Resumen Operativo Global", 300, y, { align: "center" });
    y += 20;
    doc.setFontSize(11);
    doc.text(`Periodo: ${desde} a ${hasta}`, 300, y, { align: "center" });
    y += 25;
    // UCRIF narrativo
    const ucrifText = generarTextoWhatsappNarrativo(resumen, desde, hasta).replace(/\n/g, '\n');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(ucrifText, 40, y, { maxWidth: 520 });
    y += 150;
    // Puedes añadir otros grupos con tabla si quieres
    doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});

// =================== 9. RESTO DE GRUPOS ===================
// Puedes mantener su renderizado clásico (usa tu render actual para grupo1, puerto, cecorex, etc.)

// =================== FIN. CODIGO DE CONSULTA DEFINITIVO SIREX ===================

