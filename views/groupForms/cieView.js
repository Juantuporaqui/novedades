// views/groupForms/cieView.js
// Propósito: Definir la configuración para el formulario del CIE.
// Exporta un objeto de configuración para el renderer de formularios.

import { addInternoNacionalidad, getInternosNacionalidad, addIngreso, getIngresos, addSalida, getSalidas } from '../../ui/dynamicLists.js';

export const getCieConfig = () => ({
    formFields: `
        <div class="mb-4">
            <label for="descripcionBreve">Resumen del día / Novedad principal</label>
            <textarea id="descripcionBreve" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label for="tipoActuacion">Tipo de Actuación</label>
                <input type="text" id="tipoActuacion" placeholder="Admisión, Visita, Traslado" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="totalInternos">Nº internos total</label>
                <input type="number" id="totalInternos" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Internos por nacionalidad</h4>
        <div id="internosNacionalidadesContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="intNac" placeholder="Nacionalidad" class="rounded border px-2 py-1">
            <input type="number" id="intNum" placeholder="Número" class="rounded border px-2 py-1">
            <button type="button" id="addInternoNacionalidadBtn" class="btn-secondary">Añadir</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Ingresos</h4>
        <div id="ingresosContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="ingNac" placeholder="Nacionalidad" class="rounded border px-2 py-1">
            <input type="number" id="ingNum" placeholder="Número" class="rounded border px-2 py-1">
            <button type="button" id="addIngresoBtn" class="btn-secondary">Añadir</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Salidas</h4>
        <div id="salidasContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="salDestino" placeholder="Destino" class="rounded border px-2 py-1">
            <input type="number" id="salNum" placeholder="Número" class="rounded border px-2 py-1">
            <button type="button" id="addSalidaBtn" class="btn-secondary">Añadir</button>
        </div>
        
        <div class="mt-4 mb-4">
            <label for="observacionesCIE">Observaciones</label>
            <textarea id="observacionesCIE" class="w-full rounded border px-2 py-1" rows="3"></textarea>
        </div>
    `,
    dynamicListContainers: ['internosNacionalidadesContainer', 'ingresosContainer', 'salidasContainer'],
    dataMap: {
        descripcionBreve: 'descripcionBreve',
        tipoActuacion: 'tipoActuacion',
        totalInternos: 'totalInternos',
        internosNacionalidad: getInternosNacionalidad,
        ingresos: getIngresos,
        salidas: getSalidas,
        observaciones: 'observacionesCIE',
    },
    setupEventListeners: () => {
        document.getElementById('addInternoNacionalidadBtn').addEventListener('click', addInternoNacionalidad);
        document.getElementById('addIngresoBtn').addEventListener('click', addIngreso);
        document.getElementById('addSalidaBtn').addEventListener('click', addSalida);
    },
    populateDynamicLists: (data) => {
        data.internosNacionalidad?.forEach(addInternoNacionalidad);
        data.ingresos?.forEach(addIngreso);
        data.salidas?.forEach(addSalida);
    }
});