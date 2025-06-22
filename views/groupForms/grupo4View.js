// views/groupForms/grupo4View.js
// Propósito: Definir la configuración para el formulario del Grupo 4 (Redes).
// Exporta un objeto de configuración para que `specificGroupViewRenderer.js` construya
// dinámicamente el formulario, incluyendo campos, listas dinámicas y manejadores de eventos.

import { addColaboracionG4, getColaboracionesG4, addDetenidoG4, getDetenidosG4 } from '../../ui/dynamicLists.js';
import { addBasicListItem, getBasicListItems } from '../../ui/common.js';
import { formatDate } from '../../utils.js';

const addGrupo4Pendiente = (data = {}) => {
    const descInput = document.getElementById('gp4PendDesc');
    const dateInput = document.getElementById('gp4PendDate');
    const desc = data.descripcion || (descInput ? descInput.value.trim() : '');
    const fecha = data.fechaLimite ? formatDate(data.fechaLimite) : (dateInput ? dateInput.value : '');
    if (!desc) return;
    addBasicListItem('grupo4PendientesList', desc, fecha);
    if (!data.descripcion && descInput) descInput.value = '';
    if (!data.fechaLimite && dateInput) dateInput.value = '';
};
const getGrupo4Pendientes = () => getBasicListItems('grupo4PendientesList');

export const getGrupo4Config = () => ({
    formFields: `
        <div class="mb-4">
            <label for="descripcionBreve">Resumen del día / Novedad principal</label>
            <textarea id="descripcionBreve" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
                <label for="identificados">Identificados</label>
                <input type="number" id="identificados" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="citados">Citados</label>
                <input type="number" id="citados" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="inspeccionesTrabajo">Inspecciones trabajo</label>
                <input type="number" id="inspeccionesTrabajo" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
             <div>
                <label for="otrasInspecciones">Otras inspecciones</label>
                <input type="number" id="otrasInspecciones" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
        </div>
        <div class="mb-4">
            <label for="otrasGestiones">Otras gestiones</label>
            <textarea id="otrasGestiones" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Colaboraciones otros grupos</h4>
        <div id="colaboracionesG4Container" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <input type="text" id="colG4Desc" placeholder="Descripción de la colaboración" class="rounded border px-2 py-1">
            <button type="button" id="addColaboracionG4Btn" class="btn-secondary">Añadir Colaboración</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Detenidos</h4>
        <div id="detenidosG4Container" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="detG4Motivo" placeholder="Motivo" class="rounded border px-2 py-1">
            <input type="text" id="detG4Nac" placeholder="Nacionalidad" class="rounded border px-2 py-1">
            <button type="button" id="addDetenidoG4Btn" class="btn-secondary">Añadir Detenido</button>
        </div>
    `,
    dynamicAdders: `
        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Pendientes de Gestión</h4>
        <ul id="grupo4PendientesList" class="list-disc pl-5 mb-4 max-h-40 overflow-y-auto border p-2 rounded"></ul>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="gp4PendDesc" placeholder="Descripción del pendiente" class="rounded border px-2 py-1">
            <input type="date" id="gp4PendDate" class="rounded border px-2 py-1">
            <button type="button" id="addGrupo4PendienteBtn" class="btn-secondary">Añadir Pendiente</button>
        </div>
    `,
    dynamicListContainers: ['colaboracionesG4Container', 'detenidosG4Container', 'grupo4PendientesList'],
    dataMap: {
        descripcionBreve: 'descripcionBreve',
        identificados: 'identificados',
        colaboracionesOtrosGrupos: getColaboracionesG4,
        detenidos: getDetenidosG4,
        citados: 'citados',
        otrasGestiones: 'otrasGestiones',
        inspeccionesTrabajo: 'inspeccionesTrabajo',
        otrasInspecciones: 'otrasInspecciones',
        grupo4Pendientes: getGrupo4Pendientes
    },
    setupEventListeners: () => {
        document.getElementById('addColaboracionG4Btn').addEventListener('click', addColaboracionG4);
        document.getElementById('addDetenidoG4Btn').addEventListener('click', addDetenidoG4);
        document.getElementById('addGrupo4PendienteBtn').addEventListener('click', addGrupo4Pendiente);
    },
    populateDynamicLists: (data) => {
        data.colaboracionesOtrosGrupos?.forEach(addColaboracionG4);
        data.detenidos?.forEach(addDetenidoG4);
        data.grupo4Pendientes?.forEach(addGrupo4Pendiente);
    }
});