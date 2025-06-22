/*
 * src/services/dataService.js
 * ===========================
 * Módulo para todas las operaciones de base de datos (CRUD).
 * Abstrae la comunicación con Supabase para los datos de la aplicación.
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

        const dataToInsert = {
            ...entryData, // Contiene los campos del formulario
            group_id: groupId,
            user_id: user.id,
        };

        // 'entries' es el nombre de nuestra tabla principal en Supabase.
        // Asegúrate de que esta tabla exista en tu proyecto de Supabase con las
        // columnas correspondientes a los campos del formulario, más 'group_id' y 'user_id'.
        const { data, error } = await supabase
            .from('entries')
            .insert([dataToInsert])
            .select(); // .select() devuelve el registro insertado

        return { data, error };
    },

    /**
     * Obtiene los registros para un grupo específico.
     * (Se implementará en un paso futuro)
     */
    getEntries: async (groupId) => {
        console.log(`Función getEntries para ${groupId} aún no implementada.`);
        return Promise.resolve({ data: [], error: null });
    }
};
