// js/consulta.js
// SIREX · Consulta Global / Resúmenes (Versión 2.3 - Detalles UCRIF y PDF Profesional)

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
// ====== ARQUITECTURA DE CONSULTA Y AGREGACIÓN (CON MÁS DETALLES) ================
// =================================================================================

const QUERY_STRATEGIES = {
    // --- ESTRATEGIA DE CONSULTA DETALLADA PARA UCRIF (MEJORADA) ---
    getUcrifNovedades: async (desde, hasta) => {
        const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo'];
        let rawData = [];
        for (const coll of collections) {
            const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            snap.forEach(doc => rawData.push(doc.data()));
        }

        const resultado = {
            detenidosILE: 0, filiadosVarios: 0, traslados: 0, citadosCecorex: 0,
            inspeccionesCasasCitas: [], detenidosDelito: [],
            colaboracionesG4: [], inspeccionesG4: [], gestionesG4: [] // NUEVOS DATOS
        };
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');
        rawData.forEach(data => {
            // G4
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            if (data.colaboraciones_g4) resultado.colaboracionesG4.push(...data.colaboraciones_g4);
            if (data.inspecciones_g4) resultado.inspeccionesG4.push(...data.inspecciones_g4);
            if (data.gestiones_varias_g4) resultado.gestionesG4.push(...data.gestiones_varias_g4);

            // G2, G3
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
    // ... (resto de estrategias de consulta se mantienen igual) ...
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
        // El renderizado en pantalla se mantiene, ya que es una vista rápida. El PDF será el informe visual.
        resumenVentana.innerHTML = renderizarResumenDetalladoHTML(resumen, desde, hasta);
        exportBtns.classList.remove('d-none');

    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally {
        spinner.classList.add('d-none');
    }
});

// --- RENDERIZADO EN PANTALLA (ACTUALIZADO CON DATOS G4) ---
function renderizarResumenDetalladoHTML(resumen, desde, hasta) {
    let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;
    const ucrif = resumen.ucrif;
    if (ucrif) {
        html += `<div class="card mb-3"><div class="card-header"><h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4></div><div class="card-body">`;
        html += `<p><strong>${ucrif.detenidosILE}</strong> ILE, <strong>${ucrif.filiadosVarios}</strong> filiados, <strong>${ucrif.traslados}</strong> traslados, <strong>${ucrif.citadosCecorex}</strong> citados.</p><hr/>`;
        if (ucrif.detenidosDelito.length > 0) {
            html += `<p><strong>Detenidos por delito (${ucrif.detenidosDelito.length}):</strong></p><ul>`;
            ucrif.detenidosDelito.forEach(d => { html += `<li>1 ${d.descripcion} por ${d.motivo.toLowerCase()}.</li>`; });
            html += `</ul><hr/>`;
        }
        if (ucrif.colaboracionesG4.length > 0) {
            html += `<p><strong>Colaboraciones G4:</strong> ${ucrif.colaboracionesG4.length}</p>`;
        }
        html += `</div></div>`;
    }
    // El resto de la renderización sigue igual para mantenerla ágil en pantalla
    html += `<div class="list-group">`;
    // ... (resto de la función renderizarResumenDetalladoHTML) ...
    ['grupo1', 'puerto', 'cecorex', 'gestion', 'cie'].forEach(grupoId => {
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        if (datosGrupo && Object.values(datosGrupo).some(v => v > 0 || v.length > 0 || (v && v !== "N/D"))) {
            html += `<div class="list-group-item"><h5 class="mb-1">${config.icon} ${config.label}</h5>
                     <ul class="list-unstyled mb-0">`;
            for(const [key, value] of Object.entries(datosGrupo)) {
                html += `<li>${key}: <strong>${Array.isArray(value) ? value.length : value}</strong></li>`;
            }
            html += `</ul></div>`;
        }
    });
    html += `</div>`;
    return html;
}


// =================================================================================
// ====== EXPORTACIONES (WHATSAPP ACTUALIZADO, PDF NUEVO) =========================
// =================================================================================

function generarTextoWhatsapp(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX Resumen Global*\n*Periodo:* ${desde} al ${hasta}\n`;
    const ucrif = resumen.ucrif;
    if (ucrif) {
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
        if (ucrif.colaboracionesG4.length > 0 || ucrif.inspeccionesG4.length > 0) {
             msg += `- _Actividad G. Op.:_ ${ucrif.colaboracionesG4.length} colab., ${ucrif.inspeccionesG4.length} inspec.\n`;
        }
    }
    // ... resto de la función de WhatsApp se mantiene
    ['grupo1', 'puerto', 'cecorex', 'gestion', 'cie'].forEach(grupoId => {
        // ...
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

// --- NUEVA FUNCIÓN DE EXPORTACIÓN A PDF VISUAL CON TABLAS ---
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");

    const { resumen, desde, hasta } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let finalY = 20; // Posición vertical inicial

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SIREX - Resumen Global Operativo", 105, finalY, { align: "center" });
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodo: ${desde} al ${hasta}`, 105, finalY, { align: "center" });
    finalY += 15;

    // --- Tabla UCRIF ---
    const ucrif = resumen.ucrif;
    if (ucrif) {
        doc.setFontSize(12);
        doc.text(`${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}`, 14, finalY);
        finalY += 5;
        
        const ucrifBody = [
            ["Detenidos por Infracción Ley Extranjería (ILE)", ucrif.detenidosILE],
            ["Personas Filiadas", ucrif.filiadosVarios],
            ["Citados a CECOREX", ucrif.citadosCecorex],
            ["Traslados para Identificación", ucrif.traslados],
            ["Colaboraciones (G. Operativo)", ucrif.colaboracionesG4.length],
            ["Inspecciones (G. Operativo)", ucrif.inspeccionesG4.length],
        ];
        doc.autoTable({
            startY: finalY,
            head: [['Concepto', 'Total']],
            body: ucrifBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] }
        });
        finalY = doc.autoTable.previous.finalY + 10;

        if (ucrif.detenidosDelito.length > 0) {
            doc.text("Detalle de Detenidos por Delito", 14, finalY);
            finalY += 5;
            doc.autoTable({
                startY: finalY,
                head: [['Motivo', 'Descripción']],
                body: ucrif.detenidosDelito.map(d => [d.motivo, d.descripcion]),
                theme: 'striped'
            });
            finalY = doc.autoTable.previous.finalY + 10;
        }
    }

    // --- Resto de Grupos ---
    function drawSimpleTable(title, icon, data) {
        if (finalY > 250) { // Salto de página si no hay espacio
            doc.addPage();
            finalY = 20;
        }
        doc.setFontSize(12);
        doc.text(`${icon} ${title}`, 14, finalY);
        finalY += 5;
        doc.autoTable({
            startY: finalY,
            body: Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.length : value]),
            theme: 'grid'
        });
        finalY = doc.autoTable.previous.finalY + 10;
    }
    
    drawSimpleTable("Expulsiones", GRUPOS_CONFIG.grupo1.icon, resumen.grupo1);
    drawSimpleTable("Puerto", GRUPOS_CONFIG.puerto.icon, resumen.puerto);
    drawSimpleTable("CECOREX", GRUPOS_CONFIG.cecorex.icon, resumen.cecorex);
    drawSimpleTable("Gestión", GRUPOS_CONFIG.gestion.icon, resumen.gestion);
    drawSimpleTable("CIE", GRUPOS_CONFIG.cie.icon, resumen.cie);

    doc.save(`SIREX-Resumen-Visual_${desde}_a_${hasta}.pdf`);
});
