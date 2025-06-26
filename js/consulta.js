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

// --- GESTIÓN DEL FORMULARIO ---
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
        // Consulta todos los grupos en paralelo
        const gruposDatos = await Promise.all(GRUPOS.map(g =>
            getDatosGrupo(g.id, desde, hasta)
        ));
        // Estructura resultado
        const resumen = {};
        GRUPOS.forEach((g, idx) => {
            resumen[g.id] = gruposDatos[idx];
        });

        // Renderiza resumen visual
        resumenVentana.innerHTML = renderizarResumenHTML(resumen, desde, hasta);
        mostrarSpinner(false);
        exportBtns.classList.remove('d-none');
        // Guarda para exportación
        window._ultimoResumen = { resumen, desde, hasta };
    } catch (err) {
        console.error("Error al generar resumen:", err);
        mostrarError('Error al consultar los datos: ' + err.message);
        mostrarSpinner(false);
    }
});

// --- CONSULTA FIRESTORE DE UN GRUPO ---
async function getDatosGrupo(grupo, desde, hasta) {
    // CORRECCIÓN: Lógica específica para Grupo 1 para desglosar los datos diarios.
    if (grupo === "grupo1") {
        const col = db.collection("grupo1_expulsiones");
        // Filtramos por el ID del documento que contiene la fecha.
        const snap = await col.where(firebase.firestore.FieldPath.documentId(), '>=', `expulsiones_${desde}`)
                                .where(firebase.firestore.FieldPath.documentId(), '<=', `expulsiones_${hasta}`)
                                .get();
        let datosAplanados = [];
        snap.forEach(doc => {
            const data = doc.data();
            const fechaDia = doc.id.replace("expulsiones_", "");

            if (data.expulsados) data.expulsados.forEach(item => datosAplanados.push({ ...item, tipo: 'expulsado', fecha: fechaDia }));
            if (data.fletados) data.fletados.forEach(item => datosAplanados.push({ ...item, tipo: 'fletado' })); // Ya tiene su propia fecha
            if (data.fletadosFuturos) data.fletadosFuturos.forEach(item => datosAplanados.push({ ...item, tipo: 'fletadoFuturo' }));
            if (data.conduccionesPositivas) data.conduccionesPositivas.forEach(item => datosAplanados.push({ ...item, tipo: 'conduccionPositiva', fecha: fechaDia }));
            if (data.conduccionesNegativas) data.conduccionesNegativas.forEach(item => datosAplanados.push({ ...item, tipo: 'conduccionNegativa', fecha: fechaDia }));
            if (data.pendientes) data.pendientes.forEach(item => datosAplanados.push({ ...item, tipo: 'pendiente' }));
        });
        return datosAplanados;
    }

    // grupo4: grupo4_gestion (docId: gestion_YYYYMMDD)
    if (grupo === "grupo4") {
        let col = db.collection("grupo4_gestion");
        let snap = await col.get();
        let datos = [];
        snap.forEach(doc => {
            const docId = doc.id;
            let fechaStr = docId.replace("gestion_", "");
            if (fechaStr.length === 8) fechaStr = `${fechaStr.slice(0,4)}-${fechaStr.slice(4,6)}-${fechaStr.slice(6,8)}`;
            if (fechaStr >= desde && fechaStr <= hasta) {
                datos.push({ fecha: fechaStr, ...doc.data() });
            }
        });
        return datos;
    }

    // puerto: grupoPuerto_registros (docId: puerto_YYYY-MM-DD)
    if (grupo === "puerto") {
        const col = db.collection("grupoPuerto_registros");
        const snap = await col.where(firebase.firestore.FieldPath.documentId(), '>=', `puerto_${desde}`)
                                .where(firebase.firestore.FieldPath.documentId(), '<=', `puerto_${hasta}`)
                                .get();
        let datos = [];
        snap.forEach(doc => {
            datos.push({ fecha: doc.id.replace("puerto_", ""), ...doc.data() });
        });
        return datos;
    }

    // cie: grupo_cie (docId: YYYY-MM-DD)
    if (grupo === "cie") {
        const col = db.collection("grupo_cie");
        const snap = await col.where(firebase.firestore.FieldPath.documentId(), '>=', desde)
                                .where(firebase.firestore.FieldPath.documentId(), '<=', hasta)
                                .get();
        let datos = [];
        snap.forEach(doc => {
            datos.push({ fecha: doc.id, ...doc.data() });
        });
        return datos;
    }

    // grupo2 y grupo3: solo detenidos e inspecciones
    if (grupo === "grupo2" || grupo === "grupo3") {
        const nombreColeccion = grupo + "_operaciones";
        let operacionesSnap = await db.collection(nombreColeccion).get();
        let resultado = [];

        for (const opDoc of operacionesSnap.docs) {
            const opId = opDoc.id;
            const opData = opDoc.data();

            // --- DETENIDOS ---
            const detenidosSnap = await db.collection(nombreColeccion).doc(opId)
                .collection("detenidos")
                .where("fechaDetenido", ">=", desde)
                .where("fechaDetenido", "<=", hasta)
                .get();
            detenidosSnap.forEach(det => {
                resultado.push({
                    tipo: "detenido",
                    operacion: opData.nombreOperacion || opId,
                    ...det.data()
                });
            });

            // --- INSPECCIONES (solo grupo3) ---
            if (grupo === "grupo3") {
                const inspeccionesSnap = await db.collection(nombreColeccion).doc(opId)
                    .collection("inspecciones")
                    .where("fechaInspeccion", ">=", desde)
                    .where("fechaInspeccion", "<=", hasta)
                    .get();
                inspeccionesSnap.forEach(ins => {
                    resultado.push({
                        tipo: "inspeccion",
                        operacion: opData.nombreOperacion || opId,
                        ...ins.data()
                    });
                });
            }
        }
        return resultado;
    }

    // Resto de grupos: filtro estándar por campo 'fecha'
    try {
        let col = db.collection(grupo);
        let q = col.where('fecha', '>=', desde).where('fecha', '<=', hasta);
        let snap = await q.get();
        return snap.docs.map(doc => doc.data());
    } catch(e) {
        console.warn(`El grupo '${grupo}' no tiene un campo 'fecha' o no existe. Devolviendo 0 resultados.`);
        return []; // Devuelve vacío si la colección no se puede consultar por fecha
    }
}

