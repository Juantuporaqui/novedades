/* =================================================================
   SIREX GRUPO 4 - SCRIPT V2.0 ("SORPRENDENTE")
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // --- CONFIGURACIÓN Y ESTADO ---
        firebaseConfig: {
            apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
            authDomain: "ucrif-5bb75.firebaseapp.com",
            projectId: "ucrif-5bb75",
        },
        db: null,
        state: {
            isDarkMode: false,
            currentChartInstance: null,
            resumenData: null
        },
        // --- ELEMENTOS DEL DOM ---
        dom: {
            html: document.documentElement,
            themeToggle: document.getElementById('theme-toggle'),
            fechaInput: document.getElementById('fechaRegistroG4'),
            btnCargar: document.getElementById('btnCargarG4'),
            btnGuardar: document.getElementById('btnGuardarG4'),
            btnEliminar: document.getElementById('btnEliminarG4'),
            btnLimpiar: document.getElementById('btnLimpiarG4'),
            resumenDesde: document.getElementById('resumenDesdeG4'),
            resumenHasta: document.getElementById('resumenHastaG4'),
            btnResumen: document.getElementById('btnGenerarResumenG4'),
            resumenContenido: document.getElementById('resumenContenidoG4'),
            chartCanvas: document.getElementById('summaryChart'),
            notificationArea: document.getElementById('notification-area'),
            btnExportarPdf: document.getElementById('btnExportarPdf'),
            btnCompartirWhatsapp: document.getElementById('btnCompartirWhatsapp'),
        },
        // --- CAMPOS DINÁMICOS ---
        campos: [
            { id: 'Colab', nombre: 'colaboraciones', cuantia: 'cuantiaColab', inputs: ['colabInputG4'], list: 'colabListG4', titulo: 'Colaboraciones' },
            { id: 'Detenido', nombre: 'detenidos', cuantia: 'cuantiaDetenidos', inputs: ['detenidoMotivoG4', 'detenidoNacionalidadG4'], list: 'detenidosListG4', titulo: 'Detenidos' },
            { id: 'Citados', nombre: 'citados', cuantia: 'cuantiaCitados', inputs: ['citadosInputG4'], list: 'citadosListG4', titulo: 'Citados' },
            { id: 'Gestiones', nombre: 'otrasGestiones', cuantia: 'cuantiaGestiones', inputs: ['gestionesInputG4'], list: 'gestionesListG4', titulo: 'Otras Gestiones' },
            { id: 'InspeccionTrabajo', nombre: 'inspeccionesTrabajo', cuantia: 'cuantiaInspeccion', inputs: ['inspeccionTrabajoInputG4'], list: 'inspeccionTrabajoListG4', titulo: 'Inspecciones de Trabajo' },
            { id: 'OtrasInspecciones', nombre: 'otrasInspecciones', cuantia: 'cuantiaOtrasInspecciones', inputs: ['otrasInspeccionesInputG4'], list: 'otrasInspeccionesListG4', titulo: 'Otras Inspecciones' }
        ],

        // --- MÉTODO DE INICIALIZACIÓN ---
        init() {
            // Firebase
            firebase.initializeApp(this.firebaseConfig);
            this.db = firebase.firestore();

            // Tema (Modo Oscuro/Claro)
            this.initTheme();
            
            // Fecha por defecto
            this.dom.fechaInput.valueAsDate = new Date();
            this.dom.resumenDesde.valueAsDate = new Date();
            this.dom.resumenHasta.valueAsDate = new Date();

            // Listeners
            this.addEventListeners();
        },

        // --- MANEJO DE EVENTOS ---
        addEventListeners() {
            this.dom.themeToggle.addEventListener('change', () => this.toggleTheme());
            this.dom.btnCargar.addEventListener('click', () => this.cargarRegistro());
            this.dom.btnGuardar.addEventListener('click', () => this.guardarRegistro());
            this.dom.btnEliminar.addEventListener('click', () => this.eliminarRegistro());
            this.dom.btnLimpiar.addEventListener('click', () => this.limpiarFormularioCompleto());
            this.dom.btnResumen.addEventListener('click', () => this.generarResumen());
            this.dom.btnExportarPdf.addEventListener('click', () => this.exportToPdf());
            this.dom.btnCompartirWhatsapp.addEventListener('click', () => this.shareToWhatsApp());

            this.campos.forEach(c => {
                document.getElementById(`btnAdd${c.id}G4`).onclick = () => this.addItemCampo(c);
            });
        },

        // --- LÓGICA DEL TEMA (MODO OSCURO) ---
        initTheme() {
            const savedTheme = localStorage.getItem('sirex_theme') || 'light';
            this.state.isDarkMode = savedTheme === 'dark';
            this.dom.html.setAttribute('data-theme', savedTheme);
            this.dom.themeToggle.checked = this.state.isDarkMode;
        },
        toggleTheme() {
            this.state.isDarkMode = !this.state.isDarkMode;
            const newTheme = this.state.isDarkMode ? 'dark' : 'light';
            this.dom.html.setAttribute('data-theme', newTheme);
            localStorage.setItem('sirex_theme', newTheme);
            if (this.state.currentChartInstance) {
                this.renderSummaryChart(this.state.resumenData); // Re-renderizar gráfico con nuevos colores
            }
        },

        // --- LÓGICA DE LA INTERFAZ (UI/UX) ---
        showNotification(message, type = 'info') { /* ... (sin cambios, ya era bueno) ... */ },
        toggleButtonLoading(button, isLoading) {
            if (isLoading) {
                button.disabled = true;
                button.dataset.originalContent = button.innerHTML;
                button.innerHTML = '<div class="spinner"></div>';
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalContent;
            }
        },
        addItemCampo(campoConfig) { /* ... (sin cambios, ya era bueno) ... */ },
        renderItem(text, listId) { /* ... (sin cambios, ya era bueno) ... */ },
        limpiarFormularioCompleto() {
            this.campos.forEach(c => {
                document.getElementById(c.list).innerHTML = '';
                document.getElementById(c.cuantia).value = '';
                c.inputs.forEach(id => { document.getElementById(id).value = ''; });
            });
            this.showNotification('Formulario limpiado.', 'info');
        },

        // --- LÓGICA DE DATOS (FIREBASE) ---
        async cargarRegistro() { /* ... (lógica casi idéntica, solo adaptar toggleButtonLoading) ... */ },
        async guardarRegistro() { /* ... (lógica casi idéntica, solo adaptar toggleButtonLoading) ... */ },
        async eliminarRegistro() { /* ... (lógica casi idéntica, solo adaptar toggleButtonLoading) ... */ },

        // --- LÓGICA DE RESUMEN Y GRÁFICOS ---
        async generarResumen() {
            const desde = this.dom.resumenDesde.value;
            const hasta = this.dom.resumenHasta.value;
            if (!desde || !hasta || hasta < desde) {
                this.showNotification('Rango de fechas inválido.', 'error');
                return;
            }
            
            this.toggleButtonLoading(this.dom.btnResumen, true);
            this.dom.resumenContenido.innerHTML = 'Consultando...';
            this.toggleExportButtons(false);
            if(this.state.currentChartInstance) this.state.currentChartInstance.destroy();

            try {
                const snapshot = await this.db.collection('grupo4_operativo').where('fecha', '>=', desde).where('fecha', '<=', hasta).orderBy('fecha').get();

                if (snapshot.empty) {
                    this.dom.resumenContenido.innerHTML = '<em>No se encontraron registros.</em>';
                    return;
                }

                const totales = {};
                this.campos.forEach(c => {
                    totales[c.nombre] = [];
                    totales[c.cuantia] = 0;
                });
                snapshot.forEach(doc => {
                    const data = doc.data();
                    this.campos.forEach(c => {
                        if (data[c.nombre]) totales[c.nombre].push(...data[c.nombre]);
                        if (data[c.cuantia]) totales[c.cuantia] += data[c.cuantia];
                    });
                });
                
                this.state.resumenData = totales;
                this.renderResumenHtml();
                this.renderSummaryChart();
                this.toggleExportButtons(true);

            } catch (error) {
                this.showNotification('Error al generar resumen.', 'error');
                console.error(error);
            } finally {
                this.toggleButtonLoading(this.dom.btnResumen, false);
            }
        },
        renderResumenHtml() {
            // ... (código existente para generar el HTML de la lista) ...
        },
        renderSummaryChart() {
            if (this.state.currentChartInstance) {
                this.state.currentChartInstance.destroy();
            }
            
            const labels = this.campos.map(c => c.titulo);
            const data = this.campos.map(c => this.state.resumenData[c.cuantia]);
            
            const chartColors = this.state.isDarkMode 
              ? { bg: 'rgba(0, 123, 255, 0.6)', border: '#007BFF', text: '#F0F4F9' }
              : { bg: 'rgba(0, 123, 255, 0.6)', border: '#007BFF', text: '#1D2433' };

            this.state.currentChartInstance = new Chart(this.dom.chartCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Registros',
                        data: data,
                        backgroundColor: chartColors.bg,
                        borderColor: chartColors.border,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Resumen Visual de Actividad', color: chartColors.text, font: { size: 16 } } },
                    scales: {
                        y: { ticks: { color: chartColors.text, stepSize: 1 } },
                        x: { ticks: { color: chartColors.text } }
                    }
                }
            });
        },
        toggleExportButtons(enabled) {
            this.dom.btnExportarPdf.disabled = !enabled;
            this.dom.btnCompartirWhatsapp.disabled = !enabled;
        },

        // --- LÓGICA DE EXPORTACIÓN ---
        async exportToPdf() { /* ... (código casi idéntico, ya era bueno) ... */ },
        shareToWhatsApp() { /* ... (código casi idéntico, ya era bueno) ... */ }
    };

    App.init();
});