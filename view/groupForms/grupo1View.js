// views/groupForms/grupo1View.js
// Propósito: Definir la configuración específica para el formulario del Grupo 1 (Expulsiones y Repatriaciones).
// Este módulo exporta una función `getGrupo1Config` que devuelve un objeto con todo lo necesario
// para que `specificGroupViewRenderer.js` pueda construir y gestionar el formulario:
// el HTML de los campos, los contenedores de listas, el mapeo de datos y los manejadores de eventos.

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../../firebase.js';
import { getAppId } from '../../services/viewManager.js';
import { addDynamicItem, getDynamicItems, addBasicListItem, getBasicListItems } from '../../ui/common.js';
import { formatDate } from '../../utils.js';

// --- Funciones de Listas Dinámicas Específicas para Grupo 1 ---

// Personas Implicadas
const addPersonaImplicada = (data = {}) => addDynamicItem(
    document.getElementById('personasImplicadasContainer'),
    [
        { idPrefix: 'impNombre', label: 'Nombre', valueField: 'nombre' },
        { idPrefix: 'impNac', label: 'Nacionalidad', valueField: 'nacionalidad' },
        { idPrefix: 'impFechaExp', label: 'Fecha Expulsión', type: 'date', valueField: 'fechaExpulsion' }
    ], data);
const getPersonasImplicadas = () => getDynamicItems(document.getElementById('personasImplicadasContainer'), [
    { idPrefix: 'impNombre', valueField: 'nombre' },
    { idPrefix: 'impNac', valueField: 'nacionalidad' },
    { idPrefix: 'impFechaExp', valueField: 'fechaExpulsion' }
]);

// Expulsados
const addExpulsado = (data = {}) => addDynamicItem(
    document.getElementById('expulsadosContainer'),
    [
        { idPrefix: 'expNombre', label: 'Nombre', valueField: 'nombre' },
        { idPrefix: 'expNac', label: 'Nacionalidad', valueField: 'nacionalidad' }
    ], data);
const getExpulsados = () => getDynamicItems(document.getElementById('expulsadosContainer'), [
    { idPrefix: 'expNombre', valueField: 'nombre' },
    { idPrefix: 'expNac', valueField: 'nacionalidad' }
]);

// Fletados
const addFletado = (data = {}) => addDynamicItem(
    document.getElementById('fletadosContainer'),
    [
        { idPrefix: 'fletDestino', label: 'Destino', valueField: 'destino' },
        { idPrefix: 'fletPax', label: 'Pax', type: 'number', valueField: 'pax' }
    ], data);
const getFletados = () => getDynamicItems(document.getElementById('fletadosContainer'), [
    { idPrefix: 'fletDestino', valueField: 'destino' },
    { idPrefix: 'fletPax', valueField: 'pax' }
]);

// Conducciones Positivas
const addConduccionPositiva = (data = {}) => addDynamicItem(
    document.getElementById('conduccionesPositivasContainer'),
    [{ idPrefix: 'cpDesc', label: 'Descripción', valueField: 'descripcion' }], data);
const getConduccionesPositivas = () => getDynamicItems(document.getElementById('conduccionesPositivasContainer'), [{ idPrefix: 'cpDesc', valueField: 'descripcion' }]);

// Conducciones Negativas
const addConduccionNegativa = (data = {}) => addDynamicItem(
    document.getElementById('conduccionesNegativasContainer'),
    [{ idPrefix: 'cnDesc', label: 'Descripción', valueField: 'descripcion' }], data);
const getConduccionesNegativas = () => getDynamicItems(document.getElementById('conduccionesNegativasContainer'), [{ idPrefix: 'cnDesc', valueField: 'descripcion' }]);

