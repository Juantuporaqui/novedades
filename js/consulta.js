// SIREX · Consulta Global / Resúmenes (Versión Definitiva 2025 – Completa y Profesional)

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
    grupo1: { label: 'Expulsiones', icon: '�', color: 'primary' },
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
// PARTE 3: FUNCIONES PARA AGRUPAR Y MOSTRAR DATOS
// ========================================================================

// -------- TABLA MULTICOLUMNA genérica para datos simples --------
function renderizarTablaMulticolumna(obj, maxCol = 3) {
    const keys = Object.keys(obj).filter(
        k => obj[k] !== 0 && obj[k] !== "" && obj[k] !== null && obj[k] !== "N/D" && !Array.isArray(obj[k])
    );
    if (!keys.length) return "<div class='text-muted'>Sin datos.</div>";
    let columnas = Math.min(maxCol, Math.ceil(keys.length / 6) + 1);
    let html = `<div class="row">`;
    const perCol = Math.ceil(keys.length / columnas);
    for (let c = 0; c < columnas; c++) {
        html += `<div class="col-md-${Math.floor(12/columnas)}"><ul class="list-group list-group-flush">`;
        for (let i = c * perCol; i < (c + 1) * perCol && i < keys.length; i++) {
            const k = keys[i];
            let keyText = k.replace(/_/g, " ").replace(/g[1-4]|cc/g, "").trim();
            keyText = keyText.charAt(0).toUpperCase() + keyText.slice(1);
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${keyText}</span><span class="badge bg-secondary rounded-pill">${obj[k]}</span>
            </li>`;
        }
        html += `</ul></div>`;
    }
    html += `</div>`;
    return html;
}

// ======================= RENDERIZADORES HTML/PDF AVANZADOS =======================

function renderizarResumenGlobalHTML(resumen, desde, hasta) {
    let html = `<div class="alert alert-dark text-center my-3 p-2" style="font-size:1.3rem;">
        <b>RESUMEN OPERATIVO SIREX</b><br>
        <span class="fs-6">Periodo: <b>${desde}</b> a <b>${hasta}</b></span>
    </div>`;

    if (resumen.ucrif && (resumen.ucrif.inspecciones.length + resumen.ucrif.detenidosDelito.length + resumen.ucrif.detenidosILE > 0)) {
        html += renderizarResumenDetalladoUCRIF(resumen.ucrif);
    }
    if (resumen.grupo1 && (resumen.grupo1.detenidos.length + resumen.grupo1.expulsados.length + resumen.grupo1.frustradas.length > 0)) {
        html += renderizarResumenDetalladoGrupo1(resumen.grupo1);
    }
    if (resumen.puerto && Object.keys(resumen.puerto).length > 1) {
        html += renderizarResumenDetalladoBasico(resumen, 'puerto');
    }
     if (resumen.cecorex && Object.keys(resumen.cecorex).length > 1) {
        html += renderizarResumenDetalladoBasico(resumen, 'cecorex');
    }
    if (resumen.gestion && Object.keys(resumen.gestion).length > 0) {
        html += renderizarResumenDetalladoBasico(resumen, 'gestion');
    }
    if (resumen.cie && Object.keys(resumen.cie).length > 0) {
        html += renderizarResumenDetalladoBasico(resumen, 'cie');
    }

    return html;
}

// --- UCRIF Detallado y Narrativo ---
function renderizarResumenDetalladoUCRIF(ucrif) {
    let html = `<div class="card border-info mb-4 shadow-sm">
    <div class="card-header bg-info text-white">
      <h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4>
    </div>
    <div class="card-body p-3">`;
    
    html += `<p><b>Totales:</b> ${ucrif.detenidosILE} ILE, ${ucrif.filiadosVarios} filiados, ${ucrif.traslados} traslados, ${ucrif.citadosCecorex} citados.</p>`;

    if (ucrif.inspecciones.length > 0) {
        html += `<h5 class="mt-3">Inspecciones</h5><ul class="list-group">`;
        ucrif.inspecciones.forEach(insp => {
            html += `<li class="list-group-item">${insp.lugar || 'Lugar no especificado'}: ${insp.identificadas || 0} filiadas (${insp.nacionalidades || 'N/A'}), ${insp.citadas || 0} citadas.</li>`;
        });
        html += `</ul>`;
    }

    if (ucrif.detenidosDelito.length > 0) {
        html += `<h5 class="mt-3">Detenidos por Delito</h5><ul class="list-group">`;
        ucrif.detenidosDelito.forEach(d => {
            html += `<li class="list-group-item">${d.descripcion} por ${d.motivo}</li>`;
        });
        html += `</ul>`;
    }
    
    if (ucrif.colaboraciones.length > 0) {
        html += `<h5 class="mt-3">Colaboraciones</h5><ul class="list-group">`;
        ucrif.colaboraciones.forEach(c => {
            html += `<li class="list-group-item">Con <b>${c.colaboracionUnidad || 'N/A'}</b>: ${c.colaboracionDesc} (Resultado: ${c.colaboracionResultado})</li>`;
        });
        html += `</ul>`;
    }

    html += `</div></div>`;
    return html;
}

// --- Grupo 1 Expulsiones: Redacción ampliada ---
function renderizarResumenDetalladoGrupo1(g1) {
    let html = `<div class="card border-primary mb-4 shadow-sm">
    <div class="card-header bg-primary text-white">
      <h4>${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}</h4>
    </div>
    <div class="card-body p-3">`;

    if (g1.detenidos.length > 0) {
        html += `<h5>Detenidos (${g1.detenidos.length})</h5><ul class="list-group mb-3">`;
        g1.detenidos.forEach(d => { html += `<li class="list-group-item">${d.detenidos_g1} (${d.nacionalidad_g1}) por ${d.motivo_g1}</li>`; });
        html += `</ul>`;
    }
    if (g1.expulsados.length > 0) {
        html += `<h5>Expulsados (${g1.expulsados.length})</h5><ul class="list-group mb-3">`;
        g1.expulsados.forEach(e => { html += `<li class="list-group-item">${e.expulsados_g1} (${e.nacionalidad_eg1})</li>`; });
        html += `</ul>`;
    }
    if (g1.frustradas.length > 0) {
        html += `<h5>Expulsiones Frustradas (${g1.frustradas.length})</h5><ul class="list-group mb-3">`;
        g1.frustradas.forEach(f => { html += `<li class="list-group-item">${f.exp_frustradas_g1} (${f.nacionalidad_fg1}) - Motivo: ${f.motivo_fg1}</li>`; });
        html += `</ul>`;
    }
    if (g1.fletados.length > 0) {
        html += `<h5>Vuelos Fletados</h5><ul class="list-group">`;
        g1.fletados.forEach(f => { html += `<li class="list-group-item">${f.fletados_g1} a ${f.destino_flg1} con ${f.pax_flg1} PAX</li>`; });
        html += `</ul>`;
    }
    html += `</div></div>`;
    return html;
}

// --- Renderizador Básico para Puerto, Cecorex, etc. ---
function renderizarResumenDetalladoBasico(resumen, grupoId) {
    const config = GRUPOS_CONFIG[grupoId];
    const datos = resumen[grupoId];
    let html = `<div class="card border-${config.color} mb-4 shadow-sm">
    <div class="card-header bg-${config.color} text-white">
      <h4>${config.icon} ${config.label}</h4>
    </div>
    <div class="card-body p-3">
      ${renderizarTablaMulticolumna(datos, 2)}
    </div></div>`;
    return html;
}

// ========================================================================
// PARTE 4: FUNCIONES DE EXPORTACIÓN (CORREGIDAS Y MEJORADAS)
// ========================================================================

// --- EXPORTACIÓN A WHATSAPP ---
document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta } = window._ultimoResumen;
    const msg = generarTextoWhatsapp(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

function generarTextoWhatsapp(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX Resumen Operativo*\n*Periodo:* ${desde} al ${hasta}\n`;

    // UCRIF
    if (resumen.ucrif) {
        const ucrif = resumen.ucrif;
        const tieneActividad = ucrif.inspecciones.length + ucrif.detenidosDelito.length + ucrif.detenidosILE + ucrif.colaboraciones.length > 0;
        
        if (tieneActividad) {
            msg += `\n*${GRUPOS_CONFIG.ucrif.icon} NOVEDADES UCRIF*\n`;
            msg += `Balance: *${ucrif.detenidosILE}* detenidos por ILE, *${ucrif.filiadosVarios}* filiados en vía pública, *${ucrif.traslados}* traslados y *${ucrif.citadosCecorex}* citados a CECOREX.\n`;
            
            if (ucrif.inspecciones.length > 0) {
                msg += `\n*Inspecciones Relevantes:*\n`;
                ucrif.inspecciones.forEach(i => {
                    msg += ` • En *${i.lugar || 'lugar no especificado'}*: ${i.identificadas || 0} filiadas (${i.nacionalidades || 'N/A'}) y ${i.citadas || 0} citadas.\n`;
                });
                const totalFiliadas = ucrif.inspecciones.reduce((sum, i) => sum + (Number(i.identificadas) || 0), 0);
                const totalCitadas = ucrif.inspecciones.reduce((sum, i) => sum + (Number(i.citadas) || 0), 0);
                msg += `_*En total son ${ucrif.inspecciones.length} inspecciones con ${totalFiliadas} filiadas y ${totalCitadas} citadas.*_\n`;
            }

            if (ucrif.detenidosDelito.length > 0) {
                msg += `\n*Detenidos por Delito:*\n`;
                ucrif.detenidosDelito.forEach(d => {
                    msg += ` • 1 por *${d.motivo}* (${d.descripcion}).\n`;
                });
                msg += `_*En total son ${ucrif.detenidosDelito.length} detenidos por delitos específicos.*_\n`;
            }

            const dispositivosRailpol = ucrif.dispositivos.filter(d => d.operacion?.toUpperCase().includes('RAILPOL'));
            if(dispositivosRailpol.length > 0){
                msg += `\n*Resultados Dispositivo Railpol:*\n`;
                // NOTA: Los datos de partes no desglosan los totales por dispositivo. Esto es una simulación del formato.
                // Para datos reales, el parte de origen necesitaría más estructura.
                msg += `Se participó en el dispositivo con resultados incluidos en los totales generales.\n`
            }

            if (ucrif.colaboraciones.length > 0) {
                msg += `\n*Colaboraciones con otras unidades:*\n`;
                ucrif.colaboraciones.forEach(c => {
                    msg += ` • Con *${c.colaboracionUnidad || 'N/A'}*: ${c.colaboracionDesc}.\n`;
                });
            }
        }
    }
    
    // Grupo 1
    if (resumen.grupo1) {
        const g1 = resumen.grupo1;
        if (g1.detenidos.length + g1.expulsados.length > 0) {
            msg += `\n*${GRUPOS_CONFIG.grupo1.icon} Expulsiones*\n`;
            if(g1.detenidos.length > 0) {
                msg += `\n*Detenidos (${g1.detenidos.length}):*\n`;
                g1.detenidos.forEach(d => msg += ` • ${d.detenidos_g1} (${d.nacionalidad_g1}) por ${d.motivo_g1}.\n`);
            }
            if(g1.expulsados.length > 0) {
                msg += `\n*Expulsados (${g1.expulsados.length}):*\n`;
                g1.expulsados.forEach(e => msg += ` • ${e.expulsados_g1} (${e.nacionalidad_eg1}).\n`);
            }
            if(g1.frustradas.length > 0) {
                msg += `\n*Frustradas (${g1.frustradas.length}):*\n`;
                g1.frustradas.forEach(f => msg += ` • ${f.exp_frustradas_g1} (${f.nacionalidad_fg1}) - ${f.motivo_fg1}.\n`);
            }
             if(g1.fletados.length > 0) {
                msg += `\n*Vuelos Fletados:*\n`;
                g1.fletados.forEach(f => msg += ` • ${f.fletados_g1} a ${f.destino_flg1} (${f.pax_flg1} PAX).\n`);
            }
        }
    }
    
    return msg;
}

// --- EXPORTACIÓN A PDF PROFESIONAL ---
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
    finalY += 15;

    // --- UCRIF ---
    if (resumen.ucrif) {
        const ucrif = resumen.ucrif;
        doc.setFontSize(12);
        doc.text(`${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}`, 14, finalY);
        finalY += 8;
        
        doc.autoTable({
            startY: finalY,
            head: [['Concepto General', 'Total']],
            body: [
                ["Detenidos por ILE", ucrif.detenidosILE],
                ["Personas Filiadas", ucrif.filiadosVarios],
                ["Citados a CECOREX", ucrif.citadosCecorex],
                ["Traslados para Identificación", ucrif.traslados],
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
        finalY = doc.autoTable.previous.finalY + 10;

        if (ucrif.detenidosDelito.length > 0) {
            doc.text("Detalle de Detenidos por Delito", 14, finalY);
            finalY += 8;
            doc.autoTable({ startY: finalY, head: [['Motivo', 'Descripción']], body: ucrif.detenidosDelito.map(d => [d.motivo, d.descripcion]), theme: 'striped' });
            finalY = doc.autoTable.previous.finalY + 10;
        }
        if (ucrif.inspecciones.length > 0) {
             if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.text("Detalle de Inspecciones", 14, finalY);
            finalY += 8;
            doc.autoTable({ startY: finalY, head: [['Lugar', 'Filiadas', 'Citadas', 'Nacionalidades']], body: ucrif.inspecciones.map(i => [i.lugar, i.identificadas, i.citadas, i.nacionalidades]), theme: 'striped' });
            finalY = doc.autoTable.previous.finalY + 10;
        }
    }
    
    // --- Grupo 1 ---
    if (resumen.grupo1) {
        const g1 = resumen.grupo1;
        if (g1.detenidos.length + g1.expulsados.length > 0) {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(12);
            doc.text(`${GRUPOS_CONFIG.grupo1.icon} ${GRUPOS_CONFIG.grupo1.label}`, 14, finalY);
            finalY += 8;
            
            if (g1.detenidos.length > 0) {
                 doc.autoTable({ startY: finalY, head: [['Detenido', 'Nacionalidad', 'Motivo']], body: g1.detenidos.map(d => [d.detenidos_g1, d.nacionalidad_g1, d.motivo_g1]), theme: 'grid', headStyles: { fillColor: [88, 86, 214] } });
                 finalY = doc.autoTable.previous.finalY + 5;
            }
             if (g1.expulsados.length > 0) {
                 doc.autoTable({ startY: finalY, head: [['Expulsado', 'Nacionalidad']], body: g1.expulsados.map(e => [e.expulsados_g1, e.nacionalidad_eg1]), theme: 'grid', headStyles: { fillColor: [52, 152, 219] } });
                 finalY = doc.autoTable.previous.finalY + 5;
            }
            if (g1.frustradas.length > 0) {
                 doc.autoTable({ startY: finalY, head: [['Frustrada', 'Nacionalidad', 'Motivo']], body: g1.frustradas.map(f => [f.exp_frustradas_g1, f.nacionalidad_fg1, f.motivo_fg1]), theme: 'grid', headStyles: { fillColor: [241, 196, 15] } });
                 finalY = doc.autoTable.previous.finalY + 5;
            }
             if (g1.fletados.length > 0) {
                 doc.autoTable({ startY: finalY, head: [['Vuelo', 'Destino', 'PAX']], body: g1.fletados.map(f => [f.fletados_g1, f.destino_flg1, f.pax_flg1]), theme: 'grid', headStyles: { fillColor: [26, 188, 156] } });
                 finalY = doc.autoTable.previous.finalY + 10;
            }
        }
    }
    
    doc.save(`SIREX-Resumen-Operativo_${desde}_a_${hasta}.pdf`);
});
