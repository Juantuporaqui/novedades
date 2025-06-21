// ui/common.js
// Propósito: Contener funciones de ayuda reutilizables para la interfaz de usuario (UI).
// Este módulo exporta helpers para crear y gestionar elementos comunes de la UI, como
// las listas dinámicas genéricas (añadir/obtener ítems) y las listas básicas.
// También exporta referencias a elementos DOM comunes para evitar repetición de código.

import { removeDynamicItem } from '../utils.js';

// --- UI Elements helpers ---
export const mainContent = () => document.getElementById('main-content');

// Hacemos accesible globalmente la función `removeDynamicItem` desde utils.js,
// ya que es llamada por HTML generado dinámicamente.
window.removeDynamicItem = removeDynamicItem;

/**
 * Añade un ítem a una lista dinámica en el DOM.
 * @param {HTMLElement} container - El elemento contenedor donde se añadirá el ítem.
 * @param {Array<object>} fields - Array de configuración para los campos del ítem.
 * @param {object} data - Datos iniciales para rellenar los campos.
 */
export const addDynamicItem = (container, fields, data = {}) => {
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'dynamic-list-item';
    let innerHTML = '';

    fields.forEach(field => {
        const value = data[field.valueField] ?? '';
        let inputElement;

        switch (field.type) {
            case 'textarea':
                inputElement = `<textarea rows="${field.rows || 2}" class="${field.idPrefix}-item">${value}</textarea>`;
                break;
            case 'select':
                inputElement = `<select class="${field.idPrefix}-item">` +
                    field.options.map(o => `<option value="${o}"${value === o ? ' selected' : ''}>${o}</option>`).join('') +
                    `</select>`;
                break;
            default: // text, date, number, etc.
                inputElement = `<input type="${field.type || 'text'}" class="${field.idPrefix}-item" value="${value}">`;
                break;
        }
        innerHTML += `<div><label>${field.label}:</label>${inputElement}</div>`;
    });

    div.innerHTML = innerHTML + `<button type="button" onclick="removeDynamicItem(this)">Eliminar</button>`;
    container.appendChild(div);
};

/**
 * Recoge los datos de todos los ítems de una lista dinámica.
 * @param {HTMLElement} container - El elemento contenedor de la lista.
 * @param {Array<object>} fields - Array de configuración de los campos a leer.
 * @returns {Array<object>} - Un array de objetos, cada uno representando un ítem.
 */
export const getDynamicItems = (container, fields) => {
    if (!container) return [];
    const items = [];
    container.querySelectorAll('.dynamic-list-item').forEach(div => {
        const itemObject = {};
        let isFilled = false;
        fields.forEach(field => {
            const element = div.querySelector(`.${field.idPrefix}-item`);
            if (element) {
                const value = element.value.trim();
                itemObject[field.valueField] = value;
                if (value) {
                    isFilled = true;
                }
            }
        });
        if (isFilled) {
            items.push(itemObject);
        }
    });
    return items;
};

/**
 * Añade un ítem a una lista básica (ul/ol).
 * @param {string} listId - ID del elemento <ul> u <ol>.
 * @param {string} description - Texto del ítem.
 * @param {string} date - Fecha opcional a mostrar.
 */
export const addBasicListItem = (listId, description, date) => {
    const list = document.getElementById(listId);
    if (!list || !description) return;

    const li = document.createElement('li');
    li.dataset.descripcion = description;
    li.dataset.fecha = date || '';
    li.className = 'flex justify-between items-center';
    li.innerHTML = `
        <span>${description}${date ? ` (Vence: ${date})` : ''}</span>
        <button type="button" class="ml-2 text-xs text-red-500">Eliminar</button>`;

    li.querySelector('button').addEventListener('click', () => li.remove());
    list.appendChild(li);
};

/**
 * Recoge los datos de una lista básica (ul/ol).
 * @param {string} listId - ID del elemento <ul> u <ol>.
 * @returns {Array<object>} - Un array de objetos con { descripcion, fechaLimite }.
 */
export const getBasicListItems = (listId) => {
    const list = document.getElementById(listId);
    if (!list) return [];
    return Array.from(list.children).map(li => ({
        descripcion: li.dataset.descripcion || '',
        fechaLimite: li.dataset.fecha || ''
    }));
};

/**
 * Crea una sección plegable (collapsible).
 * @param {string} id - ID para la sección.
 * @param {string} title - Título de la sección.
 * @param {string} content - Contenido HTML de la sección.
 * @returns {string} - El HTML de la sección plegable.
 */
export const renderCollapsibleSection = (id, title, content) => `
    <details id="details-${id}" class="bg-white border-blue-300 border rounded shadow mb-4">
        <summary class="p-4 font-semibold cursor-pointer flex justify-between items-center">
            <span>${title}</span>
            <svg class="w-5 h-5 transform details-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </summary>
        <div class="p-4 border-t border-gray-200">
            ${content}
        </div>
    </details>
`;