// Pendientes
const addGrupoPendiente = (data = {}) => {
    const descInput = document.getElementById('gpPendDesc');
    const dateInput = document.getElementById('gpPendDate');
    const desc = data.descripcion || (descInput ? descInput.value.trim() : '');
    const fecha = data.fechaLimite ? formatDate(data.fechaLimite) : (dateInput ? dateInput.value : '');
    if (!desc) return;
    addBasicListItem('grupoPendientesList', desc, fecha);
    if (!data.descripcion && descInput) descInput.value = '';
    if (!data.fechaLimite && dateInput) dateInput.value = '';
};
const getGrupoPendientes = () => getBasicListItems('grupoPendientesList');

/**
 * Genera un PDF con el resumen de datos del Grupo 1 en un rango de fechas.
 */
async function generateGroup1Pdf() {
    const doc = new jsPDF();
    const desde = document.getElementById('pdfDesde').value;
    const hasta = document.getElementById('pdfHasta').value;
    if (!desde || !hasta) {
        alert('Selecciona el rango Desde/Hasta para generar el PDF.');
        return;
    }

    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1, 0, 0, 0);
    const end = new Date(y2, m2 - 1, d2, 23, 59, 59);

    const q = query(
        collection(db, `artifacts/${getAppId()}/expulsiones`),
        where('fecha', '>=', start),
        where('fecha', '<=', end)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) {
        alert('No hay registros en ese rango de fechas.');
        return;
    }

    doc.setFontSize(16);
    doc.text('Resumen Novedades Grupo 1', 14, 20);
    doc.setFontSize(11);
    doc.text(`Periodo del ${desde} al ${hasta}`, 14, 28);

    const summary = {};
    snaps.docs.forEach(d => {
        const data = d.data();
        const dateKey = formatDate(data.fecha);
        if (!summary[dateKey]) {
            summary[dateKey] = { expulsados: 0, fletados: 0, conduccionesPositivas: 0, conduccionesNegativas: 0 };
        }
        summary[dateKey].expulsados += data.expulsados?.length || 0;
        summary[dateKey].fletados += data.fletados?.length || 0;
        summary[dateKey].conduccionesPositivas += data.conduccionesPositivas?.length || 0;
        summary[dateKey].conduccionesNegativas += data.conduccionesNegativas?.length || 0;
    });

    const rows = Object.keys(summary)
        .sort((a, b) => new Date(a.split('-').reverse().join('-')) - new Date(b.split('-').reverse().join('-')))
        .map(fecha => [
            fecha,
            summary[fecha].expulsados,
            summary[fecha].fletados,
            summary[fecha].conduccionesPositivas,
            summary[fecha].conduccionesNegativas
        ]);

    doc.autoTable({
        head: [['Fecha', 'Expulsados', 'Fletados', 'Cond. Positivas', 'Cond. Negativas']],
        body: rows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [22, 78, 99] } // Tailwind's cyan-800
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`resumen-grupo1_${desde}_a_${hasta}.pdf`);
}

/**
 * Función principal que exporta la configuración de la vista.
 */
