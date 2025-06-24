// --- Inicialización Firebase ---
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

// --- Referencias DOM ---
const form = document.getElementById('formCIE');
const fechaCIE = document.getElementById('fechaCIE');
const descripcionBreve = document.getElementById('descripcionBreve');
const tipoActuacion = document.getElementById('tipoActuacion');
const nInternos = document.getElementById('nInternos');
const nacionalidadInterno = document.getElementById('nacionalidadInterno');
const numInternosNac = document.getElementById('numInternosNac');
const btnAddInternoNac = document.getElementById('btnAddInternoNac');
const ventanaInternosNac = document.getElementById('ventanaInternosNac');
const nacionalidadIngreso = document.getElementById('nacionalidadIngreso');
const numIngresos = document.getElementById('numIngresos');
const btnAddIngreso = document.getElementById('btnAddIngreso');
const ventanaIngresos = document.getElementById('ventanaIngresos');
const destinoSalida = document.getElementById('destinoSalida');
const numSalidas = document.getElementById('numSalidas');
const btnAddSalida = document.getElementById('btnAddSalida');
const ventanaSalidas = document.getElementById('ventanaSalidas');
const nombrePersona = document.getElementById('nombrePersona');
const nacionalidadPersona = document.getElementById('nacionalidadPersona');
const motivo = document.getElementById('motivo');
const observaciones = document.getElementById('observaciones');
const panelResumen = document.getElementById('panelResumenCIE');
const resumenDiv = document.getElementById('resumenCIE');

let internosNac = [];
let ingresos = [];
let salidas = [];

// --- Helpers ---
function showToast(msg) { alert(msg); }
function limpiarForm() { form.reset(); internosNac=[]; ingresos=[]; salidas=[]; renderAll(); }
function renderAll() {
    renderList(ventanaInternosNac, internosNac, (i) => { internosNac.splice(i,1); renderAll(); });
    renderList(ventanaIngresos, ingresos, (i) => { ingresos.splice(i,1); renderAll(); });
    renderList(ventanaSalidas, salidas, (i) => { salidas.splice(i,1); renderAll(); });
}
function renderList(container, lista, eliminarFn) {
    container.innerHTML = "";
    if (!lista.length) {
        container.innerHTML = "<span class='text-muted'>Sin datos</span>";
        return;
    }
    lista.forEach((item,i)=>{
        const div = document.createElement('div');
        div.className = "dato-item";
        div.innerHTML = `<span>${Object.values(item).join(" · ")}</span>`;
        const btn = document.createElement('button');
        btn.textContent = "🗑";
        btn.onclick = () => eliminarFn(i);
        btn.style = "margin-left:1em; border:none; background:none; cursor:pointer;";
        div.appendChild(btn);
        container.appendChild(div);
    });
}
// --- Añadir dinámicos ---
btnAddInternoNac.onclick = () => {
    const n = nacionalidadInterno.value.trim();
    const v = parseInt(numInternosNac.value) || 0;
    if (!n || v<=0) return showToast("Introduce nacionalidad y número > 0");
    internosNac.push({nacionalidad:n, numero:v});
    nacionalidadInterno.value = ""; numInternosNac.value = "";
    renderAll();
};
btnAddIngreso.onclick = () => {
    const n = nacionalidadIngreso.value.trim();
    const v = parseInt(numIngresos.value) || 0;
    if (!n || v<=0) return showToast("Introduce nacionalidad y número > 0");
    ingresos.push({nacionalidad:n, numero:v});
    nacionalidadIngreso.value = ""; numIngresos.value = "";
    renderAll();
};
btnAddSalida.onclick = () => {
    const d = destinoSalida.value.trim();
    const v = parseInt(numSalidas.value) || 0;
    if (!d || v<=0) return showToast("Introduce destino y número > 0");
    salidas.push({destino:d, numero:v});
    destinoSalida.value = ""; numSalidas.value = "";
    renderAll();
};

// --- Guardar en Firebase ---
form.addEventListener('submit', async function(e){
    e.preventDefault();
    if (!fechaCIE.value) return showToast("Selecciona fecha");
    const datos = {
        fecha: fechaCIE.value,
        descripcionBreve: descripcionBreve.value.trim(),
        tipoActuacion: tipoActuacion.value.trim(),
        nInternos: parseInt(nInternos.value)||0,
        internosNac: internosNac.slice(),
        ingresos: ingresos.slice(),
        salidas: salidas.slice(),
        nombrePersona: nombrePersona.value.trim(),
        nacionalidadPersona: nacionalidadPersona.value.trim(),
        motivo: motivo.value.trim(),
        observaciones: observaciones.value.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("grupo_cie").doc(fechaCIE.value).set(datos);
    showToast("Registro guardado correctamente.");
    mostrarResumen(datos);
});
function mostrarResumen(datos) {
    panelResumen.style.display = "block";
    resumenDiv.innerHTML = `
    <b>Fecha:</b> ${datos.fecha}<br>
    <b>Descripción:</b> ${datos.descripcionBreve}<br>
    <b>Tipo de actuación:</b> ${datos.tipoActuacion}<br>
    <b>Nº internos total:</b> ${datos.nInternos}<br>
    <b>Internos por nacionalidad:</b> ${datos.internosNac?.map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}<br>
    <b>Ingresos:</b> ${datos.ingresos?.map(i=>`${i.nacionalidad}: ${i.numero}`).join(", ")}<br>
    <b>Salidas:</b> ${datos.salidas?.map(i=>`${i.destino}: ${i.numero}`).join(", ")}<br>
    <b>Nombre persona:</b> ${datos.nombrePersona}<br>
    <b>Nacionalidad persona:</b> ${datos.nacionalidadPersona}<br>
    <b>Motivo:</b> ${datos.motivo}<br>
    <b>Observaciones:</b> ${datos.observaciones}
    `;
}

// --- Cargar por fecha ---
document.getElementById('btnCargar').onclick = async ()=>{
    if (!fechaCIE.value) return showToast("Selecciona una fecha");
    const doc = await db.collection("grupo_cie").doc(fechaCIE.value).get();
    if (!doc.exists) { showToast("No hay registro para esa fecha"); return; }
    const d = doc.data();
    descripcionBreve.value = d.descripcionBreve||"";
    tipoActuacion.value = d.tipoActuacion||"";
    nInternos.value = d.nInternos||"";
    internosNac = Array.isArray(d.internosNac)?d.internosNac:[]; 
    ingresos = Array.isArray(d.ingresos)?d.ingresos:[]; 
    salidas = Array.isArray(d.salidas)?d.salidas:[];
    nombrePersona.value = d.nombrePersona||"";
    nacionalidadPersona.value = d.nacionalidadPersona||"";
    motivo.value = d.motivo||"";
    observaciones.value = d.observaciones||"";
    renderAll();
    mostrarResumen(d);
};
// --- Nuevo (reset) ---
document.getElementById('btnNuevo').onclick = ()=>{ limpiarForm(); panelResumen.style.display="none"; };
// --- Init hoy ---
window.addEventListener('DOMContentLoaded', ()=>{
    const hoy = new Date().toISOString().slice(0,10);
    fechaCIE.value = hoy;
    limpiarForm();
    panelResumen.style.display = "none";
});
