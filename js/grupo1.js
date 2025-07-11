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
const btnCargar = document.getElementById('btnCargar');
const btnGrabar = document.getElementById('btnGrabar');
const btnBorrar = document.getElementById('btnBorrar');
const btnNuevo = document.getElementById('btnNuevo');

// Detenidos
const detenidoForm = document.getElementById('detenidoForm');
const numeroDetenido = document.getElementById('numeroDetenido');
const motivoDetenido = document.getElementById('motivoDetenido');
const nacionalidadDetenido = document.getElementById('nacionalidadDetenido');
const diligenciasDetenido = document.getElementById('diligenciasDetenido');
const observacionesDetenido = document.getElementById('observacionesDetenido');
const detenidosVentana = document.getElementById('detenidosVentana');

// Expulsados
const expulsadoForm = document.getElementById('expulsadoForm');
const nombreExpulsado = document.getElementById('nombreExpulsado');
const nacionalidadExpulsado = document.getElementById('nacionalidadExpulsado');
const diligenciasExpulsado = document.getElementById('diligenciasExpulsado');
const nConduccionesPos = document.getElementById('nConduccionesPos');
const expulsadosVentana = document.getElementById('expulsadosVentana');

// Expulsiones Frustradas
const frustradaForm = document.getElementById('frustradaForm');
const nombreFrustrada = document.getElementById('nombreFrustrada');
const nacionalidadFrustrada = document.getElementById('nacionalidadFrustrada');
const motivoFrustrada = document.getElementById('motivoFrustrada');
const frustradasVentana = document.getElementById('frustradasVentana');

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

// Botones exportación
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnExportarCSV = document.getElementById('btnExportarCSV');
const btnWhatsapp = document.getElementById('btnWhatsapp');

// ====== Estado ======
let fechaActual = null;
let datosEnPantalla = {};

// ====== Helpers Firestore ======
function getDocIdDia(fecha) {
    if (!fecha) return null;
    return new Date(fecha).toISOString().slice(0, 10);
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
        datosEnPantalla = {};
        return;
    }
    const datos = docSnap.data();
    datosEnPantalla = JSON.parse(JSON.stringify(datos)); // copia profunda

    mostrarListaDetenidos(datos.detenidos || []);
    mostrarListaVentana(expulsadosVentana, datos.expulsados || [], 'expulsado', true);
    mostrarListaVentana(frustradasVentana, datos.frustradas || [], 'frustrada', true);
    mostrarListaVentana(fletadosVentana, datos.fletados || [], 'fletado', true);
    mostrarListaVentana(fletadosFuturosVentana, datos.fletadosFuturos || [], 'fletadoFuturo', true);
    mostrarListaVentana(conduccionesPosVentana, datos.conduccionesPositivas || [], 'conduccionPositiva', false);
    mostrarListaVentana(conduccionesNegVentana, datos.conduccionesNegativas || [], 'conduccionNegativa', false);
    mostrarListaVentana(pendientesVentana, datos.pendientes || [], 'pendiente', true);
}

function limpiarTodo() {
    detenidosVentana.innerHTML = "";
    expulsadosVentana.innerHTML = "";
    frustradasVentana.innerHTML = "";
    fletadosVentana.innerHTML = "";
    fletadosFuturosVentana.innerHTML = "";
    conduccionesPosVentana.innerHTML = "";
    conduccionesNegVentana.innerHTML = "";
    pendientesVentana.innerHTML = "";
    datosEnPantalla = {};
}

// ====== Mantener fecha seleccionada ======
fechaDiaInput.addEventListener('change', () => {
    fechaActual = fechaDiaInput.value;
});

