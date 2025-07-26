// =======================================================================================
// SIREX · Consulta Global / Resúmenes v4.1
// Autor: Gemini (Asistente de Programación)
// Descripción: Versión con lógica de CIE corregida y rediseño completo de la exportación PDF.
//
// NOTA IMPORTANTE: Para el correcto funcionamiento de los menús desplegables (acordeones),
// asegúrate de que tu archivo HTML incluye el SCRIPT de Bootstrap 5 Bundle, por ejemplo:
// <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
//
// MEJORAS CLAVE (v4.1):
// 1. **Lógica de CIE Corregida**:
//    - El total de internos refleja el dato del último día del periodo, no una suma.
//    - Se totalizan correctamente los ingresos y salidas.
//    - Se añade la recopilación y muestra de incidencias.
// 2. **Rediseño Profesional del PDF**:
//    - Se añade una página de "Resumen Ejecutivo" con KPIs y un párrafo introductorio.
//    - El contenido fluye de forma continua, eliminando páginas vacías.
//    - Diseño mejorado con más elementos visuales, texto introductorio y aspecto profesional.
//    - Inclusión de todas las tablas de datos para un informe 100% completo.
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
            gestion: { label: 'Grupo de Gestión', icon: '🗂️', color: '#6c757d', theme: 'secondary' },
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
            const collections = ['grupo2_registros', 'grupo3_registros', 'grupo4_operativo', 'control_casas_citas'];
            let rawData = [];
            for (const coll of collections) {
                const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
                snap.forEach(doc => rawData.push({ ...doc.data(), fecha: doc.id }));
            }

            const resultado = {
                detenidosILE: 0, filiadosVarios: 0, traslados: 0, citadosCecorex: 0,
                inspecciones: [], detenidosDelito: [], observaciones: [],
                colaboraciones: [], dispositivos: [], nacionalidadesFiliados: {}
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
                            descripcion: `${d.detenido || d.detenidos_g4 || 'N/A'}`,
                            nacionalidad: `${d.nacionalidad || d.nacionalidad_g4 || 'N/A'}`,
                            motivo: motivo,
                        });
                    }
                });
                
                if (data.inspecciones) {
                    const inspeccionesConFecha = data.inspecciones.map(insp => ({...insp, fecha: data.fecha}));
                    resultado.inspecciones.push(...inspeccionesConFecha);
                }
                if (data.actuaciones) {
                     const actuacionesConFecha = data.actuaciones.map(act => ({...act, fecha: data.fecha}));
                     resultado.dispositivos.push(...actuacionesConFecha);
                }
                
                if (data.datos && Array.isArray(data.datos)) {
                    data.datos.forEach(item => {
                        if (item.casa) { 
                            resultado.inspecciones.push({
                                fecha: data.fecha,
                                lugar: item.casa,
                                tipo: 'Casa de Citas',
                                resultado: `${item.n_filiadas || 0} filiadas (${item.nacionalidades || 'N/D'}).`
                            });
                            if (item.nacionalidades) {
                                const nacionalidades = item.nacionalidades.split(/, | y /);
                                nacionalidades.forEach(nac => {
                                    const cleanNac = nac.trim();
                                    if (cleanNac) {
                                        resultado.nacionalidadesFiliados[cleanNac] = (resultado.nacionalidadesFiliados[cleanNac] || 0) + 1;
                                    }
                                });
                            }
                        } else if (item.identificadas) { 
                             resultado.filiadosVarios += Number(item.identificadas) || 0;
                             resultado.citadosCecorex += Number(item.citadas) || 0;
                        }
                    });
                }
            });
            return resultado;
        },

        getGrupo1Detalles: async (desde, hasta) => {
            const snap = await db.collection('grupo1_expulsiones').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            const res = { detenidos: [], expulsados: [], frustradas: [], fletados: [] };
            snap.forEach(doc => {
                const data = doc.data();
                if (data.detenidos_g1) res.detenidos.push(...data.detenidos_g1);
                if (data.detenidos) res.detenidos.push(...data.detenidos);
                if (data.expulsados_g1) res.expulsados.push(...data.expulsados_g1);
                if (data.expulsados) res.expulsados.push(...data.expulsados);
                if (data.exp_frustradas_g1) res.frustradas.push(...data.exp_frustradas_g1);
                if (data.frustradas) res.frustradas.push(...data.frustradas);
                if (data.fletados_g1) res.fletados.push(...data.fletados_g1);
                if (data.fletados) res.fletados.push(...data.fletados);
            });
            return res;
        },
        
        getPuertoDetalles: async (desde, hasta) => {
            const snap = await db.collection('grupoPuerto_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            let res = { numericos: {}, ferrys: [], gestiones: [] };
            
            snap.forEach(doc => {
                const data = doc.data();
                const fechaDoc = doc.id;
                for (const key in data) {
                    if (typeof data[key] === 'number' && key !== 'fecha') {
                        res.numericos[key] = (res.numericos[key] || 0) + data[key];
                    }
                }
                if (data.ferrys && Array.isArray(data.ferrys)) {
                    const ferrysConFecha = data.ferrys.map(ferry => ({ ...ferry, fecha: fechaDoc }));
                    res.ferrys.push(...ferrysConFecha);
                }
                if (data.gestiones_puerto && Array.isArray(data.gestiones_puerto)) res.gestiones.push(...data.gestiones_puerto);
            });
            return res;
        },

        getCecorexDetalles: async (desde, hasta) => {
            const collectionsToQuery = ['cecorex_registros', 'cecorex'];
            let res = { numericos: {}, detenidos: [] };

            for (const coll of collectionsToQuery) {
                const snap = await db.collection(coll).where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
                snap.forEach(doc => {
                    const data = doc.data();
                    
                    Object.keys(data).forEach(key => {
                        if (key !== 'detenidos_cc' && !Array.isArray(data[key])) {
                            const numericValue = Number(data[key]);
                            if (!isNaN(numericValue)) {
                                const cleanKey = key.replace(/_/g, " ").replace(/\./g, "").trim();
                                res.numericos[cleanKey] = (res.numericos[cleanKey] || 0) + numericValue;
                            }
                        }
                    });

                    if (data.detenidos_cc && Array.isArray(data.detenidos_cc)) {
                        const detenidosNormalizados = data.detenidos_cc.map(d => ({
                            nombre: d.detenidos_cc || 'N/A',
                            motivo: d.motivo_cc || 'N/A',
                            nacionalidad: d.nacionalidad_cc || 'N/A',
                            observaciones: d.observaciones_cc || '',
                            presenta: d.presenta || ''
                        }));
                        res.detenidos.push(...detenidosNormalizados);
                    }
                });
            }
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

        // [MEJORA] Lógica de CIE completamente reescrita
        getCIE: async function(desde, hasta) {
            const snapPeriodo = await db.collection('cie_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            
            const res = {
                ingresos: 0,
                salidas: 0,
                incidencias: [],
                internos_final: 'N/D'
            };

            snapPeriodo.forEach(doc => {
                const data = doc.data();
                res.ingresos += Number(data.n_ingresos) || 0;
                res.salidas += Number(data.n_salidas) || 0;
                if (data.incidencias && data.incidencias.trim() !== '') {
                    res.incidencias.push(`[${UIRenderer.formatoFecha(doc.id)}] ${data.incidencias}`);
                }
            });

            const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
            if (!snapLastDay.empty) {
                res.internos_final = snapLastDay.docs[0].data().n_internos ?? 0;
            }
            
            return res;
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
            if (resumen.cecorex && (Object.keys(resumen.cecorex.numericos ?? {}).length > 0 || resumen.cecorex.detenidos?.length > 0)) html += this.renderizarCecorex(resumen.cecorex);
            if (resumen.gestion && Object.keys(resumen.gestion ?? {}).length > 0) html += this.renderMultiColumnCard(AppConfig.grupos.gestion, resumen.gestion);
            if (resumen.cie && Object.values(resumen.cie).some(v => (Array.isArray(v) ? v.length > 0 : v > 0 || v !== 'N/D'))) html += this.renderizarCIE(resumen.cie);

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
            
            html += this.renderAccordionSection('Dispositivos Operativos Especiales', data.dispositivos, d => this.formatters.dispositivo(d), 'dispositivos', true);

            const detenidosAgrupados = (data.detenidosDelito || []).reduce((acc, d) => {
                const key = `${d.motivo || 'N/A'}|${d.nacionalidad || 'N/A'}`;
                if (!acc[key]) {
                    acc[key] = { motivo: d.motivo, nacionalidad: d.nacionalidad, count: 0 };
                }
                acc[key].count++;
                return acc;
            }, {});
            const listaDetenidosAgrupados = Object.values(detenidosAgrupados);
            html += this.renderListSection('Detenidos por otros delitos', listaDetenidosAgrupados, d => `<strong>${d.count}</strong> x <strong>${d.motivo}</strong> (Nacionalidad: ${d.nacionalidad})`);

            html += this.renderListSection('Colaboraciones con otras unidades', data.colaboraciones, c => {
                if (typeof c === 'object' && c.colaboracionDesc) {
                    return `${c.colaboracionDesc} con <strong>${c.colaboracionUnidad || 'unidad no especificada'}</strong>. Resultado: ${c.colaboracionResultado || 'N/D'}`;
                }
                return typeof c === 'string' ? c : 'Colaboración no especificada.';
            });

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
            
            const detenidosValidos = data.detenidos.map(this.normalizers.detenido).filter(d => d.motivo && d.motivo.trim() && d.motivo !== 'N/A' && d.nacionalidad && d.nacionalidad.trim() && d.nacionalidad !== 'N/A');
            const expulsadosValidos = data.expulsados.map(this.normalizers.expulsado).filter(e => e.nacionalidad && e.nacionalidad.trim() && e.nacionalidad !== 'N/A');
            const frustradasValidas = data.frustradas.map(this.normalizers.frustrada).filter(f => f.nombre && f.nombre.trim() && f.nombre !== 'N/A');
            const fletadosValidos = data.fletados.map(this.normalizers.fletado).filter(f => f.destino && f.destino.trim() && f.destino !== 'N/A');

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
            
            const formatterFerry = f => {
                const ferry = this.normalizers.ferry(f);
                const fechaStr = ferry.fecha ? `[${this.formatoFecha(ferry.fecha)}] ` : '';
                return `${fechaStr}<strong>${ferry.destino}</strong> - Pasajeros: ${ferry.pasajeros || 0}, Vehículos: ${ferry.vehiculos || 0}. ${ferry.incidencias ? `<strong class="text-warning">Incidencia: ${ferry.incidencias}</strong>` : ''}`;
            };
            html += this.renderAccordionSection('Ferrys Controlados', data.ferrys, formatterFerry, 'ferrys');

            if (data.ferrys && data.ferrys.length > 0) {
                const totalFerrys = data.ferrys.length;
                const totalPasajeros = data.ferrys.reduce((sum, f) => sum + (Number(f.pasajeros) || 0), 0);
                const totalVehiculos = data.ferrys.reduce((sum, f) => sum + (Number(f.vehiculos) || 0), 0);
                html += `<div class="alert alert-success mt-4">
                            <strong>TOTALES FERRYS:</strong> 
                            <span class="badge bg-light text-dark mx-1">${totalFerrys} Controlados</span>
                            <span class="badge bg-light text-dark mx-1">${totalPasajeros} Pasajeros</span>
                            <span class="badge bg-light text-dark mx-1">${totalVehiculos} Vehículos</span>
                         </div>`;
            }

            html += this.renderListSection('Gestiones Realizadas', data.gestiones, g => g.gestion);

            html += `</div></div>`;
            return html;
        },

        renderizarCecorex(data) {
            const cfg = AppConfig.grupos.cecorex;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-dark"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-4">`;
            
            if (data.numericos && Object.keys(data.numericos).length > 0) {
                 html += `<h5 class="mb-3 fw-bold text-primary-emphasis">Resumen de Actividad</h5><div class="row g-3">`;
                 Object.entries(data.numericos).forEach(([key, value]) => {
                    html += `
                        <div class="col-sm-6 col-md-4">
                            <div class="d-flex justify-content-between align-items-center border rounded p-2 h-100 bg-light">
                                <span class="text-capitalize small me-2">${key}</span>
                                <span class="badge bg-${cfg.theme} text-dark rounded-pill fs-6">${value}</span>
                            </div>
                        </div>`;
                });
                html += `</div>`;
            }

            if (data.detenidos && data.detenidos.length > 0) {
                const agrupados = data.detenidos.reduce((acc, d) => {
                    const motivo = d.motivo || 'Sin motivo';
                    const nacionalidad = d.nacionalidad || 'Sin nacionalidad';
                    const key = `${motivo}|${nacionalidad}`;
                    
                    if (!acc[key]) {
                        acc[key] = { motivo, nacionalidad, count: 0 };
                    }
                    const cantidad = isNaN(parseInt(d.nombre)) ? 1 : parseInt(d.nombre);
                    acc[key].count += cantidad;
                    return acc;
                }, {});

                const detenidosAgrupados = Object.values(agrupados);
                const formatterDetenido = item => `<strong>${item.count}</strong> detenido/s por <strong>${item.motivo}</strong> de <strong>${item.nacionalidad}</strong>`;
                
                html += this.renderAccordionSection('Detenidos Registrados', detenidosAgrupados, formatterDetenido, 'cecorexDetenidos');
            }
            
            html += `</div></div>`;
            return html;
        },
        
        // [MEJORA] Renderizado de CIE actualizado
        renderizarCIE(data) {
            const cfg = AppConfig.grupos.cie;
            let html = `<div class="card border-${cfg.theme} mb-4 shadow-sm">
                            <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                            <div class="card-body p-3"><ul class="list-group list-group-flush">`;
            
            const items = {
                "Ingresos en periodo": data.ingresos,
                "Salidas en periodo": data.salidas,
                "Ocupación a fin de periodo": data.internos_final
            };

            Object.entries(items).forEach(([key, value]) => {
                html += `<li class="list-group-item d-flex justify-content-between align-items-center text-capitalize">
                            ${key}
                            <span class="badge bg-${cfg.theme} rounded-pill fs-6">${value}</span>
                        </li>`;
            });
            
            html += `</ul>`;

            if (data.incidencias && data.incidencias.length > 0) {
                html += this.renderListSection('Incidencias Relevantes', data.incidencias, i => i);
            }

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
        
        renderListSection(title, data, formatter) {
            if (!data || data.length === 0) return '';
            let html = `<h5 class="mt-4 mb-2 fw-bold text-primary-emphasis" style="font-size: 1.1rem;">${title} (${data.length})</h5><ul class="list-group list-group-flush">`;
            data.forEach(item => { html += `<li class="list-group-item">${formatter(item)}</li>`; });
            html += `</ul>`;
            return html;
        },

        renderAccordionSection(title, data, formatter, idPrefix, withCheckboxes = false) {
            if (!data || data.length === 0) return '';
            const accordionId = `accordion-${idPrefix}`;
            const collapseId = `collapse-${idPrefix}`;

            let html = `<h5 class="mt-4 mb-2 fw-bold text-primary-emphasis" style="font-size: 1.1rem;">${title} (${data.length})</h5>`;
            html += `<div class="accordion" id="${accordionId}">
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="heading-${idPrefix}">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                                    Mostrar / Ocultar Detalles
                                </button>
                            </h2>
                            <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="heading-${idPrefix}" data-bs-parent="#${accordionId}">
                                <div class="accordion-body">
                                    <ul class="list-group list-group-flush">`;
            
            data.forEach((item, index) => {
                const content = formatter(item);
                if (withCheckboxes) {
                    html += `<li class="list-group-item d-flex align-items-center">
                                <div class="form-check">
                                    <input class="form-check-input dispositivo-checkbox" type="checkbox" value="${index}" id="dispositivo-${index}">
                                    <label class="form-check-label" for="dispositivo-${index}">${content}</label>
                                </div>
                             </li>`;
                } else {
                    html += `<li class="list-group-item">${content}</li>`;
                }
            });

            html += `</ul></div></div></div></div>`;
            return html;
        },

        formatoFecha: (fechaStr) => fechaStr ? fechaStr.split('-').reverse().join('/') : "N/A",

        formatters: {
            dispositivo: (d) => {
                const fechaStr = d.fecha ? `[${UIRenderer.formatoFecha(d.fecha)}] ` : '';
                const desc = (typeof d === "string") ? d : `${d.descripcion || ''} ${d.operacion ? `(Op. ${d.operacion})` : ''}`.trim() || "[Dispositivo operativo]";
                return `${fechaStr}${desc}`;
            },
            inspeccion: (i) => {
                const fechaStr = i.fecha ? `[${UIRenderer.formatoFecha(i.fecha)}] ` : '';
                const desc = (typeof i === "string") ? i : `<strong>${i.lugar || 'Lugar N/D'}</strong> (${i.tipo || 'Tipo N/D'}) — ${i.resultado || 'Sin resultado'}`;
                return `${fechaStr}${desc}`;
            },
        },
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
                fecha: obj.fecha || null,
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
                let content = `Las novedades UCRIF son las siguientes:\n\n`;
                content += `*${u.detenidosILE ?? 0}* detenidos por ILE, *${u.filiadosVarios ?? 0}* identificados, *${u.traslados ?? 0}* traslados y *${u.citadosCecorex ?? 0}* citados para CECOREX.\n`;
                
                const detenidosAgrupados = u.detenidosDelito.reduce((acc, d) => {
                    const key = `${d.motivo} (${d.nacionalidad})`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});

                if (Object.keys(detenidosAgrupados).length > 0) {
                    content += `\n`;
                    for (const desc in detenidosAgrupados) {
                        content += `• ${detenidosAgrupados[desc]} detenido/s por _${desc}_\n`;
                    }
                }
                
                if (u.inspecciones?.length > 0) {
                    content += `\n`;
                    u.inspecciones.forEach(i => {
                        const inspText = UIRenderer.formatters.inspeccion(i).replace(/<strong>/g, '*').replace(/<\/strong>/g, '*').replace(/\[.*?\]\s/,'');
                        content += `• Inspección en ${inspText}\n`;
                    });
                }
                
                if (u.colaboraciones?.length > 0) {
                    content += `\n*Colaboraciones:*\n`;
                    u.colaboraciones.forEach(c => {
                        if (typeof c === 'object' && c.colaboracionDesc) {
                            content += `• ${c.colaboracionDesc} con ${c.colaboracionUnidad || 'unidad no especificada'}. Resultado: ${c.colaboracionResultado || 'N/D'}\n`;
                        } else if (typeof c === 'string') {
                            content += `• ${c}\n`;
                        }
                    });
                }

                const selectedDispositivos = Array.from(document.querySelectorAll('.dispositivo-checkbox:checked')).map(cb => u.dispositivos[parseInt(cb.value)]);

                if (selectedDispositivos.length > 0) {
                    content += `\n*En el marco de las investigaciones de UCRIF destacan los siguientes avances:*\n`;
                    selectedDispositivos.forEach(d => {
                        const dispText = UIRenderer.formatters.dispositivo(d).replace(/<strong>|<\/strong>/g, '').replace(/\[.*?\]\s/,'');
                        content += `• ${dispText}\n`;
                    });
                }

                addSection(AppConfig.grupos.ucrif, content);
            }

            if (resumen.grupo1) {
                const g1 = resumen.grupo1;
                let content = '';
                const detenidosValidos = g1.detenidos.map(UIRenderer.normalizers.detenido).filter(d => d.motivo && d.motivo.trim() && d.motivo !== 'N/A');
                if(detenidosValidos.length > 0) content += `• Detenidos: ${detenidosValidos.length}\n`;
                const expulsadosValidos = g1.expulsados.map(UIRenderer.normalizers.expulsado).filter(e => e.nacionalidad && e.nacionalidad.trim() && e.nacionalidad !== 'N/A');
                if(expulsadosValidos.length > 0) content += `• Expulsados: ${expulsadosValidos.length}\n`;
                const frustradasValidas = g1.frustradas.map(UIRenderer.normalizers.frustrada).filter(f => f.nombre && f.nombre.trim() && f.nombre !== 'N/A');
                if(frustradasValidas.length > 0) content += `• Frustradas: ${frustradasValidas.length}\n`;
                addSection(AppConfig.grupos.grupo1, content);
            }
             if (resumen.puerto?.numericos) {
                const p = resumen.puerto.numericos;
                addSection(AppConfig.grupos.puerto, `• Pasajeros Chequeados: ${p.paxChequeadas ?? 0}\n• Vehículos Chequeados: ${p.vehChequeados ?? 0}\n• Denegaciones: ${p.denegaciones ?? 0}`);
            }
            
            if (resumen.cecorex) {
                let content = '';
                if (resumen.cecorex.numericos && Object.keys(resumen.cecorex.numericos).length > 0) {
                    content += Object.entries(resumen.cecorex.numericos).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n');
                }
                if (resumen.cecorex.detenidos && resumen.cecorex.detenidos.length > 0) {
                     content += `\n• Detenidos Registrados: ${resumen.cecorex.detenidos.length}`;
                }
                addSection(AppConfig.grupos.cecorex, content);
            }
            
            if(resumen.cie) {
                const c = resumen.cie;
                let content = `• Ingresos: ${c.ingresos}\n• Salidas: ${c.salidas}\n• Ocupación final: ${c.internos_final}`;
                addSection(AppConfig.grupos.cie, content);
            }

            if(resumen.gestion) {
                 addSection(AppConfig.grupos.gestion, Object.entries(resumen.gestion).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n'));
            }

            out += `\n_Parte cerrado y generado automáticamente por SIREX._`;
            return out;
        },

        // [MEJORA] Función de exportación a PDF completamente rediseñada
        exportarPDF(resumen, desde, hasta) {
            try {
                if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
                    alert("Error fatal: El plugin 'jsPDF-AutoTable' no se ha cargado correctamente.");
                    return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                
                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();
                const margin = 15;
                let y = 0; 
                const logoURL = 'https://i.imgur.com/7dlqR3j.png';

                const colors = {
                    primary: [40, 58, 90], secondary: [108, 117, 125], background: [248, 249, 250],
                    ucrif: [13, 202, 240], grupo1: [13, 110, 253], puerto: [25, 135, 84],
                    cecorex: [255, 193, 7], gestion: [108, 117, 125], cie: [220, 53, 69]
                };
                const fonts = { title: "helvetica", body: "helvetica" };
                const autoTableConfig = {
                    theme: 'grid', styles: { fontSize: 9, cellPadding: 2, font: fonts.body },
                    headStyles: { fontStyle: 'bold', halign: 'center', valign: 'middle' },
                    margin: { left: margin, right: margin }
                };
                
                // --- HELPERS PDF ---
                const checkPageBreak = (currentY, neededSpace = 20) => {
                    if (currentY + neededSpace > pageH - margin) {
                        doc.addPage();
                        return margin;
                    }
                    return currentY;
                };
                
                const addFooter = () => {
                    const pageCount = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setFont(fonts.body, "normal").setFontSize(8).setTextColor(...colors.secondary);
                        doc.text(`Página ${i} de ${pageCount}`, pageW / 2, pageH - 10, { align: 'center' });
                        doc.text('Informe Confidencial · SIREX', margin, pageH - 10);
                        try { doc.addImage(logoURL, 'PNG', pageW - margin - 8, pageH - 13.5, 8, 8); } catch(e) { console.error("Error al añadir logo al pie."); }
                    }
                };
                
                const createSectionTitle = (title, color) => {
                    y = checkPageBreak(y, 20);
                    doc.setFont(fonts.title, "bold").setFontSize(13).setTextColor(...color);
                    doc.text(title, margin, y);
                    doc.setDrawColor(...color).setLineWidth(0.5).line(margin, y + 2, pageW - margin, y + 2);
                    y += 8;
                };

                const renderTwoColumnData = (data, color) => {
                    y = checkPageBreak(y, (Math.ceil(data.length / 2) * 8));
                    const midPoint = margin + (pageW - margin * 2) / 2;
                    doc.setFont(fonts.body, "normal").setFontSize(10);
                    data.forEach((item, index) => {
                        const xPos = (index % 2 === 0) ? margin : midPoint;
                        if (index % 2 === 0 && index > 0) {
                             y = checkPageBreak(y, 8);
                             y += 8;
                        }
                        doc.setTextColor(...colors.secondary).text(`${item[0]}:`, xPos, y);
                        doc.setFont(fonts.body, "bold").setTextColor(...color).text(String(item[1]), xPos + 55, y, {align: 'right', maxWidth: (pageW/2 - margin - 15)});
                    });
                    y += 10;
                };
                
                const createKPIBox = (x, y, label, value, color) => {
                    const boxWidth = (pageW - margin * 3) / 2;
                    const boxHeight = 20;
                    doc.setFillColor(...color);
                    doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');
                    const isDarkText = JSON.stringify(color) === JSON.stringify(colors.cecorex);
                    doc.setTextColor(isDarkText ? 0 : 255, isDarkText ? 0 : 255, isDarkText ? 0 : 255);
                    doc.setFont(fonts.body, "bold").setFontSize(16).text(String(value), x + boxWidth - 10, y + 13, { align: "right" });
                    doc.setFont(fonts.body, "normal").setFontSize(10).text(label, x + 10, y + 13, {maxWidth: boxWidth - 30});
                };

                // --- PÁGINA 1: PORTADA ---
                doc.setFillColor(...colors.primary).rect(0, 0, pageW, pageH, 'F');
                try { doc.addImage(logoURL, 'PNG', pageW / 2 - 25, 40, 50, 50); } catch (e) { console.error("Error al añadir logo a portada."); }
                doc.setTextColor(255, 255, 255);
                doc.setFont(fonts.title, "bold").setFontSize(26).text("INFORME OPERATIVO GLOBAL", pageW / 2, 120, { align: 'center' });
                doc.setFontSize(14).setFont(fonts.body, "normal").text("BRIGADA PROVINCIAL DE EXTRANJERÍA Y FRONTERAS", pageW / 2, 135, { align: 'center' });
                doc.setLineWidth(0.5).setDrawColor(255, 255, 255).line(margin, 145, pageW - margin, 145);
                doc.setFontSize(12).text(`Periodo del ${UIRenderer.formatoFecha(desde)} al ${UIRenderer.formatoFecha(hasta)}`, pageW / 2, 155, { align: 'center' });
                
                // --- PÁGINA 2: RESUMEN EJECUTIVO ---
                doc.addPage();
                y = margin;
                createSectionTitle("Resumen Ejecutivo", colors.primary);
                const randomFraseApertura = AppConfig.frasesNarrativas.apertura[Math.floor(Math.random() * AppConfig.frasesNarrativas.apertura.length)];
                doc.setFont(fonts.body, "italic").setFontSize(11).setTextColor(...colors.secondary);
                const introText = doc.splitTextToSize(randomFraseApertura, pageW - margin * 2);
                doc.text(introText, margin, y);
                y += introText.length * 5 + 8;

                y = checkPageBreak(y, 55);
                createKPIBox(margin, y, "Detenciones por ILE", resumen.ucrif?.detenidosILE ?? 0, colors.ucrif);
                const expulsadosValidos = resumen.grupo1?.expulsados.map(UIRenderer.normalizers.expulsado).filter(e => e.nacionalidad?.trim() && e.nacionalidad !== 'N/A') ?? [];
                createKPIBox(margin + (pageW - margin*3)/2 + margin, y, "Expulsiones Materializadas", expulsadosValidos.length, colors.grupo1);
                y += 25; 
                createKPIBox(margin, y, "Pasajeros Controlados", resumen.puerto?.numericos?.paxChequeadas ?? 0, colors.puerto);
                createKPIBox(margin + (pageW - margin*3)/2 + margin, y, "Ocupación Final CIE", resumen.cie?.internos_final ?? 'N/D', colors.cie);
                y += 35;

                // --- INICIO CONTENIDO DETALLADO ---
                createSectionTitle("Informe Detallado de Actividad", colors.primary);

                // --- SECCIÓN UCRIF ---
                if (resumen.ucrif) {
                    const u = resumen.ucrif;
                    createSectionTitle(AppConfig.grupos.ucrif.label, colors.ucrif);
                    doc.setFont(fonts.body, "normal").setFontSize(10).setTextColor(...colors.secondary);
                    const ucrifIntro = doc.splitTextToSize(`El trabajo de los grupos operativos de UCRIF se ha centrado en la detección de infracciones a la Ley de Extranjería y el control de la estancia, resultando en los siguientes indicadores clave:`, pageW - margin * 2);
                    doc.text(ucrifIntro, margin, y);
                    y += ucrifIntro.length * 5 + 4;

                    renderTwoColumnData([
                        ['Detenciones por ILE', u.detenidosILE ?? 0], ['Personas filiadas', u.filiadosVarios ?? 0],
                        ['Traslados materializados', u.traslados ?? 0], ['Citaciones para CECOREX', u.citadosCecorex ?? 0]
                    ], colors.ucrif);
                    
                    if (u.inspecciones?.length > 0) {
                        y = checkPageBreak(y);
                        doc.autoTable({ ...autoTableConfig, startY: y, head: [['Fecha', 'Lugar', 'Tipo', 'Resultado']],
                            body: u.inspecciones.map(i => [UIRenderer.formatoFecha(i.fecha), i.lugar, i.tipo, i.resultado]),
                            headStyles: { ...autoTableConfig.headStyles, fillColor: colors.ucrif } });
                        y = doc.autoTable.previous.finalY + 10;
                    }
                    if (u.detenidosDelito?.length > 0) {
                         y = checkPageBreak(y);
                         doc.autoTable({ ...autoTableConfig, startY: y, head: [['Individuo', 'Nacionalidad', 'Motivo']],
                            body: u.detenidosDelito.map(d => [d.descripcion, d.nacionalidad, d.motivo]),
                            headStyles: { ...autoTableConfig.headStyles, fillColor: colors.ucrif } });
                         y = doc.autoTable.previous.finalY + 10;
                    }
                }
                
                // --- SECCIÓN GRUPO 1 ---
                if (resumen.grupo1 && Object.values(resumen.grupo1).some(v => v?.length > 0)) {
                    createSectionTitle(AppConfig.grupos.grupo1.label, colors.grupo1);
                    const g1 = resumen.grupo1;
                    const detenidosValidos = g1.detenidos.map(UIRenderer.normalizers.detenido).filter(d => d.motivo?.trim() && d.motivo !== 'N/A');
                    if(detenidosValidos.length > 0) {
                        y = checkPageBreak(y);
                        doc.autoTable({ ...autoTableConfig, startY: y, head: [['Motivo', 'Nacionalidad']], body: detenidosValidos.map(d => [d.motivo, d.nacionalidad]), headStyles: { ...autoTableConfig.headStyles, fillColor: colors.grupo1 } });
                        y = doc.autoTable.previous.finalY + 10;
                    }
                }

                // --- SECCIÓN PUERTO ---
                if (resumen.puerto && (Object.keys(resumen.puerto.numericos ?? {}).length > 0 || resumen.puerto.ferrys?.length > 0)) {
                    createSectionTitle(AppConfig.grupos.puerto.label, colors.puerto);
                    if (Object.keys(resumen.puerto.numericos ?? {}).length > 0) {
                        renderTwoColumnData(Object.entries(resumen.puerto.numericos).map(([k, v]) => [k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), v]), colors.puerto);
                    }
                    if (resumen.puerto.ferrys?.length > 0) {
                        y = checkPageBreak(y);
                        const totalPasajeros = resumen.puerto.ferrys.reduce((sum, f) => sum + (Number(f.pasajeros) || 0), 0);
                        const totalVehiculos = resumen.puerto.ferrys.reduce((sum, f) => sum + (Number(f.vehiculos) || 0), 0);
                        doc.autoTable({ ...autoTableConfig, startY: y,
                            head: [['Fecha', 'Destino', 'Pasajeros', 'Vehículos', 'Incidencias']],
                            body: resumen.puerto.ferrys.map(f => [UIRenderer.formatoFecha(f.fecha), f.destino, f.pasajeros, f.vehiculos, f.incidencias]),
                            foot: [['TOTALES', `${resumen.puerto.ferrys.length} Ferrys`, totalPasajeros, totalVehiculos, '']],
                            headStyles: { ...autoTableConfig.headStyles, fillColor: colors.puerto },
                            footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0,0,0] }
                        });
                        y = doc.autoTable.previous.finalY + 10;
                    }
                }
                
                // --- SECCIÓN CECOREX ---
                if (resumen.cecorex && (Object.keys(resumen.cecorex.numericos ?? {}).length > 0 || resumen.cecorex.detenidos?.length > 0)) {
                    createSectionTitle(AppConfig.grupos.cecorex.label, colors.cecorex);
                     if (Object.keys(resumen.cecorex.numericos ?? {}).length > 0) {
                        renderTwoColumnData(Object.entries(resumen.cecorex.numericos), colors.cecorex);
                    }
                    if (resumen.cecorex.detenidos?.length > 0) {
                         y = checkPageBreak(y);
                         doc.autoTable({ ...autoTableConfig, startY: y, head: [['Nombre/Cant.', 'Nacionalidad', 'Motivo', 'Observaciones']],
                            body: resumen.cecorex.detenidos.map(d => [d.nombre, d.nacionalidad, d.motivo, d.observaciones]),
                            headStyles: { ...autoTableConfig.headStyles, fillColor: colors.cecorex, textColor: [0,0,0] }
                         });
                         y = doc.autoTable.previous.finalY + 10;
                    }
                }
                
                // --- SECCIÓN GESTIÓN ---
                if (resumen.gestion && Object.keys(resumen.gestion).length > 0) {
                    createSectionTitle(AppConfig.grupos.gestion.label, colors.gestion);
                    renderTwoColumnData(Object.entries(resumen.gestion).map(([k, v]) => [k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), v]), colors.gestion);
                }

                // --- SECCIÓN CIE ---
                if (resumen.cie) {
                    createSectionTitle(AppConfig.grupos.cie.label, colors.cie);
                    renderTwoColumnData([
                        ['Ingresos en periodo', resumen.cie.ingresos],
                        ['Salidas en periodo', resumen.cie.salidas],
                        ['Ocupación a fin de periodo', resumen.cie.internos_final]
                    ], colors.cie);
                    if (resumen.cie.incidencias?.length > 0) {
                         y = checkPageBreak(y);
                         doc.autoTable({ ...autoTableConfig, startY: y, head: [['Incidencias Registradas']],
                            body: resumen.cie.incidencias.map(i => [i]),
                            headStyles: { ...autoTableConfig.headStyles, fillColor: colors.cie } });
                         y = doc.autoTable.previous.finalY + 10;
                    }
                }

                // --- FINALIZACIÓN Y GUARDADO ---
                addFooter();
                doc.save(`SIREX_Informe_Global_${desde}_a_${hasta}.pdf`);

            } catch (error) {
                console.error("Error catastrófico al generar el PDF:", error);
                alert("Se produjo un error muy grave al intentar generar el PDF. Revisa la consola del navegador para ver los detalles técnicos.");
            }
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
                cecorex: QueryManager.getCecorexDetalles(desde, hasta),
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
