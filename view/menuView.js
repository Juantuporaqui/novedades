// views/menuView.js
// Propósito: Renderizar el menú principal de la aplicación.
// Este módulo se encarga de generar y mostrar la pantalla de bienvenida con los botones
// de acceso a cada grupo funcional. También muestra el ID de usuario actual.

import { groups } from '../groups.js';
import { getUserId, navigateTo } from '../services/viewManager.js';
import { mainContent } from '../ui/common.js';

export const renderMenu = () => {
    const userId = getUserId();
    let html = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mx-auto p-4">`;

    for (const key in groups) {
        const g = groups[key];
        html += `
            <button data-group="${key}" class="group-btn p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div class="text-5xl">${g.icon}</div>
                <div class="font-semibold text-lg mt-2 text-gray-800">${g.name}</div>
                <div class="text-sm text-gray-500">${g.description}</div>
            </button>
        `;
    }
    html += `</div>
        <div class="text-center text-gray-500 text-sm mt-6">
            ID de Sesión: <span class="font-mono bg-gray-100 p-1 rounded">${userId || 'Cargando...'}</span>
        </div>
    `;

    mainContent().innerHTML = html;

    // Añadir event listeners a los botones de grupo
    document.querySelectorAll('.group-btn').forEach(btn =>
        btn.addEventListener('click', () => {
            const groupKey = btn.dataset.group;
            navigateTo(groupKey);
        })
    );
};