// ====== Mostrar listados ======
function mostrarListaDetenidos(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        detenidosVentana.innerHTML = "<span class='text-muted'>Sin datos</span>";
        return;
    }
    detenidosVentana.innerHTML = "";
    lista.forEach((item, idx) => {
        let texto = `Nº ${item.numero || "-"} - ${item.motivo || ""} (${item.nacionalidad || "-"}) [${item.diligencias || ""}] ${item.observaciones ? "- " + item.observaciones : ""}`;
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${texto}</span>`;
        const btnDel = document.createElement("button");
        btnDel.className = "btn btn-sm btn-danger ms-2";
        btnDel.title = "Eliminar";
        btnDel.innerHTML = "<i class='bi bi-trash'></i>";
        btnDel.onclick = () => eliminarDetenido(idx);
        div.appendChild(btnDel);
        detenidosVentana.appendChild(div);
    });
    scrollVentana(detenidosVentana.id);
}

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
            case "frustrada":
                texto = `${item.nombre || ""} (${item.nacionalidad || "-"}) - ${item.motivo || ""}`;
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
async function añadirDetenido(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const numero = parseInt(numeroDetenido.value) || null;
    const motivo = motivoDetenido.value.trim();
    const nacionalidad = nacionalidadDetenido.value.trim();
    const diligencias = diligenciasDetenido.value.trim();
    const observaciones = observacionesDetenido.value.trim();
    if (!numero) { showToast("Introduce número de detenido."); return; }
    if (!motivo) { showToast("Introduce motivo."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }

    const detenido = { numero, motivo, nacionalidad, diligencias, observaciones };
    const ref = getDocRefDia(fechaActual);

    // Evitar duplicados
    const docSnap = await ref.get();
    let detenidos = [];
    if (docSnap.exists && Array.isArray(docSnap.data().detenidos)) {
        detenidos = docSnap.data().detenidos;
        if (detenidos.some(d => d.numero === numero)) {
            showToast("Ya existe un detenido con ese número.");
            return;
        }
    }

    await ref.set({
        detenidos: firebase.firestore.FieldValue.arrayUnion(detenido)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(detenidoForm);
}

async function eliminarDetenido(idx) {
    if (!fechaDiaInput.value) return;
    fechaActual = fechaDiaInput.value;
    const ref = getDocRefDia(fechaActual);
    const docSnap = await ref.get();
    if (!docSnap.exists) return;
    let lista = docSnap.data().detenidos || [];
    if (idx < 0 || idx >= lista.length) return;
    lista.splice(idx, 1);
    await ref.set({ detenidos: lista }, { merge: true });
    cargarDia(fechaActual);
}

// ====== Expulsiones Frustradas ======
async function añadirFrustrada(e) {
    e.preventDefault();
    if (!fechaDiaInput.value) { showToast("Selecciona una fecha de trabajo."); return; }
    fechaActual = fechaDiaInput.value;
    const nombre = nombreFrustrada.value.trim();
    const nacionalidad = nacionalidadFrustrada.value.trim();
    const motivo = motivoFrustrada.value.trim();
    if (!nombre) { showToast("Introduce nombre."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }
    if (!motivo) { showToast("Introduce motivo de frustración."); return; }
    const frustrada = { nombre, nacionalidad, motivo };
    const ref = getDocRefDia(fechaActual);
    await ref.set({
        frustradas: firebase.firestore.FieldValue.arrayUnion(frustrada)
    }, { merge: true });
    cargarDia(fechaActual);
    limpiarFormulario(frustradaForm);
}

// Eliminar frustrada
async function eliminarDato(tipo, idx) {
    if (!fechaDiaInput.value) return;
    fechaActual = fechaDiaInput.value;
    const ref = getDocRefDia(fechaActual);
    const docSnap = await ref.get();
    if (!docSnap.exists) return;
    const datos = docSnap.data();
    let key = tipo;
    if (tipo === "expulsado") key = "expulsados";
    if (tipo === "frustrada") key = "frustradas";
    if (tipo === "fletado") key = "fletados";
    if (tipo === "fletadoFuturo") key = "fletadosFuturos";
    if (tipo === "pendiente") key = "pendientes";
    let lista = datos[key] || [];
    if (idx < 0 || idx >= lista.length) return;
    lista.splice(idx, 1);
    await ref.set({
        [key]: lista
    }, { merge: true });
    cargarDia(fechaActual);
}

// ====== Añadir otros (expulsados, fletados, etc) ======
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

// ====== Buscar/Cargar, Nuevo, Grabar y Borrar ======
btnCargar.addEventListener('click', () => {
    if (!fechaDiaInput.value) { showToast("Introduce una fecha para cargar."); return; }
    fechaActual = fechaDiaInput.value;
    cargarDia(fechaActual);
});
btnNuevo.addEventListener('click', () => {
    if (!fechaDiaInput.value) { showToast("Introduce la fecha para el nuevo registro."); return; }
    fechaActual = fechaDiaInput.value;
    limpiarTodo();
});
btnGrabar.addEventListener('click', async () => {
    if (!fechaDiaInput.value) { showToast("Introduce la fecha a grabar."); return; }
    fechaActual = fechaDiaInput.value;
    const ref = getDocRefDia(fechaActual);
    await ref.set(datosEnPantalla, { merge: false });
    showToast("Registro guardado correctamente.");
    cargarDia(fechaActual);
});
btnBorrar.addEventListener('click', async () => {
    if (!fechaDiaInput.value) { showToast("Introduce la fecha a borrar."); return; }
    fechaActual = fechaDiaInput.value;
    if (!confirm("¿Seguro que deseas borrar el registro del día seleccionado?")) return;
    const ref = getDocRefDia(fechaActual);
    await ref.delete();
    showToast("Registro borrado.");
    limpiarTodo();
});

// ====== Formularios: eventos ======
detenidoForm.addEventListener('submit', añadirDetenido);
expulsadoForm.addEventListener('submit', añadirExpulsado);
frustradaForm.addEventListener('submit', añadirFrustrada);
fletadoForm.addEventListener('submit', añadirFletado);
fletadoFuturoForm.addEventListener('submit', añadirFletadoFuturo);
conduccionPosForm.addEventListener('submit', añadirConduccionPositiva);
conduccionNegForm.addEventListener('submit', añadirConduccionNegativa);
pendienteForm.addEventListener('submit', añadirPendiente);

// ====== Generar resumen avanzado ======
let resumenFiltrado = [];
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
        const fechaStr = docId;
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
      <th>Detenidos</th>
      <th>Expulsados</th>
      <th>Frustradas</th>
      <th>Fletados</th>
      <th>Fletados Futuros</th>
      <th>Cond. Positivas</th>
      <th>Cond. Negativas</th>
      <th>Pendientes</th>
    </tr></thead><tbody>`;
    resumen.forEach(item => {
        html += `<tr>
          <td>${formatoFecha(item.fecha)}</td>
          <td>${(item.detenidos||[]).length}</td>
          <td>${(item.expulsados||[]).length}</td>
          <td>${(item.frustradas||[]).length}</td>
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
          <th>Detenidos</th>
          <th>Expulsados</th>
          <th>Frustradas</th>
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
              <td>${(item.detenidos||[]).map(x => x.numero ? x.numero : "-").join(", ")}</td>
              <td>${(item.expulsados||[]).map(x => x.nombre ? x.nombre : "-").join(", ")}</td>
              <td>${(item.frustradas||[]).map(x => x.nombre ? x.nombre : "-").join(", ")}</td>
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
        let csv = "Fecha,Detenidos,Expulsados,Frustradas,Fletados,FletadosFuturos,ConduccionesPos,ConduccionesNeg,Pendientes\n";
        resumenFiltrado.forEach(item => {
            csv += [
                item.fecha,
                (item.detenidos||[]).map(x => x.numero).join("|"),
                (item.expulsados||[]).map(x => x.nombre).join("|"),
                (item.frustradas||[]).map(x => x.nombre).join("|"),
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
            resumen += `${formatoFecha(item.fecha)} - Det: ${(item.detenidos||[]).length}, Exp: ${(item.expulsados||[]).length}, Frust: ${(item.frustradas||[]).length}, Flet: ${(item.fletados||[]).length}, FletF: ${(item.fletadosFuturos||[]).length}, C+: ${(item.conduccionesPositivas||[]).map(x=>x.numero).reduce((a,b)=>a+b,0)}, C-: ${(item.conduccionesNegativas||[]).map(x=>x.numero).reduce((a,b)=>a+b,0)}, Pend: ${(item.pendientes||[]).length}\n`;
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
    if (localStorage.getItem("sirex_darkmode") === "1") {
        document.body.classList.add("dark-mode");
    }
});
