// js/consulta.js
// SIREX · Consulta Global / Resúmenes

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
    authDomain: "ucrif-5bb75.firebaseapp.com",
    projectId: "ucrif-5bb75",
    storageBucket: "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId: "1:241698436443:web:1f333b3ae3f813b755167e",
    measurementId: "G-S2VPQNWZ21"
};
if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ELEMENTOS DOM ---
const form = document.getElementById('consultaForm');
const spinner = document.getElementById('spinner');
const resumenVentana = document.getElementById('resumenVentana');
const exportBtns = document.getElementById('exportBtns');
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnWhatsapp = document.getElementById('btnWhatsapp');

// --- NOMBRES Y ETIQUETAS DE GRUPOS ---
const GRUPOS = [
    { id: 'grupo1', label: 'Expulsiones', icon: '🚔' },
    { id: 'grupo2', label: 'Investigación 1', icon: '🕵️' },
    { id: 'grupo3', label: 'Investigación 2', icon: '🕵️‍♂️' },
    { id: 'grupo4', label: 'Operativo', icon: '🚨' },
    { id: 'puerto', label: 'Puerto', icon: '⚓' },
    { id: 'gestion', label: 'Gestión', icon: '📋' },
    { id: 'cecorex', label: 'CECOREX', icon: '📡' },
    { id: 'cie', label: 'CIE', icon: '🏢' },
    { id: 'estadistica', label: 'Estadística', icon: '📊' }
];


// =================================================================================
// ====== ARQUITECTURA DE CONSULTA REFACTORIZADA ===================================
// =================================================================================

