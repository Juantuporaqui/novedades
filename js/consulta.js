// js/consulta.js
// SIREX · Consulta Global / Resúmenes (Versión Final Optimizada)

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
    grupo1: { label: 'Expulsiones', icon: '🚔', collection: 'grupo1_expulsiones' },
    grupo4: { label: 'Operativo', icon: '🚨', collection: 'grupo4_operativo' },
    puerto: { label: 'Puerto', icon: '⚓', collection: 'grupoPuerto_registros' },
    cecorex: { label: 'CECOREX', icon: '📡', collection: 'cecorex_registros' },
    gestion: { label: 'Gestión', icon: '📋', collection: 'gestion_registros' },
    cie: { label: 'CIE', icon: '🏢', collection: 'cie_registros' }
};

// =================================================================================
// ====== ARQUITECTURA DE CONSULTA Y AGREGACIÓN ===================================
// =================================================================================

const QUERY_STRATEGIES = {
    sumarCampos: async (collection, desde, hasta, fields) => {
        const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
        const totals = fields.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {});
        snap.forEach(doc => {
            const data = doc.data();
            fields.forEach(field => {
                const value = data[field.name];
                totals[field.key] += Array.isArray(value) ? value.length : (Number(value) || 0);
            });
        });
        return totals;
    },
    
    getGrupo1: function(d, h) { return this.sumarCampos('grupo1_expulsiones',d,h,[{name:'detenidos_g1',key:'Detenidos'},{name:'expulsados_g1',key:'Exp. OK'},{name:'exp_frustradas_g1',key:'Exp. KO'},{name:'fletados_g1',key:'Fletados'}]); },
    getGrupo4: function(d, h) { return this.sumarCampos('grupo4_operativo',d,h,[{name:'identificados_g4',key:'Identif.'},{name:'detenidos_g4',key:'Detenidos'},{name:'colaboraciones_g4',key:'Colab.'},{name:'citadosCecorex_g4',key:'Citados CECOREX'}]); },
    getPuerto: function(d, h) { return this.sumarCampos('grupoPuerto_registros',d,h,[{name:'denegaciones',key:'Denegaciones'},{name:'cruceristas',key:'Cruceristas'},{name:'visadosExp',key:'Visados Exp.'},{name:'detenidos',key:'Detenidos'},{name:'marinosArgos',key:'Ctrl. Argos'},{name:'ptosDeportivos',key:'Ptos. Deport.'},{name:'ferrys',key:'Mov. Ferry'}]); },
    getCecorex: function(d, h) { return this.sumarCampos('cecorex_registros',d,h,[{name:'detenidos_cc',key:'Detenidos'},{name:'decretos_exp',key:'Decretos Exp.'},{name:'proh_entrada',key:'Prohib. Entrada'},{name: 'dil_informe',key:'Dilig. Informe'},{name:'notificaciones',key:'Notif.'},{name:'al_abogados',key:'Asist. Letrada'}]); },
    getGestion: function(d, h) { return this.sumarCampos('gestion_registros',d,h,[{name:'ENTRV. ASILO',key:'Entrev. Asilo'},{name:'ASILOS CONCEDIDOS',key:'Asilos OK'},{name:'ASILOS DENEGADOS',key:'Asilos KO'},{name:'CARTAS CONCEDIDAS',key:'Cartas OK'},{name:'CARTAS DENEGADAS',key:'Cartas KO'},{name:'TARJET. SUBDELEG',key:'Tarjetas Subd.'}]); },
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
        const promesas = Object.keys(GRUPOS_CONFIG).reduce((acc, key) => {
            acc[key] = QUERY_STRATEGIES[key](desde, hasta);
            return acc;
        }, {});

        await Promise.all(Object.values(promesas));
        const resumen = {};
        for(const key in promesas) {
            resumen[key] = await promesas[key];
        }

        const hechoDestacado = findHechoDestacado(resumen);
        window._ultimoResumen = { resumen, desde, hasta, hechoDestacado };
        resumenVentana.innerHTML = renderizarResumenHTML(resumen, desde, hasta, hechoDestacado);
        exportBtns.classList.remove('d-none');

    } catch (err) {
        console.error("Error al generar resumen:", err);
        resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
    } finally {
        spinner.classList.add('d-none');
    }
});

