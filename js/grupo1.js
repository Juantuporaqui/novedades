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
function showToast(mensaje, tipo = "info") { alert(mensaje); }
function formatoFecha(fecha) {
    if (!fecha) return "";
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return fecha;
    return f.toLocaleDateString("es-ES");
}
function limpiarFormulario(formulario) { if (formulario) formulario.reset(); }
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
let datosEnPantalla = {
    detenidos: [],
    expulsados: [],
    frustradas: [],
    fletados: [],
    fletadosFuturos: [],
    conduccionesPositivas: [],
    conduccionesNegativas: [],
    pendientes: []
};

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
        datosEnPantalla = {
            detenidos: [],
            expulsados: [],
            frustradas: [],
            fletados: [],
            fletadosFuturos: [],
            conduccionesPositivas: [],
            conduccionesNegativas: [],
            pendientes: []
        };
        refrescarTodo();
        return;
    }
    const datos = docSnap.data();
    datosEnPantalla = {
        detenidos: normalizarDetenidos(datos.detenidos_g1 || datos.detenidos || []),
        expulsados: normalizarExpulsados(datos.expulsados_g1 || datos.expulsados || []),
        frustradas: normalizarFrustradas(datos.exp_frustradas_g1 || datos.frustradas || []),
        fletados: normalizarFletados(datos.fletados_g1 || datos.fletados || []),
        fletadosFuturos: normalizarFletados(datos.fletadosFuturos_g1 || datos.fletadosFuturos || []),
        conduccionesPositivas: normalizarConducciones(datos.conduccionesPositivas_g1 || datos.conduccionesPositivas || []),
        conduccionesNegativas: normalizarConducciones(datos.conduccionesNegativas_g1 || datos.conduccionesNegativas || []),
        pendientes: normalizarPendientes(datos.pendientes_g1 || datos.pendientes || [])
    };
    refrescarTodo();
}

// Detenidos
function normalizarDetenidos(arr) {
    if (!Array.isArray(arr)) return [];
    // Si vienen con sufijos de parser DOCX
    if (arr.length && arr[0].detenidos_g1 !== undefined) {
        return arr.map(x => ({
            numero: x.detenidos_g1 || "",
            motivo: x.motivo_g1 || "",
            nacionalidad: x.nacionalidad_g1 || "",
            diligencias: x.diligencias_g1 || "",
            observaciones: x.observaciones_g1 || ""
        }));
    }
    // Si ya están en formato estándar (manual o ya normalizado)
    return arr.map(x => ({
        numero: x.numero || "",
        motivo: x.motivo || "",
        nacionalidad: x.nacionalidad || "",
        diligencias: x.diligencias || "",
        observaciones: x.observaciones || ""
    }));
}

// Expulsados
function normalizarExpulsados(arr) {
    if (!Array.isArray(arr)) return [];
    if (arr.length && arr[0].expulsados_g1 !== undefined) {
        return arr.map(x => ({
            nombre: x.expulsados_g1 || "",
            nacionalidad: x.nacionalidad_eg1 || "",
            diligencias: x.diligencias_eg1 || "",
            nConduccionesPos: x.conduc_pos_eg1 || "",
            nConduccionesNeg: x.conduc_neg_eg1 || "",
            observaciones: x.observaciones_eg1 || ""
        }));
    }
    return arr.map(x => ({
        nombre: x.nombre || "",
        nacionalidad: x.nacionalidad || "",
        diligencias: x.diligencias || "",
        nConduccionesPos: x.nConduccionesPos || "",
        nConduccionesNeg: x.nConduccionesNeg || "",
        observaciones: x.observaciones || ""
    }));
}

// Frustradas
function normalizarFrustradas(arr) {
    if (!Array.isArray(arr)) return [];
    if (arr.length && arr[0].exp_frustradas_g1 !== undefined) {
        return arr.map(x => ({
            nombre: x.exp_frustradas_g1 || "",
            nacionalidad: x.nacionalidad_fg1 || "",
            motivo: x.motivo_fg1 || "",
            diligencias: x.diligencias_fg1 || ""
        }));
    }
    return arr.map(x => ({
        nombre: x.nombre || "",
        nacionalidad: x.nacionalidad || "",
        motivo: x.motivo || "",
        diligencias: x.diligencias || ""
    }));
}

// Fletados y Fletados futuros
function normalizarFletados(arr) {
    if (!Array.isArray(arr)) return [];
    if (arr.length && arr[0].fletados_g1 !== undefined) {
        return arr.map(x => ({
            destino: x.destino_flg1 || "",
            pax: x.pax_flg1 || "",
            fecha: x.fecha || "",
            observaciones: x.observaciones_flg1 || ""
        }));
    }
    return arr.map(x => ({
        destino: x.destino || "",
        pax: x.pax || "",
        fecha: x.fecha || "",
        observaciones: x.observaciones || ""
    }));
}

// Conducciones
function normalizarConducciones(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(x => ({
        numero: x.numero || "",
        fecha: x.fecha || ""
    }));
}

// Pendientes
function normalizarPendientes(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(x => ({
        descripcion: x.descripcion || "",
        fecha: x.fecha || ""
    }));
}