const GROUP_STRATEGIES = {
    grupo1: {
        query: async (desde, hasta) => {
            const snap = await db.collection("grupo1_expulsiones")
                .where(firebase.firestore.FieldPath.documentId(), '>=', `expulsiones_${desde}`)
                .where(firebase.firestore.FieldPath.documentId(), '<=', `expulsiones_${hasta}`)
                .get();
            let results = [];
            snap.forEach(doc => {
                const data = doc.data();
                const fechaDia = doc.id.replace("expulsiones_", "");
                if (data.expulsados) results.push(...data.expulsados.map(item => ({ ...item, tipo: 'expulsado', fecha: fechaDia })));
                if (data.fletados) results.push(...data.fletados.map(item => ({ ...item, tipo: 'fletado' })));
                if (data.conduccionesPositivas) results.push(...data.conduccionesPositivas.map(item => ({ ...item, tipo: 'conduccionPositiva', fecha: fechaDia })));
                if (data.conduccionesNegativas) results.push(...data.conduccionesNegativas.map(item => ({ ...item, tipo: 'conduccionNegativa', fecha: fechaDia })));
                if (data.pendientes) results.push(...data.pendientes.map(item => ({ ...item, tipo: 'pendiente' })));
            });
            return results;
        },
        formatter: (item) => {
            switch (item.tipo) {
                case 'expulsado': return `Expulsado: <b>${item.nombre||''}</b> (${item.nacionalidad||'-'}) [Diligencias: ${item.diligencias||'-'}]`;
                case 'fletado': return `Fletado: <b>${item.destino||''}</b> (${item.pax||0} pax) - Fecha: ${item.fecha||'-'}`;
                case 'conduccionPositiva': return `Conducción Positiva: <b>${item.numero||0}</b> - Fecha: ${item.fecha||'-'}`;
                case 'conduccionNegativa': return `Conducción Negativa: <b>${item.numero||0}</b> - Fecha: ${item.fecha||'-'}`;
                case 'pendiente': return `Pendiente: <b>${item.descripcion||''}</b> (Para el: ${item.fecha||'-'})`;
                default: return JSON.stringify(item);
            }
        }
    },
    investigacion: {
        query: async (desde, hasta, grupoId) => {
            const nombreColeccion = `${grupoId}_operaciones`;
            const operacionesSnap = await db.collection(nombreColeccion).get();
            let results = [];
            for (const opDoc of operacionesSnap.docs) {
                const opData = opDoc.data();
                const detenidosSnap = await opDoc.ref.collection("detenidos").where("fechaDetenido", ">=", desde).where("fechaDetenido", "<=", hasta).get();
                detenidosSnap.forEach(det => results.push({ tipo: "detenido", operacion: opData.nombreOperacion || opDoc.id, ...det.data() }));
                if (grupoId === "grupo3") {
                    const inspeccionesSnap = await opDoc.ref.collection("inspecciones").where("fechaInspeccion", ">=", desde).where("fechaInspeccion", "<=", hasta).get();
                    inspeccionesSnap.forEach(ins => results.push({ tipo: "inspeccion", operacion: opData.nombreOperacion || opDoc.id, ...ins.data() }));
                }
            }
            return results;
        },
        formatter: (item) => {
            if (item.tipo === "detenido") return `Detenido: <b>${item.nombreDetenido||''}</b> (${item.nacionalidadDetenido||'-'}) - Motivo: ${item.delitoDetenido||'-'} [Op: ${item.operacion}]`;
            if (item.tipo === "inspeccion") return `Inspección: <b>${item.casa}</b> (${item.fechaInspeccion}) - Filiadas: ${item.numFiliadas} [${(item.nacionalidadesFiliadas||[]).join(", ")}] [Op: ${item.operacion}]`;
            return JSON.stringify(item);
        }
    },
    default: {
        query: async (desde, hasta, grupoId) => {
            const snap = await db.collection(grupoId).where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
            return snap.docs.map(doc => doc.data());
        },
        formatter: (item) => `Fecha: ${item.fecha} - ${item.asunto || item.descripcion || 'Registro genérico'}`
    },
    grupo4: {
        query: async (desde, hasta) => {
            const snap = await db.collection("grupo4_gestion").get();
            const results = [];
            snap.forEach(doc => {
                let fechaStr = doc.id.replace("gestion_", "");
                if (fechaStr.length === 8) fechaStr = `${fechaStr.slice(0,4)}-${fechaStr.slice(4,6)}-${fechaStr.slice(6,8)}`;
                if (fechaStr >= desde && fechaStr <= hasta) results.push({ fecha: fechaStr, ...doc.data() });
            });
            return results;
        },
        formatter: (item) => `Fecha: ${item.fecha} - Gestiones: ${item.gestiones||0}, Citados: ${item.citados||0}, Colaboraciones: ${item.colaboraciones||0}`
    },
    puerto: {
        query: async (desde, hasta) => {
            const snap = await db.collection("grupoPuerto_registros").where(firebase.firestore.FieldPath.documentId(), '>=', `puerto_${desde}`).where(firebase.firestore.FieldPath.documentId(), '<=', `puerto_${hasta}`).get();
            return snap.docs.map(doc => ({ fecha: doc.id.replace("puerto_", ""), ...doc.data() }));
        },
        formatter: (item) => `Fecha: ${item.fecha} - Denegaciones: ${item.denegaciones||0}, Marinos/Argos: ${item.marinosArgos||0}, Cruceristas: ${item.cruceristas||0}`
    },
    cie: {
        query: async (desde, hasta) => {
            const snap = await db.collection("grupo_cie").where(firebase.firestore.FieldPath.documentId(), '>=', desde).where(firebase.firestore.FieldPath.documentId(), '<=', hasta).get();
            return snap.docs.map(doc => ({ fecha: doc.id, ...doc.data() }));
        },
        formatter: (item) => `Fecha: ${item.fecha} - Internos: ${item.internosNac||0}, Salidas: ${item.salidas||0}`
    },
    cecorex: {
        query: async (desde, hasta) => {
            const snap = await db.collection("cecorex").where(firebase.firestore.FieldPath.documentId(), '>=', `cecorex_${desde}`).where(firebase.firestore.FieldPath.documentId(), '<=', `cecorex_${hasta}`).get();
            return snap.docs.map(doc => doc.data());
        },
        formatter: (item) => `Fecha: ${item.fecha} - Incoacciones: ${item.incoacciones||0}, Consultas Tel: ${item.consultasTel||0}, Diligencias: ${item.diligenciasInforme||0}, CIEs Concedidos: ${item.ciesConcedidos||0}`
    },
    // CORRECCIÓN: Estrategia actualizada para el nuevo sistema de "Gestión"
    gestion: {
        query: async (desde, hasta) => {
            // Apunta a la nueva colección y filtra por el campo 'fecha'
            const snap = await db.collection("gestion_avanzada").where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
            return snap.docs.map(doc => doc.data());
        },
        formatter: (item) => {
            // Crea un resumen con los campos más relevantes del nuevo formulario
            const resumen = [
                `Trámite: <b>${item.tipoTramite || 'N/A'}</b>`,
                `Citas: ${item.citas || 0}`,
                `Entrevistas Asilo: ${item.entrevistasAsilo || 0}`,
                `MENAs: ${item.menas || 0}`,
                `Oficios: ${item.oficios || 0}`
            ];
            return `Fecha: ${item.fecha} - ${resumen.join(', ')}`;
        }
    }
};

