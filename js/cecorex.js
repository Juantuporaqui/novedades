// =======================================================================================
// SIREX · Consulta Global / Resúmenes v2.4
// Autor: Gemini (Asistente de Programación)
// Descripción: Lógica completa y mejorada para la consulta, visualización profesional
//              y exportación multi-formato de resúmenes operativos desde Firebase.
//              Este código implementa una narrativa automática para datos complejos
//              y se centra en una experiencia de usuario y presentación de alto nivel.
// ACTUALIZACIÓN: El resumen de CECOREX ahora suma todos sus campos y los muestra en 3 columnas.
// =======================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN CENTRAL DE LA APLICACIÓN ---
    // En este objeto se definen todas las constantes y configuraciones para mantener
    // el código limpio y fácil de modificar.
    const AppConfig = {
        firebase: {
            apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
            authDomain: "ucrif-5bb75.firebaseapp.com",
            projectId: "ucrif-5bb75",
            storageBucket: "ucrif-5bb75.appspot.com",
            messagingSenderId: "241698436443",
            appId: "1:241698436443:web:1f333b3ae3f813b755167e"
        },
        // Definición de cada grupo para consistencia en la UI (colores, iconos)
        grupos: {
            ucrif: { label: 'UCRIF (Grupos 2, 3 y 4)', icon: '🛡️', color: '#0dcaf0', theme: 'info' },
            grupo1: { label: 'Grupo I - Expulsiones', icon: '✈️', color: '#0d6efd', theme: 'primary' },
            puerto: { label: 'Grupo Puerto', icon: '⚓', color: '#198754', theme: 'success' },
            cecorex: { label: 'CECOREX', icon: '📡', color: '#ffc107', theme: 'warning' },
            gestion: { label: 'Grupo de Gestión', icon: '📋', color: '#6c757d', theme: 'secondary' },
            cie: { label: 'CIE', icon: '🏢', color: '#dc3545', theme: 'danger' }
        },
        // Frases para dar un toque humano y narrativo a los resúmenes
        frasesNarrativas: {
            apertura: [
                "Desplegadas actuaciones operativas clave, se ha reforzado la vigilancia y el control en materia de extranjería en el periodo analizado.",
                "En el marco de las competencias de la Brigada, se han desarrollado dispositivos coordinados para la prevención y actuación frente a la inmigración irregular.",
                "La intervención en focos de riesgo se ha consolidado con resultados notables, destacando las siguientes actuaciones coordinadas.",
                "Se han ejecutado múltiples dispositivos incidiendo en la protección de derechos y el mantenimiento del orden legal en materia de extranjería.",
                "La operativa del periodo refleja el firme compromiso de los grupos adscritos en el ámbito migratorio y de seguridad ciudadana."
            ],
            cierre: [
                "El conjunto de actuaciones llevadas a cabo refuerza la seguridad ciudadana y consolida la estrategia de la Brigada.",
                "El servicio se cierra sin incidencias extraordinarias que reseñar, cumpliendo con los objetivos marcados.",
                "Se mantiene una vigilancia activa sobre los dispositivos clave y se continúa el seguimiento de las actuaciones en curso.",
                "Parte cerrado con un balance de actividad positivo para la operativa global de la UCRIF."
            ]
        }
    };

    // --- 2. INICIALIZACIÓN DE FIREBASE ---
    // Nos aseguramos de inicializar Firebase solo una vez.
    if (!firebase.apps.length) {
        firebase.initializeApp(AppConfig.firebase);
    }
    const db = firebase.firestore();
    const FieldPath = firebase.firestore.FieldPath; // Atajo para consultas complejas

    // --- 3. REFERENCIAS A ELEMENTOS DEL DOM ---
    // Centralizamos todos los accesos al DOM para un código más limpio.
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
    // Almacena los datos del último resumen generado para poder exportarlos sin
    // necesidad de volver a consultar a la base de datos.
    let appState = {
        ultimoResumen: null,
        desde: '',
        hasta: ''
    };
    
    // --- 5. LÓGICA DE CONSULTAS A FIRESTORE (QueryManager) ---
    // Módulo encargado exclusivamente de obtener y procesar los datos desde Firebase.
    const QueryManager = {
        /**
         * Obtiene y consolida todas las novedades de los grupos operativos de UCRIF.
         * Esta función es clave para la "narrativa", ya que une datos de distintas
         * colecciones en un único objeto fácil de interpretar.
         */
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

                // Unifica detenidos de diferentes formatos de parte (DOCX vs manual)
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
                if (data.inspecciones_g4) resultado.inspecciones.push(...data.inspecciones_g4); // Para partes de G4
                if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones);
            });
            return resultado;
        },

        // Obtiene los detalles del Grupo 1
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

        // Obtiene los detalles del Grupo Puerto
        getPuertoDetalles: async (desde, hasta) => {
            const snap = await db.collection('grupoPuerto_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            let res = { ferrys: [], incidencias: [], ctrlMarinos: 0, marinosArgos: 0 };
            snap.forEach(doc => {
                const data = doc.data();
                if (data.ferrys) res.ferrys.push(...data.ferrys);
                if (data.incidencias) res.incidencias.push(...data.incidencias);
                res.ctrlMarinos += Number(data.ctrlMarinos) || 0;
                res.marinosArgos += Number(data.marinosArgos) || 0;
            });
            return res;
        },

        /**
         * Función genérica para sumar todos los campos numéricos de una colección
         * en un rango de fechas. Usada por CECOREX, Gestión y CIE.
         */
        sumarCampos: async (collection, desde, hasta) => {
            const snap = await db.collection(collection).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            let res = {};
            snap.forEach(doc => {
                const data = doc.data();
                Object.keys(data).forEach(key => {
                    // Suma el campo si es un número y no es el campo 'fecha'
                    if (key !== 'fecha' && !isNaN(Number(data[key]))) {
                         res[key] = (res[key] || 0) + (Number(data[key]) || 0);
                    }
                });
            });
            return res;
        },

        /**
         * Obtiene los datos del CIE. Suma los totales del rango y además busca
         * el último dato de "internos" para tener el recuento final.
         */
        getCIE: async function(desde, hasta) {
            const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta);
            const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
            const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
            return { ...rangeTotals, "Internos (a fin de periodo)": finalCount };
        }
    };

    // --- 6. LÓGICA DE RENDERIZADO HTML (UIRenderer) ---
    // Módulo para construir la interfaz de usuario. Separa la lógica de presentación
    // de la lógica de datos.
    const UIRenderer = {
        /**
         * Construye el HTML completo del resumen global.
         */
        renderizarResumenGlobalHTML(resumen, desde, hasta) {
            let html = `<div class="alert alert-light text-center my-4 p-3 border rounded-3">
                            <h2 class="h4 mb-1"><b>RESUMEN OPERATIVO GLOBAL SIREX</b></h2>
                            <span class="text-muted">Periodo consultado: <b>${this.formatoFecha(desde)}</b> al <b>${this.formatoFecha(hasta)}</b></span>
                        </div>`;
            
            const randomFrase = (tipo) => {
                const frases = AppConfig.frasesNarrativas[tipo] || [];
                return frases.length ? frases[Math.floor(Math.random() * frases.length)] : "";
            };

            // Añade la narrativa
            html += `<p class="lead">${randomFrase('apertura')}</p><hr/>`;

            // Renderiza las tarjetas de cada grupo si tienen datos
            if (resumen.ucrif && Object.values(resumen.ucrif).some(v => Array.isArray(v) ? v.length > 0 : v > 0)) html += this.renderizarUcrif(resumen.ucrif);
            if (resumen.grupo1 && Object.values(resumen.grupo1).some(v => v.length > 0)) html += this.renderizarGrupo1(resumen.grupo1);
            if (resumen.puerto && Object.values(resumen.puerto).some(v => Array.isArray(v) ? v.length > 0 : v > 0)) html += this.renderizarPuerto(resumen.puerto);
            if (resumen.cecorex && Object.keys(resumen.cecorex).length > 0) html += this.renderizarCecorex(resumen.cecorex);
            if (resumen.gestion && Object.keys(resumen.gestion).length > 0) html += this.renderizarGestion(resumen.gestion);
            if (resumen.cie && Object.keys(resumen.cie).length > 0) html += this.renderizarCIE(resumen.cie);

            html += `<hr/><p class="text-muted fst-italic mt-4">${randomFrase('cierre')}</p>`;
            return html;
        },

        /**
         * Crea la tarjeta de presentación para los datos de UCRIF.
         */
        renderizarUcrif(data) {
            const cfg = AppConfig.grupos.ucrif;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;

            // Párrafo narrativo principal de UCRIF
            let frase = `En el periodo se han efectuado <strong>${data.detenidosILE || 0}</strong> detenciones por Infracción a la Ley de Extranjería, se ha procedido a la filiación de <strong>${data.filiadosVarios || 0}</strong> personas en diversos controles, se han materializado <strong>${data.traslados || 0}</strong> traslados y se ha citado a <strong>${data.citadosCecorex || 0}</strong> individuos para trámites en CECOREX.`;
            html += `<p class="mb-4">${frase}</p>`;

            // Secciones con listas detalladas
            html += this.renderListSection('Inspecciones y Controles', data.inspecciones, i => this.formatters.inspeccion(i));
            html += this.renderListSection('Dispositivos Operativos Especiales', data.dispositivos, d => this.formatters.dispositivo(d));
            html += this.renderListSection('Detenidos por otros delitos', data.detenidosDelito, d => `${d.descripcion} por <strong>${d.motivo}</strong>`);
            html += this.renderListSection('Colaboraciones con otras unidades', data.colaboraciones, c => typeof c === 'string' ? c : (c.colaboracionDesc || '[Colaboración registrada]'));
            
            if (data.observaciones && data.observaciones.filter(o => o && o.trim()).length > 0) {
                html += `<div class="alert alert-light mt-3"><strong>Observaciones Relevantes de los Grupos:</strong><br>${data.observaciones.filter(o => o && o.trim()).map(o => `<div><small>- ${o}</small></div>`).join("")}</div>`;
            }
            
            html += `</div></div>`;
            return html;
        },

        // Métodos de renderizado para cada grupo (Grupo1, Puerto, etc.)
        renderizarGrupo1(data) {
            const cfg = AppConfig.grupos.grupo1;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;
            
            html += this.renderListSection('Detenidos', data.detenidos, d => {
                const det = this.normalizers.detenido(d);
                return `<strong>${det.nombre}</strong> (${det.nacionalidad}) por <strong>${det.motivo}</strong>. ${det.diligencias ? `Diligencias: ${det.diligencias}`:''}`;
            });
            html += this.renderListSection('Expulsiones Materializadas', data.expulsados, e => {
                const exp = this.normalizers.expulsado(e);
                return `<strong>${exp.nombre}</strong> (${exp.nacionalidad}).`;
            });
            html += this.renderListSection('Expulsiones Frustradas', data.frustradas, f => {
                const fru = this.normalizers.frustrada(f);
                return `<strong>${fru.nombre}</strong> (${fru.nacionalidad}) - Motivo: <strong>${fru.motivo}</strong>`;
            });
            html += this.renderListSection('Vuelos Fletados', data.fletados, f => {
                const fle = this.normalizers.fletado(f);
                return `Destino: <strong>${fle.destino}</strong> - ${fle.pax} PAX. ${fle.fecha ? `Fecha: ${this.formatoFecha(fle.fecha)}` : ''}`;
            });

            html += `</div></div>`;
            return html;
        },
        
        renderizarPuerto(data) {
            const cfg = AppConfig.grupos.puerto;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;
            
            html += `<p>Actividad principal: <strong>${data.ctrlMarinos || 0}</strong> marinos controlados y <strong>${data.marinosArgos || 0}</strong> consultas en ARGOS. Se han registrado <strong>${data.incidencias?.length || 0}</strong> incidencias.</p>`;
            html += this.renderListSection('Ferrys Controlados', data.ferrys, f => {
                const ferry = this.normalizers.ferry(f);
                return `<strong>${ferry.destino}</strong> - Pasajeros: ${ferry.pasajeros || 0}, Vehículos: ${ferry.vehiculos || 0}. ${ferry.incidencias ? `<strong class="text-danger">Incidencia: ${ferry.incidencias}</strong>` : ''}`;
            });
            html += this.renderListSection('Incidencias Relevantes', data.incidencias, inc => inc.incidencia || inc);

            html += `</div></div>`;
            return html;
        },

        renderizarCecorex(data) {
            const cfg = AppConfig.grupos.cecorex;
            let html = `<div class="card border-warning mb-4 shadow-sm">
                            <div class="card-header bg-warning text-dark"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4"><div class="row g-3">`;

            const fields = Object.entries(data);
            if (fields.length === 0) {
                html += `<div class="col-12"><p class="text-muted">No hay datos para mostrar en este periodo.</p></div>`;
            } else {
                fields.forEach(([key, value]) => {
                    html += `
                        <div class="col-sm-6 col-md-4">
                            <div class="d-flex justify-content-between align-items-center border rounded p-2 h-100 bg-light">
                                <span class="text-capitalize small me-2">${key.replace(/_/g, " ").toLowerCase()}</span>
                                <span class="badge bg-warning text-dark rounded-pill fs-6">${value}</span>
                            </div>
                        </div>`;
                });
            }

            html += `</div></div></div>`;
            return html;
        },
        
        // Renderizadores genéricos para grupos con formato similar (Gestión, CIE)
        renderizarGestion(data) {
            return this.renderKeyValueCard(AppConfig.grupos.gestion, data);
        },

        renderizarCIE(data) {
            return this.renderKeyValueCard(AppConfig.grupos.cie, data);
        },

        // --- HELPERS DE RENDERIZADO ---
        /**
         * Crea una tarjeta genérica para mostrar pares de clave-valor.
         */
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
        
        /**
         * Crea una sección con título y una lista de elementos.
         */
        renderListSection(title, data, formatter) {
            if (!data || data.length === 0) return '';
            let html = `<h5 class="mt-4 mb-2 fw-bold text-primary-emphasis" style="font-size: 1.1rem;">${title} (${data.length})</h5><ul class="list-group">`;
            data.forEach(item => {
                html += `<li class="list-group-item">${formatter(item)}</li>`;
            });
            html += `</ul>`;
            return html;
        },

        formatoFecha(fechaStr) {
            if (!fechaStr) return "N/A";
            const [year, month, day] = fechaStr.split('-');
            return `${day}/${month}/${year}`;
        },

        // --- FORMATEADORES Y NORMALIZADORES ---
        // Ayudan a manejar pequeñas diferencias en la estructura de los datos
        // que vienen de distintas fuentes (partes DOCX, entrada manual, etc.)
        formatters: {
            dispositivo: (d) => {
                if (typeof d === "string") return d;
                let parts = [];
                if (d.descripcion) parts.push(d.descripcion);
                if (d.operacion) parts.push(`(Op. ${d.operacion})`);
                return parts.join(' ').trim() || "[Dispositivo operativo registrado]";
            },
            inspeccion: (i) => {
                if (typeof i === "string") return i;
                let parts = [];
                if (i.lugar) parts.push(`<strong>${i.lugar}</strong>`);
                if (i.tipo) parts.push(`(${i.tipo})`);
                if (i.resultado) parts.push(`— ${i.resultado}`);
                return parts.join(' ').trim() || "[Inspección registrada]";
            }
        },
        normalizers: {
            detenido: (obj) => ({
                nombre: obj.detenidos_g1 || obj.numero || obj.nombre || "N/A",
                motivo: obj.motivo_g1 || obj.motivo || "N/A",
                nacionalidad: obj.nacionalidad_g1 || obj.nacionalidad || "N/A",
                diligencias: obj.diligencias_g1 || obj.diligencias || ""
            }),
            expulsado: (obj) => ({
                nombre: obj.expulsados_g1 || obj.nombre || "N/A",
                nacionalidad: obj.nacionalidad_eg1 || obj.nacionalidad || "N/A",
            }),
            fletado: (obj) => ({
                destino: obj.destino_flg1 || obj.destino || "N/A",
                pax: obj.pax_flg1 || obj.pax || 0,
                fecha: obj.fecha || "",
            }),
            frustrada: (obj) => ({
                nombre: obj.exp_frustradas_g1 || obj.nombre || "N/A",
                nacionalidad: obj.nacionalidad_fg1 || obj.nacionalidad || "N/A",
                motivo: obj.motivo_fg1 || obj.motivo || "N/A",
            }),
            ferry: (obj) => ({
                destino: obj.destino || "N/D",
                pasajeros: obj.pasajeros || 0,
                vehiculos: obj.vehiculos || 0,
                incidencias: obj.incidencias || ""
            })
        }
    };

    // --- 7. LÓGICA DE EXPORTACIÓN (ExportManager) ---
    // Módulo para generar los formatos de salida: WhatsApp y PDF.
    const ExportManager = {
        /**
         * Genera un texto conciso y formateado para compartir en WhatsApp.
         */
        generarTextoWhatsapp(resumen, desde, hasta) {
            const f = UIRenderer.formatoFecha;
            let out = `*🛡️ SIREX - RESUMEN OPERATIVO*\n*Periodo:* ${f(desde)} al ${f(hasta)}\n`;

            const addSection = (cfg, content) => {
                if (!content || content.trim() === '') return;
                out += `\n*${cfg.icon} ${cfg.label.toUpperCase()}*\n${content}`;
            };

            if (resumen.ucrif) {
                const u = resumen.ucrif;
                let content = `• *Totales*: ${u.detenidosILE || 0} ILE, ${u.filiadosVarios || 0} filiados, ${u.traslados || 0} traslados.\n`;
                if (u.inspecciones?.length > 0) content += `• Inspecciones: ${u.inspecciones.length}\n`;
                if (u.dispositivos?.length > 0) content += `• Dispositivos: ${u.dispositivos.length}\n`;
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
            
            if (resumen.puerto) {
                const p = resumen.puerto;
                addSection(AppConfig.grupos.puerto, `• Marinos controlados: ${p.ctrlMarinos || 0}\n• Incidencias: ${p.incidencias?.length || 0}\n`);
            }
            
            const addKeyValueSection = (cfg, data) => {
                if (data && Object.keys(data).length > 0) {
                     addSection(cfg, Object.entries(data).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n'));
                }
            };

            addKeyValueSection(AppConfig.grupos.cecorex, resumen.cecorex);
            addKeyValueSection(AppConfig.grupos.gestion, resumen.gestion);
            addKeyValueSection(AppConfig.grupos.cie, resumen.cie);

            out += `\n_Parte cerrado y generado automáticamente por SIREX._`;
            return out;
        },

        /**
         * Genera un documento PDF profesional con tablas y estilos.
         */
        exportarPDF(resumen, desde, hasta) {
            // Verificación crítica: Asegurarse de que el plugin AutoTable está cargado.
            if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
                console.error("Error: El plugin jsPDF-AutoTable no está cargado. Asegúrate de que el script esté incluido en tu HTML.");
                alert("Error al generar PDF: El plugin de tablas no está disponible.");
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const f = UIRenderer.formatoFecha;
            const N = UIRenderer.normalizers;
            let finalY = 20;
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 15;

            // --- Cabecera del Documento ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("SIREX - Resumen Operativo Global", pageW / 2, finalY, { align: "center" });
            finalY += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.text(`Periodo: ${f(desde)} al ${f(hasta)}`, pageW / 2, finalY, { align: "center" });
            finalY += 15;

            const addSection = (cfg, addContentCallback) => {
                if (finalY > 250) { doc.addPage(); finalY = 20; } // Control de salto de página
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(cfg.color);
                doc.text(`${cfg.icon} ${cfg.label}`, margin, finalY);
                doc.setDrawColor(cfg.color);
                doc.line(margin, finalY + 1, pageW - margin, finalY + 1);
                finalY += 8;
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
                addContentCallback();
                finalY += 10;
            };

            // --- Renderizado de Secciones en PDF ---
            if (resumen.ucrif) {
                addSection(AppConfig.grupos.ucrif, () => {
                    const u = resumen.ucrif;
                    doc.autoTable({
                        startY: finalY,
                        body: [
                            ['Detenidos por ILE', u.detenidosILE || 0],
                            ['Personas Filiadas', u.filiadosVarios || 0],
                            ['Traslados Realizados', u.traslados || 0],
                            ['Citados en CECOREX', u.citadosCecorex || 0]
                        ],
                        theme: 'grid',
                        styles: { fontSize: 10, cellPadding: 2 },
                        headStyles: { fillColor: AppConfig.grupos.ucrif.color },
                    });
                    finalY = doc.autoTable.previous.finalY + 5;
                    if(u.detenidosDelito?.length > 0) {
                        doc.autoTable({
                            startY: finalY, head: [['Detenidos por Delito Común', 'Motivo']],
                            body: u.detenidosDelito.map(d => [d.descripcion, d.motivo]),
                            theme: 'striped', headStyles: { fillColor: AppConfig.grupos.ucrif.color }
                        });
                        finalY = doc.autoTable.previous.finalY + 5;
                    }
                });
            }

            if (resumen.grupo1) {
                addSection(AppConfig.grupos.grupo1, () => {
                    const g1 = resumen.grupo1;
                    if(g1.detenidos?.length > 0) doc.autoTable({ startY: finalY, head: [['Detenido', 'Nacionalidad', 'Motivo']], body: g1.detenidos.map(d => { const d_ = N.detenido(d); return [d_.nombre, d_.nacionalidad, d_.motivo]}), theme: 'striped', headStyles: { fillColor: AppConfig.grupos.grupo1.color }, didDrawPage: () => finalY = 20 });
                    if(g1.expulsados?.length > 0) doc.autoTable({ startY: doc.autoTable.previous.finalY + 5, head: [['Expulsado', 'Nacionalidad']], body: g1.expulsados.map(e => { const e_ = N.expulsado(e); return [e_.nombre, e_.nacionalidad]}), theme: 'striped', headStyles: { fillColor: AppConfig.grupos.grupo1.color }, didDrawPage: () => finalY = 20 });
                    finalY = doc.autoTable.previous.finalY;
                });
            }
             
            // --- Pie de Página ---
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, pageW / 2, 287, { align: 'center' });
                doc.text(`Informe generado el ${new Date().toLocaleString('es-ES')} por SIREX`, margin, 287);
            }

            doc.save(`SIREX_Resumen_${desde}_a_${hasta}.pdf`);
        }
    };

    // --- 8. MANEJADOR PRINCIPAL DE EVENTOS ---
    // Orquesta todo el proceso: gestiona el formulario, llama a las consultas,
    // y luego al renderizado.
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
            // Ejecuta todas las consultas en paralelo para máxima eficiencia
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
            
            // Guarda el resultado en el estado de la aplicación
            appState.ultimoResumen = resumen;
            appState.desde = desde;
            appState.hasta = hasta;

            // Llama al renderizador para mostrar los resultados
            DOM.resumenVentana.innerHTML = UIRenderer.renderizarResumenGlobalHTML(resumen, desde, hasta);
            DOM.exportBtns.classList.remove('d-none');

        } catch (err) {
            console.error("Error al generar resumen:", err);
            DOM.resumenVentana.innerHTML = `<div class="alert alert-danger"><strong>Error al consultar los datos:</strong> ${err.message}. Revisa la consola para más detalles.</div>`;
        } finally {
            DOM.spinner.classList.add('d-none');
        }
    }

    // --- 9. ASIGNACIÓN DE EVENTOS A LOS BOTONES Y FORMULARIO ---
    DOM.form.addEventListener('submit', handleFormSubmit);
    
    DOM.btnWhatsapp.addEventListener('click', () => {
        if (!appState.ultimoResumen) return;
        const msg = ExportManager.generarTextoWhatsapp(appState.ultimoResumen, appState.desde, appState.hasta);
        // Abre WhatsApp en una nueva pestaña con el mensaje pre-cargado
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    });

    DOM.btnExportarPDF.addEventListener('click', () => {
        if (!appState.ultimoResumen) return;
        ExportManager.exportarPDF(appState.ultimoResumen, appState.desde, appState.hasta);
    });

    // --- INICIALIZACIÓN ---
    // Establece las fechas por defecto al día de hoy para conveniencia del usuario.
    const today = new Date().toISOString().split('T')[0];
    DOM.fechaDesde.value = today;
    DOM.fechaHasta.value = today;

});
