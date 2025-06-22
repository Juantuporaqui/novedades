/*
 * src/views/layout.js
 * ===================
 * Contiene las funciones que renderizan las partes principales de la UI:
 * la vista de login y el layout principal de la aplicación.
 */

import { authService } from '../services/authService.js';

// Estilos para los componentes que vamos a crear.
// Inyectamos los estilos directamente para no tener que modificar el CSS por ahora.
const addLoginStyles = () => {
    const styleId = 'login-styles';
    if (document.getElementById(styleId)) return; // No añadir estilos si ya existen

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .auth-container {
            max-width: 420px;
            margin: 5rem auto;
            padding: 2.5rem;
            background-color: var(--color-surface);
            border-radius: var(--border-radius-medium);
            box-shadow: var(--box-shadow-medium);
            text-align: center;
        }
        .auth-container h2 {
            margin-bottom: 1.5rem;
            color: var(--color-text-primary);
        }
        .form-group {
            margin-bottom: 1.25rem;
            text-align: left;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--color-text-secondary);
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius-small);
            font-size: 1rem;
        }
        .form-group input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        #auth-error {
            color: var(--color-danger);
            background-color: rgba(220, 38, 38, 0.1);
            padding: 0.75rem;
            border-radius: var(--border-radius-small);
            margin-bottom: 1rem;
            display: none; /* Oculto por defecto */
        }
        #toggle-auth-mode {
            background: none;
            border: none;
            color: var(--color-primary);
            cursor: pointer;
            text-decoration: underline;
            margin-top: 1rem;
        }
    `;
    document.head.appendChild(style);
};


/**
 * Renderiza la vista de inicio de sesión en el contenedor de la app.
 * @param {HTMLElement} container - El elemento donde se renderizará la vista.
 */
export const renderLoginView = (container) => {
    addLoginStyles();

    container.innerHTML = `
        <div class="auth-container">
            <h2 id="auth-title">Iniciar Sesión</h2>
            <form id="auth-form" novalidate>
                <div id="auth-error"></div>
                <div class="form-group">
                    <label for="email">Correo Electrónico</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <input type="password" id="password" name="password" required minlength="6">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">${'Iniciar Sesión'}</button>
            </form>
            <button id="toggle-auth-mode" data-mode="login">¿No tienes cuenta? Regístrate</button>
        </div>
    `;

    // --- Lógica del formulario ---
    const form = container.querySelector('#auth-form');
    const emailInput = container.querySelector('#email');
    const passwordInput = container.querySelector('#password');
    const errorDiv = container.querySelector('#auth-error');
    const toggleButton = container.querySelector('#toggle-auth-mode');
    const submitButton = form.querySelector('button[type="submit"]');
    const authTitle = container.querySelector('#auth-title');

    const showError = (message) => {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Cambiar entre modo Login y Registro
    toggleButton.addEventListener('click', () => {
        const currentMode = toggleButton.dataset.mode;
        if (currentMode === 'login') {
            toggleButton.dataset.mode = 'register';
            authTitle.textContent = 'Crear Cuenta';
            submitButton.textContent = 'Registrarse';
            toggleButton.textContent = '¿Ya tienes cuenta? Inicia sesión';
        } else {
            toggleButton.dataset.mode = 'login';
            authTitle.textContent = 'Iniciar Sesión';
            submitButton.textContent = 'Iniciar Sesión';
            toggleButton.textContent = '¿No tienes cuenta? Regístrate';
        }
        errorDiv.style.display = 'none';
        form.reset();
    });

    // Manejar el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        const email = emailInput.value;
        const password = passwordInput.value;
        const isLoginMode = toggleButton.dataset.mode === 'login';

        if (!email || password.length < 6) {
            showError('Por favor, introduce un email válido y una contraseña de al menos 6 caracteres.');
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';

        try {
            let result;
            if (isLoginMode) {
                result = await authService.login(email, password);
            } else {
                result = await authService.signUp(email, password);
            }

            if (result.error) {
                showError(result.error.message);
            }
            // Si tiene éxito, el onAuthStateChange en app.js se encargará de re-renderizar.
        } catch (err) {
            showError('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = isLoginMode ? 'Iniciar Sesión' : 'Registrarse';
        }
    });
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
            <button id="logout-btn" class="btn" style="background-color: var(--color-danger); position: absolute; top: 1rem; right: 1rem;">Cerrar Sesión</button>
        </header>
        <main id="main-content" style="flex-grow: 1; padding: 2rem; background: var(--color-surface); box-shadow: var(--box-shadow-medium);">
            <p>Dashboard principal y contenido de la app irá aquí...</p>
        </main>
        <footer style="background: var(--color-text-primary); color: white; padding: 1rem; text-align: center; border-radius: 0 0 var(--border-radius-medium) var(--border-radius-medium);">
            <p>© 2024 - Benito App</p>
        </footer>
    `;
    
    // Añadir lógica al botón de cerrar sesión
    const logoutButton = container.querySelector('#logout-btn');
    logoutButton.addEventListener('click', async () => {
        await authService.logout();
        // El onAuthStateChange se encargará de re-renderizar la vista de login.
    });
};
