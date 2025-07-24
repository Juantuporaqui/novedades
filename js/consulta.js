// js/consulta.js
// SIREX · Consulta Global / Resúmenes (Versión 2.0 - Mejorada con Resúmenes Detallados y de WhatsApp)

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
    grupo1: { label: 'Expulsiones', icon: '🚔', collection: 'grupo1_expulsiones' },
    puerto: { label: 'Puerto', icon: '⚓', collection: 'grupoPuerto_registros' },
    cecorex: { label: 'CECOREX', icon: '📡', collection: 'cecorex_registros' },
    gestion: { label: 'Gestión', icon: '📋', collection: 'gestion_registros' },
    cie: { label: 'CIE', icon: '🏢', collection: 'cie_registros' }
};

// =================================================================================
// ====== ARQUITECTURA DE CONSULTA Y AGREGACIÓN ===================================
// =================================================================================

const QUERY_STRATEGIES = {
    // Estrategia genérica para sumar campos numéricos o contar elementos de un array
    sumarCampos: async (collection, desde, hasta, fields) => {
        const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const totals = fields.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {});
        snap.forEach(doc => {
            const data = doc.data();
            fields.forEach(field => {
                const value = data[field.name];
                if (Array.isArray(value)) {
                    totals[field.key] += value.length;
                } else {
                    totals[field.key] += Number(value) || 0;
                }
            });
        });
        return totals;
    },

    // --- NUEVA ESTRATEGIA DETALLADA PARA UCRIF ---
    getUcrifNovedades: async (desde, hasta) => {
        const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo'];
        let rawData = [];

        for (const coll of collections) {
            const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            snap.forEach(doc => rawData.push(doc.data()));
        }

        const resultado = {
            detenidosILE: 0,
            filiadosVarios: 0,
            traslados: 0,
            citadosCecorex: 0,
            inspeccionesCasasCitas: [],
            detenidosDelito: [],
            otrasActuaciones: [],
            operacionesEspeciales: {}
        };
        
        const isILE = (motivo = '') => motivo.toUpperCase().includes('ILE') || motivo.toUpperCase().includes('EXTRANJERÍA');

        rawData.forEach(data => {
            // Sumar totales de Grupo 4
            resultado.filiadosVarios += Number(data.identificados_g4) || 0;
            resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
            if (data.traslados_g4) resultado.traslados += (String(data.traslados_g4).match(/\d+/) || [0])[0] * 1;
            
            // Procesar detenidos de G2, G3 y G4
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

            // Procesar inspecciones de G2 y G3
            if (data.inspecciones) {
                 data.inspecciones.forEach(insp => {
                    resultado.inspeccionesCasasCitas.push({
                       lugar: insp.lugar || "Lugar no especificado",
                       filiadas: Number(insp.identificadas) || 0,
                       citadas: Number(insp.citadas) || 0,
                       nacionalidades: insp.nacionalidades || ""
                    });
                });
            }

            // Procesar actuaciones de G2 y G3 (para dispositivos especiales)
            if (data.actuaciones) {
                data.actuaciones.forEach(act => {
                    const op = act.operacion?.toUpperCase();
                    if (op && (op.includes('RAILPOL') || op.includes('EMPACT'))) {
                        if (!resultado.operacionesEspeciales[op]) {
                            resultado.operacionesEspeciales[op] = { detenidosILE: 0, filiados: 0, traslados: 0, citados: 0, funcionarios: 0 };
                        }
                        // Esta parte es una estimación; la estructura del parte no detalla esto por actuación.
                        // Se podría mejorar si el parte de origen tuviera más estructura.
                    } else {
                        resultado.otrasActuaciones.push(act.descripcion);
                    }
                });
            }
        });
        
        return resultado;
    },

    // --- ESTRATEGIAS AGREGADAS PARA OTROS GRUPOS ---
    getGrupo1: function(d, h) { return this.sumarCampos('grupo1_expulsiones', d, h, [{name:'detenidos_g1',key:'Detenidos'}, {name:'expulsados_g1',key:'Exp. OK'}, {name:'exp_frustradas_g1',key:'Exp. KO'}, {name:'fletados_g1',key:'Fletados'}]); },
    getPuerto: function(d, h) { return this.sumarCampos('grupoPuerto_registros', d, h, [{name:'denegaciones',key:'Denegaciones'}, {name:'cruceristas',key:'Cruceristas'}, {name:'visadosExp',key:'Visados Exp.'}, {name:'detenidos',key:'Detenidos'}, {name:'marinosArgos',key:'Ctrl. Argos'}, {name:'ptosDeportivos',key:'Ptos. Deport.'}, {name:'ferrys',key:'Mov. Ferry'}]); },
    getCecorex: function(d, h) { return this.sumarCampos('cecorex_registros', d, h, [{name:'detenidos_cc',key:'Detenidos'}, {name:'decretos_exp',key:'Decretos Exp.'}, {name:'proh_entrada',key:'Prohib. Entrada'}, {name:'dil_informe',key:'Dilig. Informe'}, {name:'notificaciones',key:'Notif.'}, {name:'al_abogados',key:'Asist. Letrada'}]); },
    getGestion: function(d, h) { return this.sumarCampos('gestion_registros', d, h, [{name:'ENTRV. ASILO',key:'Entrev. Asilo'}, {name:'ASILOS CONCEDIDOS',key:'Asilos OK'}, {name:'ASILOS DENEGADOS',key:'Asilos KO'}, {name:'CARTAS CONCEDIDAS',key:'Cartas OK'}, {name:'CARTAS DENEGADAS',key:'Cartas KO'}, {name:'TARJET. SUBDELEG',key:'Tarjetas Subd.'}]); },
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
            grupo1: QUERY_STRATEGIES.getGrupo1(desde, hasta),
            puerto: QUERY_STRATEGIES.getPuerto(desde, hasta),
            cecorex: QUERY_STRATEGIES.getCecorex(desde, hasta),
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


