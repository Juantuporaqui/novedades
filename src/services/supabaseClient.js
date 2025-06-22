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

// ▼▼▼ CREDENCIALES CONFIGURADAS ▼▼▼
const SUPABASE_URL = 'https://djcillcgqdsfquvppaov.supabase.co'; // <-- URL extraída de tu clave
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2lsbGNncWRzZnF1dnBwYW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODk5MjUsImV4cCI6MjA2NjE2NTkyNX0.LC_OiRtZcZ8x3AVziskAuB9WMfmUJxNS-hKgWZYLPhA'; // <-- Tu clave pública
// ▲▲▲ FIN DE LA SECCIÓN DE CREDENCIALES ▲▲▲


// Validación para asegurar que las credenciales han sido cambiadas.
if (SUPABASE_URL === 'URL_DE_TU_PROYECTO_SUPABASE' || SUPABASE_ANON_KEY === 'CLAVE_ANON_DE_TU_PROYECTO_SUPABASE') {
    // No uses alert en producción real, esto es una ayuda para el desarrollo.
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