// Asignar estrategias a los grupos correspondientes
GROUP_STRATEGIES.grupo2 = GROUP_STRATEGIES.investigacion;
GROUP_STRATEGIES.grupo3 = GROUP_STRATEGIES.investigacion;
// La estrategia 'gestion' ya está definida arriba, por lo que no necesita la 'default'.
GROUP_STRATEGIES.estadistica = GROUP_STRATEGIES.default;


// --- FUNCIÓN DE CONSULTA PRINCIPAL (AHORA MÁS LIMPIA) ---
async function getDatosGrupo(grupo, desde, hasta) {
    const strategy = GROUP_STRATEGIES[grupo] || GROUP_STRATEGIES.default;
    try {
        return await strategy.query(desde, hasta, grupo);
    } catch (e) {
        console.warn(`Error al consultar el grupo '${grupo}':`, e.message);
        return [];
    }
}

// --- FUNCIÓN DE FORMATO PRINCIPAL (AHORA MÁS LIMPIA) ---
function formatearItem(item, grupoId) {
    const strategy = GROUP_STRATEGIES[grupoId] || GROUP_STRATEGIES.default;
    try {
        return strategy.formatter(item, grupoId);
    } catch (e) {
        console.error(`Error al formatear item para el grupo '${grupoId}':`, e);
        return `Error al mostrar dato: ${JSON.stringify(item)}`;
    }
}

// =================================================================================
// ====== SECCIÓN DE RENDERIZADO Y EXPORTACIÓN (SIN CAMBIOS) =======================
// =================================================================================

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    resumenVentana.innerHTML = '';
    mostrarSpinner(true);
    exportBtns.classList.add('d-none');

    const desde = form.fechaDesde.value;
    const hasta = form.fechaHasta.value;
    if (desde > hasta) {
        mostrarError('La fecha de inicio no puede ser posterior a la de fin.');
        mostrarSpinner(false);
        return;
    }

    try {
        const gruposDatos = await Promise.all(GRUPOS.map(g => getDatosGrupo(g.id, desde, hasta)));
        const resumen = {};
        GRUPOS.forEach((g, idx) => {
            resumen[g.id] = gruposDatos[idx];
        });

        resumenVentana.innerHTML = renderizarResumenHTML(resumen, desde, hasta);
        mostrarSpinner(false);
        exportBtns.classList.remove('d-none');
        window._ultimoResumen = { resumen, desde, hasta };
    } catch (err) {
        console.error("Error al generar resumen:", err);
        mostrarError('Error al consultar los datos: ' + err.message);
        mostrarSpinner(false);
    }
});