function limpiarTodo() {
    datosEnPantalla = {
        detenidos: [],
        expulsados: [],
        frustradas: [],
        fletados: [],
        fletadosFuturos: [],
        conduccionesPositivas: [],
        conduccionesNegativas: [],
        pendientes: []
    };
    refrescarTodo();
}

function refrescarTodo() {
    mostrarListaDetenidos(datosEnPantalla.detenidos);
    mostrarListaVentana(expulsadosVentana, datosEnPantalla.expulsados, 'expulsado', true);
    mostrarListaVentana(frustradasVentana, datosEnPantalla.frustradas, 'frustrada', true);
    mostrarListaVentana(fletadosVentana, datosEnPantalla.fletados, 'fletado', true);
    mostrarListaVentana(fletadosFuturosVentana, datosEnPantalla.fletadosFuturos, 'fletadoFuturo', true);
    mostrarListaVentana(conduccionesPosVentana, datosEnPantalla.conduccionesPositivas, 'conduccionPositiva', false);
    mostrarListaVentana(conduccionesNegVentana, datosEnPantalla.conduccionesNegativas, 'conduccionNegativa', false);
    mostrarListaVentana(pendientesVentana, datosEnPantalla.pendientes, 'pendiente', true);
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
        // Corrige valores "vacíos", undefined o nulos
        const numero = (item.numero !== undefined && item.numero !== null && item.numero !== "") ? item.numero : "-";
        const motivo = item.motivo || "-";
        const nacionalidad = item.nacionalidad || "-";
        const diligencias = item.diligencias || "-";
        const observaciones = item.observaciones || "";
        // No mostrar "[]" nunca
        let texto = `Nº ${numero} - ${motivo} (${nacionalidad}) [${diligencias}]${observaciones ? " - " + observaciones : ""}`;
        // Si todos están vacíos, no muestres nada (evita líneas inútiles)
        if (numero === "-" && motivo === "-" && nacionalidad === "-" && diligencias === "-") return;
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${texto}</span>`;
        const btnDel = document.createElement("button");
        btnDel.className = "btn btn-sm btn-danger ms-2";
        btnDel.title = "Eliminar";
        btnDel.innerHTML = "<i class='bi bi-trash'></i>";
        btnDel.onclick = () => { datosEnPantalla.detenidos.splice(idx, 1); refrescarTodo(); };
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
                // Siempre valores por defecto legibles
                texto = `${item.nombre || "-"} (${item.nacionalidad || "-"}) [${item.diligencias || "-"}]`;
                break;
            case "frustrada":
                texto = `${item.nombre || "-"} (${item.nacionalidad || "-"}) - ${item.motivo || "-"}`;
                break;
            case "fletado":
            case "fletadoFuturo":
                texto = `${item.destino || "-"} (${item.pax || "0"} pax) - ${formatoFecha(item.fecha)}`;
                break;
            case "conduccionPositiva":
            case "conduccionNegativa":
                texto = `Nº: ${item.numero || "0"} (${formatoFecha(item.fecha)})`;
                break;
            case "pendiente":
                texto = `${item.descripcion || "-"} (${formatoFecha(item.fecha)})`;
                break;
            default:
                texto = JSON.stringify(item);
        }
        // Si todos los campos están vacíos, no muestra la línea
        if (/^(?:-|\s|0|\(\-\)|\[\-\])+$/.test(texto.replace(/\s/g,''))) return;
        const div = document.createElement("div");
        div.className = "dato-item border-bottom py-1 d-flex justify-content-between align-items-center";
        div.innerHTML = `<span>${texto}</span>`;
        if (permiteEliminar) {
            const btnDel = document.createElement("button");
            btnDel.className = "btn btn-sm btn-danger ms-2";
            btnDel.title = "Eliminar";
            btnDel.innerHTML = "<i class='bi bi-trash'></i>";
            btnDel.onclick = () => {
                switch (tipo) {
                    case "expulsado": datosEnPantalla.expulsados.splice(idx, 1); break;
                    case "frustrada": datosEnPantalla.frustradas.splice(idx, 1); break;
                    case "fletado": datosEnPantalla.fletados.splice(idx, 1); break;
                    case "fletadoFuturo": datosEnPantalla.fletadosFuturos.splice(idx, 1); break;
                    case "pendiente": datosEnPantalla.pendientes.splice(idx, 1); break;
                }
                refrescarTodo();
            };
            div.appendChild(btnDel);
        }
        ventana.appendChild(div);
    });
    scrollVentana(ventana.id);
}


// ====== Añadir datos ======
detenidoForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const numero = parseInt(numeroDetenido.value) || null;
    const motivo = motivoDetenido.value.trim();
    const nacionalidad = nacionalidadDetenido.value.trim();
    const diligencias = diligenciasDetenido.value.trim();
    const observaciones = observacionesDetenido.value.trim();
    if (!numero) { showToast("Introduce número de detenido."); return; }
    if (!motivo) { showToast("Introduce motivo."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }
    if (datosEnPantalla.detenidos.some(d => d.numero === numero)) {
        showToast("Ya existe un detenido con ese número."); return;
    }
    datosEnPantalla.detenidos.push({ numero, motivo, nacionalidad, diligencias, observaciones });
    refrescarTodo();
    limpiarFormulario(detenidoForm);
});
expulsadoForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const nombre = nombreExpulsado.value.trim();
    const nacionalidad = nacionalidadExpulsado.value.trim();
    const diligencias = diligenciasExpulsado.value.trim();
    const ncondu = parseInt(nConduccionesPos.value) || 0;
    if (!nombre) { showToast("Introduce nombre."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }
    datosEnPantalla.expulsados.push({ nombre, nacionalidad, diligencias, nConduccionesPos: ncondu });
    refrescarTodo();
    limpiarFormulario(expulsadoForm);
});
frustradaForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const nombre = nombreFrustrada.value.trim();
    const nacionalidad = nacionalidadFrustrada.value.trim();
    const motivo = motivoFrustrada.value.trim();
    if (!nombre) { showToast("Introduce nombre."); return; }
    if (!nacionalidad) { showToast("Introduce nacionalidad."); return; }
    if (!motivo) { showToast("Introduce motivo de frustración."); return; }
    datosEnPantalla.frustradas.push({ nombre, nacionalidad, motivo });
    refrescarTodo();
    limpiarFormulario(frustradaForm);
});
fletadoForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const destino = destinoFletado.value.trim();
    const pax = parseInt(paxFletado.value) || 0;
    const fecha = fechaFletado.value;
    if (!destino) { showToast("Introduce destino."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    datosEnPantalla.fletados.push({ destino, pax, fecha });
    refrescarTodo();
    limpiarFormulario(fletadoForm);
});
fletadoFuturoForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const destino = destinoFletadoFuturo.value.trim();
    const pax = parseInt(paxFletadoFuturo.value) || 0;
    const fecha = fechaFletadoFuturo.value;
    if (!destino) { showToast("Introduce destino."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    datosEnPantalla.fletadosFuturos.push({ destino, pax, fecha });
    refrescarTodo();
    limpiarFormulario(fletadoFuturoForm);
});
conduccionPosForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const numero = parseInt(conduccionPositiva.value) || 0;
    const fecha = fechaActual;
    datosEnPantalla.conduccionesPositivas.push({ numero, fecha });
    refrescarTodo();
    limpiarFormulario(conduccionPosForm);
});
conduccionNegForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const numero = parseInt(conduccionNegativa.value) || 0;
    const fecha = fechaActual;
    datosEnPantalla.conduccionesNegativas.push({ numero, fecha });
    refrescarTodo();
    limpiarFormulario(conduccionNegForm);
});
pendienteForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const descripcion = descPendiente.value.trim();
    const fecha = fechaPendiente.value;
    if (!descripcion) { showToast("Introduce descripción."); return; }
    if (!fecha) { showToast("Selecciona fecha."); return; }
    datosEnPantalla.pendientes.push({ descripcion, fecha });
    refrescarTodo();
    limpiarFormulario(pendienteForm);
});

// ====== Botones ======
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

    // Estructura estándar compatible con novedades.js
    const datosGuardar = {
        detenidos_g1: datosEnPantalla.detenidos,
        expulsados_g1: datosEnPantalla.expulsados,
        exp_frustradas_g1: datosEnPantalla.frustradas,
        fletados_g1: datosEnPantalla.fletados,
        fletadosFuturos_g1: datosEnPantalla.fletadosFuturos,
        conduccionesPositivas_g1: datosEnPantalla.conduccionesPositivas,
        conduccionesNegativas_g1: datosEnPantalla.conduccionesNegativas,
        pendientes_g1: datosEnPantalla.pendientes,
        fecha: fechaActual
    };

    await ref.set(datosGuardar, { merge: false });
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

// ====== Resumen y Exportación ======
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
          <td>${(item.detenidos_g1 || item.detenidos || []).length}</td>
          <td>${(item.expulsados_g1 || item.expulsados || []).length}</td>
          <td>${(item.exp_frustradas_g1 || item.frustradas || []).length}</td>
          <td>${(item.fletados_g1 || item.fletados || []).length}</td>
          <td>${(item.fletadosFuturos_g1 || item.fletadosFuturos || []).length}</td>
          <td>${(item.conduccionesPositivas_g1 || item.conduccionesPositivas || []).map(c=>c.numero).reduce((a,b)=>a+b,0)}</td>
          <td>${(item.conduccionesNegativas_g1 || item.conduccionesNegativas || []).map(c=>c.numero).reduce((a,b)=>a+b,0)}</td>
          <td>${(item.pendientes_g1 || item.pendientes || []).length}</td>
        </tr>`;
    });
    html += "</tbody></table></div>";
    resumenVentana.innerHTML = html;
}

// Exportar PDF/CSV/WhatsApp = igual que tu código, puedes copiar y pegar, funciona igual

if (btnExportarPDF) { /* ... */ }
if (btnExportarCSV) { /* ... */ }
if (btnWhatsapp) { /* ... */ }

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
