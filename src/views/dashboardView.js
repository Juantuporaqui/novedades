/*
 * src/views/dashboardView.js
 * ==========================
 * Renderiza el panel principal de la aplicación, que consiste en un
 * menú de selección de grupos de trabajo.
 */

import { groups } from '../config/groups.js';

// Estilos para el dashboard.
const addDashboardStyles = () => {
    const styleId = 'dashboard-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        .group-card {
            background-color: var(--color-surface);
            border-radius: var(--border-radius-medium);
            padding: 1.5rem;
            text-align: center;
            border: 1px solid var(--color-border);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
        }
        .group-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--box-shadow-medium);
        }
        .group-card-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .group-card h3 {
            color: var(--color-primary);
            margin-bottom: 0.5rem;
        }
        .group-card p {
            color: var(--color-text-secondary);
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Renderiza la vista del dashboard en el contenedor especificado.
 * @param {HTMLElement} container - El elemento donde se renderizará el dashboard.
 */
export const renderDashboardView = (container) => {
    addDashboardStyles();

    let cardsHtml = '';
    for (const key in groups) {
        const group = groups[key];
        cardsHtml += `
            <div class="group-card" data-group-id="${group.id}">
                <div class="group-card-icon">${group.icon}</div>
                <h3>${group.name}</h3>
                <p>${group.description}</p>
            </div>
        `;
    }

    container.innerHTML = `
        <h2 style="margin-bottom: 2rem; color: var(--color-text-primary);">Seleccionar Módulo</h2>
        <div class="dashboard-grid">
            ${cardsHtml}
        </div>
    `;

    // Lógica para manejar el click en las tarjetas (se implementará con el router)
    container.querySelector('.dashboard-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.group-card');
        if (card) {
            const groupId = card.dataset.groupId;
            // En el futuro, esto cambiará la ruta: router.navigate(\`#/group/${groupId}\`);
            alert(`Has seleccionado: ${groups[groupId].name}. La navegación completa se implementará en el siguiente paso.`);
        }
    });
};
