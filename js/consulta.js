// =======================================================================================
// SIREX · Consulta Global / Resúmenes v3.4
// Autor: Gemini (Asistente de Programación)
// Descripción: Versión de corrección con visibilidad de datos restaurada y PDF reparado.
// MEJORAS CLAVE (v3.4):
// 1. **Visibilidad de Dispositivos Restaurada**: La lista de "Dispositivos Operativos"
//    ahora es siempre visible en la página web. El checkbox ya no la oculta.
// 2. **Control de Exportación Funcional**: El checkbox "incluirDispositivos" ahora
//    controla exclusivamente la inclusión de dispositivos en los exports (PDF/WhatsApp).
// 3. **Reparación del PDF**: Se ha refactorizado la función que genera las tablas de
//    3 columnas para hacerla más robusta y evitar los errores de cálculo de ancho,
//    haciendo la exportación a PDF estable.
// 4. **Estabilidad General**: Mantiene todas las mejoras de diseño y precisión de
//    datos de las versiones anteriores.
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
        incluirDispositivos: document.getElementById('incluirDispositivos'),
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
                snap.forEach(doc => rawData.push(doc.data()));
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
                
                if (data.inspecciones) resultado.inspecciones.push(...data.inspecciones);
                if (data.actuaciones) resultado.dispositivos.push(...data.actuaciones);
                
                if (data.datos && Array.isArray(data.datos)) {
                    data.datos.forEach(item => {
                        if (item.casa) {
                            resultado.inspecciones.push({
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
            // **CORRECCIÓN**: La lista de dispositivos ahora siempre se renderiza en la web.
            html += this.renderListSection('Dispositivos Operativos Especiales', data.dispositivos, d => this.formatters.dispositivo(d));
            html += this.renderListSection('Detenidos por otros delitos', data.detenidosDelito, d => `${d.descripcion} (${d.nacionalidad}) por <strong>${d.motivo}</strong>`);
            
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
                let content = `Las novedades UCRIF son las siguientes:\n\n`;
                content += `*${u.detenidosILE ?? 0}* detenidos por ILE, *${u.filiadosVarios ?? 0}* identificados, *${u.traslados ?? 0}* traslados y *${u.citadosCecorex ?? 0}* citados para CECOREX.\n`;

                if (u.detenidosDelito?.length > 0) {
                    content += `\n`;
                    u.detenidosDelito.forEach(d => {
                        content += `• 1 detenido por _${d.motivo}_ (${d.nacionalidad})\n`;
                    });
                }
                
                if (u.inspecciones?.length > 0) {
                    content += `\n`;
                    u.inspecciones.forEach(i => {
                        const inspText = UIRenderer.formatters.inspeccion(i)
                            .replace(/<strong>/g, '*')
                            .replace(/<\/strong>/g, '*');
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

                if (DOM.incluirDispositivos?.checked && u.dispositivos?.length > 0) {
                    content += `\n*Dispositivos en Curso:*\n`;
                    u.dispositivos.slice(0, 5).forEach(d => {
                         const dispText = UIRenderer.formatters.dispositivo(d).replace(/<strong>|<\/strong>/g, '');
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
            const addKeyValueSection = (cfg, data) => { if (data && Object.keys(data).length > 0) addSection(cfg, Object.entries(data).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n')); };
            addKeyValueSection(AppConfig.grupos.cecorex, resumen.cecorex);
            addKeyValueSection(AppConfig.grupos.gestion, resumen.gestion);
            addKeyValueSection(AppConfig.grupos.cie, resumen.cie);
            out += `\n_Parte cerrado y generado automáticamente por SIREX._`;
            return out;
        },

        exportarPDF(resumen, desde, hasta) {
            try {
                if (typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
                    alert("Error al generar PDF: El plugin de tablas no está disponible."); return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                let finalY = 15;
                const pageW = doc.internal.pageSize.getWidth();
                const margin = 15;

                const addHeader = () => {
                    doc.setFillColor(40, 58, 90);
                    doc.rect(0, 0, pageW, 38, 'F');
                    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
                    doc.setTextColor(255, 255, 255);
                    doc.text("INFORME OPERATIVO GLOBAL", pageW / 2, 20, { align: "center" });
                    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
                    doc.text(`Periodo del ${UIRenderer.formatoFecha(desde)} al ${UIRenderer.formatoFecha(hasta)}`, pageW / 2, 28, { align: "center" });
                    finalY = 45;
                };
                const addFooter = () => {
                    const pageCount = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setLineWidth(0.5);
                        doc.setDrawColor(200, 200, 200);
                        doc.line(margin, 280, pageW - margin, 280);
                        doc.setFontSize(8); doc.setTextColor(150);
                        doc.text(`Página ${i} de ${pageCount}`, pageW / 2, 285, { align: 'center' });
                        doc.text(`Informe SIREX · Generado el ${new Date().toLocaleString('es-ES')}`, margin, 285);
                    }
                };
                const checkPageBreak = () => { if (finalY > 255) { doc.addPage(); finalY = 20; } };

                addHeader();
                
                if (resumen.ucrif) {
                    const u = resumen.ucrif;
                    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 58, 90);
                    doc.text("Indicadores Clave (UCRIF)", margin, finalY);
                    finalY += 8;

                    const indicators = [
                        { label: "Detenidos por ILE", value: u.detenidosILE ?? 0 },
                        { label: "Personas Filiadas", value: u.filiadosVarios ?? 0 },
                        { label: "Traslados Realizados", value: u.traslados ?? 0 }
                    ];
                    
                    doc.setFontSize(18); doc.setFont("helvetica", "bold");
                    const blockWidth = (pageW - 2 * margin) / indicators.length;
                    indicators.forEach((item, index) => {
                        doc.setTextColor(AppConfig.grupos.ucrif.color);
                        doc.text(String(item.value), margin + (index * blockWidth), finalY, { align: 'left' });
                        doc.setFontSize(9); doc.setTextColor(100);
                        doc.text(item.label, margin + (index * blockWidth), finalY + 5, { align: 'left' });
                        doc.setFontSize(18);
                    });
                    finalY += 15;
                }

                const addSection = (cfg, callback) => {
                    if (!callback) return;
                    checkPageBreak();
                    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(cfg.color);
                    doc.text(cfg.label, margin, finalY);
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

                if (resumen.ucrif) {
                    addSection(AppConfig.grupos.ucrif, () => {
                        const u = resumen.ucrif;
                        if (u.inspecciones?.length > 0) {
                            autoTable([['Inspecciones y Controles (Lugar)', 'Tipo', 'Resultado']], u.inspecciones.map(i => [i.lugar || 'N/D', i.tipo || 'N/D', i.resultado || 'N/D']), AppConfig.grupos.ucrif);
                            finalY += 5;
                        }
                        if (Object.keys(u.nacionalidadesFiliados).length > 0) {
                             autoTable([['Resumen de Nacionalidades (Filiados)']], Object.entries(u.nacionalidadesFiliados).map(([nac, count]) => [`• ${count} ${nac}`]), AppConfig.grupos.ucrif);
                             finalY += 5;
                        }
                        if (DOM.incluirDispositivos?.checked && u.dispositivos?.length > 0) {
                            autoTable([['Dispositivos Operativos (Operación)', 'Descripción']], u.dispositivos.map(d => [d.operacion || 'N/D', d.descripcion || 'N/D']), AppConfig.grupos.ucrif);
                            finalY += 5;
                        }
                        if (u.detenidosDelito?.length > 0) {
                            autoTable([['Detenidos por Otros Delitos', 'Nacionalidad', 'Motivo']], u.detenidosDelito.map(d => [d.descripcion, d.nacionalidad, d.motivo]), AppConfig.grupos.ucrif);
                            finalY += 5;
                        }
                         if (u.colaboraciones?.length > 0) {
                            autoTable([['Colaboración', 'Unidad', 'Resultado']], u.colaboraciones.map(c => [c.colaboracionDesc || 'N/D', c.colaboracionUnidad || 'N/D', c.colaboracionResultado || 'N/D']), AppConfig.grupos.ucrif);
                        }
                    });
                }


                if (resumen.grupo1) addSection(AppConfig.grupos.grupo1, () => {
                    const { normalizers } = UIRenderer;
                    const detenidosValidos = resumen.grupo1.detenidos.map(normalizers.detenido).filter(d => d.motivo && d.motivo.trim() && d.motivo !== 'N/A');
                    const expulsadosValidos = resumen.grupo1.expulsados.map(normalizers.expulsado).filter(e => e.nacionalidad && e.nacionalidad.trim() && e.nacionalidad !== 'N/A');
                    const fletadosValidos = resumen.grupo1.fletados.map(normalizers.fletado).filter(f => f.destino && f.destino.trim() && f.destino !== 'N/A');

                    if (detenidosValidos.length > 0) autoTable([['Detenido (Motivo)', 'Nacionalidad']], detenidosValidos.map(d => [d.motivo, d.nacionalidad]), AppConfig.grupos.grupo1);
                    if (expulsadosValidos.length > 0) { finalY += 2; autoTable([['Expulsado (Nacionalidad)']], expulsadosValidos.map(e => [e.nacionalidad]), AppConfig.grupos.grupo1); }
                    if (fletadosValidos.length > 0) { finalY += 2; autoTable([['Vuelo Fletado (Destino)', 'PAX']], fletadosValidos.map(f => [f.destino, f.pax]), AppConfig.grupos.grupo1); }
                });

                const createThreeColumnTable = (cfg, data) => {
                    if (!data || Object.keys(data).length === 0) return;
                    
                    const items = Object.entries(data).map(([key, value]) => ({
                        label: key.replace(/_/g, " ").toUpperCase(),
                        value: String(value)
                    }));
                    
                    const body = [];
                    for (let i = 0; i < items.length; i += 3) {
                        body.push(items.slice(i, i + 3));
                    }

                    doc.autoTable({
                        startY: finalY,
                        body: body,
                        theme: 'plain',
                        styles: { cellPadding: 2, minCellHeight: 25 },
                        didDrawCell: function (data) {
                            const item = data.cell.raw;
                            if (item && data.section === 'body') {
                                doc.setDrawColor(220, 220, 220);
                                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
                                doc.setFontSize(16);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(cfg.color);
                                doc.text(item.value, data.cell.x + data.cell.width / 2, data.cell.y + 12, { align: 'center' });
                                doc.setFontSize(8);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(120);
                                const labelText = doc.splitTextToSize(item.label, data.cell.width - 6);
                                doc.text(labelText, data.cell.x + data.cell.width / 2, data.cell.y + 18, { align: 'center' });
                            }
                        },
                        columnStyles: {
                            0: { cellWidth: (pageW - margin * 2) / 3 },
                            1: { cellWidth: (pageW - margin * 2) / 3 },
                            2: { cellWidth: (pageW - margin * 2) / 3 },
                        }
                    });
                    finalY = doc.autoTable.previous.finalY;
                };

                if (resumen.puerto?.numericos) addSection(AppConfig.grupos.puerto, () => createThreeColumnTable(AppConfig.grupos.puerto, resumen.puerto.numericos));
                if (resumen.cecorex) addSection(AppConfig.grupos.cecorex, () => createThreeColumnTable(AppConfig.grupos.cecorex, resumen.cecorex));
                if (resumen.gestion) addSection(AppConfig.grupos.gestion, () => createThreeColumnTable(AppConfig.grupos.gestion, resumen.gestion));
                if (resumen.cie) addSection(AppConfig.grupos.cie, () => autoTable(null, Object.entries(resumen.cie).map(([k,v]) => [k.replace(/_/g, " "), v]), AppConfig.grupos.cie));


                addFooter();
                doc.save(`SIREX_Resumen_${desde}_a_${hasta}.pdf`);
            } catch (error) {
                console.error("Error al generar el PDF:", error);
                alert("Se produjo un error al intentar generar el PDF. Por favor, revisa la consola para más detalles.");
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
