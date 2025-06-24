// ==== FIREBASE CONFIGURACIÓN (no cambies si no cambias de proyecto) ====
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e",
  measurementId: "G-S2VPQNWZ21"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==== CAMPOS Y FUNCIONES ====
const fechaInput = document.getElementById('fechaRegistroG4');
const btnCargar = document.getElementById('btnCargarG4');
const btnGuardar = document.getElementById('btnGuardarG4');

const campos = [
  {input: 'colabInputG4', list: 'colabListG4', nombre: 'colaboraciones', cuantia: 'cuantiaColab'},
  {input: 'detenidoMotivoG4', list: 'detenidosListG4', nombre: 'detenidos', inputExtra: 'detenidoNacionalidadG4', cuantia: 'cuantiaDetenidos'},
  {input: 'citadosInputG4', list: 'citadosListG4', nombre: 'citados', cuantia: 'cuantiaCitados'},
  {input: 'gestionesInputG4', list: 'gestionesListG4', nombre: 'otrasGestiones', cuantia: 'cuantiaGestiones'},
  {input: 'inspeccionTrabajoInputG4', list: 'inspeccionTrabajoListG4', nombre: 'inspeccionesTrabajo', cuantia: 'cuantiaInspeccion'},
  {input: 'otrasInspeccionesInputG4', list: 'otrasInspeccionesListG4', nombre: 'otrasInspecciones', cuantia: 'cuantiaOtrasInspecciones'}
];

function clearList(listId) {
  document.getElementById(listId).innerHTML = '';
}

// Añadir ítem dinámico a campo-list y respaldo en variable temporal
function addItemCampo(inputId, listId, extraId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  let value = input.value.trim();
  let extraValue = extraId ? document.getElementById(extraId).value.trim() : '';
  if (!value && !extraValue) return;
  let txt = value;
  if (extraValue) txt += ' · ' + extraValue;
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `<span>${txt}</span>
    <button type="button" class="btn-del" title="Eliminar" onclick="this.parentElement.remove()">×</button>`;
  list.appendChild(item);
  input.value = '';
  if (extraId) document.getElementById(extraId).value = '';
}

// ENLACE DE BOTONES “AÑADIR”
document.getElementById('btnAddColabG4').onclick = () => addItemCampo('colabInputG4', 'colabListG4');
document.getElementById('btnAddDetenidoG4').onclick = () => addItemCampo('detenidoMotivoG4', 'detenidosListG4', 'detenidoNacionalidadG4');
document.getElementById('btnAddCitadosG4').onclick = () => addItemCampo('citadosInputG4', 'citadosListG4');
document.getElementById('btnAddGestionesG4').onclick = () => addItemCampo('gestionesInputG4', 'gestionesListG4');
document.getElementById('btnAddInspeccionTrabajoG4').onclick = () => addItemCampo('inspeccionTrabajoInputG4', 'inspeccionTrabajoListG4');
document.getElementById('btnAddOtrasInspeccionesG4').onclick = () => addItemCampo('otrasInspeccionesInputG4', 'otrasInspeccionesListG4');

// ==== CARGAR REGISTRO DE FIRESTORE ====
btnCargar.addEventListener('click', async () => {
  const fecha = fechaInput.value;
  if (!fecha) return alert('Selecciona una fecha para cargar.');
  const docId = fecha;
  const doc = await db.collection('grupo4_operativo').doc(docId).get();
  if (!doc.exists) {
    limpiarTodos();
    campos.forEach(c => document.getElementById(c.cuantia).value = "");
    return alert('No hay registro para esa fecha.');
  }
  cargarFormulario(doc.data());
});

function limpiarTodos() {
  campos.forEach(c => clearList(c.list));
}

// Cargar los datos visualmente
function cargarFormulario(data) {
  limpiarTodos();
  campos.forEach(c => document.getElementById(c.cuantia).value = data[c.cuantia] ?? "");
  if (!data) return;
  if (data.colaboraciones) data.colaboraciones.forEach(txt => renderItem(txt, 'colabListG4'));
  if (data.detenidos) data.detenidos.forEach(txt => renderItem(txt, 'detenidosListG4'));
  if (data.citados) data.citados.forEach(txt => renderItem(txt, 'citadosListG4'));
  if (data.otrasGestiones) data.otrasGestiones.forEach(txt => renderItem(txt, 'gestionesListG4'));
  if (data.inspeccionesTrabajo) data.inspeccionesTrabajo.forEach(txt => renderItem(txt, 'inspeccionTrabajoListG4'));
  if (data.otrasInspecciones) data.otrasInspecciones.forEach(txt => renderItem(txt, 'otrasInspeccionesListG4'));
}

function renderItem(txt, listId) {
  const list = document.getElementById(listId);
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `<span>${txt}</span>
    <button type="button" class="btn-del" title="Eliminar" onclick="this.parentElement.remove()">×</button>`;
  list.appendChild(item);
}

// ==== GUARDAR REGISTRO EN FIRESTORE ====
btnGuardar.addEventListener('click', async () => {
  const fecha = fechaInput.value;
  if (!fecha) return alert('Selecciona una fecha para guardar.');
  // Extrae los valores de todos los campos list y cuantía
  const datos = {};
  campos.forEach(c => {
    datos[c.nombre] = Array.from(document.getElementById(c.list).children).map(i => i.firstChild.textContent.trim());
    datos[c.cuantia] = parseInt(document.getElementById(c.cuantia).value) || 0;
  });
  datos.fecha = fecha;
  datos.timestamp = new Date().toISOString();
  await db.collection('grupo4_operativo').doc(fecha).set(datos);
  alert('Registro guardado correctamente.');
});

// ==== GENERAR RESUMEN DE UN RANGO DE FECHAS (y sumatorio de totales) ====
document.getElementById('btnGenerarResumenG4').onclick = async function() {
  const desde = document.getElementById('resumenDesdeG4').value;
  const hasta = document.getElementById('resumenHastaG4').value;
  if (!desde || !hasta) return alert('Selecciona el rango de fechas.');
  const resumenDiv = document.getElementById('resumenContenidoG4');
  resumenDiv.innerHTML = '<b>Consultando...</b>';
  const snapshot = await db.collection('grupo4_operativo')
    .where('fecha', '>=', desde)
    .where('fecha', '<=', hasta)
    .orderBy('fecha')
    .get();
  if (snapshot.empty) {
    resumenDiv.innerHTML = '<em>No hay registros en ese rango.</em>';
    return;
  }
  // Acumula todos los datos y totales
  const total = {};
  campos.forEach(c => { total[c.nombre] = []; total[c.cuantia] = 0; });
  snapshot.forEach(doc => {
    const d = doc.data();
    campos.forEach(c => {
      if (d[c.nombre]) total[c.nombre].push(...d[c.nombre]);
      if (d[c.cuantia]) total[c.cuantia] += d[c.cuantia];
    });
  });
  // Monta el HTML resumen
  let html = '';
  campos.forEach(c => {
    html += `<b>${c.campo || c.nombre}:</b> ${lista(total[c.nombre])}<br>`;
    html += `<b style="color:#2185e0;">Total ${c.campo || c.nombre}:</b> ${total[c.cuantia]}<hr style="margin:0.5em 0">`;
  });
  resumenDiv.innerHTML = html;

  function lista(arr) {
    if (!arr.length) return '<em>Ninguno</em>';
    return '<ul style="margin-bottom:7px;">' + arr.map(t => `<li>${t}</li>`).join('') + '</ul>';
  }
};

window.addEventListener('DOMContentLoaded', ()=>{
  fechaInput.value = new Date().toISOString().slice(0,10);
});
