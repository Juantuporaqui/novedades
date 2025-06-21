// views/groupForms/specificGroupViewRenderer.js
// Propósito: Orquestar la renderización de formularios para grupos "específicos" (no G2/G3).
// Este módulo actúa como un despachador. Carga la configuración (campos, manejadores) 
// del archivo de vista correspondiente al grupo actual (e.g., grupo1View.js) y 
// construye dinámicamente el formulario, los listeners de eventos y la lógica de guardado/carga.

import { showSpinner, showStatus, formatDate, parseDate } from '../../utils.js';
import { saveData, loadData, findDocByDate, fetchDataForSelect } from '../../services/firestoreService.js';
import { getCurrentGroup, getCurrentDocId, setCurrentDocId } from '../../services/viewManager.js';
import { groups } from '../../groups.js';
import { mainContent } from '../../ui/common.js';

// Importar configuraciones de vistas específicas
import { getGrupo1Config } from './grupo1View.js';
import { getGrupo4Config } from './grupo4View.js';
import { getPuertoConfig } from './puertoView.js';
import { getCieConfig } from './cieView.js';
import { getGestionConfig } from './gestionView.js';
import { getCecorexConfig } from './cecorexView.js';

// Mapa para obtener la configuración de cada grupo
const configMap = {
    'grupo1': getGrupo1Config,
    'grupo4': getGrupo4Config,
    'puerto': getPuertoConfig,
    'cie': getCieConfig,
    'gestion': getGestionConfig,
    'cecorex': getCecorexConfig,
};

let viewConfig = {};

/**
 * Renderiza el formulario para un grupo específico.
 * @param {string} groupKey - La clave del grupo (e.g., 'grupo1').
 */
export const renderSpecificGroupForm = async (groupKey) => {
    const groupInfo = groups[groupKey];
    if (!groupInfo) return;

    // Obtener la configuración específica para esta vista
    if (!configMap[groupKey]) {
        mainContent().innerHTML = `<p class="text-red-500 p-4">Error: No se encontró la configuración para el grupo ${groupKey}.</p>`;
        return;
    }
    viewConfig = configMap[groupKey]();

    // Sección de búsqueda/selección
    const searchSection = `
        <div class="card">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div class="md:col-span-2">
                    <label>Fecha del Parte (Grabar / Buscar)</label>
                    <input type="date" id="searchDate" class="w-full rounded border px-2 py-1">
                </div>
                <button id="loadDateBtn" class="btn-primary">Buscar por Fecha</button>
                <button id="newDocBtn" class="btn-secondary">Nuevo Parte</button>
            </div>
        </div>`;

    const formSection = `
        <div class="card space-y-4">
            <div id="status-message" class="font-semibold"></div>
            ${viewConfig.formFields}
            ${viewConfig.dynamicAdders || ''}
             <div class="flex justify-between items-center mt-6">
                <button id="saveDocBtn" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Guardar Registro</button>
                ${viewConfig.extraButtons || ''}
            </div>
        </div>`;

    mainContent().innerHTML = `
        <div class="max-w-4xl mx-auto p-4 space-y-6">
            <h2 class="text-2xl font-bold text-center">${groupInfo.name} · ${groupInfo.description}</h2>
            ${searchSection}
            ${formSection}
        </div>
    `;

    setupEventListeners();
    await resetForm();
};

/**
 * Configura todos los listeners de eventos para el formulario.
 */
function setupEventListeners() {
    document.getElementById('newDocBtn').addEventListener('click', resetForm);
    document.getElementById('loadDateBtn').addEventListener('click', () => {
        const dateStr = document.getElementById('searchDate').value;
        loadDocByDate(dateStr);
    });
    document.getElementById('saveDocBtn').addEventListener('click', saveDoc);

    // Listeners específicos de la configuración (si existen)
    if (viewConfig.setupEventListeners) {
        viewConfig.setupEventListeners();
    }
}

/**
 * Guarda el documento actual.
 */
