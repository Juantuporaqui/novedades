
// Se espera a que el DOM esté completamente cargado para ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // MÓDULO 1: SELECTORES DEL DOM
    // Centraliza todos los accesos a los elementos del DOM en un solo lugar.
    // Esto facilita el mantenimiento: si un ID cambia en el HTML, solo se
    // necesita actualizarlo aquí.
    // =========================================================================
    const dom = {
        entryForm: document.getElementById('entry-form'),
        entryTitle: document.getElementById('entry-title'),
        entryDate: document.getElementById('entry-date'),
        entryDescription: document.getElementById('entry-description'),
        entryHours: document.getElementById('entry-hours'),
        entriesList: document.getElementById('entries-list'),
        noEntriesMessage: document.getElementById('no-entries-message'),
        startDate: document.getElementById('start-date'),
        endDate: document.getElementById('end-date'),
        filterBtn: document.getElementById('filter-btn'),
        summaryResult: document.getElementById('summary-result'),
        detailModal: document.getElementById('detail-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalTitle: document.getElementById('modal-title'),
        modalDate: document.getElementById('modal-date'),
        modalHours: document.getElementById('modal-hours'),
        modalDescription: document.getElementById('modal-description'),
        modalDeleteBtn: document.getElementById('modal-delete-btn'),
        exportBtn: document.getElementById('export-btn'),
        importProxyBtn: document.getElementById('import-btn-proxy'),
        importFile: document.getElementById('import-file'),
        toast: document.getElementById('toast-notification'),
    };

    // =========================================================================
    // MÓDULO 2: ESTADO DE LA APLICACIÓN
    // Contiene el estado de la aplicación, principalmente la lista de registros.
    // Tener un estado centralizado ayuda a que la UI sea un reflejo de los datos.
    // =========================================================================
    let state = {
        entries:,
        currentOpenEntryId: null, // Guarda el ID del registro abierto en el modal
    };

    // =========================================================================
    // MÓDULO 3: GESTIÓN DE DATOS (El "Modelo")
    // Funciones que interactúan con localStorage. Aíslan la lógica de la
    // aplicación del método de almacenamiento.
    // =========================================================================
    const dataService = {
        /**
         * Obtiene todos los registros desde localStorage.
         * @returns {Array} Un array de objetos de registro.
         */
        getEntries: () => {
            const entriesJSON = localStorage.getItem('benito_entries');
            // Si no hay datos, devuelve un array vacío.
            // Si hay, los parsea desde la cadena JSON.
            return entriesJSON? JSON.parse(entriesJSON) :;
        },

        /**
         * Guarda el array completo de registros en localStorage.
         * @param {Array} entries El array de registros a guardar.
         */
        saveEntries: (entries) => {
            // Ordena las entradas por fecha (más recientes primero) antes de guardar.
            entries.sort((a, b) => new Date(b.date) - new Date(a.date));
            localStorage.setItem('benito_entries', JSON.stringify(entries));
        }
    };

    // =========================================================================
    // MÓDULO 4: RENDERIZADO DE LA UI (La "Vista")
    // Funciones que manipulan el DOM para reflejar el estado actual.
    // Estas funciones no modifican el estado, solo lo leen.
    // =========================================================================
    const uiService = {
        /**
         * Renderiza la lista de registros en el DOM.
         */
        renderEntries: () => {
            // Limpia la lista actual
            dom.entriesList.innerHTML = '';

            if (state.entries.length === 0) {
                dom.noEntriesMessage.classList.remove('hidden');
            } else {
                dom.noEntriesMessage.classList.add('hidden');
                state.entries.forEach(entry => {
                    const card = document.createElement('div');
                    card.className = 'entry-card';
                    // Se usa `data-id` para asociar el elemento del DOM con el dato.
                    card.dataset.id = entry.id;

                    const title = document.createElement('h3');
                    title.className = 'entry-card__title';
                    // IMPORTANTE: Usar `textContent` en lugar de `innerHTML` para prevenir ataques XSS.
                    title.textContent = entry.title;

                    const date = document.createElement('p');
                    date.className = 'entry-card__date';
                    date.textContent = new Date(entry.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

                    card.appendChild(title);
                    card.appendChild(date);
                    dom.entriesList.appendChild(card);
                });
            }
        },

        /**
         * Limpia los campos del formulario de entrada.
         */
        resetForm: () => {
            dom.entryForm.reset();
        },

        /**
         * Muestra el modal con los detalles de un registro específico.
         * @param {string} entryId El ID del registro a mostrar.
         */
        openModal: (entryId) => {
            const entry = state.entries.find(e => e.id === entryId);
            if (!entry) return;

            state.currentOpenEntryId = entryId;

            dom.modalTitle.textContent = entry.title;
            dom.modalDate.textContent = `Fecha: ${new Date(entry.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
            dom.modalDescription.textContent = entry.description;

            if (entry.hours) {
                dom.modalHours.textContent = `Horas dedicadas: ${entry.hours}`;
                dom.modalHours.classList.remove('hidden');
            } else {
                dom.modalHours.classList.add('hidden');
            }

            dom.detailModal.classList.remove('hidden');
        },

        /**
         * Cierra el modal de detalles.
         */
        closeModal: () => {
            state.currentOpenEntryId = null;
            dom.detailModal.classList.add('hidden');
        },

        /**
         * Muestra el resultado del resumen en el DOM.
         * @param {object} summaryData - Objeto con los datos del resumen.
         */
        renderSummary: (summaryData) => {
            if (!summaryData) {
                dom.summaryResult.innerHTML = '<p><em>Selecciona un rango de fechas y haz clic en "Generar Resumen".</em></p>';
                return;
            }
            dom.summaryResult.innerHTML = `
                <p><strong>Registros encontrados:</strong> ${summaryData.count}</p>
                <p><strong>Total de horas registradas:</strong> ${summaryData.totalHours.toFixed(2)}</p>
            `;
        },

        /**
         * Muestra una notificación temporal (toast).
         * @param {string} message - El mensaje a mostrar.
         * @param {string} type - 'success' o 'error'.
         */
        showToast: (message, type = 'success') => {
            dom.toast.textContent = message;
            dom.toast.className = `toast show ${type}`;
            setTimeout(() => {
                dom.toast.classList.remove('show');
            }, 3000);
        }
    };

    // =========================================================================
    // MÓDULO 5: LÓGICA DE LA APLICACIÓN Y MANEJADORES DE EVENTOS (El "Controlador")
    // Conecta las acciones del usuario con la gestión de datos y la actualización de la UI.
    // =========================================================================
    const appController = {
        /**
         * Maneja el envío del formulario para añadir un nuevo registro.
         * @param {Event} event El evento de envío del formulario.
         */
        handleFormSubmit: (event) => {
            event.preventDefault(); // Previene la recarga de la página

            const newEntry = {
                id: `entry_${Date.now()}`, // ID único basado en el timestamp
                title: dom.entryTitle.value.trim(),
                date: dom.entryDate.value,
                description: dom.entryDescription.value.trim(),
                hours: dom.entryHours.value? parseFloat(dom.entryHours.value) : 0,
                createdAt: new Date().toISOString()
            };

            // Validación simple
            if (!newEntry.title ||!newEntry.date ||!newEntry.description) {
                uiService.showToast('Por favor, completa los campos obligatorios.', 'error');
                return;
            }

            // Actualiza el estado y guarda
            state.entries.push(newEntry);
            dataService.saveEntries(state.entries);

            // Actualiza la UI
            uiService.renderEntries();
            uiService.resetForm();
            uiService.showToast('Registro guardado con éxito.');
        },

        /**
         * Maneja el clic en la lista de registros para abrir el modal.
         * @param {Event} event El evento de clic.
         */
        handleListClick: (event) => {
            const card = event.target.closest('.entry-card');
            if (card) {
                const entryId = card.dataset.id;
                uiService.openModal(entryId);
            }
        },

        /**
         * Maneja la eliminación de un registro desde el modal.
         */
        handleDeleteEntry: () => {
            if (!state.currentOpenEntryId) return;

            if (confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
                // Filtra el array para excluir el registro a eliminar
                state.entries = state.entries.filter(e => e.id!== state.currentOpenEntryId);
                dataService.saveEntries(state.entries);

                uiService.closeModal();
                uiService.renderEntries();
                uiService.showToast('Registro eliminado.', 'success');
            }
        },

        /**
         * Genera y muestra un resumen basado en el rango de fechas seleccionado.
         */
        handleGenerateSummary: () => {
            const start = dom.startDate.value;
            const end = dom.endDate.value;

            if (!start ||!end) {
                uiService.showToast('Por favor, selecciona una fecha de inicio y de fin.', 'error');
                return;
            }
            
            if (new Date(start) > new Date(end)) {
                uiService.showToast('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
                return;
            }

            // Convertir fechas a UTC para evitar problemas de zona horaria en la comparación
            const startDate = new Date(start);
            const endDate = new Date(end);

            const filteredEntries = state.entries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startDate && entryDate <= endDate;
            });

            const totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.hours |
| 0), 0);

            uiService.renderSummary({
                count: filteredEntries.length,
                totalHours: totalHours
            });
        },

        /**
         * Exporta todos los datos a un archivo JSON.
         */
        handleExportData: () => {
            if (state.entries.length === 0) {
                uiService.showToast('No hay datos para exportar.', 'error');
                return;
            }
            const dataStr = JSON.stringify(state.entries, null, 2); // El '2' formatea el JSON para que sea legible
            const dataBlob = new Blob(, { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `benito_backup_${new Date().toISOString().split('T')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            uiService.showToast('Datos exportados correctamente.');
        },

        /**
         * Maneja la importación de datos desde un archivo JSON.
         * @param {Event} event El evento de cambio del input de archivo.
         */
        handleImportData: (event) => {
            const file = event.target.files;
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedEntries = JSON.parse(e.target.result);
                    // Validación básica del archivo importado
                    if (!Array.isArray(importedEntries) |
| (importedEntries.length > 0 &&!importedEntries.id)) {
                        throw new Error('Formato de archivo no válido.');
                    }

                    if (confirm('Esto reemplazará todos tus datos actuales. ¿Estás seguro de que quieres continuar?')) {
                        state.entries = importedEntries;
                        dataService.saveEntries(state.entries);
                        uiService.renderEntries();
                        uiService.showToast('Datos importados con éxito.');
                    }
                } catch (error) {
                    uiService.showToast('Error al importar el archivo. Asegúrate de que es un JSON válido de Benito.', 'error');
                } finally {
                    // Resetea el valor del input para poder importar el mismo archivo de nuevo
                    dom.importFile.value = '';
                }
            };
            reader.readAsText(file);
        },

        /**
         * Función de inicialización de la aplicación.
         */
        init: () => {
            // Carga los datos iniciales
            state.entries = dataService.getEntries();

            // Renderiza la UI inicial
            uiService.renderEntries();
            uiService.renderSummary(null); // Muestra el mensaje inicial del resumen

            // Configura todos los manejadores de eventos
            dom.entryForm.addEventListener('submit', appController.handleFormSubmit);
            dom.entriesList.addEventListener('click', appController.handleListClick);
            dom.modalCloseBtn.addEventListener('click', uiService.closeModal);
            dom.modalDeleteBtn.addEventListener('click', appController.handleDeleteEntry);
            dom.filterBtn.addEventListener('click', appController.handleGenerateSummary);
            dom.exportBtn.addEventListener('click', appController.handleExportData);
            // El botón de importar es un proxy para el input de archivo real, que está oculto
            dom.importProxyBtn.addEventListener('click', () => dom.importFile.click());
            dom.importFile.addEventListener('change', appController.handleImportData);

            // Cierra el modal si se hace clic fuera de él o se presiona la tecla Escape
            dom.detailModal.addEventListener('click', (event) => {
                if (event.target === dom.detailModal) {
                    uiService.closeModal();
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' &&!dom.detailModal.classList.contains('hidden')) {
                    uiService.closeModal();
                }
            });
            
            console.log('Aplicación Benito v2.0 inicializada.');
        }
    };

    // =========================================================================
    // PUNTO DE ENTRADA DE LA APLICACIÓN
    // =========================================================================
    appController.init();

});