function renderizarResumenHTML(resumen, desde, hasta) {
    let html = `<h4 class="mb-3">Resumen global del <b>${desde}</b> al <b>${hasta}</b></h4>`;
    html += `<div class="table-responsive"><table class="table table-striped align-middle">
    <thead><tr><th>Grupo</th><th class="text-end">Eventos Registrados</th></tr></thead><tbody>`;
    let total = 0;
    GRUPOS.forEach(g => {
        const cantidad = resumen[g.id].length;
        total += cantidad;
        html += `<tr><td>${g.icon} <b>${g.label}</b></td><td class="text-end">${cantidad}</td></tr>`;
    });
    html += `<tr class="table-info"><td><b>Total general</b></td><td class="text-end"><b>${total}</b></td></tr>`;
    html += `</tbody></table></div>`;
    html += `<details class="mt-3"><summary>Ver detalle por grupo</summary>`;
    GRUPOS.forEach(g => {
        if (resumen[g.id].length > 0) {
            html += `<h6 class="mt-3">${g.icon} ${g.label}</h6><ul>`;
            resumen[g.id].forEach((item) => {
                html += `<li>${formatearItem(item, g.id)}</li>`;
            });
            html += `</ul>`;
        }
    });
    html += `</details>`;
    return html;
}

function mostrarSpinner(mostrar) {
    spinner.classList.toggle('d-none', !mostrar);
}
function mostrarError(msg) {
    resumenVentana.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

btnExportarPDF.addEventListener('click', () => {
    if (!window._ultimoResumen) return;
    const { resumen, desde, hasta } = window._ultimoResumen;
    exportarPDF(resumen, desde, hasta);
});

function exportarPDF(resumen, desde, hasta) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(`SIREX - Resumen Global`, 10, 18);
    doc.setFontSize(12);
    doc.text(`Periodo: ${desde} al ${hasta}`, 10, 28);
    let y = 40;
    GRUPOS.forEach(g => {
        if (y > 270) { doc.addPage(); y = 20; }
        const cantidad = resumen[g.id].length;
        if (cantidad > 0) {
            doc.setFont(undefined, 'bold');
            doc.text(`${g.icon} ${g.label} (${cantidad} eventos)`, 10, y);
            y += 8;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            resumen[g.id].forEach(item => {
                if (y > 280) { doc.addPage(); y = 20; }
                const textoItem = formatearItem(item, g.id).replace(/<[^>]*>/g, "");
                doc.text(`- ${textoItem}`, 15, y, { maxWidth: 180 });
                y += 5;
            });
            y += 4;
            doc.setFontSize(12);
        }
    });
    doc.save(`SIREX-Resumen_${desde}_a_${hasta}.pdf`);
}

btnWhatsapp.addEventListener('click', () => {
    if (!window._ultimoResumen) return;
    const { resumen, desde, hasta } = window._ultimoResumen;
    const mensaje = crearMensajeWhatsapp(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
});

function crearMensajeWhatsapp(resumen, desde, hasta) {
    let msg = `*SIREX Resumen Global*\n(del ${desde} al ${hasta})\n`;
    let total = 0;
    let totalesMsg = "\n*Totales por grupo:*\n";
    GRUPOS.forEach(g => {
        const cantidad = resumen[g.id].length;
        total += cantidad;
        if (cantidad > 0) {
            totalesMsg += `${g.icon} ${g.label}: ${cantidad}\n`;
        }
    });
    totalesMsg += `*Total general: ${total}*\n`;
    msg += totalesMsg;
    let detalleMsg = "\n*Detalle:*\n";
    GRUPOS.forEach(g => {
        const cantidad = resumen[g.id].length;
        if (cantidad > 0) {
            detalleMsg += `\n*${g.icon} ${g.label}:*\n`;
            resumen[g.id].forEach(item => {
                const textoItem = formatearItem(item, g.id).replace(/<[^>]*>/g, "");
                detalleMsg += `- ${textoItem}\n`;
            });
        }
    });
    return msg + detalleMsg;
}
