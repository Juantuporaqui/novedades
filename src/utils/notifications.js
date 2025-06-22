/*
 * src/utils/notifications.js
 * ==========================
 * Gestiona las notificaciones de la interfaz de usuario, como los "toasts".
 */

/**
 * Muestra una notificación temporal (toast).
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - 'success' (por defecto) o 'error'.
 */
export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast-notification');
    if (!toast) {
        console.error('El elemento #toast-notification no se encuentra en el DOM.');
        return;
    }

    toast.textContent = message;
    // Resetea las clases de tipo y añade la actual
    toast.classList.remove('success', 'error');
    toast.classList.add(type);

    // Muestra el toast
    toast.classList.add('show');

    // Lo oculta después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};
