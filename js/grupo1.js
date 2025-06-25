// Inicialización de Firebase
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

// ====== Utilidades ======

function showToast(mensaje, tipo = "info") {
    alert(mensaje);
}

function formatoFecha(fecha) {
    if (!fecha) return "";
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return fecha;
    return f.toLocaleDateString("es-ES");
}

function limpiarFormulario(formulario) {
    if (formulario) formulario.reset();
}

function scrollVentana(idVentana) {
    const ventana = document.getElementById(idVentana);
    if (ventana) ventana.scrollTop = ventana.scrollHeight;
}

// ====== Referencias DOM ======

const fechaDiaInput = document.getElementById('fechaDia');
const btnBuscar = document.getElementById('btnBuscar');
const btnNuevo = document.getElementById('btnNuevo');

// Expulsados
const expulsadoForm = document.getElementById('expulsadoForm');
const nombreExpulsado = document.getElementById('nombreExpulsado');
const nacionalidadExpulsado = document.getElementById('nacionalidadExpulsado');
const diligenciasExpulsado = document.getElementById('diligenciasExpulsado');
const nConduccionesPos = document.getElementById('nConduccionesPos');
const expulsadosVentana = document.getElementById('expulsadosVentana');

// Fletados
const fletadoForm = document.getElementById('fletadoForm');
const destinoFletado = document.getElementById('destinoFletado');
const paxFletado = document.getElementById('paxFletado');
const fechaFletado = document.getElementById('fechaFletado');
const fletadosVentana = document.getElementById('fletadosVentana');

// Fletados futuros
const fletadoFuturoForm = document.getElementById('fletadoFuturoForm');
const destinoFletadoFuturo = document.getElementById('destinoFletadoFuturo');
const paxFletadoFuturo = document.getElementById('paxFletadoFuturo');
const fechaFletadoFuturo = document.getElementById('fechaFletadoFuturo');
const fletadosFuturosVentana = document.getElementById('fletadosFuturosVentana');

// Conducciones positivas
const conduccionPosForm = document.getElementById('conduccionPosForm');
const conduccionPositiva = document.getElementById('conduccionPositiva');
const conduccionesPosVentana = document.getElementById('conduccionesPosVentana');

// Conducciones negativas
const conduccionNegForm = document.getElementById('conduccionNegForm');
const conduccionNegativa = document.getElementById('conduccionNegativa');
const conduccionesNegVentana = document.getElementById('conduccionesNegVentana');

// Pendientes de gestión
const pendienteForm = document.getElementById('pendienteForm');
const descPendiente = document.getElementById('descPendiente');
const fechaPendiente = document.getElementById('fechaPendiente');
const pendientesVentana = document.getElementById('pendientesVentana');

// Resumen avanzado
const desdeResumen = document.getElementById('desdeResumen');
const hastaResumen = document.getElementById('hastaResumen');
const generarResumenBtn = document.getElementById('generarResumenBtn');
const resumenVentana = document.getElementById('resumenVentana');

// NUEVOS: Botones exportación
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnExportarCSV = document.getElementById('btnExportarCSV');
const btnWhatsapp = document.getElementById('btnWhatsapp');

// ====== Estado ======
let fechaActual = null;

// ====== Helpers Firestore ======
function getDocIdDia(fecha) {
    if (!fecha) return null;
    const fechaISO = new Date(fecha).toISOString().slice(0, 10);
    return `expulsiones_${fechaISO}`;
}
function getDocRefDia(fecha) {
    return db.collection("grupo1_expulsiones").doc(getDocIdDia(fecha));
}

// ====== Cargar y mostrar datos de un día ======
async function cargarDia(fecha) {
    if (!fecha) return;
    fechaActual = fecha;
    limpiarTodo();
    const ref = getDocRefDia(fecha);
    const docSnap = await ref.get();
    if (!docSnap.exists) {
        // No muestres alert al cargar un día vacío, sólo vacía campos
        return;
    }
    const datos = docSnap.data();

    mostrarListaVentana(expulsadosVentana, datos.expulsados || [], 'expulsado', true);
    mostrarListaVentana(fletadosVentana, datos.fletados || [], 'fletado', true);
    mostrarListaVentana(fletadosFuturosVentana, datos.fletadosFuturos || [], 'fletadoFuturo', true);
    mostrarListaVentana(conduccionesPosVentana, datos.conduccionesPositivas || [], 'conduccionPositiva', false);
    mostrarListaVentana(conduccionesNegVentana, datos.conduccionesNegativas || [], 'conduccionNegativa', false);
    mostrarListaVentana(pendientesVentana, datos.pendientes || [], 'pendiente', true);
}

