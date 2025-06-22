/*
 * src/views/groupView.js
 * ======================
 * Renderiza la vista detallada para un grupo de trabajo específico.
 * Corregido para leer los datos desde la columna 'data' de tipo JSONB.
 */

import { groups } from '../config/groups.js';
import { router } from '../router/router.js';
import { dataService } from '../services/dataService.js';
import { showToast } from '../utils/notifications.js';

// --- CONFIGURACIÓN DE FORMULARIOS ---
const formConfigs = {
    grupo1: [
        { id: 'fecha_expediente', label: 'Fecha de Expediente', type: 'date', required: true },
        { id: 'num_expediente', label: 'Número de Expediente', type: 'text', required: true, placeholder: 'Ej: 24/2024' },
        { id: 'pais', label: 'País de Origen', type: 'text', required: true, placeholder: 'Ej: Marruecos' }
    ],
    grupo2: [
        { id: 'nombre_operacion', label: 'Nombre de la Operación', type: 'text', required: true },
        { id: 'fecha_inicio', label: 'Fecha de Inicio', type: 'date', required: true },
        { id: 'juzgado', label: 'Juzgado a cargo', type: 'text', placeholder: 'Ej: Instrucción Nº 3' }
    ],
    default: [
        { id: 'fecha', label: 'Fecha', type: 'date', required: true },
        { id: 'titulo', label: 'Título', type: 'text', required: true },
        { id: 'descripcion', label: 'Descripción', type: 'textarea', rows: 4, required: true }
    ]
};

// --- ESTILOS ---
const addGroupViewStyles = () => {
    const styleId = 'group-view-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        @media (min-width: 768px) { .form-grid { grid-template-columns: repeat(2, 1fr); } }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { margin-bottom: 0.5rem; font-weight: 500; color: var(--color-text-secondary); }
        .form-group input, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: var(--border-radius-small); font-size: 1rem; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
        .form-actions { margin-top: 2rem; text-align: right; }
        .entries-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 0.9rem; }
        .entries-table th, .entries-table td { border: 1px solid var(--color-border); padding: 0.75rem; text-align: left; vertical-align: top; word-break: break-word; }
        .entries-table th { background-color: var(--color-background); font-weight: 500; }
        .entries-table tbody tr:nth-child(even) { background-color: var(--color-background); }
    `;
    document.head.appendChild(style);
};

// --- CONSTRUCTORES DE HTML ---
const buildFormHtml = (fieldsConfig) => {
    const fieldsHtml = fieldsConfig.map(field => {
        const isTextarea = field.type === 'textarea';
        const fullWidthClass = isTextarea ? 'full-width' : '';
        const inputHtml = isTextarea
            ? `<textarea id="${field.id}" name="${field.id}" rows="${field.rows || 3}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"></textarea>`
            : `<input type="${field.type}" id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">`;

        return `
            <div class="form-group ${fullWidthClass}">
                <label for="${field.id}">${field.label}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');

    return `
        <form id="data-entry-form" class="form-grid" novalidate>
            ${fieldsHtml}
            <div class="form-actions full-width">
                <button type="submit" class="btn btn-primary">Guardar Registro</button>
            </div>
        </form>
    `;
};

const buildEntriesListHtml = (entries, fieldsConfig) => {
    if (!entries || entries.length === 0) {
        return '<p>No hay registros para este grupo todavía.</p>';
    }

    const headers = fieldsConfig.map(field => `<th>${field.label}</th>`).join('');

    const rows = entries.map(entry => {
        const cells = fieldsConfig.map(field => {
            // **CORRECCIÓN**: Acceder a los datos desde el campo 'data' (JSONB).
            const value = entry.data ? (entry.data[field.id] || '---') : '---';
            let displayValue = value;
            if (field.type === 'date' && value !== '---') {
                displayValue = new Date(value).toLocaleDateString('es-ES', { timeZone: 'UTC' });
            }
            const tempDiv = document.createElement('div');
            tempDiv.textContent = displayValue;
            return `<td>${tempDiv.innerHTML}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
        <div style="overflow-x: auto;">
            <table class="entries-table">
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
};

// --- FUNCIÓN PRINCIPAL DE RENDERIZADO ---
export const renderGroupView = async (container, params) => {
    addGroupViewStyles();
    const groupId = params.id;
    const group = groups[groupId];

    if (!group) {
        container.innerHTML = '<h2>Error: Grupo no encontrado</h2>';
        return;
    }

    const formConfig = formConfigs[groupId] || formConfigs.default;
    const formHtml = buildFormHtml(formConfig);

    container.innerHTML = `
        <div class="group-header">
            <h2>Módulo: ${group.name}</h2>
            <button id="back-to-dashboard" class="btn" style="background-color: var(--color-secondary);">← Volver al Panel</button>
        </div>
        <div class="card" style="background-color: var(--color-surface); padding: 1.5rem; border-radius: var(--border-radius-medium); box-shadow: var(--box-shadow-medium);">
            <h3>Nuevo Registro para ${group.name}</h3>
            <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">${group.description}</p>
            ${formHtml}
        </div>
        <div class="card" style="margin-top: 2rem;">
            <h3>Registros Guardados</h3>
            <div id="entries-list-container">
                <p>Cargando registros...</p>
            </div>
        </div>
    `;

    // --- LÓGICA ---
    const form = container.querySelector('#data-entry-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const listContainer = container.querySelector('#entries-list-container');

    const loadEntries = async () => {
        if (!listContainer) return;
        listContainer.innerHTML = '<p>Cargando registros...</p>';
        try {
            const { data: entries, error } = await dataService.getEntries(groupId);
            if (error) throw error;
            listContainer.innerHTML = buildEntriesListHtml(entries, formConfig);
        } catch (error) {
            console.error('Error al cargar los registros:', error);
            listContainer.innerHTML = `<p style="color: var(--color-danger);">Error al cargar los registros: ${error.message}</p>`;
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const entryData = Object.fromEntries(formData.entries());
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        try {
            const { error } = await dataService.saveEntry(groupId, entryData);
            if (error) throw error;
            showToast('Registro guardado con éxito', 'success');
            form.reset();
            await loadEntries();
        } catch (error) {
            console.error('Error al guardar el registro:', error);
            showToast(`Error: ${error.message || 'Error desconocido'}`, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Registro';
        }
    });

    container.querySelector('#back-to-dashboard').addEventListener('click', () => {
        router.navigate('/');
    });

    await loadEntries();
};
