/*
 * src/services/dataService.js
 * ===========================
 * Módulo para todas las operaciones de base de datos (CRUD).
 * Corregido para usar la columna 'data' de tipo JSONB.
 */

import { supabase } from './supabaseClient.js';
import { authService } from './authService.js';

export const dataService = {
    /**
     * Guarda un nuevo registro en la base de datos.
     * @param {string} groupId - El ID del grupo al que pertenece el registro.
     * @param {object} entryData - El objeto con los datos del formulario.
     * @returns {Promise<{data: object, error: object}>}
     */
    saveEntry: async (groupId, entryData) => {
        const user = await authService.getUser();
        if (!user) {
            return { data: null, error: { message: 'Usuario no autenticado. No se puede guardar.' } };
        }

        // Estructura de datos correcta para la tabla 'entries'.
        // Todos los datos del formulario se anidan dentro de la columna 'data'.
        const dataToInsert = {
            group_id: groupId,
            user_id: user.id,
            data: entryData, 
        };

        const { data, error } = await supabase
            .from('entries')
            .insert([dataToInsert])
            .select(); // .select() devuelve el registro insertado

        return { data, error };
    },

    /**
     * Obtiene los registros para un grupo específico, ordenados por fecha de creación.
     * @param {string} groupId - El ID del grupo.
     * @returns {Promise<{data: Array, error: object}>}
     */
    getEntries: async (groupId) => {
        const user = await authService.getUser();
        if (!user) {
            return { data: [], error: { message: 'Usuario no autenticado.' } };
        }

        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        return { data, error };
    }
};
