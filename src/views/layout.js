/*
 * src/views/layout.js
 * ===================
 * Contiene las funciones que renderizan las partes principales de la UI:
 * la vista de login y el layout principal de la aplicación.
 */

/**
 * Renderiza la vista de inicio de sesión en el contenedor de la app.
 * @param {HTMLElement} container - El elemento donde se renderizará la vista.
 */
export const renderLoginView = (container) => {
    // Por ahora, solo un placeholder. Lo construiremos en el siguiente paso.
    container.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
            <h2>Iniciar Sesión</h2>
            <p>El formulario de inicio de sesión irá aquí.</p>
        </div>
    `;
};

/**
 * Renderiza el layout principal de la aplicación (header, main, footer).
 * @param {HTMLElement} container - El elemento donde se renderizará el layout.
 */
export const renderMainLayout = (container) => {
    // Este layout contiene la estructura para un usuario autenticado.
    container.innerHTML = `
        <header style="background: var(--color-primary); color: white; padding: 1rem; text-align: center; border-radius: var(--border-radius-medium) var(--border-radius-medium) 0 0;">
            <h1>Benito</h1>
        </header>
        <main id="main-content" style="flex-grow: 1; padding: 2rem; background: var(--color-surface); box-shadow: var(--box-shadow-medium);">
            <p>Dashboard principal y contenido de la app irá aquí...</p>
        </main>
        <footer style="background: var(--color-text-primary); color: white; padding: 1rem; text-align: center; border-radius: 0 0 var(--border-radius-medium) var(--border-radius-medium);">
            <p>© 2024 - Benito App</p>
        </footer>
    `;
    // Aquí inicializaríamos el router en el futuro.
    // router.init('#main-content');
};