export const getGrupo1Config = () => ({
    // --- HTML DE LOS CAMPOS DEL FORMULARIO ---
    formFields: `
        <input type="hidden" id="anio">
        <div class="mb-4">
            <label for="descripcionBreve">Resumen del día / Novedad principal</label>
            <textarea id="descripcionBreve" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Personas Implicadas</h4>
        <div id="personasImplicadasContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls">
            <button type="button" id="addPersonaImplicadaBtn" class="btn-secondary">Añadir Persona</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Expulsados</h4>
        <div id="expulsadosContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls">
            <button type="button" id="addExpulsadoBtn" class="btn-secondary">Añadir Expulsado</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Fletados</h4>
        <div id="fletadosContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls">
            <button type="button" id="addFletadoBtn" class="btn-secondary">Añadir Fletado</button>
        </div>
        
        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Conducciones Positivas</h4>
        <div id="conduccionesPositivasContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls">
            <button type="button" id="addConduccionPositivaBtn" class="btn-secondary">Añadir Conducción Positiva</button>
        </div>

        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Conducciones Negativas</h4>
        <div id="conduccionesNegativasContainer" class="dynamic-list-container"></div>
        <div class="dynamic-list-controls">
            <button type="button" id="addConduccionNegativaBtn" class="btn-secondary">Añadir Conducción Negativa</button>
        </div>
    `,

    // --- HTML PARA SECCIONES DE LISTAS ADICIONALES ---
    dynamicAdders: `
        <h4 class="mt-6 mb-2 font-semibold text-gray-700">Pendientes de Gestión</h4>
        <ul id="grupoPendientesList" class="list-disc pl-5 mb-4 max-h-40 overflow-y-auto border p-2 rounded"></ul>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input type="text" id="gpPendDesc" placeholder="Descripción del pendiente" class="rounded border px-2 py-1">
            <input type="date" id="gpPendDate" class="rounded border px-2 py-1">
            <button type="button" id="addGrupoPendienteBtn" class="btn-secondary">Añadir Pendiente</button>
        </div>
    `,
    
    // --- HTML PARA BOTONES ADICIONALES ---
    extraButtons: `
        <div class="flex items-center gap-4">
             <input type="date" id="pdfDesde" class="rounded border px-2 py-1">
             <input type="date" id="pdfHasta" class="rounded border px-2 py-1">
             <button id="generatePdfBtn" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generar PDF</button>
        </div>
    `,

    // --- IDS DE CONTENEDORES DE LISTAS DINÁMICAS PARA LIMPIEZA ---
    dynamicListContainers: [
        'personasImplicadasContainer', 'expulsadosContainer', 'fletadosContainer', 
        'conduccionesPositivasContainer', 'conduccionesNegativasContainer', 'grupoPendientesList'
    ],

    // --- MAPEO DE DATOS: CLAVE DEL OBJETO DE DATOS -> ID DEL CAMPO O FUNCIÓN GETTER ---
    dataMap: {
        anio: 'anio',
        descripcionBreve: 'descripcionBreve',
        personasImplicadas: getPersonasImplicadas,
        expulsados: getExpulsados,
        fletados: getFletados,
        conduccionesPositivas: getConduccionesPositivas,
        conduccionesNegativas: getConduccionesNegativas,
        grupoPendientes: getGrupoPendientes
    },
    
    // --- FUNCIÓN PARA CONFIGURAR LISTENERS ESPECÍFICOS DE ESTA VISTA ---
    setupEventListeners: () => {
        document.getElementById('addPersonaImplicadaBtn').addEventListener('click', () => addPersonaImplicada());
        document.getElementById('addExpulsadoBtn').addEventListener('click', () => addExpulsado());
        document.getElementById('addFletadoBtn').addEventListener('click', () => addFletado());
        document.getElementById('addConduccionPositivaBtn').addEventListener('click', () => addConduccionPositiva());
        document.getElementById('addConduccionNegativaBtn').addEventListener('click', () => addConduccionNegativa());
        document.getElementById('addGrupoPendienteBtn').addEventListener('click', () => addGrupoPendiente());
        document.getElementById('generatePdfBtn').addEventListener('click', generateGroup1Pdf);
        
        const today = formatDate(new Date());
        document.getElementById('pdfDesde').value = today;
        document.getElementById('pdfHasta').value = today;
    },

    // --- FUNCIÓN PARA RELLENAR LISTAS AL CARGAR UN DOCUMENTO ---
    populateDynamicLists: (data) => {
        data.personasImplicadas?.forEach(addPersonaImplicada);
        data.expulsados?.forEach(addExpulsado);
        data.fletados?.forEach(addFletado);
        data.conduccionesPositivas?.forEach(addConduccionPositiva);
        data.conduccionesNegativas?.forEach(addConduccionNegativa);
        data.grupoPendientes?.forEach(addGrupoPendiente);
    }
});