// --- RENDER HTML DEL RESUMEN ---
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

// --- FORMATEA ITEM (ajusta según tus campos por grupo) ---
function formatearItem(item, grupoId) {
    // CORRECCIÓN: Casos específicos para cada tipo de dato del Grupo 1
    if (grupoId === "grupo1") {
        switch (item.tipo) {
            case 'expulsado':
                return `Expulsado: <b>${item.nombre || ''}</b> (${item.nacionalidad || '-'}) [Diligencias: ${item.diligencias || '-'}]`;
            case 'fletado':
                return `Fletado: <b>${item.destino || ''}</b> (${item.pax || 0} pax) - Fecha: ${item.fecha || '-'}`;
            case 'fletadoFuturo':
                return `Fletado Futuro: <b>${item.destino || ''}</b> (${item.pax || 0} pax) - Fecha: ${item.fecha || '-'}`;
            case 'conduccionPositiva':
                return `Conducción Positiva: <b>${item.numero || 0}</b> - Fecha: ${item.fecha || '-'}`;
            case 'conduccionNegativa':
                return `Conducción Negativa: <b>${item.numero || 0}</b> - Fecha: ${item.fecha || '-'}`;
            case 'pendiente':
                 return `Pendiente: <b>${item.descripcion || ''}</b> (Para el: ${item.fecha || '-'})`;
            default:
                return `Dato de Grupo 1: ${JSON.stringify(item)}`;
        }
    }

    // CORRECCIÓN: Formato para Grupo 2 y 3, compatible con varios nombres de campo.
    if ((grupoId === "grupo2" || grupoId === "grupo3") && item.tipo === "detenido") {
        const nombre = item.nombreDetenido || item.filiacionDelito || '';
        const motivo = item.delitoDetenido || item.motivo || '-';
        return `Detenido: <b>${nombre}</b> (${item.nacionalidadDetenido||'-'}) - Motivo: ${motivo} - Fecha: ${item.fechaDetenido||'-'} [Op: ${item.operacion}]`;
    }
    if (grupoId === "grupo3" && item.tipo === "inspeccion") {
        return `Inspección: <b>${item.casa}</b> (${item.fechaInspeccion}) - Filiadas: ${item.numFiliadas} [${(item.nacionalidadesFiliadas||[]).join(", ")}] [Op: ${item.operacion}]`;
    }

    // Otros grupos, genérico
    if (item.nombre) return `${item.nombre} (${item.nacionalidad||'-'}) - ${item.diligencias||'-'} - ${item.fecha||''}`;
    if (item.descripcion) return `${item.descripcion} [${item.fecha||''}]`;
    
    // Fallback para cualquier otra estructura no reconocida.
    return `Dato genérico: ${JSON.stringify(item)}`;
}

// --- SPINNER Y ERROR ---
function mostrarSpinner(mostrar) {
    spinner.classList.toggle('d-none', !mostrar);
}

function mostrarError(msg) {
    resumenVentana.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

// --- EXPORTAR PDF ---
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
                // Eliminar etiquetas HTML para el PDF
                const textoItem = formatearItem(item, g.id).replace(/<[^>]*>/g, ""); 
                doc.text(`- ${textoItem}`, 15, y, { maxWidth: 180 });
                y += 5;
            });
            y += 4; // Espacio extra entre grupos
            doc.setFontSize(12);
        }
    });
    doc.save(`SIREX-Resumen_${desde}_a_${hasta}.pdf`);
}

// --- EXPORTAR WHATSAPP ---
btnWhatsapp.addEventListener('click', () => {
    if (!window._ultimoResumen) return;
    const { resumen, desde, hasta } = window._ultimoResumen;
    const mensaje = crearMensajeWhatsapp(resumen, desde, hasta);
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
});

function crearMensajeWhatsapp(resumen, desde, hasta) {
    let msg = `*SIREX Resumen Global*\n(${desde} a ${hasta})\n`;
    let total = 0;
    GRUPOS.forEach(g => {
        const cantidad = resumen[g.id].length;
        total += cantidad;
        if (cantidad > 0) {
            msg += `\n*${g.icon} ${g.label}: ${cantidad}*`;
            resumen[g.id].forEach(item => {
                const textoItem = formatearItem(item, g.id).replace(/<[^>]*>/g, ""); // Sin HTML
                msg += `\n- ${textoItem}`;
            });
        }
    });
    msg += `\n\n*Total general: ${total}*`;
    return msg;
}
