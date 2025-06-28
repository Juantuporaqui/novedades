// SIREX · CECOREX · VERSIÓN MEJORADA Y COMPLETA
// Reescrito para incluir todos los campos de los partes y gestión de listas dinámicas.

// Inicializa Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const $ = id => document.getElementById(id);

// --- Referencias DOM ---
const registroSelect = $('registroSelect');
const fechaRegistro = $('fechaRegistro');
const btnBuscar = $('btnBuscar');
const btnNuevo = $('btnNuevo');
const cecorexForm = $('cecorexForm');
const panelResumen = $('panelResumen');
const resumenDiv = $('resumen');

// IDs de todos los campos del formulario
const numericFields = [
    'citados', 'notificaciones', 'remisiones', 'alegaciones', 'decretos', 
    'prohibiciones', 'audiencias', 'oficios', 'consultasTel', 
    'consultasEquipo', 'diligenciasInforme', 'ciesConcedidos', 
    'ciesDenegados', 'menas'
];
const textFields = ['turno', 'observaciones', 'tareaPendiente'];

// DOM para la lista dinámica de detenidos
const btnAddDetenido = $('btnAddDetenido');
const listaDetenidosDiv = $('listaDetenidos');
const detenidoNacionalidad = $('detenidoNacionalidad');
const detenidoMotivo = $('detenidoMotivo');
const detenidoGrupo = $('detenidoGrupo');
const detenidoResultado = $('detenidoResultado');

// --- Estado Global ---
let detenidos = []; // Array para la lista de detenidos

// --- Helpers ---
function showToast(msg) { alert(msg); }
function getDocId(fecha) { return fecha ? "cecorex_" + fecha : null; }
function getDocRef(fecha) { return db.collection("cecorex").doc(getDocId(fecha)); }