function renderizarResumenDetalladoHTML(resumen, desde, hasta) {
    let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;

    // --- SECCIÓN DETALLADA DE UCRIF ---
    const ucrif = resumen.ucrif;
    if (ucrif) {
        html += `<div class="card mb-3"><div class="card-header"><h4>${GRUPOS_CONFIG.ucrif.icon} ${GRUPOS_CONFIG.ucrif.label}</h4></div><div class="card-body">`;
        
        html += `<p><strong>${ucrif.detenidosILE}</strong> detenidos por ILE, <strong>${ucrif.filiadosVarios}</strong> filiados en vía pública, <strong>${ucrif.traslados}</strong> traslados a efectos de identificación y <strong>${ucrif.citadosCecorex}</strong> citados a CECOREX.</p><hr/>`;
        
        if (ucrif.inspeccionesCasasCitas.length > 0) {
            ucrif.inspeccionesCasasCitas.forEach(insp => {
                html += `<p><strong>1 casa de citas en ${insp.lugar}</strong> con ${insp.filiadas} filiadas (${insp.nacionalidades}) y ${insp.citadas} citadas.</p>`;
            });

            const totalCasas = ucrif.inspeccionesCasasCitas.length;
            const totalFiliadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.filiadas, 0);
            const totalCitadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.citadas, 0);
            const allNacionalidades = ucrif.inspeccionesCasasCitas.map(i => i.nacionalidades).join(', ').split(/, | y /).map(n => n.trim()).filter(Boolean);
            const conteoNacionalidades = allNacionalidades.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});
            const nacionalidadesStr = Object.entries(conteoNacionalidades).map(([nac, count]) => `${count} ${nac}`).join(', ');

            html += `<p><em><strong>En total son ${totalCasas} casas de citas con ${totalFiliadas} filiadas (${nacionalidadesStr}) y ${totalCitadas} citadas.</strong></em></p><hr/>`;
        }

        if (ucrif.detenidosDelito.length > 0) {
            html += `<p><strong>Detenidos por delito:</strong></p><ul>`;
            ucrif.detenidosDelito.forEach(d => {
                html += `<li>1 detenido ${d.descripcion} por ${d.motivo.toLowerCase()}.</li>`;
            });
            html += `</ul><p><em><strong>En total son ${ucrif.detenidosDelito.length} detenidos por delito.</strong></em></p><hr/>`;
        }
        
        html += `</div></div>`;
    }


    // --- SECCIONES AGREGADAS PARA OTROS GRUPOS ---
    html += `<div class="list-group">`;
    for (const grupoId in resumen) {
        if (grupoId === 'ucrif') continue; // Ya se ha mostrado
        
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        const tieneDatos = Object.values(datosGrupo).some(val => (typeof val === 'number' && val > 0) || (val && val !== "N/D"));

        if (tieneDatos) {
            html += `<div class="list-group-item">`;
            html += `<h5 class="mb-1">${config.icon} ${config.label}</h5>`;
            const items = Object.entries(datosGrupo)
                .map(([key, value]) => `<li>${key}: <strong>${value}</strong></li>`).join('');
            html += `<ul class="list-unstyled mb-0">${items}</ul></div>`;
        }
    }
    html += `</div>`;
    return html;
}


