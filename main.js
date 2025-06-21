// main.js
// Propósito: Punto de entrada principal de la aplicación.
// Este archivo inicializa la conexión con Firebase, gestiona el estado de autenticación
// del usuario y, una vez autenticado, delega el control al gestor de vistas (viewManager)
// para renderizar la interfaz de usuario inicial (el menú).

import { initFirebase, auth } from './firebase.js';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { setUserId, getUserId, navigateTo } from './services/viewManager.js';
import { mainContent } from './ui/common.js';

/**
 * Muestra un error crítico de autenticación en la pantalla.
 * @param {Error} error - El objeto de error.
 */
const showAuthError = (error) => {
    mainContent().innerHTML = `
        <div class="text-center text-red-500 p-8">
            <h2 class="text-xl font-bold">Error de Autenticación</h2>
            <p>${error.message}</p>
            <p>Por favor, recarga la página o contacta con el administrador.</p>
        </div>`;
};

/**
 * Función de inicialización de la aplicación.
 * Se ejecuta cuando el DOM está completamente cargado.
 */
const init = () => {
    try {
        initFirebase(); // Inicializa la configuración de Firebase desde firebase.js

        // Escucha los cambios en el estado de autenticación.
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Si el usuario ya está autenticado, guardamos su ID.
                setUserId(user.uid);
                // Navegamos a la vista de menú principal.
                navigateTo('menu');
            } else {
                // Si no hay usuario, intentamos un inicio de sesión.
                try {
                    // Si se proporciona un token de autenticación inicial, úsalo.
                    if (typeof __initial_auth_token !== 'undefined') {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        // De lo contrario, inicia sesión de forma anónima.
                        await signInAnonymously(auth);
                    }
                    // El listener onAuthStateChanged se disparará de nuevo y gestionará la navegación.
                } catch (e) {
                    console.error("Error en el inicio de sesión (anónimo o token):", e);
                    showAuthError(e);
                }
            }
        });
    } catch (e) {
        console.error("Error crítico durante la inicialización:", e);
        mainContent().innerHTML = `<div class="text-center text-red-500 p-8">Error al iniciar la aplicación: ${e.message}</div>`;
    }
};

// Event Listener para iniciar la app cuando el contenido del DOM se haya cargado.
document.addEventListener('DOMContentLoaded', init);