// --- Lógica de Lista Dinámica (Detenidos) ---
function renderDetenidos() {
    listaDetenidosDiv.innerHTML = "";
    if (detenidos.length === 0) {
        listaDetenidosDiv.innerHTML = "<p class='empty-list-msg'>No hay detenidos añadidos.</p>";
        return;
    }
    detenidos.forEach((d, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span>
                <strong>Nac:</strong> ${d.nacionalidad || 'N/A'} | 
                <strong>Motivo:</strong> ${d.motivo || 'N/A'} | 
                <strong>Grupo:</strong> ${d.grupo || 'N/A'} | 
                <strong>Resultado:</strong> ${d.resultado || 'N/A'}
            </span>
            <button type="button" class="delete-btn" onclick="deleteDetenido(${index})">✖</button>
        `;
        listaDetenidosDiv.appendChild(item);
    });
}

function addDetenido() {
    const nacionalidad = detenidoNacionalidad.value.trim();
    const motivo = detenidoMotivo.value.trim();
    if (!nacionalidad && !motivo) {
        showToast("Debes introducir al menos la nacionalidad o el motivo.");
        return;
    }
    detenidos.push({
        nacionalidad,
        motivo,
        grupo: detenidoGrupo.value.trim(),
        resultado: detenidoResultado.value.trim()
    });
    // Limpiar inputs del "adder"
    detenidoNacionalidad.value = '';
    detenidoMotivo.value = '';
    detenidoGrupo.value = '';
    detenidoResultado.value = '';
    renderDetenidos();
}

window.deleteDetenido = function(index) {
    detenidos.splice(index, 1);
    renderDetenidos();
}

// --- Funciones Principales (Guardar, Cargar, Limpiar) ---
function limpiarFormulario() {
  cecorexForm.reset();
  numericFields.forEach(id => { if ($(id)) $(id).value = 0; });
  detenidos = [];
  renderDetenidos();
  panelResumen.style.display = "none";
  fechaRegistro.value = new Date().toISOString().slice(0, 10);
  registroSelect.value = "";
}

async function cargarRegistro(fecha) {
  const docSnap = await getDocRef(fecha).get();
  if (!docSnap.exists) {
    showToast("No existe registro para esta fecha. Puedes crear uno nuevo.");
    limpiarFormulario();
    fechaRegistro.value = fecha;
    return;
  }
  const datos = docSnap.data();
  
  numericFields.forEach(id => { if ($(id)) $(id).value = datos[id] || 0; });
  textFields.forEach(id => { if ($(id)) $(id).value = datos[id] || ''; });
  
  detenidos = Array.isArray(datos.detenidos) ? datos.detenidos : [];
  renderDetenidos();
  
  fechaRegistro.value = datos.fecha || fecha;
  mostrarResumen({ ...datos, detenidos });
  panelResumen.style.display = "block";
}

cecorexForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fecha = fechaRegistro.value;
  if (!fecha) { showToast("Selecciona una fecha para guardar."); return; }
  
  const datos = {};
  numericFields.forEach(id => datos[id] = parseInt($(id).value) || 0);
  textFields.forEach(id => datos[id] = $(id).value);
  datos.fecha = fecha;
  datos.detenidos = detenidos; // Añadimos la lista al objeto de datos

  await getDocRef(fecha).set(datos, { merge:true });
  showToast("Registro guardado correctamente.");
  cargarListaRegistros();
  mostrarResumen(datos);
  panelResumen.style.display = "block";
});

// --- Resumen y Carga Inicial ---
function mostrarResumen(datos) {
  let detenidosHTML = '<li>No hay detenidos registrados.</li>';
  if (datos.detenidos && datos.detenidos.length > 0) {
      detenidosHTML = datos.detenidos.map(d => 
          `<li>${d.nacionalidad || ''} - ${d.motivo || ''} (${d.grupo || ''}) &rarr; ${d.resultado || ''}</li>`
      ).join('');
  }

  resumenDiv.innerHTML = `
    <p><b>Fecha:</b> ${datos.fecha || ""} | <b>Turno:</b> ${datos.turno || "N/A"}</p>
    <p><b>Contadores:</b> Citados: ${datos.citados||0}, Notif.: ${datos.notificaciones||0}, Remisiones: ${datos.remisiones||0}, Alegaciones: ${datos.alegaciones||0}, Decretos: ${datos.decretos||0}</p>
    <p><b>Consultas:</b> Telefónicas: ${datos.consultasTel||0}, Equipo: ${datos.consultasEquipo||0} | <b>Diligencias:</b> ${datos.diligenciasInforme||0}</p>
    <p><b>Detenidos/Incoaciones:</b></p>
    <ul>${detenidosHTML}</ul>
    <p><b>Observaciones:</b> ${datos.observaciones || "---"}</p>
    <p><b>¿Tarea pendiente?:</b> ${datos.tareaPendiente || "No"}</p>
  `;
}

async function cargarListaRegistros() {
  registroSelect.innerHTML = '<option value="">-- Cargar un día anterior --</option>';
  try {
      const snap = await db.collection("cecorex").orderBy(firebase.firestore.FieldPath.documentId(), "desc").limit(30).get();
      snap.forEach(doc => {
        if (doc.id.startsWith("cecorex_")) {
          const fecha = doc.id.replace("cecorex_", "");
          registroSelect.innerHTML += `<option value="${fecha}">${fecha}</option>`;
        }
      });
  } catch(error) {
      console.error("Error cargando lista de registros: ", error);
  }
}

// --- Event Listeners ---
btnBuscar.addEventListener('click', () => {
  const fecha = registroSelect.value || fechaRegistro.value;
  if (!fecha) { showToast("Selecciona una fecha del calendario o de la lista."); return; }
  cargarRegistro(fecha);
});

btnNuevo.addEventListener('click', limpiarFormulario);
btnAddDetenido.addEventListener('click', addDetenido);
registroSelect.addEventListener('change', () => {
  if (registroSelect.value) {
      fechaRegistro.value = registroSelect.value;
      cargarRegistro(registroSelect.value);
  }
});

// --- Carga Inicial de la Página ---
window.addEventListener('DOMContentLoaded', () => {
  limpiarFormulario();
  cargarListaRegistros();
});
