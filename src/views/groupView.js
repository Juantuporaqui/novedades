/*
 * src/views/groupView.js
 * ======================
 * Renderiza la vista detallada para un grupo de trabajo específico.
 * Aquí es donde irán los formularios de entrada de datos.
 */

import { groups } from '../config/groups.js';
import { router } from '../router/router.js';

// Estilos para la vista de grupo.
const addGroupViewStyles = () => {
    const styleId = 'group-view-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Renderiza la vista del grupo en el contenedor especificado.
 * @param {HTMLElement} container - El elemento donde se renderizará la vista.
 * @param {object} params - Los parámetros de la ruta (ej. { id: 'grupo1' }).
 */
export const renderGroupView = (container, params) => {
    addGroupViewStyles();

    const groupId = params.id;
    const group = groups[groupId];

    if (!group) {
        container.innerHTML = '<h2>Error: Grupo no encontrado</h2>';
        return;
    }

    container.innerHTML = `
        <div class="group-header">
            <h2>Módulo: ${group.name}</h2>
            <button id="back-to-dashboard" class="btn btn-secondary" style="background-color: var(--color-secondary);">← Volver al Panel</button>
        </div>
        <div class="card" style="background-color: var(--color-surface); padding: 1.5rem; border-radius: var(--border-radius-medium); box-shadow: var(--box-shadow-medium);">
            <p>El formulario de entrada de datos y el listado para <strong>${group.name}</strong> se implementarán aquí.</p>
            <p style="color: var(--color-text-secondary); margin-top: 1rem;">${group.description}</p>
        </div>
    `;

    // Lógica del botón de volver
    container.querySelector('#back-to-dashboard').addEventListener('click', () => {
        router.navigate('/');
    });
};
