/*
 * src/app.js
 * ==========
 * Punto de entrada principal de la aplicación "Benito".
 *
 * Responsabilidades:
 * 1. Orquestar la inicialización de módulos clave (autenticación, router).
 * 2. Manejar el estado de autenticación del usuario para decidir qué vista mostrar.
 * 3. Renderizar el layout principal de la aplicación.
 *
 */

// Aún no hemos creado estos archivos, pero los importaremos para
// establecer la arquitectura modular desde el principio.
// import { router } from './router/router.js';
// import { authService } from './services/authService.js';
// import { renderMainLayout, renderLoginView } from './views/layout.js';

/**
 * Función principal que inicializa toda la aplicación.
 */
const initializeApp = async () => {
    const appContainer = document.getElementById('app-container');

    if (!appContainer) {
        console.error('Error Crítico: El contenedor principal #app-container no fue encontrado en el DOM.');
        return;
    }

    console.log('Benito App: Inicializando...');
    
    // Por ahora, como aún no tenemos el servicio de autenticación,
    // simularemos que el usuario está "logueado" para poder
    // empezar a construir la interfaz principal.

    // --- PASO 1: Renderizar el Layout Principal ---
    // En el futuro, la función renderMainLayout() creará el header,
    // el contenedor para el contenido principal y el footer.
    // Por ahora, pondremos un placeholder.
    appContainer.innerHTML = `
        <header style="background: #333; color: white; padding: 1rem; text-align: center;">
            <h1>Benito App</h1>
        </header>
        <main id="main-content" style="flex-grow: 1; padding: 1rem;">
            <p>Contenido principal se cargará aquí...</p>
        </main>
        <footer style="background: #333; color: white; padding: 1rem; text-align: center;">
            <p>© 2024</p>
        </footer>
    `;


    // --- PASO 2: Configurar el Router (se hará en un próximo paso) ---
    // router.init('#main-content');
    // console.log('Router inicializado.');


    // --- PASO 3: Verificar Autenticación (se hará en un próximo paso) ---
    // const user = await authService.getUser();
    // if (user) {
    //     router.navigate('/dashboard');
    // } else {
    //     renderLoginView(appContainer);
    // }
};

// Se añade un listener para asegurar que el script se ejecuta solo cuando
// el DOM está completamente cargado y listo.
document.addEventListener('DOMContentLoaded', initializeApp);
