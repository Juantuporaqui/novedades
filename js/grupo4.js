// ==== CONFIGURACIÓN DE FIREBASE ====
const firebaseConfig = {
    apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo", // ¡Considera usar variables de entorno para esto!
    authDomain: "ucrif-5bb75.firebaseapp.com",
    projectId: "ucrif-5bb75",
    storageBucket: "ucrif-5bb75.appspot.com",
    messagingSenderId: "241698436443",
    appId: "1:241698436443:web:1f333b3ae3f813b755167e",
    measurementId: "G-S2VPQNWZ21"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==== MÓDULO DE LA APLICACIÓN ====
const App = {
    // Referencias al DOM
    dom: {
        fechaInput: document.getElementById('fechaRegistroG4'),
        btnCargar: document.getElementById('btnCargarG4'),
        btnGuardar: document.getElementById('btnGuardarG4'),
        btnEliminar: document.getElementById('btnEliminarG4'),
        btnLimpiar: document.getElementById('btnLimpiarG4'),
        resumenDesde: document.getElementById('resumenDesdeG4'),
        resumenHasta: document.getElementById('resumenHastaG4'),
        btnResumen: document.getElementById('btnGenerarResumenG4'),
        resumenContenido: document.getElementById('resumenContenidoG4'),
        notificationArea: document.getElementById('notification-area'),
    },

    // Definición de los campos dinámicos
    campos: [
        { id: 'Colab', nombre: 'colaboraciones', cuantia: 'cuantiaColab', inputs: ['colabInputG4'], list: 'colabListG4', titulo: 'Colaboraciones' },
        { id: 'Detenido', nombre: 'detenidos', cuantia: 'cuantiaDetenidos', inputs: ['detenidoMotivoG4', 'detenidoNacionalidadG4'], list: 'detenidosListG4', titulo: 'Detenidos' },
        { id: 'Citados', nombre: 'citados', cuantia: 'cuantiaCitados', inputs: ['citadosInputG4'], list: 'citadosListG4', titulo: 'Citados' },
        { id: 'Gestiones', nombre: 'otrasGestiones', cuantia: 'cuantiaGestiones', inputs: ['gestionesInputG4'], list: 'gestionesListG4', titulo: 'Otras Gestiones' },
        { id: 'InspeccionTrabajo', nombre: 'inspeccionesTrabajo', cuantia: 'cuantiaInspeccion', inputs: ['inspeccionTrabajoInputG4'], list: 'inspeccionTrabajoListG4', titulo: 'Inspecciones de Trabajo' },
        { id: 'OtrasInspecciones', nombre: 'otrasInspecciones', cuantia: 'cuantiaOtrasInspecciones', inputs: ['otrasInspeccionesInputG4'], list: 'otrasInspeccionesListG4', titulo: 'Otras Inspecciones' }
    ],

    // Método de inicialización
    init() {
        // Establecer fecha actual por defecto
        this.dom.fechaInput.value = new Date().toISOString().slice(0, 10);
        this.addEventListeners();
    },

    // Centralizar todos los event listeners
    addEventListeners() {
        this.dom.btnCargar.addEventListener('click', () => this.cargarRegistro());
        this.dom.btnGuardar.addEventListener('click', () => this.guardarRegistro());
        this.dom.btnEliminar.addEventListener('click', () => this.eliminarRegistro());
        this.dom.btnLimpiar.addEventListener('click', () => this.limpiarFormularioCompleto());
        this.dom.btnResumen.addEventListener('click', () => this.generarResumen());

        // Listeners para los botones de añadir (+)
        this.campos.forEach(c => {
            const btnAdd = document.getElementById(`btnAdd${c.id}G4`);
            btnAdd.onclick = () => this.addItemCampo(c);
        });
    },

    // --- Funciones de Interfaz de Usuario (UI) ---

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.dom.notificationArea.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4000);
    },

    toggleButtonLoading(button, isLoading) {
        const span = button.querySelector('span');
        if (isLoading) {
            button.disabled = true;
            if (span) span.textContent = 'Cargando...';
        } else {
            button.disabled = false;
            if (span) span.textContent = button.dataset.originalText || '';
        }
    },
    
    addItemCampo(campoConfig) {
        const listElement = document.getElementById(campoConfig.list);
        const inputElements = campoConfig.inputs.map(id => document.getElementById(id));
        
        const values = inputElements.map(input => input.value.trim());
        if (values.every(v => v === '')) return; // No añadir si todos los campos están vacíos

        const textContent = values.filter(v => v).join(' · ');

        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `<span class="item-text">${textContent}</span><button type="button" class="btn-del" title="Eliminar">×</button>`;
        
        item.querySelector('.btn-del').onclick = () => item.remove();

        listElement.appendChild(item);

        // Limpiar inputs
        inputElements.forEach(input => input.value = '');
    },

    renderItem(text, listId) {
        const listElement = document.getElementById(listId);
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `<span class="item-text">${text}</span><button type="button" class="btn-del" title="Eliminar">×</button>`;
        
        item.querySelector('.btn-del').onclick = () => item.remove();
        listElement.appendChild(item);
    },
    
    limpiarFormularioCompleto() {
        this.campos.forEach(c => {
            document.getElementById(c.list).innerHTML = '';
            document.getElementById(c.cuantia).value = '';
            c.inputs.forEach(inputId => document.getElementById(inputId).value = '');
        });
        this.showNotification('Formulario limpiado.', 'info');
    },

    // --- Funciones de Lógica de Datos (Firebase) ---

    async cargarRegistro() {
        const fecha = this.dom.fechaInput.value;
        if (!fecha) return this.showNotification('Selecciona una fecha para cargar.', 'error');
        
        this.toggleButtonLoading(this.dom.btnCargar, true);
        try {
            const doc = await db.collection('grupo4_operativo').doc(fecha).get();
            if (doc.exists) {
                this.limpiarFormularioCompleto();
                const data = doc.data();
                this.campos.forEach(c => {
                    document.getElementById(c.cuantia).value = data[c.cuantia] ?? "";
                    if (data[c.nombre]) {
                        data[c.nombre].forEach(txt => this.renderItem(txt, c.list));
                    }
                });
                this.showNotification('Registro cargado correctamente.', 'success');
            } else {
                this.limpiarFormularioCompleto();
                this.showNotification('No hay registro para esa fecha.', 'info');
            }
        } catch (error) {
            console.error("Error al cargar:", error);
            this.showNotification('Error al cargar el registro.', 'error');
        } finally {
            this.toggleButtonLoading(this.dom.btnCargar, false);
        }
    },

    async guardarRegistro() {
        const fecha = this.dom.fechaInput.value;
        if (!fecha) return this.showNotification('Selecciona una fecha para guardar.', 'error');

        this.toggleButtonLoading(this.dom.btnGuardar, true);
        try {
            const datos = {
                fecha: fecha,
                timestamp: new Date().toISOString()
            };

            this.campos.forEach(c => {
                datos[c.nombre] = Array.from(document.getElementById(c.list).children).map(item => item.querySelector('.item-text').textContent.trim());
                datos[c.cuantia] = parseInt(document.getElementById(c.cuantia).value) || 0;
            });

            await db.collection('grupo4_operativo').doc(fecha).set(datos);
            this.showNotification('Registro guardado con éxito.', 'success');
        } catch (error) {
            console.error("Error al guardar:", error);
            this.showNotification('Error al guardar el registro.', 'error');
        } finally {
            this.toggleButtonLoading(this.dom.btnGuardar, false);
        }
    },

    async eliminarRegistro() {
        const fecha = this.dom.fechaInput.value;
        if (!fecha) return this.showNotification('Selecciona una fecha para eliminar.', 'error');

        if (!confirm(`¿Estás seguro de que quieres eliminar TODO el registro del día ${fecha}? Esta acción no se puede deshacer.`)) {
            return;
        }

        this.toggleButtonLoading(this.dom.btnEliminar, true);
        try {
            await db.collection('grupo4_operativo').doc(fecha).delete();
            this.limpiarFormularioCompleto();
            this.showNotification('Registro eliminado correctamente.', 'success');
        } catch (error) {
            console.error("Error al eliminar:", error);
            this.showNotification('Error al eliminar el registro.', 'error');
        } finally {
            this.toggleButtonLoading(this.dom.btnEliminar, false);
        }
    },
    
    async generarResumen() {
        const desde = this.dom.resumenDesde.value;
        const hasta = this.dom.resumenHasta.value;
        if (!desde || !hasta) return this.showNotification('Selecciona el rango de fechas para el resumen.', 'error');
        if (desde > hasta) return this.showNotification('La fecha "Desde" no puede ser posterior a la fecha "Hasta".', 'error');

        this.dom.resumenContenido.innerHTML = '<b>Consultando...</b>';
        this.toggleButtonLoading(this.dom.btnResumen, true);

        try {
            const snapshot = await db.collection('grupo4_operativo')
                .where('fecha', '>=', desde)
                .where('fecha', '<=', hasta)
                .orderBy('fecha')
                .get();

            if (snapshot.empty) {
                this.dom.resumenContenido.innerHTML = '<em>No se encontraron registros en ese rango de fechas.</em>';
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
            
            let html = '';
            this.campos.forEach(c => {
                html += `<b>${c.titulo}</b>`;
                if (totales[c.nombre].length > 0) {
                    html += `<ul>${totales[c.nombre].map(t => `<li>${t}</li>`).join('')}</ul>`;
                } else {
                    html += '<em>: Ninguno</em>';
                }
                html += `<div><strong>Total ${c.titulo}:</strong> <span class="total-count">${totales[c.cuantia]}</span></div><hr>`;
            });

            this.dom.resumenContenido.innerHTML = html;

        } catch (error) {
            console.error("Error al generar resumen:", error);
            this.dom.resumenContenido.innerHTML = '<em>Ocurrió un error al generar el resumen.</em>';
            this.showNotification('Error al generar el resumen.', 'error');
        } finally {
            this.toggleButtonLoading(this.dom.btnResumen, false);
        }
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Guardar el texto original de los botones para restaurarlo después de la carga
    document.querySelectorAll('.btn[data-original-text]').forEach(btn => {
        const span = btn.querySelector('span');
        if (span) btn.dataset.originalText = span.textContent;
    });
    App.init();
});