// =================================================================================
// ====== EXPORTACIÓN A WHATSAPP Y OTROS ==========================================
// =================================================================================

function generarTextoWhatsapp(resumen, desde, hasta) {
    let msg = `*🇪🇸 SIREX Resumen Global*\n*Periodo:* ${desde} al ${hasta}\n`;

    // --- Resumen conciso de UCRIF ---
    const ucrif = resumen.ucrif;
    if (ucrif) {
        msg += `\n*${GRUPOS_CONFIG.ucrif.icon} Novedades UCRIF*\n`;
        let ucrifResumen = [];
        if (ucrif.detenidosILE > 0) ucrifResumen.push(`${ucrif.detenidosILE} detenidos ILE`);
        if (ucrif.detenidosDelito.length > 0) ucrifResumen.push(`${ucrif.detenidosDelito.length} detenidos delito`);
        if (ucrif.filiadosVarios > 0) ucrifResumen.push(`${ucrif.filiadosVarios} filiados`);
        if (ucrif.traslados > 0) ucrifResumen.push(`${ucrif.traslados} traslados`);
        if (ucrif.citadosCecorex > 0) ucrifResumen.push(`${ucrif.citadosCecorex} citados CECOREX`);
        msg += `- ${ucrifResumen.join(', ')}\n`;

        const totalCasas = ucrif.inspeccionesCasasCitas.length;
        if (totalCasas > 0) {
            const totalFiliadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.filiadas, 0);
            const totalCitadas = ucrif.inspeccionesCasasCitas.reduce((sum, i) => sum + i.citadas, 0);
            msg += `- Inspecciones: *${totalCasas}* casas de citas (*${totalFiliadas}* filiadas, *${totalCitadas}* citadas)\n`;
        }
    }

    // --- Resumen del resto de grupos ---
    for (const grupoId in resumen) {
        if (grupoId === 'ucrif') continue;
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        const tieneDatos = Object.values(datosGrupo).some(val => (typeof val === 'number' && val > 0) || (val && val !== "N/D"));

        if (tieneDatos) {
            msg += `\n*${config.icon} ${config.label}*\n`;
            for (const [key, value] of Object.entries(datosGrupo)) {
                 if ((typeof value === 'number' && value > 0) || (typeof value === 'string' && value !== "N/D")) {
                    msg += `- ${key}: *${value}*\n`;
                 }
            }
        }
    }
    
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
    const doc = new jsPDF();
    
    const source = document.getElementById('resumenVentana');
    // Se usa html() para renderizar el contenido HTML del div en el PDF
    doc.html(source, {
        callback: function (doc) {
            doc.save(`SIREX-Resumen_Detallado_${desde}_a_${hasta}.pdf`);
        },
        x: 10,
        y: 10,
        width: 180,
        windowWidth: source.offsetWidth
    });
});
