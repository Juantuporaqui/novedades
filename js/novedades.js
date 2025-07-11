// ========== SIREX 2025 - novedades.js COMPLETO ==========
// Subida DOCX multi-grupo y edición por grupo. Firebase modular + Mammoth.js
// Requiere: <script src="https://unpkg.com/mammoth/mammoth.browser.min.js"></script>
//           <input type="file" id="inputDocx" accept=".docx">

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ====== CONFIG FIREBASE ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain: "ucrif-5bb75.firebaseapp.com",
  projectId: "ucrif-5bb75",
  storageBucket: "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId: "1:241698436443:web:1f333b3ae3f813b755167e"
};
if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

const GRUPO1      = "grupo1_expulsiones";
const GRUPO4      = "grupo4_operativo";
const GRUPOPUERTO = "grupoPuerto";
const MAPA_COLEC  = {
  [GRUPO1]:      "grupo1_expulsiones",
  [GRUPO4]:      "grupo4_operativo",
  [GRUPOPUERTO]: "grupoPuerto_registros"
};

/* ====== PARSEO DOCX Y SUBIDA ====== */
async function parseDocx(file) {
  const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const upper = html.toUpperCase();
  const fechaMatch = upper.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  const fechaISO = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2].padStart(2, '0')}-${fechaMatch[1].padStart(2, '0')}` : "";

  const resultados = {};
  if (upper.includes("DETENIDOS") && upper.includes("EXPULSADOS"))
    resultados[GRUPO1] = parseGrupo1(html);
  if (upper.includes("COLABORACION") && upper.includes("CITADOS"))
    resultados[GRUPO4] = parseGrupo4(html);
  if (upper.includes("PUERTO") && (upper.includes("CTRL.MARINOS") || upper.includes("MARINOS ARGOS") || upper.includes("CRUCEROS") || upper.includes("FERRYS")))
    resultados[GRUPOPUERTO] = parseGrupoPuerto(html);

  return { fechaISO, resultados };
}

/* ====== PARSER GRUPO 1 ====== */
function parseGrupo1(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  const plain = root.innerText || root.textContent || "";
  let m = plain.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  const fecha = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';

  const grupo1 = {};

  const sinGestiones = t => {
    const head = t.querySelector('tr')?.textContent?.toUpperCase() || '';
    return !head.includes('GESTIONES');
  };

  // Detenidos
  grupo1.detenidos = [];
  tablas.filter(sinGestiones).forEach(tabla => {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    const encabezado = rows[0].textContent.toUpperCase();
    if (encabezado.includes('DETENIDOS') && encabezado.includes('MOTIVO')) {
      rows.slice(1).forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < 4) return;
        const obj = {
          numero:        parseInt(td[0].textContent.trim()) || '',
          motivo:        td[1].textContent.trim() || '',
          nacionalidad:  td[2].textContent.trim() || '',
          diligencias:   td[3].textContent.trim() || '',
          observaciones: td[4]?.textContent.trim() || ''
        };
        if (Object.values(obj).some(x => x !== ''))
          grupo1.detenidos.push(obj);
      });
    }
  });
  if (!grupo1.detenidos.length) delete grupo1.detenidos;

  // Expulsados
  grupo1.expulsados = [];
  tablas.filter(sinGestiones).forEach(tabla => {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    const head = rows[0].textContent.toUpperCase();
    if (head.includes('EXPULSADOS') && head.includes('NACIONALIDAD')) {
      rows.slice(1).forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < 2) return;
        const obj = {
          nombre:            td[0].textContent.trim() || '',
          nacionalidad:      td[1].textContent.trim() || '',
          diligencias:       td[2]?.textContent.trim() || '',
          nConduccionesPos:  parseInt(td[3]?.textContent.trim()) || 0,
          conduccionesNeg:   parseInt(td[4]?.textContent.trim()) || 0,
          observaciones:     td[5]?.textContent.trim() || ''
        };
        if (obj.nombre || obj.nacionalidad) grupo1.expulsados.push(obj);
      });
    }
  });
  if (!grupo1.expulsados.length) delete grupo1.expulsados;

  // Fletados actuales
  grupo1.fletados = [];
  tablas.filter(sinGestiones).forEach(tabla => {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    const head = rows[0].textContent.toUpperCase();
    if (head.includes('FLETADOS') && head.includes('DESTINO') && !head.includes('FUTUROS')) {
      rows.slice(1).forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < 2) return;
        const obj = {
          destino:       td[0].textContent.trim() || '',
          pax:           parseInt(td[1].textContent.trim()) || 0,
          observaciones: td[2]?.textContent.trim() || ''
        };
        if (obj.destino) grupo1.fletados.push(obj);
      });
    }
  });
  if (!grupo1.fletados.length) delete grupo1.fletados;

  // Fletados futuros
  grupo1.fletadosFuturos = [];
  tablas.filter(sinGestiones).forEach(tabla => {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    const head = rows[0].textContent.toUpperCase();
    if (head.includes('FLETADOS FUTUROS')) {
      rows.slice(1).forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < 2) return;
        const obj = {
          destino: td[0].textContent.trim() || '',
          pax:     parseInt(td[1].textContent.trim()) || 0,
          fecha:   td[2]?.textContent.trim() || ''
        };
        if (obj.destino) grupo1.fletadosFuturos.push(obj);
      });
    }
  });
  if (!grupo1.fletadosFuturos.length) delete grupo1.fletadosFuturos;

  // Conducciones positivas/negativas
  const extraerConducciones = (clave, palabra) => {
    grupo1[clave] = [];
    tablas.filter(sinGestiones).forEach(tabla => {
      const rows = Array.from(tabla.querySelectorAll('tr'));
      const head = rows[0].textContent.toUpperCase();
      if (head.includes(palabra)) {
        rows.slice(1).forEach(tr => {
          const td = Array.from(tr.querySelectorAll('td'));
          if (!td.length) return;
          const obj = {
            numero: parseInt(td[0].textContent.trim()) || 0,
            fecha : td[1]?.textContent.trim() || ''
          };
          if (obj.numero) grupo1[clave].push(obj);
        });
      }
    });
    if (!grupo1[clave].length) delete grupo1[clave];
  };
  extraerConducciones('conduccionesPositivas','CONDUCCIONES POSITIVAS');
  extraerConducciones('conduccionesNegativas','CONDUCCIONES NEGATIVAS');

  // Pendientes
  grupo1.pendientes = [];
  tablas.filter(sinGestiones).forEach(tabla => {
    const rows = Array.from(tabla.querySelectorAll('tr'));
    const head = rows[0].textContent.toUpperCase();
    if (head.includes('PENDIENTES')) {
      rows.slice(1).forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (!td.length) return;
        const obj = {
          descripcion: td[0].textContent.trim() || '',
          fecha:       td[1]?.textContent.trim() || ''
        };
        if (obj.descripcion) grupo1.pendientes.push(obj);
      });
    }
  });
  if (!grupo1.pendientes.length) delete grupo1.pendientes;

  return grupo1;
}

/* ====== PARSER GRUPO 4 ====== */
function parseGrupo4(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  const plain = root.innerText || root.textContent || "";
  let m = plain.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  const fecha = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';

  const grupo4 = {};

  const mapSeccion = (palabras, campos, parseFn) => {
    for (const t of tablas) {
      const cab = t.querySelector('tr')?.textContent?.toUpperCase() || '';
      if (!palabras.every(p => cab.includes(p.toUpperCase()))) continue;
      const filas = Array.from(t.querySelectorAll('tr')).slice(1);
      const arr = [];
      filas.forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < campos.length) return;
        const obj = {};
        campos.forEach((campo, i) => obj[campo] = td[i].textContent.trim() || '');
        if (parseFn) Object.assign(obj, parseFn(obj));
        if (Object.values(obj).some(v => v !== '')) arr.push(obj);
      });
      return arr;
    }
    return [];
  };

  grupo4.colaboraciones      = mapSeccion(['COLABORACIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.colaboraciones.length) delete grupo4.colaboraciones;

  grupo4.detenidos           = mapSeccion(['DETENIDOS'],['motivo','nacionalidad','cantidad'],
                                          o=>({motivo:o.motivo,nacionalidad:o.nacionalidad,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.detenidos.length) delete grupo4.detenidos;

  grupo4.citados             = mapSeccion(['CITADOS'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.citados.length) delete grupo4.citados;

  grupo4.gestiones           = mapSeccion(['OTRAS GESTIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.gestiones.length) delete grupo4.gestiones;

  grupo4.inspeccionesTrabajo = mapSeccion(['INSPECCIONES TRABAJO'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.inspeccionesTrabajo.length) delete grupo4.inspeccionesTrabajo;

  grupo4.otrasInspecciones   = mapSeccion(['OTRAS INSPECCIONES'],['desc','cantidad'],o=>({descripcion:o.desc,cantidad:parseInt(o.cantidad)||0}));
  if(!grupo4.otrasInspecciones.length) delete grupo4.otrasInspecciones;

  tablas.forEach(t => {
    const cab = t.querySelector('tr')?.textContent?.toUpperCase() || '';
    if (!cab.includes('OBSERVACIONES')) return;
    const txt = Array.from(t.querySelectorAll('tr td')).slice(1).map(td => td.textContent.trim()).join(' ');
    if (txt) grupo4.observaciones = txt;
  });

  return grupo4;
}

/* ====== PARSER GRUPO PUERTO ====== */
function parseGrupoPuerto(html) {
  const root = document.createElement('div'); root.innerHTML = html;
  const tablas = Array.from(root.querySelectorAll('table'));
  const plain = root.innerText || root.textContent || "";
  let m = plain.match(/(\\d{4})[\\/\\-](\\d{2})[\\/\\-](\\d{2})|(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  const fecha = m
    ? (m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5].padStart(2, '0')}-${m[4].padStart(2, '0')}`)
    : '';

  const puerto = {
    ctrlMarinos:'', marinosArgos:'', cruceros:'', cruceristas:'', visadosCgef:'', visadosValencia:'',
    visadosExp:'', vehChequeados:'', paxChequeadas:'', detenidos:'', denegaciones:'',
    entrExcep:'', eixics:'', ptosDeportivos:'', ferrys:[], observaciones:''
  };

  tablas.forEach(tabla => {
    const head = tabla.querySelector('tr')?.textContent?.toUpperCase() || '';

    // Estadísticas principales
    if ((head.includes('CTRL.MARINOS') || head.includes('CTRL. MARINOS'))
        && head.includes('MARINOS ARGOS')
        && head.includes('CRUCEROS')) {
      const filas = Array.from(tabla.querySelectorAll('tr')).slice(1);
      filas.forEach(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length >= 14) {
          puerto.ctrlMarinos     = td[0]?.textContent.trim()||'';
          puerto.marinosArgos    = td[1]?.textContent.trim()||'';
          puerto.cruceros        = td[2]?.textContent.trim()||'';
          puerto.cruceristas     = td[3]?.textContent.trim()||'';
          puerto.visadosCgef     = td[4]?.textContent.trim()||'';
          puerto.visadosValencia = td[5]?.textContent.trim()||'';
          puerto.visadosExp      = td[6]?.textContent.trim()||'';
          puerto.vehChequeados   = td[7]?.textContent.trim()||'';
          puerto.paxChequeadas   = td[8]?.textContent.trim()||'';
          puerto.detenidos       = td[9]?.textContent.trim()||'';
          puerto.denegaciones    = td[10]?.textContent.trim()||'';
          puerto.entrExcep       = td[11]?.textContent.trim()||'';
          puerto.eixics          = td[12]?.textContent.trim()||'';
          puerto.ptosDeportivos  = td[13]?.textContent.trim()||'';
        }
      });
    }

    // Ferrys
    if (head.includes('FERRYS')) {
      const filas = Array.from(tabla.querySelectorAll('tr')).slice(1);
      puerto.ferrys = filas.map(tr => {
        const td = Array.from(tr.querySelectorAll('td'));
        return {
          tipo:       td[0]?.textContent.trim()||'',
          destino:    td[1]?.textContent.trim()||'',
          fecha:      td[2]?.textContent.trim()||'',
          hora:       td[3]?.textContent.trim()||'',
          pasajeros:  td[4]?.textContent.trim()||'',
          vehiculos:  td[5]?.textContent.trim()||'',
          incidencia: td[6]?.textContent.trim()||''
        };
      }).filter(f=>Object.values(f).some(v=>v));
    }

    // Observaciones
    if (head.includes('OBSERVACIONES')) {
      puerto.observaciones = Array.from(tabla.querySelectorAll('tr td')).slice(1).map(td=>td.textContent.trim()).join(' ').trim();
    }
  });

  // Eliminar vacíos
  Object.keys(puerto).forEach(k=>{
    if(Array.isArray(puerto[k]) && !puerto[k].length)          delete puerto[k];
    else if(!Array.isArray(puerto[k]) && puerto[k]==='')       delete puerto[k];
  });

  return puerto;
}

