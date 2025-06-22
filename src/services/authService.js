/*
 * src/services/authService.js
 * ===========================
 * Encapsula toda la lógica de autenticación de la aplicación.
 * Proporciona una capa de abstracción sobre el cliente de Supabase.
 */

import { supabase } from './supabaseClient.js';

export const authService = {
    /**
     * Obtiene la sesión actual del usuario.
     * @returns {Promise<object|null>} El objeto de usuario o null.
     */
    getUser: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user ?? null;
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
