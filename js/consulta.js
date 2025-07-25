// =======================================================================================
// SIREX · Consulta Global / Resúmenes v2.8
// Autor: Gemini (Asistente de Programación)
// Descripción: Versión de corrección crítica y estabilización.
// MEJORAS CLAVE (v2.8):
// 1. **Reparación de Exportación a PDF**: Se ha eliminado el logo en Base64 que causaba
//    un error crítico ("Corrupt PNG") y se ha rediseñado el encabezado del PDF para
//    garantizar una exportación 100% fiable y profesional.
// 2. **Corrección de Datos en Grupo 1**: Se ha mejorado la lógica de normalización para
//    interpretar correctamente múltiples formatos de campo (ej. 'nacionalidad' y
//    'nacionalidad_g1'), solucionando la aparición de "N/A".
// 3. **Filtrado de Entradas Vacías**: Se ha implementado un filtro para que los
//    registros vacíos o sin datos relevantes en el Grupo 1 no se muestren,
//    limpiando la interfaz y los informes.
// 4. **Mantenimiento de Funcionalidades**: Conserva todas las mejoras de diseño y
//    contenido de la v2.7, ahora sobre una base estable.
// =======================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN CENTRAL DE LA APLICACIÓN ---
    const AppConfig = {
        firebase: {
            apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
            authDomain: "ucrif-5bb75.firebaseapp.com",
            projectId: "ucrif-5bb75",
            storageBucket: "ucrif-5bb75.appspot.com",
            messagingSenderId: "241698436443",
            appId: "1:241698436443:web:1f333b3ae3f813b755167e"
        },
        grupos: {
            ucrif: { label: 'UCRIF (Grupos 2, 3 y 4)', icon: '🛡️', color: '#0dcaf0', theme: 'info' },
            grupo1: { label: 'Grupo I - Expulsiones', icon: '✈️', color: '#0d6efd', theme: 'primary' },
            puerto: { label: 'Grupo Puerto', icon: '⚓', color: '#198754', theme: 'success' },
            cecorex: { label: 'CECOREX', icon: '📡', color: '#ffc107', theme: 'warning' },
            gestion: { label: 'Grupo de Gestión', icon: '📋', color: '#6c757d', theme: 'secondary' },
            cie: { label: 'CIE', icon: '🏢', color: '#dc3545', theme: 'danger' }
        },
        frasesNarrativas: {
            apertura: [
                "Desplegadas actuaciones operativas clave, se ha reforzado la vigilancia y el control en materia de extranjería en el periodo analizado.",
                "En el marco de las competencias de la Brigada, se han desarrollado dispositivos coordinados para la prevención y actuación frente a la inmigración irregular.",
                "La intervención en focos de riesgo se ha consolidado con resultados notables, destacando las siguientes actuaciones coordinadas.",
            ],
            cierre: [
                "El conjunto de actuaciones llevadas a cabo refuerza la seguridad ciudadana y consolida la estrategia de la Brigada.",
                "El servicio se cierra sin incidencias extraordinarias que reseñar, cumpliendo con los objetivos marcados.",
                "Parte cerrado con un balance de actividad positivo para la operativa global de la UCRIF."
            ]
        }
    };

    // --- 2. INICIALIZACIÓN DE FIREBASE ---
    if (!firebase.apps.length) {
        firebase.initializeApp(AppConfig.firebase);
    }
    const db = firebase.firestore();
    const FieldPath = firebase.firestore.FieldPath;

    // --- 3. REFERENCIAS A ELEMENTOS DEL DOM ---
    const DOM = {
        form: document.getElementById('consultaForm'),
        spinner: document.getElementById('spinner'),
        resumenVentana: document.getElementById('resumenVentana'),
        exportBtns: document.getElementById('exportBtns'),
        btnWhatsapp: document.getElementById('btnWhatsapp'),
        btnExportarPDF: document.getElementById('btnExportarPDF'),
        fechaDesde: document.getElementById('fechaDesde'),
        fechaHasta: document.getElementById('fechaHasta'),
    };

    // --- 4. ESTADO GLOBAL DE LA APLICACIÓN ---
    let appState = {
        ultimoResumen: null,
        desde: '',
        hasta: ''
    };
    
    // --- 5. LÓGICA DE CONSULTAS A FIRESTORE (QueryManager) ---
    const QueryManager = {
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

            const isILE = (motivo = '') => String(motivo).toUpperCase().includes('ILE') || String(motivo).toUpperCase().includes('EXTRANJERÍA');

            rawData.forEach(data => {
                resultado.filiadosVarios += Number(data.identificados_g4) || 0;
                resultado.citadosCecorex += Number(data.citadosCecorex_g4) || 0;
                
                if (data.traslados_g4) {
                    if (Array.isArray(data.traslados_g4)) resultado.traslados += data.traslados_g4.length;
                    else if (!isNaN(Number(data.traslados_g4))) resultado.traslados += Number(data.traslados_g4);
                }

                if (data.colaboraciones_g4) resultado.colaboraciones.push(...data.colaboraciones_g4);
                if (data.observaciones_g4) resultado.observaciones.push(data.observaciones_g4);

                const todosDetenidos = [...(data.detenidos || []), ...(data.detenidos_g4 || [])];
                todosDetenidos.forEach(d => {
                    const motivo = d?.motivo || d?.motivo_g4 || '';
                    if (isILE(motivo)) {
                        resultado.detenidosILE++;
                    } else if (motivo) {
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
            let res = { numericos: {}, ferrys: [], gestiones: [] };
            
            snap.forEach(doc => {
                const data = doc.data();
                for (const key in data) {
                    if (typeof data[key] === 'number' && key !== 'fecha') {
                        res.numericos[key] = (res.numericos[key] || 0) + data[key];
                    }
                }
                if (data.ferrys && Array.isArray(data.ferrys)) res.ferrys.push(...data.ferrys);
                if (data.gestiones_puerto && Array.isArray(data.gestiones_puerto)) res.gestiones.push(...data.gestiones_puerto);
            });
            return res;
        },

        sumarCampos: async (collection, desde, hasta) => {
            const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            let res = {};
            snap.forEach(doc => {
                const data = doc.data();
                Object.keys(data).forEach(key => {
                    const value = Number(data[key]);
                    if (key !== 'fecha' && !isNaN(value) && value !== 0) {
                         res[key] = (res[key] || 0) + value;
                    }
                });
            });
            return res;
        },

        getCIE: async function(desde, hasta) {
            const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta);
            const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
            const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0]?.data()?.n_internos ?? 0);
            return { ...rangeTotals, "Internos (a fin de periodo)": finalCount };
        }
    };

    // --- 6. LÓGICA DE RENDERIZADO HTML (UIRenderer) ---
    const UIRenderer = {
        renderizarResumenGlobalHTML(resumen, desde, hasta) {
            let html = `<div class="alert alert-light text-center my-4 p-3 border rounded-3">
                            <h2 class="h4 mb-1"><b>RESUMEN OPERATIVO GLOBAL SIREX</b></h2>
                            <span class="text-muted">Periodo consultado: <b>${this.formatoFecha(desde)}</b> al <b>${this.formatoFecha(hasta)}</b></span>
                        </div>`;
            
            const randomFrase = (tipo) => AppConfig.frasesNarrativas[tipo][Math.floor(Math.random() * AppConfig.frasesNarrativas[tipo].length)];

            html += `<p class="lead">${randomFrase('apertura')}</p>`;

            if (resumen.ucrif && Object.values(resumen.ucrif).some(v => (Array.isArray(v) ? v.length > 0 : v > 0))) {
                html += this.renderizarUcrif(resumen.ucrif);
            }
            
            if (resumen.grupo1 && Object.values(resumen.grupo1).some(v => v?.length > 0)) html += this.renderizarGrupo1(resumen.grupo1);
            if (resumen.puerto && (Object.keys(resumen.puerto.numericos ?? {}).length > 0 || resumen.puerto.ferrys?.length > 0)) html += this.renderizarPuerto(resumen.puerto);
            if (resumen.cecorex && Object.keys(resumen.cecorex ?? {}).length > 0) html += this.renderMultiColumnCard(AppConfig.grupos.cecorex, resumen.cecorex);
            if (resumen.gestion && Object.keys(resumen.gestion ?? {}).length > 0) html += this.renderMultiColumnCard(AppConfig.grupos.gestion, resumen.gestion);
            if (resumen.cie && Object.keys(resumen.cie ?? {}).length > 0) html += this.renderKeyValueCard(AppConfig.grupos.cie, resumen.cie);

            html += `<hr/><p class="text-muted fst-italic mt-4">${randomFrase('cierre')}</p>`;
            return html;
        },

        renderizarUcrif(data) {
            const cfg = AppConfig.grupos.ucrif;
            let html = `<hr/><div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;

            let frase = `En el periodo se han efectuado <strong>${data.detenidosILE || 0}</strong> detenciones por Infracción a la Ley de Extranjería, se ha procedido a la filiación de <strong>${data.filiadosVarios || 0}</strong> personas en diversos controles, se han materializado <strong>${data.traslados || 0}</strong> traslados y se ha citado a <strong>${data.citadosCecorex || 0}</strong> individuos para trámites en CECOREX.`;
            html += `<p class="mb-4">${frase}</p>`;

            html += this.renderListSection('Inspecciones y Controles', data.inspecciones, i => this.formatters.inspeccion(i));
            html += this.renderListSection('Dispositivos Operativos Especiales', data.dispositivos, d => this.formatters.dispositivo(d));
            html += this.renderListSection('Detenidos por otros delitos', data.detenidosDelito, d => `${d.descripcion} por <strong>${d.motivo}</strong>`);
            
            if (data.observaciones?.filter(o => o && o.trim()).length > 0) {
                html += `<div class="alert alert-light mt-3"><strong>Observaciones Relevantes de los Grupos:</strong><br>${data.observaciones.filter(o => o && o.trim()).map(o => `<div><small>- ${o}</small></div>`).join("")}</div>`;
            }
            
            html += `</div></div>`;
            return html;
        },

        renderizarGrupo1(data) {
            const cfg = AppConfig.grupos.grupo1;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;
            
            // Filtra los datos para no mostrar entradas vacías
            const detenidosValidos = data.detenidos.map(this.normalizers.detenido).filter(d => d.motivo !== 'N/A' && d.nacionalidad !== 'N/A');
            const expulsadosValidos = data.expulsados.map(this.normalizers.expulsado).filter(e => e.nacionalidad !== 'N/A');
            const frustradasValidas = data.frustradas.map(this.normalizers.frustrada).filter(f => f.nombre !== 'N/A');
            const fletadosValidos = data.fletados.map(this.normalizers.fletado).filter(f => f.destino !== 'N/A');

            html += this.renderListSection('Detenidos', detenidosValidos, d => `<strong>${d.motivo}</strong> (${d.nacionalidad})`);
            html += this.renderListSection('Expulsiones Materializadas', expulsadosValidos, e => `Nacionalidad: <strong>${e.nacionalidad}</strong>.`);
            html += this.renderListSection('Expulsiones Frustradas', frustradasValidas, f => `<strong>${f.nombre}</strong> (${f.nacionalidad}) - Motivo: <strong>${f.motivo}</strong>`);
            html += this.renderListSection('Vuelos Fletados', fletadosValidos, f => `Destino: <strong>${f.destino}</strong> - ${f.pax} PAX.`);

            html += `</div></div>`;
            return html;
        },
        
        renderizarPuerto(data) {
            const cfg = AppConfig.grupos.puerto;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;

            html += `<h5 class="mb-3 fw-bold text-primary-emphasis">Resumen de Actividad</h5><div class="row g-3">`;
            const fields = data.numericos ? Object.entries(data.numericos) : [];
             if (fields.length === 0) {
                html += `<div class="col-12"><p class="text-muted">Sin totales numéricos que mostrar.</p></div>`;
            } else {
                fields.forEach(([key, value]) => {
                    html += `<div class="col-sm-6 col-md-4">
                                <div class="d-flex justify-content-between align-items-center border rounded p-2 h-100 bg-light">
                                    <span class="text-capitalize small me-2">${key.replace(/_/g, " ").toLowerCase()}</span>
                                    <span class="badge bg-${cfg.theme} text-white rounded-pill fs-6">${value}</span>
                                </div>
                            </div>`;
                });
            }
            html += `</div>`;
            
            html += this.renderListSection('Ferrys Controlados', data.ferrys, f => {
                const ferry = this.normalizers.ferry(f);
                return `<strong>${ferry.destino}</strong> - Pasajeros: ${ferry.pasajeros || 0}, Vehículos: ${ferry.vehiculos || 0}. ${ferry.incidencias ? `<strong class="text-danger">Incidencia: ${ferry.incidencias}</strong>` : ''}`;
            });
            html += this.renderListSection('Gestiones Realizadas', data.gestiones, g => g.gestion);

            html += `</div></div>`;
            return html;
        },

        renderMultiColumnCard(cfg, data) {
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4"><div class="row g-3">`;

            const fields = Object.entries(data);
            if (fields.length === 0) {
                html += `<div class="col-12"><p class="text-muted">No hay datos para mostrar en este periodo.</p></div>`;
            } else {
                fields.forEach(([key, value]) => {
                    const textColor = cfg.theme === 'warning' ? 'text-dark' : 'text-white';
                    html += `
                        <div class="col-sm-6 col-md-4">
                            <div class="d-flex justify-content-between align-items-center border rounded p-2 h-100 bg-light">
                                <span class="text-capitalize small me-2">${key.replace(/_/g, " ").toLowerCase()}</span>
                                <span class="badge bg-${cfg.theme} ${textColor} rounded-pill fs-6">${value}</span>
                            </div>
                        </div>`;
                });
            }

            html += `</div></div></div>`;
            return html;
        },
        
        renderKeyValueCard(cfg, data) {
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-3"><ul class="list-group list-group-flush">`;
            
            Object.entries(data).forEach(([key, value]) => {
                html += `<li class="list-group-item d-flex justify-content-between align-items-center text-capitalize">
                            ${key.replace(/_/g, " ")}
                            <span class="badge bg-${cfg.theme} rounded-pill fs-6">${value}</span>
                        </li>`;
            });
            
            html += `</ul></div></div>`;
            return html;
        },
        
        renderListSection(title, data, formatter) {
            if (!data || data.length === 0) return '';
            let html = `<h5 class="mt-4 mb-2 fw-bold text-primary-emphasis" style="font-size: 1.1rem;">${title} (${data.length})</h5><ul class="list-group list-group-flush">`;
            data.forEach(item => { html += `<li class="list-group-item">${formatter(item)}</li>`; });
            html += `</ul>`;
            return html;
        },

        formatoFecha: (fechaStr) => fechaStr ? fechaStr.split('-').reverse().join('/') : "N/A",

        formatters: {
            dispositivo: (d) => (typeof d === "string") ? d : `${d.descripcion || ''} ${d.operacion ? `(Op. ${d.operacion})` : ''}`.trim() || "[Dispositivo operativo]",
            inspeccion: (i) => (typeof i === "string") ? i : `<strong>${i.lugar || 'Lugar N/D'}</strong> (${i.tipo || 'Tipo N/D'}) — ${i.resultado || 'Sin resultado'}`,
        },
        // Normalizadores robustecidos para manejar múltiples claves de datos
        normalizers: {
            detenido: (obj = {}) => ({ 
                nombre: obj.detenidos_g1 || obj.numero || obj.nombre || "N/A", 
                motivo: obj.motivo_g1 || obj.motivo || "N/A", 
                nacionalidad: obj.nacionalidad_g1 || obj.nacionalidad || "N/A", 
                diligencias: obj.diligencias_g1 || obj.diligencias || "" 
            }),
            expulsado: (obj = {}) => ({ 
                nombre: obj.expulsados_g1 || obj.nombre || "N/A", 
                nacionalidad: obj.nacionalidad_eg1 || obj.nacionalidad || "N/A" 
            }),
            fletado: (obj = {}) => ({ 
                destino: obj.destino_flg1 || obj.destino || "N/A", 
                pax: obj.pax_flg1 || obj.pax || 0 
            }),
            frustrada: (obj = {}) => ({ 
                nombre: obj.exp_frustradas_g1 || obj.nombre || "N/A", 
                nacionalidad: obj.nacionalidad_fg1 || obj.nacionalidad || "N/A", 
                motivo: obj.motivo_fg1 || obj.motivo || "N/A" 
            }),
            ferry: (obj = {}) => ({ 
                destino: obj.destino || "N/D", 
                pasajeros: obj.pasajeros || 0, 
                vehiculos: obj.vehiculos || 0, 
                incidencias: obj.incidencias || "" 
            })
        }
    };

    // --- 7. LÓGICA DE EXPORTACIÓN (ExportManager) ---
    const ExportManager = {
        generarTextoWhatsapp(resumen, desde, hasta) {
            const f = UIRenderer.formatoFecha;
            let out = `*🛡️ SIREX - RESUMEN OPERATIVO*\n*Periodo:* ${f(desde)} al ${f(hasta)}\n`;
            const addSection = (cfg, content) => { if (content && content.trim()) out += `\n*${cfg.icon} ${cfg.label.toUpperCase()}*\n${content}`; };

            if (resumen.ucrif) {
                const u = resumen.ucrif;
                let content = `• *Totales*: ${u.detenidosILE ?? 0} ILE, ${u.filiadosVarios ?? 0} filiados, ${u.traslados ?? 0} traslados.\n`;
                if (u.inspecciones?.length > 0) content += `• Inspecciones: ${u.inspecciones.length}\n`;
                if (u.detenidosDelito?.length > 0) content += `• Detenidos (delito): ${u.detenidosDelito.length}\n`;
                addSection(AppConfig.grupos.ucrif, content);
            }
            if (resumen.grupo1) {
                const g1 = resumen.grupo1;
                let content = '';
                if(g1.detenidos?.length > 0) content += `• Detenidos: ${g1.detenidos.length}\n`;
                if(g1.expulsados?.length > 0) content += `• Expulsados: ${g1.expulsados.length}\n`;
                if(g1.frustradas?.length > 0) content += `• Frustradas: ${g1.frustradas.length}\n`;
                addSection(AppConfig.grupos.grupo1, content);
            }
             if (resumen.puerto?.numericos) {
                const p = resumen.puerto.numericos;
                addSection(AppConfig.grupos.puerto, `• Pasajeros Chequeados: ${p.paxChequeadas ?? 0}\n• Vehículos Chequeados: ${p.vehChequeados ?? 0}\n• Denegaciones: ${p.denegaciones ?? 0}`);
            }
            const addKeyValueSection = (cfg, data) => { if (data && Object.keys(data).length > 0) addSection(cfg, Object.entries(data).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n')); };
            addKeyValueSection(AppConfig.grupos.cecorex, resumen.cecorex);
            addKeyValueSection(AppConfig.grupos.gestion, resumen.gestion);
            addKeyValueSection(AppConfig.grupos.cie, resumen.cie);
            out += `\n_Parte cerrado y generado automáticamente por SIREX._`;
            return out;
        },

        exportarPDF(resumen, desde, hasta) {
            if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
                alert("Error al generar PDF: El plugin de tablas no está disponible."); return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            let finalY = 15;
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 15;
            const randomFrase = (tipo) => AppConfig.frasesNarrativas[tipo][Math.floor(Math.random() * AppConfig.frasesNarrativas[tipo].length)];

            const addHeader = () => {
                doc.setFont("helvetica", "bold"); doc.setFontSize(18);
                doc.setTextColor(40, 58, 90);
                doc.text("Resumen Operativo Global SIREX", pageW / 2, 22, { align: "center" });
                doc.setFont("helvetica", "normal"); doc.setFontSize(11);
                doc.setTextColor(108, 117, 125);
                doc.text(`Periodo del ${UIRenderer.formatoFecha(desde)} al ${UIRenderer.formatoFecha(hasta)}`, pageW / 2, 28, { align: "center" });
                finalY = 40;
            };
            const addFooter = () => {
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setLineWidth(0.5);
                    doc.setDrawColor(AppConfig.grupos.ucrif.color);
                    doc.line(margin, 280, pageW - margin, 280);
                    doc.setFontSize(8); doc.setTextColor(150);
                    doc.text(`Página ${i} de ${pageCount}`, pageW / 2, 285, { align: 'center' });
                    doc.text(`Informe SIREX · Generado el ${new Date().toLocaleString('es-ES')}`, margin, 285);
                }
            };
             const checkPageBreak = () => { if (finalY > 260) { doc.addPage(); finalY = 20; } };

            addHeader();
            doc.setFontSize(10);
            doc.setTextColor(0,0,0);
            const introText = doc.splitTextToSize(randomFrase('apertura'), pageW - margin * 2);
            doc.text(introText, margin, finalY);
            finalY += introText.length * 5 + 5;

            const addSection = (cfg, callback) => {
                if (!callback) return;
                checkPageBreak();
                doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(cfg.color);
                doc.text(`${cfg.icon} ${cfg.label}`, margin, finalY);
                finalY += 7;
                doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
                callback();
                finalY += 8;
            };

            const autoTable = (head, body, cfg) => {
                if (!body || body.length === 0) return;
                doc.autoTable({
                    startY: finalY, head: head, body: body, theme: 'grid',
                    headStyles: { fillColor: cfg.color, textColor: '#FFFFFF', fontStyle: 'bold' },
                    didDrawPage: (data) => { finalY = data.cursor.y; }
                });
                finalY = doc.autoTable.previous.finalY;
            };

            if (resumen.ucrif) addSection(AppConfig.grupos.ucrif, () => {
                const u = resumen.ucrif;
                let body = [];
                if (u.detenidosILE) body.push(['Detenidos por ILE', u.detenidosILE]);
                if (u.filiadosVarios) body.push(['Personas Filiadas', u.filiadosVarios]);
                if (u.traslados) body.push(['Traslados Realizados', u.traslados]);
                autoTable(null, body, AppConfig.grupos.ucrif);
                if (u.detenidosDelito?.length > 0) {
                    finalY += 3;
                    autoTable([['Detenidos por Delito Común', 'Motivo']], u.detenidosDelito.map(d => [d.descripcion, d.motivo]), AppConfig.grupos.ucrif);
                }
            });

            if (resumen.grupo1) addSection(AppConfig.grupos.grupo1, () => {
                const { normalizers } = UIRenderer;
                const detenidosValidos = resumen.grupo1.detenidos.map(normalizers.detenido).filter(d => d.motivo !== 'N/A' && d.nacionalidad !== 'N/A');
                const expulsadosValidos = resumen.grupo1.expulsados.map(normalizers.expulsado).filter(e => e.nacionalidad !== 'N/A');
                const fletadosValidos = resumen.grupo1.fletados.map(normalizers.fletado).filter(f => f.destino !== 'N/A');

                if (detenidosValidos.length > 0) autoTable([['Detenido (Motivo)', 'Nacionalidad']], detenidosValidos.map(d => [d.motivo, d.nacionalidad]), AppConfig.grupos.grupo1);
                if (expulsadosValidos.length > 0) { finalY += 2; autoTable([['Expulsado (Nacionalidad)']], expulsadosValidos.map(e => [e.nacionalidad]), AppConfig.grupos.grupo1); }
                if (fletadosValidos.length > 0) { finalY += 2; autoTable([['Vuelo Fletado (Destino)', 'PAX']], fletadosValidos.map(f => [f.destino, f.pax]), AppConfig.grupos.grupo1); }
            });

            const addKeyValueSectionToPdf = (cfg, data) => {
                if(data && Object.keys(data).length > 0) {
                    addSection(cfg, () => autoTable(null, Object.entries(data).map(([k,v]) => [k.replace(/_/g, " "), v]), cfg));
                }
            };
            addKeyValueSectionToPdf(AppConfig.grupos.puerto, resumen.puerto?.numericos);
            addKeyValueSectionToPdf(AppConfig.grupos.cecorex, resumen.cecorex);
            addKeyValueSectionToPdf(AppConfig.grupos.gestion, resumen.gestion);
            addKeyValueSectionToPdf(AppConfig.grupos.cie, resumen.cie);

            checkPageBreak();
            finalY += 5;
            doc.setFont("helvetica", "italic");
            const outroText = doc.splitTextToSize(randomFrase('cierre'), pageW - margin * 2);
            doc.text(outroText, margin, finalY);

            addFooter();
            doc.save(`SIREX_Resumen_${desde}_a_${hasta}.pdf`);
        }
    };

    // --- 8. MANEJADOR PRINCIPAL DE EVENTOS ---
    async function handleFormSubmit(e) {
        e.preventDefault();
        DOM.resumenVentana.innerHTML = '';
        DOM.spinner.classList.remove('d-none');
        DOM.exportBtns.classList.add('d-none');

        const desde = DOM.fechaDesde.value;
        const hasta = DOM.fechaHasta.value;

        if (!desde || !hasta || desde > hasta) {
            DOM.resumenVentana.innerHTML = `<div class="alert alert-danger">Por favor, selecciona un rango de fechas válido. La fecha "Desde" no puede ser posterior a "Hasta".</div>`;
            DOM.spinner.classList.add('d-none');
            return;
        }
        
        try {
            const promesas = {
                ucrif: QueryManager.getUcrifNovedades(desde, hasta),
                grupo1: QueryManager.getGrupo1Detalles(desde, hasta),
                puerto: QueryManager.getPuertoDetalles(desde, hasta),
                cecorex: QueryManager.sumarCampos('cecorex_registros', desde, hasta),
                gestion: QueryManager.sumarCampos('gestion_registros', desde, hasta),
                cie: QueryManager.getCIE(desde, hasta),
            };

            const resultados = await Promise.all(Object.values(promesas));
            const resumen = Object.keys(promesas).reduce((acc, key, index) => {
                acc[key] = resultados[index];
                return acc;
            }, {});
            
            console.log("Datos consolidados del resumen:", JSON.stringify(resumen, null, 2));

            appState = { ultimoResumen: resumen, desde, hasta };
            DOM.resumenVentana.innerHTML = UIRenderer.renderizarResumenGlobalHTML(resumen, desde, hasta);
            DOM.exportBtns.classList.remove('d-none');
        } catch (err) {
            console.error("Error al generar resumen:", err);
            DOM.resumenVentana.innerHTML = `<div class="alert alert-danger"><strong>Error al consultar los datos:</strong> ${err.message}. Revisa la consola para más detalles.</div>`;
        } finally {
            DOM.spinner.classList.add('d-none');
        }
    }

    // --- 9. ASIGNACIÓN DE EVENTOS ---
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.btnWhatsapp.addEventListener('click', () => appState.ultimoResumen && window.open(`https://wa.me/?text=${encodeURIComponent(ExportManager.generarTextoWhatsapp(appState.ultimoResumen, appState.desde, appState.hasta))}`, '_blank'));
    DOM.btnExportarPDF.addEventListener('click', () => appState.ultimoResumen && ExportManager.exportarPDF(appState.ultimoResumen, appState.desde, appState.hasta));

    // --- INICIALIZACIÓN ---
    const today = new Date().toISOString().split('T')[0];
    DOM.fechaDesde.value = today;
    DOM.fechaHasta.value = today;
});
