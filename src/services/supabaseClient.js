/*
 * src/services/supabaseClient.js
 * ==============================
 * Centraliza la inicialización del cliente de Supabase.
 *
 * Instrucciones:
 * 1. Ve a tu panel de control de Supabase.
 * 2. Ve a la configuración del proyecto (icono de engranaje).
 * 3. Selecciona "API".
 * 4. Copia la "URL del Proyecto" y la "Clave Pública (anon)" y pégalas abajo.
 *
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

const SUPABASE_URL = 'URL_DE_TU_PROYECTO_SUPABASE'; // <-- PEGA AQUÍ TU URL
const SUPABASE_ANON_KEY = 'CLAVE_ANON_DE_TU_PROYECTO_SUPABASE'; // <-- PEGA AQUÍ TU CLAVE ANON

// Se crea y exporta una única instancia del cliente de Supabase para toda la app.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