async function saveDoc() {
    showSpinner(true);
    const groupKey = getCurrentGroup();
    const collectionName = groups[groupKey].collection;
    let docData = {};

    try {
        // Recoger datos de campos de formulario normales
        for (const key in viewConfig.dataMap) {
            const mapping = viewConfig.dataMap[key];
            if (typeof mapping === 'string') {
                const field = document.getElementById(mapping);
                if (field) {
                    if (field.type === 'number') {
                        docData[key] = Number(field.value) || 0;
                    } else if (field.type === 'date') {
                        docData[key] = parseDate(field.value);
                    } else {
                        docData[key] = field.value.trim();
                    }
                }
            } else if (typeof mapping === 'function') {
                // Recoger datos de listas dinámicas
                docData[key] = mapping();
            }
        }

        docData.grupo = groups[groupKey].name;
        // La fecha y el año se toman del campo de búsqueda/grabación
        const searchDate = document.getElementById('searchDate').value;
        if (!searchDate) {
            showStatus('La fecha del parte es obligatoria para guardar.', true);
            showSpinner(false);
            return;
        }
        docData.fecha = parseDate(searchDate);
        docData.anio = docData.fecha.getFullYear();

        const docId = getCurrentDocId();
        const newId = await saveData(collectionName, docData, docId);
        setCurrentDocId(newId);
        showStatus('Registro guardado correctamente.', false);
    } catch (e) {
        showStatus(`Error al guardar: ${e.message}`, true);
    } finally {
        showSpinner(false);
    }
}

/**
 * Carga un documento buscando por fecha.
 * @param {string} dateStr - La fecha en formato YYYY-MM-DD.
 */
async function loadDocByDate(dateStr) {
    if (!dateStr) {
        showStatus('Por favor, selecciona una fecha para buscar.', true);
        return;
    }
    showSpinner(true);
    await resetForm(false); // Limpia el form sin resetear la fecha

    const groupKey = getCurrentGroup();
    const collectionName = groups[groupKey].collection;
    const date = parseDate(dateStr);

    try {
        const doc = await findDocByDate(collectionName, date);
        if (doc) {
            setCurrentDocId(doc.id);
            populateForm(doc);
            showStatus('Registro cargado para la fecha seleccionada.', false);
        } else {
            setCurrentDocId(null);
            showStatus('No se encontró ningún registro para esta fecha. Puedes crear uno nuevo.', false);
        }
    } catch (e) {
        showStatus(`Error al cargar: ${e.message}`, true);
    } finally {
        // Rellenar campos de fecha/año incluso si no se encuentra nada
        document.getElementById('searchDate').value = dateStr;
        const anioField = document.getElementById('anio');
        if (anioField) anioField.value = date.getFullYear();
        showSpinner(false);
    }
}

/**
 * Rellena el formulario con los datos de un documento cargado.
 * @param {object} data - Los datos del documento.
 */
function populateForm(data) {
    // Rellenar campos normales
    for (const key in viewConfig.dataMap) {
        const mapping = viewConfig.dataMap[key];
        if (typeof mapping === 'string') {
            const field = document.getElementById(mapping);
            if (field && data[key] !== undefined) {
                 if (field.type === 'date') {
                    field.value = formatDate(data[key]);
                } else {
                    field.value = data[key];
                }
            }
        }
    }

    // Rellenar listas dinámicas y otros elementos complejos
    if (viewConfig.populateDynamicLists) {
        viewConfig.populateDynamicLists(data);
    }
}


/**
 * Resetea el formulario a su estado inicial.
 * @param {boolean} resetDate - Indica si también se debe limpiar el campo de fecha.
 */
async function resetForm(resetDate = true) {
    setCurrentDocId(null);
    showStatus('', false);

    // Limpiar todos los inputs, textareas y selects
    document.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else if (el.type !== 'button' && el.type !== 'submit') {
            if (el.id === 'searchDate' && !resetDate) {
              // no hacer nada
            } else {
               el.value = '';
            }
        }
    });
    
    // Limpiar contenedores de listas dinámicas
     if (viewConfig.dynamicListContainers) {
        viewConfig.dynamicListContainers.forEach(id => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = '';
        });
    }

    // Valores por defecto
    if (resetDate) {
        document.getElementById('searchDate').value = formatDate(new Date());
    }
    const anioField = document.getElementById('anio');
    if (anioField) anioField.value = new Date().getFullYear();

    // Resetear detalles de 'pendiente' si existen
    const pendSel = document.getElementById('pendiente');
    if (pendSel) pendSel.value = '';
    const pendDet = document.getElementById('pendienteDetalles');
    if (pendDet) pendDet.classList.add('hidden');
}