function limpiarTodo() {
    expulsadosVentana.innerHTML = "";
    fletadosVentana.innerHTML = "";
    fletadosFuturosVentana.innerHTML = "";
    conduccionesPosVentana.innerHTML = "";
    conduccionesNegVentana.innerHTML = "";
    pendientesVentana.innerHTML = "";
}

// ====== Mantener fecha seleccionada ======
fechaDiaInput.addEventListener('change', () => {
    fechaActual = fechaDiaInput.value;
});

// ====== Mostrar listados ======
function mostrarListaVentana(ventana, lista, tipo, permiteEliminar) {
    if (!Array.isArray(lista) || lista.length === 0) {
        ventana.innerHTML = "<span class='text-muted'>Sin datos</span>";
        return;
    }
    ventana.innerHTML = "";
    lista.forEach((item, idx) => {
        let texto = "";
        switch (tipo) {
            case "expulsado":
                texto = `${item.nombre || ""} (${item.nacionalidad || "-"}) [${item.diligencias || ""}]`;
                break;
            case "fletado":
                texto = `${item.destino || ""} (${item.pax || 0} pax) - ${formatoFecha(item.fecha)}`;
                break;
            case "fletadoFuturo":
                texto = `${item.destino || ""} (${item.pax || 0} pax) - ${formatoFecha(item.fecha)}`;
                break;
            case "conduccionPositiva":
            case "conduccionNegativa":
                texto = `Nº: ${item.numero || 0} (${formatoFecha(item.fecha)})`;
                break;
            case "pendiente":
                texto = `${item.descripcion || ""} (${formatoFecha(item.fecha)})`;
                break;
            default:
                texto = JSON.stringify(item);
        }
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${texto}</span>`;
        if (permiteEliminar) {
            const btnDel = document.createElement("button");
            btnDel.className = "btn btn-sm btn-danger ms-2";
            btnDel.title = "Eliminar";
            btnDel.innerHTML = "<i class='bi bi-trash'></i>";
            btnDel.onclick = () => eliminarDato(tipo, idx);
            div.appendChild(btnDel);
        }
        ventana.appendChild(div);
    });
    scrollVentana(ventana.id);
}

// ====== Añadir datos ======
async function añadirExpulsado(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const nombre = nombreExpulsado.value.trim();
    const nacionalidad = nacionalidadExpulsado.value.trim();
    const diligencias = diligenciasExpulsado.value.trim();
    const ncondu = parseInt(nConduccionesPos.value) || 0;
    if (!nombre) { showToast("Introduce nombre."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }
    const expulsado = { nombre, nacionalidad, diligencias, nConduccionesPos: ncondu };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        expulsados: firebase.firestore.FieldValue.arrayUnion(expulsado)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(expulsadoForm);
}

async function añadirFletado(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const destino = destinoFletado.value.trim();
    const pax = parseInt(paxFletado.value) || 0;
    const fecha = fechaFletado.value;
    if (!destino) { showToast("Introduce destino."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    const fletado = { destino, pax, fecha };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        fletados: firebase.firestore.FieldValue.arrayUnion(fletado)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(fletadoForm);
}

async function añadirFletadoFuturo(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const destino = destinoFletadoFuturo.value.trim();
    const pax = parseInt(paxFletadoFuturo.value) || 0;
    const fecha = fechaFletadoFuturo.value;
    if (!destino) { showToast("Introduce destino."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    const fletado = { destino, pax, fecha };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        fletadosFuturos: firebase.firestore.FieldValue.arrayUnion(fletado)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(fletadoFuturoForm);
}

async function añadirConduccionPositiva(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const numero = parseInt(conduccionPositiva.value) || 0;
    const fecha = fechaActual;
    const dato = { numero, fecha };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        conduccionesPositivas: firebase.firestore.FieldValue.arrayUnion(dato)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(conduccionPosForm);
}

async function añadirConduccionNegativa(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const numero = parseInt(conduccionNegativa.value) || 0;
    const fecha = fechaActual;
    const dato = { numero, fecha };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        conduccionesNegativas: firebase.firestore.FieldValue.arrayUnion(dato)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(conduccionNegForm);
}

async function añadirPendiente(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const descripcion = descPendiente.value.trim();
    const fecha = fechaPendiente.value;
    if (!descripcion) { showToast("Introduce descripción."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    const pendiente = { descripcion, fecha };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        pendientes: firebase.firestore.FieldValue.arrayUnion(pendiente)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(pendienteForm);
}

// ====== Eliminar dato ======
async function eliminarDato(tipo, idx) {
    if (!fechaDiaInput.value) return;
    fechaActual = fechaDiaInput.value;
    const ref = getDocRefDia(fechaActual);
    const docSnap = await ref.get();
    if (!docSnap.exists) return;
    const datos = docSnap.data();
    let lista = datos[tipo + (tipo.endsWith('a') ? 's' : '')] || [];
    if (idx < 0 || idx >= lista.length) return;
    lista.splice(idx, 1);
    await ref.set({
        [tipo + (tipo.endsWith('a') ? 's' : '')]: lista
    }, { merge: true });
    cargarDia(fechaActual);
}

// ====== Buscar y nuevo registro ======
btnBuscar.addEventListener('click', () => {
    if (!fechaDiaInput.value) { showToast("Introduce una fecha para buscar."); return; }
    fechaActual = fechaDiaInput.value;
    cargarDia(fechaActual);
});

btnNuevo.addEventListener('click', () => {
    if (!fechaDiaInput.value) { showToast("Introduce la fecha para el nuevo registro."); return; }
    fechaActual = fechaDiaInput.value;
    limpiarTodo();
    // No borres la fecha del input
});

// ====== Formularios: eventos ======
expulsadoForm.addEventListener('submit', añadirExpulsado);
fletadoForm.addEventListener('submit', añadirFletado);
fletadoFuturoForm.addEventListener('submit', añadirFletadoFuturo);
conduccionPosForm.addEventListener('submit', añadirConduccionPositiva);
conduccionNegForm.addEventListener('submit', añadirConduccionNegativa);
pendienteForm.addEventListener('submit', añadirPendiente);

// ====== Generar resumen avanzado ======
let resumenFiltrado = []; // para exportación

generarResumenBtn.addEventListener('click', async () => {
    const desde = desdeResumen.value;
    const hasta = hastaResumen.value;
    if (!desde || !hasta) {
        showToast("Selecciona rango de fechas.");
        return;
    }
    const col = db.collection("grupo1_expulsiones");
    const snapshot = await col.get();
    let resumen = [];
    snapshot.forEach(docSnap => {
        const docId = docSnap.id;
        const fechaStr = docId.replace("expulsiones_", "");
        if (fechaStr >= desde && fechaStr <= hasta) {
            resumen.push({ fecha: fechaStr, ...docSnap.data() });
        }
    });

    resumenFiltrado = resumen;
    mostrarResumen(resumen);
});

function mostrarResumen(resumen) {
    if (!Array.isArray(resumen) || resumen.length === 0) {
        resumenVentana.innerHTML = "<span class='text-muted'>No hay datos en el rango seleccionado.</span>";
        return;
    }
    let html = `<div class='table-responsive'><table class='table table-striped'>
    <thead><tr>
      <th>Fecha</th>
      <th>Expulsados</th>
      <th>Fletados</th>
      <th>Fletados Futuros</th>
      <th>Cond. Positivas</th>
      <th>Cond. Negativas</th>
      <th>Pendientes</th>
    </tr></thead><tbody>`;
    resumen.forEach(item => {
        html += `<tr>
          <td>${formatoFecha(item.fecha)}</td>
          <td>${(item.expulsados||[]).length}</td>
          <td>${(item.fletados||[]).length}</td>
          <td>${(item.fletadosFuturos||[]).length}</td>
          <td>${(item.conduccionesPositivas||[]).map(c=>c.numero).reduce((a,b)=>a+b,0)}</td>
          <td>${(item.conduccionesNegativas||[]).map(c=>c.numero).reduce((a,b)=>a+b,0)}</td>
          <td>${(item.pendientes||[]).length}</td>
        </tr>`;
    });
    html += "</tbody></table></div>";
    resumenVentana.innerHTML = html;
}

// ====== Exportar PDF ======
if (btnExportarPDF) {
    btnExportarPDF.onclick = function () {
        if (!resumenFiltrado || resumenFiltrado.length === 0) {
            showToast("Primero genera un resumen.");
            return;
        }
        let html = `<h2>Resumen de Gestión</h2>
        <h4>Del ${desdeResumen.value} al ${hastaResumen.value}</h4>
        <table border="1" cellpadding="5" cellspacing="0">
        <thead>
        <tr>
          <th>Fecha</th>
          <th>Expulsados</th>
          <th>Fletados</th>
          <th>Fletados Futuros</th>
          <th>Conducciones +</th>
          <th>Conducciones -</th>
          <th>Pendientes</th>
        </tr>
        </thead><tbody>`;
        resumenFiltrado.forEach(item => {
            html += `<tr>
              <td>${formatoFecha(item.fecha)}</td>
              <td>${(item.expulsados||[]).map(x => x.nombre ? x.nombre : "-").join(", ")}</td>
              <td>${(item.fletados||[]).map(x => x.destino ? x.destino : "-").join(", ")}</td>
              <td>${(item.fletadosFuturos||[]).map(x => x.destino ? x.destino : "-").join(", ")}</td>
              <td>${(item.conduccionesPositivas||[]).map(x => x.numero).reduce((a,b)=>a+b,0)}</td>
              <td>${(item.conduccionesNegativas||[]).map(x => x.numero).reduce((a,b)=>a+b,0)}</td>
              <td>${(item.pendientes||[]).map(x=>x.descripcion).join(" | ")}</td>
            </tr>`;
        });
        html += "</tbody></table>";
        const w = window.open("", "_blank");
        w.document.write(`<html><head><title>Resumen Gestión</title></head><body>${html}</body></html>`);
        w.print();
    }
}

// ====== Exportar CSV ======
if (btnExportarCSV) {
    btnExportarCSV.onclick = function () {
        if (!resumenFiltrado || resumenFiltrado.length === 0) {
            showToast("Primero genera un resumen.");
            return;
        }
        let csv = "Fecha,Expulsados,Fletados,FletadosFuturos,ConduccionesPos,ConduccionesNeg,Pendientes\n";
        resumenFiltrado.forEach(item => {
            csv += [
                item.fecha,
                (item.expulsados||[]).map(x => x.nombre).join("|"),
                (item.fletados||[]).map(x => x.destino).join("|"),
                (item.fletadosFuturos||[]).map(x => x.destino).join("|"),
                (item.conduccionesPositivas||[]).map(x => x.numero).reduce((a,b)=>a+b,0),
                (item.conduccionesNegativas||[]).map(x => x.numero).reduce((a,b)=>a+b,0),
                (item.pendientes||[]).map(x=>x.descripcion).join("|")
            ].join(",") + "\n";
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "resumen_grupo1.csv";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }
}

// ====== Exportar resumen a WhatsApp ======
if (btnWhatsapp) {
    btnWhatsapp.onclick = function () {
        if (!resumenFiltrado || resumenFiltrado.length === 0) {
            showToast("Primero genera un resumen.");
            return;
        }
        let resumen = `Resumen Gestión SIREX\n${desdeResumen.value} al ${hastaResumen.value}:\n`;
        resumenFiltrado.forEach(item => {
            resumen += `${formatoFecha(item.fecha)} - Exp: ${(item.expulsados||[]).length}, Flet: ${(item.fletados||[]).length}, FletF: ${(item.fletadosFuturos||[]).length}, C+: ${(item.conduccionesPositivas||[]).map(x=>x.numero).reduce((a,b)=>a+b,0)}, C-: ${(item.conduccionesNegativas||[]).map(x=>x.numero).reduce((a,b)=>a+b,0)}, Pend: ${(item.pendientes||[]).length}\n`;
        });
        navigator.clipboard.writeText(resumen)
            .then(() => showToast("Resumen WhatsApp copiado. Solo tienes que pegarlo en la conversación."))
            .catch(() => showToast("No se pudo copiar. Actualiza el navegador."));
    }
}

// ====== Inicialización automática ======
window.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    fechaDiaInput.value = hoy;
    fechaActual = hoy;
    cargarDia(hoy);

    // Modo oscuro persistente
    if (localStorage.getItem("sirex_darkmode") === "1") {
        document.body.classList.add("dark-mode");
    }
});
