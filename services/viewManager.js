// services/viewManager.js
// Propósito: Gestionar el estado de la aplicación y la navegación entre vistas.
// Este módulo actúa como el "router" de la aplicación. Mantiene el estado actual
// (vista, grupo, ID de documento), almacena el ID del usuario y la app, y contiene
// la función `MapsTo` que carga y renderiza la vista correspondiente
// (menú, formularios de grupo, estadísticas, etc.), importando dinámicamente el código necesario.

import { groups } from '../groups.js';
import { renderMenu } from '../views/menuView.js';
import { renderStatistics } from '../views/statisticsView.js';
import { renderSummary } from '../views/summaryView.js';
import { renderSpecificGroupForm } from '../views/groupForms/specificGroupViewRenderer.js';
import { renderGroup2and3Form } from '../views/groupForms/grupo2y3View.js';

// --- App State ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let state = {
    userId: null,
    currentView: 'menu',
    currentGroup: null,
    currentDocId: null,
};

// --- UI Elements helpers ---
const headerTitle = () => document.getElementById('header-title');
const backButton = () => document.getElementById('back-button');

// --- State Getters and Setters ---
export const getUserId = () => state.userId;
export const setUserId = (id) => { state.userId = id; };
export const getAppId = () => appId;
export const getCurrentGroup = () => state.currentGroup;
export const setCurrentGroup = (group) => { state.currentGroup = group; };
export const getCurrentDocId = () => state.currentDocId;
export const setCurrentDocId = (id) => { state.currentDocId = id; };

/**
 * Navega a una vista específica de la aplicación.
 * @param {string} viewOrGroupKey - La clave de la vista o grupo a mostrar (e.g., 'menu', 'grupo1').
 * @param {object} options - Opciones adicionales para la navegación.
 */
export const navigateTo = async (viewOrGroupKey) => {
    setCurrentGroup(viewOrGroupKey);
    setCurrentDocId(null); // Reset doc ID on navigation

    const backBtn = backButton();
    if (backBtn) {
        if (viewOrGroupKey === 'menu') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
            // Asegurarse de que el listener solo se añade una vez o se actualiza
            const newBackBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBackBtn, backBtn);
            newBackBtn.addEventListener('click', () => navigateTo('menu'));
        }
    }

    headerTitle().textContent = `UCRIF · ${groups[viewOrGroupKey]?.name || 'Menú Principal'}`;

    switch (viewOrGroupKey) {
        case 'menu':
            renderMenu();
            break;
        case 'estadistica':
            renderStatistics();
            break;
        case 'resumen':
            renderSummary();
            break;
        case 'grupo2':
        case 'grupo3':
            await renderGroup2and3Form(viewOrGroupKey);
            break;
        default:
            // Para todos los demás grupos que usan un formulario específico
            if (groups[viewOrGroupKey]) {
                await renderSpecificGroupForm(viewOrGroupKey);
            } else {
                console.error(`Vista o grupo no reconocido: ${viewOrGroupKey}`);
                navigateTo('menu'); // Fallback a menú
            }
            break;
    }
};