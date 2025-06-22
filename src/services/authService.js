/*
 * src/services/authService.js
 * ===========================
 * Encapsula toda la lógica de autenticación de la aplicación.
 * Ahora propaga los errores de conexión para ser manejados por la UI.
 */

import { supabase } from './supabaseClient.js';

export const authService = {
    /**
     * Obtiene la sesión actual del usuario.
     * @returns {Promise<object|null>} El objeto de usuario o null.
     */
    getUser: async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                // Si Supabase devuelve un error (ej. red caída), lo lanzamos.
                throw error;
            }
            return data.session?.user ?? null;
        } catch (e) {
            // Si ocurre cualquier otra excepción (ej. mala configuración del cliente)
            console.error("Excepción en authService.getUser:", e);
            throw new Error(`No se pudo comunicar con el servicio de autenticación. Verifica la conexión y la configuración. (${e.message})`);
        }
    },

    /**
     * Inicia sesión de un usuario con email y contraseña.
     * @param {string} email - El email del usuario.
     * @param {string} password - La contraseña del usuario.
     * @returns {Promise<{user: object, error: object}>}
     */
    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { user: data.user, error };
    },

    /**
     * Cierra la sesión del usuario actual.
     * @returns {Promise<{error: object}>}
     */
    logout: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Registra a un nuevo usuario.
     * @param {string} email - El email del nuevo usuario.
     * @param {string} password - La contraseña del nuevo usuario.
     * @returns {Promise<{user: object, error: object}>}
     */
    signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { user: data.user, error };
    },

    /**
     * Permite suscribirse a los cambios en el estado de autenticación.
     * @param {function} callback - La función a ejecutar cuando el estado cambia.
     * @returns {object} El objeto de suscripción que se puede usar para desuscribirse.
     */
    onAuthStateChange: (callback) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChanged((event, session) => {
            const user = session?.user ?? null;
            callback(user);
        });
        return subscription;
    }
};