function findHechoDestacado(resumen) {
    let max = { valor: -1, texto: '', icono: '' };
    const camposMenosRelevantes = ['Identif.', 'Cruceristas', 'Ctrl. Argos', 'Notif.', 'Mov. Ferry'];

    for (const grupoId in resumen) {
        const config = GRUPOS_CONFIG[grupoId];
        for (const [key, value] of Object.entries(resumen[grupoId])) {
            if (typeof value === 'number' && value > max.valor && !camposMenosRelevantes.includes(key)) {
                max = { valor: value, texto: key, icono: config.icon };
            }
        }
    }
    return max.valor > 0 ? max : null;
}

function renderizarResumenHTML(resumen, desde, hasta, hechoDestacado) {
    let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;
    
    if (hechoDestacado) {
        html += `<div class="alert alert-warning text-center">
                   <div class="fs-6 fw-bold text-uppercase">Hecho Destacado</div>
                   <div class="fs-2 fw-bolder">${hechoDestacado.icono} ${hechoDestacado.valor}</div>
                   <div class="fs-5">${hechoDestacado.texto}</div>
                 </div>`;
    }

    html += `<div class="list-group">`;
    for (const grupoId in resumen) {
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

document.getElementById('btnWhatsapp').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta, hechoDestacado } = window._ultimoResumen;
    let msg = `*🇪🇸 SIREX Resumen Global*\n*Periodo:* ${desde} al ${hasta}\n`;

    if (hechoDestacado) {
        msg += `\n*HECHO DESTACADO*\n${hechoDestacado.icono} *${hechoDestacado.valor}* ${hechoDestacado.texto}\n`;
    }

    for (const grupoId in resumen) {
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        const tieneDatos = Object.values(datosGrupo).some(val => (typeof val === 'number' && val > 0) || (val && val !== "N/D"));

        if (tieneDatos) {
            msg += `\n*${config.icon} ${config.label}*\n`;
            for (const [key, value] of Object.entries(datosGrupo)) {
                 if((typeof value === 'number' && value > 0) || (typeof value === 'string' && value !== "N/D")) {
                    msg += `- ${key}: *${value}*\n`;
                 }
            }
        }
    }
    
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});

// La función de PDF se mantiene por si se necesita, aunque el foco es WhatsApp
document.getElementById('btnExportarPDF').addEventListener('click', () => {
    if (!window._ultimoResumen) return alert("Primero genera un resumen.");
    const { resumen, desde, hasta, hechoDestacado } = window._ultimoResumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`SIREX - Resumen Global del ${desde} al ${hasta}`, 10, 10);
    let y = 20;

    if (hechoDestacado) {
        doc.setFontSize(14);
        doc.text(`HECHO DESTACADO: ${hechoDestacado.valor} ${hechoDestacado.texto}`, 10, y);
        y += 10;
    }

    doc.setFontSize(10);
    for (const grupoId in resumen) {
        if (y > 270) { doc.addPage(); y = 10; }
        const config = GRUPOS_CONFIG[grupoId];
        const datosGrupo = resumen[grupoId];
        const tieneDatos = Object.values(datosGrupo).some(val => val > 0 || (val && val !== "N/D"));
        if(tieneDatos) {
            doc.setFont(undefined, 'bold');
            doc.text(`${config.icon} ${config.label}`, 10, y);
            y += 6;
            doc.setFont(undefined, 'normal');
            for(const [key, value] of Object.entries(datosGrupo)){
                if (y > 280) { doc.addPage(); y = 10; }
                doc.text(`- ${key}: ${value}`, 15, y);
                y += 5;
            }
            y += 2;
        }
    }
    doc.save(`SIREX-Resumen_${desde}_a_${hasta}.pdf`);
});