/* ====== VALIDACIÓN (solo AVISA, no bloquea) ====== */
function valida(grupo, datos) {
  const vacio = Array.isArray(datos) ? datos.length === 0
    : typeof datos === "object" ? Object.keys(datos).length === 0
    : !datos;
  return vacio ? `⚠️ ${grupo}: sin datos` : "";
}

/* ====== GUARDA LOS TRES GRUPOS EN BATCH ====== */
async function guardarParte({ fechaISO, resultados }) {
  if (!fechaISO) throw Error("No se detectó la fecha en el documento.");

  const batch = writeBatch(db);
  const avisos = [];

  for (const [grupo, datos] of Object.entries(resultados)) {
    const ref = doc(db, MAPA_COLEC[grupo], fechaISO);
    const ya = await getDoc(ref);
    if (ya.exists()) {
      const sobre = confirm(`Ya existe parte de ${grupo} para ${fechaISO}.\n¿Sustituirlo?`);
      if (!sobre) continue;
    }
    const aviso = valida(grupo, datos);
    if (aviso) avisos.push(aviso);
    batch.set(ref, datos, { merge: true });
  }
  await batch.commit();
  return avisos;
}

/* ====== SUBIDA DE DOCX ====== */
document.getElementById("inputDocx").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const info = await parseDocx(file);
    const avisos = await guardarParte(info);

    alert("✅ Parte guardado correctamente.\n\n" + avisos.join("\\n"));
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  } finally {
    e.target.value = "";
  }
});

/* ====== HELPERS PARA CONSULTA Y EDICIÓN ====== */
// Consulta parte de grupo y fecha
window.cargarGrupo = async function (grupo, fechaISO, callback) {
  if (!MAPA_COLEC[grupo]) throw Error("Grupo no válido");
  const ref = doc(db, MAPA_COLEC[grupo], fechaISO);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw Error("No hay parte en esa fecha");
  if (callback) callback(snap.data());
  return snap.data();
};

// Guarda edición de grupo y fecha
window.guardarGrupo = async function (grupo, fechaISO, datosFn) {
  if (!MAPA_COLEC[grupo]) throw Error("Grupo no válido");
  if (!fechaISO) throw Error("Debes indicar la fecha");
  let datos = (typeof datosFn === 'function') ? datosFn() : datosFn;
  await setDoc(doc(db, MAPA_COLEC[grupo], fechaISO), datos, { merge: true });
  alert("Guardado correctamente.");
};
