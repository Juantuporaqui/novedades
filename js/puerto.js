// --- UTILIDAD ---
function showToast(msg) { alert(msg); }

// --- REFERENCIAS ---
const form = document.getElementById('formPuerto');
const panelResumen = document.getElementById('panelResumenPuerto');
const resumenDiv = document.getElementById('resumenPuerto');
const btnPDF = document.getElementById('btnPDF');

form.addEventListener('submit', function(e){
  e.preventDefault();
  const datos = {
    fecha: form.fechaPuerto.value,
    tipoControl: form.tipoControl.value,
    marinosArgos: parseInt(form.marinosArgos.value)||0,
    controlPasaportes: parseInt(form.controlPasaportes.value)||0,
    cruceros: parseInt(form.cruceros.value)||0,
    cruceristas: parseInt(form.cruceristas.value)||0,
    visadosValencia: parseInt(form.visadosValencia.value)||0,
    visadosCG: parseInt(form.visadosCG.value)||0,
    ferryEntradas: parseInt(form.ferryEntradas.value)||0,
    ferrySalidas: parseInt(form.ferrySalidas.value)||0,
    ferryVehiculos: parseInt(form.ferryVehiculos.value)||0,
    ferryPasajeros: parseInt(form.ferryPasajeros.value)||0,
    ferryCulminados: parseInt(form.ferryCulminados.value)||0,
    ferryExcepcionales: parseInt(form.ferryExcepcionales.value)||0,
    denegaciones: parseInt(form.denegaciones.value)||0,
    puertoDeportivo: parseInt(form.puertoDeportivo.value)||0,
    observaciones: form.observaciones.value.trim(),
    tareaPendiente: form.tareaPendiente.value,
    adjuntos: [...form.adjuntos.files].map(f=>f.name)
  };
  // Guarda en localStorage (fácil de pasar a Firebase)
  let registros = JSON.parse(localStorage.getItem('puertoRegistros')) || [];
  registros.push(datos);
  localStorage.setItem('puertoRegistros', JSON.stringify(registros));
  showToast("Registro guardado");
  mostrarResumen(datos);
});

function mostrarResumen(datos) {
  panelResumen.style.display = 'block';
  resumenDiv.innerHTML = `
    <b>Fecha:</b> ${datos.fecha}<br>
    <b>Tipo de control:</b> ${datos.tipoControl}<br>
    <b>Marinos chequedos en Argos:</b> ${datos.marinosArgos}<br>
    <b>Control pasaportes marinos:</b> ${datos.controlPasaportes}<br>
    <b>Cruceros:</b> ${datos.cruceros} / <b>Cruceristas:</b> ${datos.cruceristas}<br>
    <b>Visados Valencia:</b> ${datos.visadosValencia} / <b>CG:</b> ${datos.visadosCG}<br>
    <b>Ferry - Entradas:</b> ${datos.ferryEntradas}, <b>Salidas:</b> ${datos.ferrySalidas}, <b>Vehículos:</b> ${datos.ferryVehiculos}, <b>Pasajeros:</b> ${datos.ferryPasajeros}<br>
    <b>Culminados EISICS:</b> ${datos.ferryCulminados}, <b>Excepcionales:</b> ${datos.ferryExcepcionales}<br>
    <b>Puerto deportivo:</b> ${datos.puertoDeportivo}<br>
    <b>Denegaciones:</b> ${datos.denegaciones}<br>
    <b>Observaciones:</b> ${datos.observaciones || '---'}<br>
    <b>Archivos adjuntos:</b> ${datos.adjuntos.length ? datos.adjuntos.join(", ") : 'Ninguno'}<br>
    <b>Tarea pendiente:</b> ${datos.tareaPendiente}
  `;
}

btnPDF.addEventListener('click', () => {
  window.print();
});
