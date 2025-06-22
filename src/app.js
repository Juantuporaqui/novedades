/*
 * src/app.js
 * ==========
 * Punto de entrada principal de la aplicación "Benito".
 * Ahora con manejo de errores de inicialización mejorado.
 */

import { authService } from './services/authService.js';
import { renderMainLayout, renderLoginView } from './views/layout.js';

/**
 * Función principal que inicializa toda la aplicación.
 */
const initializeApp = async () => {
    const appContainer = document.getElementById('app-container');

    if (!appContainer) {
        console.error('Error Crítico: El contenedor principal #app-container no fue encontrado en el DOM.');
        document.body.innerHTML = '<h2 style="color:red">Error: #app-container no encontrado.</h2>';
        return;
    }

    appContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Conectando con el servidor...</p>';

    try {
        // Forzamos la inicialización del servicio de autenticación.
        // Si las credenciales o la conexión fallan, esto lanzará un error.
        await authService.getUser();
        
        // Si llegamos aquí, la conexión inicial es exitosa.
        // Configuramos el listener para que reaccione a los cambios de estado (login/logout).
        authService.onAuthStateChange((user) => {
            if (user) {
                renderMainLayout(appContainer);
            } else {
                renderLoginView(appContainer);
            }
        });
    } catch (error) {
        console.error('Error fatal durante la inicialización:', error);
        appContainer.innerHTML = `
            <div class="auth-container" style="background-color: #fef2f2; border: 1px solid #fecaca;">
                <h2 style="color: #991b1b;">Error Crítico de Conexión</h2>
                <p style="color: #b91c1c;">No se pudo inicializar la aplicación. Esto suele deberse a un problema de red o a una configuración incorrecta de las credenciales de Supabase.</p>
                <p style="color: #7f1d1d; font-size: 0.8rem; margin-top: 1rem; text-align: left; background: #fee2e2; padding: 0.5rem; border-radius: 4px;">
                    <strong>Mensaje del error:</strong> ${error.message}
                </p>
                <p style="margin-top: 1rem; color: #4b5563;">Por favor, revisa la consola del navegador (F12) para más detalles.</p>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);
