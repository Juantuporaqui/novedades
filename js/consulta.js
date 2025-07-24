// =======================================================================================
// SIREX · Consulta Global / Resúmenes v2.2
// Autor: Gemini
// Descripción: Lógica de la aplicación para la consulta y exportación de resúmenes.
// Este archivo debe ser enlazado desde un archivo HTML que contenga la estructura y los IDs correspondientes.
// CORRECCIÓN: Solucionado ReferenceError 'Field is not defined' en getPuertoDetalles.
// =======================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN Y CONSTANTES ---
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
            grupo1: { label: 'Expulsiones', icon: '✈️', color: '#0d6efd', theme: 'primary' },
            puerto: { label: 'Puerto', icon: '⚓', color: '#198754', theme: 'success' },
            cecorex: { label: 'CECOREX', icon: '📡', color: '#ffc107', theme: 'warning' },
            gestion: { label: 'Gestión', icon: '📋', color: '#6c757d', theme: 'secondary' },
            cie: { label: 'CIE', icon: '🏢', color: '#dc3545', theme: 'danger' }
        },
        frasesNarrativas: {
            apertura: [
                "Actuaciones operativas clave han sido desplegadas, reforzando la vigilancia y el control en materia de extranjería.",
                "Se han desarrollado dispositivos coordinados para la prevención y actuación contra la delincuencia vinculada a la inmigración.",
                "La intervención en focos de riesgo se ha consolidado con resultados notables y actuaciones coordinadas.",
                "Se han ejecutado múltiples dispositivos incidiendo en la protección de derechos y el mantenimiento del orden legal.",
                "La operativa ha reflejado el compromiso de los equipos en el ámbito migratorio y de seguridad ciudadana."
            ],
            cierre: [
                "El conjunto de actuaciones refuerza la seguridad ciudadana y consolida el trabajo de los grupos.",
                "El servicio se cierra sin incidencias extraordinarias, cumpliendo los objetivos establecidos.",
                "Se mantiene la atención en los dispositivos clave y el seguimiento de las actuaciones en curso.",
                "Parte cerrado con balance positivo para la operativa global."
            ]
        }
    };

    // --- 2. INICIALIZACIÓN DE FIREBASE ---
    if (!firebase.apps.length) {
        firebase.initializeApp(AppConfig.firebase);
    }
    const db = firebase.firestore();
    const FieldPath = firebase.firestore.FieldPath;

    // --- 3. ELEMENTOS DEL DOM ---
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

    // --- 4. ESTADO DE LA APLICACIÓN ---
    let appState = {
        ultimoResumen: null,
        desde: '',
        hasta: ''
    };
    
    // --- 5. LÓGICA DE CONSULTAS A FIRESTORE ---
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
                if (data.inspecciones_g4) resultado.inspecciones.push(...data.inspecciones_g4);
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
        getCecorexDetalles: async (desde, hasta) => {
            const snap = await db.collection('cecorex_registros').where(FieldPath.documentId(), '>=', desde).where(FieldPath.documentId(), '<=', hasta).get();
            let res = { gestiones: [], incidencias: [], detenidos: 0 };
            snap.forEach(doc => {
                const data = doc.data();
                if (data.gestiones_cecorex) res.gestiones.push(...data.gestiones_cecorex);
                if (data.incidencias) res.incidencias.push(...data.incidencias);
                if (data.detenidos_cc) res.detenidos += data.detenidos_cc.length || 0;
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
        getCIE: async function(desde, hasta) {
            const rangeTotals = await this.sumarCampos('cie_registros', desde, hasta);
            const snapLastDay = await db.collection('cie_registros').where(FieldPath.documentId(), '<=', hasta).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
            const finalCount = snapLastDay.empty ? "N/D" : (snapLastDay.docs[0].data().n_internos || 0);
            return { ...rangeTotals, "Internos (fin)": finalCount };
        }
    };

    // --- 6. LÓGICA DE RENDERIZADO HTML ---
    const UIRenderer = {
        renderizarResumenGlobalHTML(resumen, desde, hasta) {
            let html = `<div class="alert alert-light text-center my-4 p-3 border">
                <h2 class="h4"><b>RESUMEN OPERATIVO SIREX</b></h2>
                <span class="text-muted">Periodo: <b>${this.formatoFecha(desde)}</b> a <b>${this.formatoFecha(hasta)}</b></span>
            </div>`;
            
            const randomFrase = (tipo) => {
                const frases = AppConfig.frasesNarrativas[tipo] || [];
                return frases.length ? frases[Math.floor(Math.random() * frases.length)] : "";
            };

            html += `<p class="narrative-intro">${randomFrase('apertura')}</p>`;

            if (resumen.ucrif) html += this.renderizarUcrif(resumen.ucrif);
            if (resumen.grupo1) html += this.renderizarGrupo1(resumen.grupo1);
            if (resumen.puerto) html += this.renderizarPuerto(resumen.puerto);
            if (resumen.cecorex) html += this.renderizarCecorex(resumen.cecorex);
            if (resumen.gestion) html += this.renderizarGestion(resumen.gestion);
            if (resumen.cie) html += this.renderizarCIE(resumen.cie);

            html += `<p class="narrative-outro mt-4">${randomFrase('cierre')}</p>`;
            return html;
        },

        renderizarUcrif(data) {
            const cfg = AppConfig.grupos.ucrif;
            let html = `<div class="card border-${cfg.theme} mb-4">
                <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                <div class="card-body p-4">`;

            let frase = `Se han efectuado <strong>${data.detenidosILE || 0}</strong> detenciones por ILE, identificado a <strong>${data.filiadosVarios || 0}</strong> personas, realizado <strong>${data.traslados || 0}</strong> traslados y citado a <strong>${data.citadosCecorex || 0}</strong> individuos en CECOREX.`;
            html += `<p class="mb-3">${frase}</p>`;

            html += this.renderListSection('Inspecciones', data.inspecciones, i => this.formatters.inspeccion(i));
            html += this.renderListSection('Dispositivos Operativos', data.dispositivos, d => this.formatters.dispositivo(d));
            html += this.renderListSection('Detenidos por otros delitos', data.detenidosDelito, d => `${d.descripcion} por <strong>${d.motivo}</strong>`);
            html += this.renderListSection('Colaboraciones', data.colaboraciones, c => typeof c === 'string' ? c : (c.colaboracionDesc || '[Colaboración]'));
            
            if (data.observaciones && data.observaciones.length > 0) {
                html += `<div class="alert alert-light mt-3"><strong>Observaciones:</strong><br>${data.observaciones.filter(o => o && o.trim()).map(o => `<div>- ${o}</div>`).join("")}</div>`;
            }
            
            html += `</div></div>`;
            return html;
        },

        renderizarGrupo1(data) {
            const cfg = AppConfig.grupos.grupo1;
            let html = `<div class="card border-${cfg.theme} mb-4">
                <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                <div class="card-body p-4">`;
            
            html += this.renderListSection('Detenidos', data.detenidos, d => {
                const det = this.normalizers.detenido(d);
                return `<strong>${det.nombre}</strong> (${det.nacionalidad}) por <strong>${det.motivo}</strong>. ${det.diligencias ? `Diligencias: ${det.diligencias}`:''}`;
            });
            html += this.renderListSection('Expulsados', data.expulsados, e => {
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
            let html = `<div class="card border-${cfg.theme} mb-4">
                <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                <div class="card-body p-4">`;
            
            html += `<p>Controles: <strong>${data.ctrlMarinos || 0}</strong> marinos. Argos: <strong>${data.marinosArgos || 0}</strong>. Incidencias: <strong>${data.incidencias?.length || 0}</strong>.</p>`;
            html += this.renderListSection('Ferrys Controlados', data.ferrys, f => `<strong>${f.nombre || 'N/D'}</strong> (Destino: ${f.destino || 'N/D'}) - Pasajeros: ${f.pasajeros || 0}, Vehículos: ${f.vehiculos || 0}. ${f.incidencias ? `<strong class="text-danger">Incidencia: ${f.incidencias}</strong>` : ''}`);
            html += this.renderListSection('Incidencias Relevantes', data.incidencias, inc => inc);

            html += `</div></div>`;
            return html;
        },

        renderizarCecorex(data) {
            const cfg = AppConfig.grupos.cecorex;
            let html = `<div class="card border-${cfg.theme} mb-4">
                <div class="card-header bg-warning text-dark"><h4>${cfg.icon} ${cfg.label}</h4></div>
                <div class="card-body p-4">`;

            html += `<p>Gestiones: <strong>${data.gestiones?.length || 0}</strong>. Incidencias: <strong>${data.incidencias?.length || 0}</strong>. Detenidos gestionados: <strong>${data.detenidos || 0}</strong>.</p>`;
            html += this.renderListSection('Gestiones Destacadas', data.gestiones, g => g.gestion || g);
            html += this.renderListSection('Incidencias', data.incidencias, inc => inc);

            html += `</div></div>`;
            return html;
        },

        renderizarGestion(data) {
            const cfg = AppConfig.grupos.gestion;
            return this.renderKeyValueCard(cfg, data);
        },

        renderizarCIE(data) {
            const cfg = AppConfig.grupos.cie;
            return this.renderKeyValueCard(cfg, data);
        },

        renderKeyValueCard(cfg, data) {
            let html = `<div class="card border-${cfg.theme} mb-4">
                <div class="card-header bg-${cfg.theme} text-white"><h4>${cfg.icon} ${cfg.label}</h4></div>
                <div class="card-body p-3"><ul class="list-group list-group-flush">`;
            
            Object.entries(data).forEach(([key, value]) => {
                html += `<li class="list-group-item d-flex justify-content-between align-items-center text-capitalize">
                    ${key.replace(/_/g, " ")}
                    <span class="badge bg-${cfg.theme} rounded-pill">${value}</span>
                </li>`;
            });
            
            html += `</ul></div></div>`;
            return html;
        },
        
        renderListSection(title, data, formatter) {
            if (!data || data.length === 0) return '';
            let html = `<h5 class="mt-4 mb-2 fw-bold" style="font-size: 1.1rem;">${title} (${data.length})</h5><ul class="list-group">`;
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

        formatters: {
            dispositivo: (d) => {
                if (typeof d === "string") return d;
                let parts = [];
                if (d.tipo) parts.push(`<strong>${d.tipo}</strong>`);
                if (d.lugar) parts.push(`en ${d.lugar}`);
                if (d.descripcion) parts.push(`: ${d.descripcion}`);
                if (d.funcionarios) parts.push(`(Funcionarios: ${d.funcionarios})`);
                if (d.detenciones) parts.push(`— Detenciones: ${d.detenciones}`);
                return parts.join(' ').trim() || "[Dispositivo operativo registrado]";
            },
            inspeccion: (i) => {
                if (typeof i === "string") return i;
                let parts = [];
                if (i.lugar) parts.push(`<strong>${i.lugar}</strong>`);
                if (i.tipo) parts.push(`(${i.tipo})`);
                if (i.identificadas) parts.push(`— ${i.identificadas} filiadas`);
                if (i.citadas) parts.push(`, ${i.citadas} citadas`);
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
            })
        }
    };

    // --- 7. LÓGICA DE EXPORTACIÓN ---
    const ExportManager = {
        generarTextoWhatsapp(resumen, desde, hasta) {
            const f = UIRenderer.formatoFecha;
            let out = `*🛡️ SIREX - RESUMEN OPERATIVO*\n*Periodo:* ${f(desde)} al ${f(hasta)}\n`;

            const addSection = (cfg, content) => {
                if (!content || content.trim() === '') return;
                out += `\n*${cfg.icon} ${cfg.label.toUpperCase()}*\n${content}`;
            };

            // UCRIF
            if (resumen.ucrif) {
                const u = resumen.ucrif;
                let content = `*Totales*: ${u.detenidosILE || 0} ILE · ${u.filiadosVarios || 0} filiados · ${u.traslados || 0} traslados.\n`;
                if (u.inspecciones?.length > 0) content += `*Inspecciones*: ${u.inspecciones.length}\n`;
                if (u.dispositivos?.length > 0) content += `*Dispositivos*: ${u.dispositivos.length}\n`;
                if (u.detenidosDelito?.length > 0) content += `*Detenidos (delito)*: ${u.detenidosDelito.length}\n`;
                addSection(AppConfig.grupos.ucrif, content);
            }
            
            // GRUPO 1
            if (resumen.grupo1) {
                const g1 = resumen.grupo1;
                let content = '';
                if(g1.detenidos?.length > 0) content += `• Detenidos: ${g1.detenidos.length}\n`;
                if(g1.expulsados?.length > 0) content += `• Expulsados: ${g1.expulsados.length}\n`;
                if(g1.frustradas?.length > 0) content += `• Frustradas: ${g1.frustradas.length}\n`;
                if(g1.fletados?.length > 0) content += `• Vuelos Fletados: ${g1.fletados.length}\n`;
                addSection(AppConfig.grupos.grupo1, content);
            }
            
            // PUERTO
            if (resumen.puerto) {
                const p = resumen.puerto;
                addSection(AppConfig.grupos.puerto, `• Marinos controlados: ${p.ctrlMarinos || 0}\n• Incidencias: ${p.incidencias?.length || 0}\n`);
            }

            // CECOREX
            if (resumen.cecorex) {
                const c = resumen.cecorex;
                addSection(AppConfig.grupos.cecorex, `• Gestiones: ${c.gestiones?.length || 0}\n• Detenidos: ${c.detenidos || 0}\n`);
            }

            // GESTIÓN & CIE (más conciso)
            if (resumen.gestion && Object.keys(resumen.gestion).length > 0) {
                 addSection(AppConfig.grupos.gestion, Object.entries(resumen.gestion).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n'));
            }
            if (resumen.cie && Object.keys(resumen.cie).length > 0) {
                 addSection(AppConfig.grupos.cie, Object.entries(resumen.cie).map(([k,v]) => `• ${k.replace(/_/g, " ")}: ${v}`).join('\n'));
            }

            out += `\n_Parte cerrado SIREX._`;
            return out;
        },

        exportarPDF(resumen, desde, hasta) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const f = UIRenderer.formatoFecha;
            const N = UIRenderer.normalizers;
            let finalY = 20;
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 15;

            // --- CABECERA DEL DOCUMENTO ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("SIREX - Resumen Operativo Global", pageW / 2, finalY, { align: "center" });
            finalY += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.text(`Periodo: ${f(desde)} al ${f(hasta)}`, pageW / 2, finalY, { align: "center" });
            finalY += 15;

            const addSection = (cfg, addContentCallback) => {
                if (finalY > 260) { doc.addPage(); finalY = 20; }
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

            // --- SECCIONES DEL PDF ---
            if (resumen.ucrif) {
                addSection(AppConfig.grupos.ucrif, () => {
                    const u = resumen.ucrif;
                    doc.autoTable({
                        startY: finalY,
                        body: [
                            ['Detenidos ILE', u.detenidosILE || 0],
                            ['Filiados', u.filiadosVarios || 0],
                            ['Traslados', u.traslados || 0],
                            ['Citados CECOREX', u.citadosCecorex || 0]
                        ],
                        theme: 'grid',
                        styles: { fontSize: 10, cellPadding: 2 },
                        headStyles: { fillColor: AppConfig.grupos.ucrif.color },
                    });
                    finalY = doc.autoTable.previous.finalY + 5;
                    if(u.detenidosDelito?.length > 0) {
                        doc.autoTable({
                            startY: finalY, head: [['Detenidos por Delito', 'Motivo']],
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
                    if(g1.detenidos?.length > 0) doc.autoTable({ startY: finalY, head: [['Detenido', 'Nacionalidad', 'Motivo']], body: g1.detenidos.map(d => { const d_ = N.detenido(d); return [d_.nombre, d_.nacionalidad, d_.motivo]}), headStyles: { fillColor: AppConfig.grupos.grupo1.color }, didDrawPage: () => finalY = 20 });
                    if(g1.expulsados?.length > 0) doc.autoTable({ startY: doc.autoTable.previous.finalY + 5, head: [['Expulsado', 'Nacionalidad']], body: g1.expulsados.map(e => { const e_ = N.expulsado(e); return [e_.nombre, e_.nacionalidad]}), headStyles: { fillColor: AppConfig.grupos.grupo1.color }, didDrawPage: () => finalY = 20 });
                    if(g1.frustradas?.length > 0) doc.autoTable({ startY: doc.autoTable.previous.finalY + 5, head: [['Exp. Frustrada', 'Nacionalidad', 'Motivo']], body: g1.frustradas.map(fr => { const fr_ = N.frustrada(fr); return [fr_.nombre, fr_.nacionalidad, fr_.motivo]}), headStyles: { fillColor: AppConfig.grupos.grupo1.color }, didDrawPage: () => finalY = 20 });
                    finalY = doc.autoTable.previous.finalY;
                });
            }
            
            // --- PIE DE PÁGINA ---
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, pageW / 2, 287, { align: 'center' });
                doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, 287);
            }

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
            DOM.resumenVentana.innerHTML = `<div class="alert alert-danger">Por favor, selecciona un rango de fechas válido.</div>`;
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
            
            appState.ultimoResumen = resumen;
            appState.desde = desde;
            appState.hasta = hasta;

            DOM.resumenVentana.innerHTML = UIRenderer.renderizarResumenGlobalHTML(resumen, desde, hasta);
            DOM.exportBtns.classList.remove('d-none');

        } catch (err) {
            console.error("Error al generar resumen:", err);
            DOM.resumenVentana.innerHTML = `<div class="alert alert-danger">Error al consultar los datos: ${err.message}</div>`;
        } finally {
            DOM.spinner.classList.add('d-none');
        }
    }

    // --- 9. ASIGNACIÓN DE EVENTOS ---
    DOM.form.addEventListener('submit', handleFormSubmit);
    
    DOM.btnWhatsapp.addEventListener('click', () => {
        if (!appState.ultimoResumen) return;
        const msg = ExportManager.generarTextoWhatsapp(appState.ultimoResumen, appState.desde, appState.hasta);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    });

    DOM.btnExportarPDF.addEventListener('click', () => {
        if (!appState.ultimoResumen) return;
        ExportManager.exportarPDF(appState.ultimoResumen, appState.desde, appState.hasta);
    });

    // --- INICIALIZACIÓN ---
    const today = new Date().toISOString().split('T')[0];
    DOM.fechaDesde.value = today;
    DOM.fechaHasta.value = today;

});
