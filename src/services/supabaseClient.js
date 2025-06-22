/*
 * src/services/supabaseClient.js
 * ==============================
 * Centraliza la inicialización del cliente de Supabase.
 *
 * CORRECCIÓN: Se ha cambiado 'createclient' a 'createClient' para que
 * coincida con la exportación real de la librería de Supabase.
 *
 */

// Se importa 'createClient' con la 'C' mayúscula correcta.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

// ▼▼▼ CREDENCIALES CONFIGURADAS ▼▼▼
const SUPABASE_URL = 'https://djcillcgqdsfquvppaov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2lsbGNncWRzZnF1dnBwYW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODk5MjUsImV4cCI6MjA2NjE2NTkyNX0.LC_OiRtZcZ8x3AVziskAuB9WMfmUJxNS-hKgWZYLPhA';
// ▲▲▲ FIN DE LA SECCIÓN DE CREDENCIALES ▲▲▲


// Validación para asegurar que las credenciales han sido cambiadas.
if (SUPABASE_URL.includes('URL_DE_TU_PROYECTO') || SUPABASE_ANON_KEY.includes('CLAVE_ANON')) {
    const errorContainer = document.getElementById('app-container') || document.body;
    errorContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;">
            <h2>Configuración Requerida</h2>
            <p>Por favor, abre el archivo <strong>src/services/supabaseClient.js</strong> y reemplaza los valores de 'SUPABASE_URL' y 'SUPABASE_ANON_KEY' con las credenciales de tu proyecto de Supabase.</p>
        </div>
    `;
    throw new Error("Las credenciales de Supabase no han sido configuradas.");
}

// Se crea y exporta una única instancia del cliente de Supabase para toda la app.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
