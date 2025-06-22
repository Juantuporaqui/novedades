// views/groupForms/cecorexView.js
// Propósito: Definir la configuración para el formulario de Cecorex.
// Exporta un objeto de configuración para el renderer de formularios.

export const getCecorexConfig = () => ({
    formFields: `
        <div class="mb-4">
            <label for="descripcionBreve">Resumen del día / Novedad principal</label>
            <textarea id="descripcionBreve" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
        <div class="mb-4">
            <label for="turno">Turno</label>
            <select id="turno" class="w-full rounded border px-2 py-1">
                <option value="">--Seleccione--</option>
                <option>Mañana</option>
                <option>Tarde</option>
                <option>Noche</option>
                <option>Día completo</option>
            </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
                <label for="incoacciones">Incoacciones</label>
                <input type="number" id="incoacciones" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="consultasTelefonicas">Consultas telefónicas</label>
                <input type="number" id="consultasTelefonicas" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="consultasEquipo">Consultas equipo</label>
                <input type="number" id="consultasEquipo" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="diligenciasInforme">Diligencias informe</label>
                <input type="number" id="diligenciasInforme" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="menas">MENAs</label>
                <input type="number" id="menas" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label for="ciesConcedidos">CIEs concedidos (por nacionalidad)</label>
                <input type="text" id="ciesConcedidos" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="ciesDenegados">CIEs denegados (por nacionalidad)</label>
                <input type="text" id="ciesDenegados" class="w-full rounded border px-2 py-1">
            </div>
        </div>
        <div class="mb-4">
            <label for="observacionesCecorex">Observaciones / Incidencias</label>
            <textarea id="observacionesCecorex" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
    `,
    dataMap: {
        descripcionBreve: 'descripcionBreve',
        turno: 'turno',
        incoacciones: 'incoacciones',
        consultasTelefonicas: 'consultasTelefonicas',
        consultasEquipo: 'consultasEquipo',
        diligenciasInforme: 'diligenciasInforme',
        ciesConcedidos: 'ciesConcedidos',
        ciesDenegados: 'ciesDenegados',
        menas: 'menas',
        observaciones: 'observacionesCecorex',
    },
});