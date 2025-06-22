// views/groupForms/puertoView.js
// Propósito: Definir la configuración para el formulario del Puesto Fronterizo Marítimo.
// Exporta un objeto de configuración para el renderer de formularios.

export const getPuertoConfig = () => ({
    formFields: `
        <div class="mb-4">
            <label for="descripcionBreve">Resumen del día / Novedad principal</label>
            <textarea id="descripcionBreve" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
        <div class="mb-4">
            <label for="tipoControl">Tipo de control</label>
            <select id="tipoControl" class="w-full rounded border px-2 py-1">
                <option value="">--Seleccione--</option>
                <option>Control embarque</option>
                <option>Control desembarque</option>
                <option>Inspección buque</option>
                <option>Crucero</option>
                <option>Ferri entrada/salida</option>
                <option>Puerto deportivo</option>
                <option>Otras actuaciones</option>
            </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
                <label for="marinosArgos">Marinos en Argos</label>
                <input type="number" id="marinosArgos" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="controlPasaportesMarinos">Pasaportes marinos</label>
                <input type="number" id="controlPasaportesMarinos" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="cruceros">Cruceros</label>
                <input type="number" id="cruceros" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="cruceristas">Cruceristas</label>
                <input type="number" id="cruceristas" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="visadosValencia">Visados Valencia</label>
                <input type="number" id="visadosValencia" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="visadosCG">Visados CG</label>
                <input type="number" id="visadosCG" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="culminadosEISICS">Culminados EISICS</label>
                <input type="number" id="culminadosEISICS" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="ferriEntradas">Ferry entradas</label>
                <input type="number" id="ferriEntradas" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="ferriSalidas">Ferry salidas</label>
                <input type="number" id="ferriSalidas" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="ferriPasajeros">Ferry pasajeros</label>
                <input type="number" id="ferriPasajeros" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="ferriVehiculos">Ferry vehículos</label>
                <input type="number" id="ferriVehiculos" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="entradasExcepcionales">Entradas excepcionales</label>
                <input type="number" id="entradasExcepcionales" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="puertoDeportivo">Puerto deportivo</label>
                <input type="number" id="puertoDeportivo" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
            <div>
                <label for="denegaciones">Denegaciones</label>
                <input type="number" id="denegaciones" min="0" value="0" class="w-full rounded border px-2 py-1">
            </div>
        </div>
        <div class="mb-4">
            <label for="observacionesPuerto">Observaciones</label>
            <textarea id="observacionesPuerto" class="w-full rounded border px-2 py-1" rows="2"></textarea>
        </div>
    `,
    dataMap: {
        descripcionBreve: 'descripcionBreve',
        tipoControl: 'tipoControl',
        marinosArgos: 'marinosArgos',
        controlPasaportesMarinos: 'controlPasaportesMarinos',
        cruceros: 'cruceros',
        cruceristas: 'cruceristas',
        visadosValencia: 'visadosValencia',
        visadosCG: 'visadosCG',
        culminadosEISICS: 'culminadosEISICS',
        ferriEntradas: 'ferriEntradas',
        ferriSalidas: 'ferriSalidas',
        ferriPasajeros: 'ferriPasajeros',
        ferriVehiculos: 'ferriVehiculos',
        entradasExcepcionales: 'entradasExcepcionales',
        puertoDeportivo: 'puertoDeportivo',
        denegaciones: 'denegaciones',
        observaciones: 'observacionesPuerto',
    },
});