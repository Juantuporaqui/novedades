/*
 * src/router/router.js
 * ====================
 * Un router simple basado en hash para nuestra SPA.
 * Maneja la navegación sin recargar la página.
 */
export const router = {
    routes: {},
    container: null,

    /**
     * Inicializa el router.
     * @param {string} containerSelector - El selector CSS para el contenedor de contenido principal.
     */
    init(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`Router Error: El contenedor '${containerSelector}' no fue encontrado.`);
            return;
        }
        // Escucha cambios en el hash de la URL
        window.addEventListener('hashchange', () => this._resolveRoute());
        // Resuelve la ruta inicial cuando la página carga
        this._resolveRoute();
    },

    /**
     * Añade una nueva ruta al router.
     * @param {string} path - La ruta (ej. '/' o '/group/:id').
     * @param {Function} handler - La función a llamar para renderizar la vista.
     */
    addRoute(path, handler) {
        this.routes[path] = handler;
    },

    /**
     * Navega a una nueva ruta programáticamente.
     * @param {string} path - La ruta a la que navegar (ej. '#/group/grupo1').
     */
    navigate(path) {
        window.location.hash = path;
    },

    /**
     * Resuelve la ruta actual, encuentra el handler y lo ejecuta.
     * Este es un método "privado" interno del router.
     */
    _resolveRoute() {
        const path = window.location.hash.slice(1) || '/'; // Elimina el '#' y usa '/' por defecto

        // Lógica para manejar rutas dinámicas como /group/:id
        for (const routePath in this.routes) {
            const routeParts = routePath.split('/');
            const pathParts = path.split('/');

            if (routeParts.length === pathParts.length) {
                const params = {};
                const isMatch = routeParts.every((part, i) => {
                    if (part.startsWith(':')) {
                        params[part.slice(1)] = pathParts[i]; // Extrae el parámetro
                        return true;
                    }
                    return part === pathParts[i];
                });

                if (isMatch) {
                    // Si hay coincidencia, llama al handler con los parámetros
                    this.routes[routePath](this.container, params);
                    return;
                }
            }
        }
        
        // Manejo de rutas estáticas y la ruta por defecto
        const handler = this.routes[path] || this.routes['/'];
        if (handler) {
            handler(this.container);
        } else {
            this.container.innerHTML = '<h2>404 - Página no encontrada</h2>';
            console.warn(`No se encontró una ruta para: ${path}`);
        }
    }
};
