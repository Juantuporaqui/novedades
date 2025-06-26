// js/novedades.js
import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ------------------------------
//  Utilidades de Interfaz
// ------------------------------
function mostrarEstado(mensaje, tipo = "info") {
    let statusDiv = document.getElementById("estadoCarga");
    if (!statusDiv) {
        statusDiv = document.createElement("div");
        statusDiv.id = "estadoCarga";
        statusDiv.style.position = "fixed";
        statusDiv.style.top = "10px";
        statusDiv.style.right = "10px";
        statusDiv.style.padding = "12px 22px";
        statusDiv.style.borderRadius = "10px";
        statusDiv.style.background = tipo === "error" ? "#e74646" : "#28b063";
        statusDiv.style.color = "#fff";
        statusDiv.style.zIndex = 9999;
        statusDiv.style.boxShadow = "0 4px 24px #0002";
        document.body.appendChild(statusDiv);
    }
    statusDiv.innerText = mensaje;
    setTimeout(() => { statusDiv.remove(); }, 4000);
}

function mostrarSpinner(visible = true) {
    let sp = document.getElementById("spinnerCarga");
    if (!sp && visible) {
        sp = document.createElement("div");
        sp.id = "spinnerCarga";
        sp.innerHTML = '<div style="width:80px;height:80px;border:10px solid #e4f6fd;border-top:10px solid #079cd8;border-radius:50%;animation:spin 1s linear infinite;margin:auto"></div>';
        sp.style.position = "fixed";
        sp.style.left = "0"; sp.style.top = "0";
        sp.style.width = "100vw"; sp.style.height = "100vh";
        sp.style.background = "#fff8";
        sp.style.zIndex = 10000;
        sp.style.display = "flex";
        sp.style.justifyContent = "center";
        sp.style.alignItems = "center";
        document.body.appendChild(sp);
        const style = document.createElement("style");
        style.innerHTML = "@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}";
        document.head.appendChild(style);
    } else if (sp && !visible) {
        sp.remove();
    }
}

// ------------------------------
//  Lógica de importación DOCX
// ------------------------------

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('inputDocx').addEventListener('change', handleDocxUpload);
});

// Lógica principal al subir DOCX
async function handleDocxUpload(event) {
    const file = event.target.files[0];
    if (!file) return mostrarEstado("No se ha seleccionado archivo", "error");

    mostrarSpinner(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        const novedadesEstructuradas = extraerYMapearDatos(result.value);
        autocompletarYMostrarFormularios(novedadesEstructuradas);
        await guardarTodasNovedades(novedadesEstructuradas);
        mostrarEstado("¡Importación y guardado completados!");
    } catch (err) {
        mostrarEstado("Error procesando DOCX: " + err, "error");
        console.error(err);
    } finally {
        mostrarSpinner(false);
    }
}

// Extrae y mapea datos desde el HTML generado por Mammoth
function extraerYMapearDatos(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // --- Detecta todos los títulos de grupo y las tablas siguientes ---
    const novedadesPorGrupo = {};
    const titulos = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5')).filter(e => /grupo/i.test(e.textContent));
    titulos.forEach((titulo, i) => {
        const tabla = titulo.nextElementSibling && titulo.nextElementSibling.tagName === "TABLE"
            ? titulo.nextElementSibling
            : null;
        if (tabla) {
            const grupo = titulo.textContent.trim().replace(":", "").toUpperCase();
            novedadesPorGrupo[grupo] = tablaAObjetos(tabla);
        }
    });
    return novedadesPorGrupo;
}

// Convierte una tabla DOM a array de objetos (campos: Asunto, Gestión, Observaciones)
function tablaAObjetos(tabla) {
    const filas = Array.from(tabla.querySelectorAll('tr'));
    if (filas.length < 2) return [];
    const encabezados = Array.from(filas[0].querySelectorAll('td,th')).map(td => td.textContent.trim().toLowerCase());
    return filas.slice(1).map(fila => {
        const celdas = Array.from(fila.querySelectorAll('td')).map(td => td.textContent.trim());
        let obj = {};
        encabezados.forEach((h, i) => { obj[h] = celdas[i] || ""; });
        return obj;
    });
}

// Autocompleta y muestra formularios para revisión visual (solo lectura)
function autocompletarYMostrarFormularios(novedadesPorGrupo) {
    const cont = document.getElementById('formularios-grupos');
    cont.innerHTML = '';
    Object.entries(novedadesPorGrupo).forEach(([grupo, novedades]) => {
        const form = document.createElement('form');
        form.innerHTML = `<h3 style="color:#079cd8">${grupo}</h3>`;
        novedades.forEach((n, idx) => {
            form.innerHTML += `
                <div style="margin:6px 0;border-bottom:1px solid #ddd;padding-bottom:6px">
                    <b>Asunto:</b> <input readonly value="${n.asunto || ""}" style="width:40%">
                    <b>Gestión:</b> <input readonly value="${n.gestión || n.gestion || ""}" style="width:40%">
                    <b>Observaciones:</b> <input readonly value="${n.observaciones || n.obs || ""}" style="width:40%">
                </div>
            `;
        });
        cont.appendChild(form);
    });
}

// Guarda todas las novedades de todos los grupos en Firestore
async function guardarTodasNovedades(novedadesPorGrupo) {
    // Almacena bajo colección "novedades_diarias/{fecha}/grupo"
    const fechaStr = (new Date()).toISOString().slice(0, 10);
    for (const [grupo, novedades] of Object.entries(novedadesPorGrupo)) {
        const colRef = collection(db, `novedades_diarias/${fechaStr}/${grupo.replace(/\s+/g, '_').toLowerCase()}`);
        for (const novedad of novedades) {
            await addDoc(colRef, {
                ...novedad,
                fecha: fechaStr,
                timestamp: serverTimestamp()
            });
        }
    }
}
