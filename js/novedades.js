/* -----------------------------------------------------------------------------
 * novedades.js · SIREX 2025
 * Procesa un único DOCX diario y guarda simultáneamente los datos de
 * Grupo 1 (Expulsiones), Grupo 4 (Operativo) y Grupo Puerto en Firebase.
 *
 * ➊  Incluir en el <head> del HTML:
 *        <script src="https://unpkg.com/mammoth/mammoth.browser.min.js"></script>
 *        <script type="module" src="./novedades.js"></script>
 * ➋  Asegurarse de tener un <input type="file" id="inputDocx" />
 *     y un <div id="statusMsg"></div> para mensajes.
 * --------------------------------------------------------------------------- */

/* ===========================  IMPORTS FIREBASE  ============================ */
import {
  initializeApp,         // core
  getApps
}                            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,          // database
  doc, getDoc,
  writeBatch
}                            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================  CONFIG GLOBAL  ============================= */
const firebaseConfig = {
  apiKey:            "AIzaSyDTvriR7KjlAINO44xhDDvIDlc4T_4nilo",
  authDomain:        "ucrif-5bb75.firebaseapp.com",
  projectId:         "ucrif-5bb75",
  storageBucket:     "ucrif-5bb75.appspot.com",
  messagingSenderId: "241698436443",
  appId:             "1:241698436443:web:1f333b3ae3f813b755167e"
};
if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

/* ==============================  CONSTANTES  ============================== */
const GRUPO1      = "grupo1_expulsiones";
const GRUPO4      = "grupo4_operativo";
const GRUPOPUERTO = "grupoPuerto";

const MAPA_COLECCION = {
  [GRUPO1]:      "grupo1_expulsiones",
  [GRUPO4]:      "grupo4_operativo",
  [GRUPOPUERTO]: "grupoPuerto_registros"
};

/* ==========================================================================
 *                            UTILIDADES BÁSICAS
 * =========================================================================*/

/** Devuelve texto de estado en #statusMsg */
const status = (msg, tipo = "info") => {
  const node = document.getElementById("statusMsg");
  if (!node) return;
  const colores = { info: "#1565c0", ok: "#2e7d32", warn: "#ed6c02", err: "#c62828" };
  node.style.color = colores[tipo] || colores.info;
  node.textContent = msg;
};

/** Devuelve yyyy-mm-dd si encuentra una fecha dd/mm/aaaa o dd-mm-aaaa en un texto */
const extraerFechaISO = txt => {
  const m = txt.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
};

/** Convierte HTML a un elemento DOM contenedor */
const htmlToDiv = html => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
};

/* ==========================================================================
 *                       PARSER PRINCIPAL DEL DOCX
 * =========================================================================*/

/**
 * Lee un File .docx, lo pasa a HTML (via mammoth) y devuelve
 * { fechaISO, grupos: { grupoClave: datosExtraídos } }
 */
export const parseDocx = async file => {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer });
  const textoMayus = html.toUpperCase();
  const fechaISO   = extraerFechaISO(textoMayus);

  const grupos = {};
  if (textoMayus.includes("DETENIDOS")   && textoMayus.includes("EXPULSADOS"))
    grupos[GRUPO1] = parseGrupo1(html);
  if (textoMayus.includes("COLABORACION") && textoMayus.includes("CITADOS"))
    grupos[GRUPO4] = parseGrupo4(html);
  if (textoMayus.includes("PUERTO") &&
      (textoMayus.includes("CTRL.MARINOS") || textoMayus.includes("MARINOS ARGOS")))
    grupos[GRUPOPUERTO] = parseGrupoPuerto(html);

  if (!Object.keys(grupos).length)
    throw Error("No se reconoció ninguno de los formatos de grupo en el DOCX.");

  return { fechaISO, grupos };
};

/* ==========================================================================
 *                      PARSER DETALLADO · GRUPO 1                           *
 *   (Expulsiones – Detenidos / Expulsados / Fletados …)
 * =========================================================================*/
function parseGrupo1(html) {
  const root   = htmlToDiv(html);
  const tablas = Array.from(root.querySelectorAll("table"));
  const plain  = root.textContent || "";
  const fecha  = extraerFechaISO(plain);

  const g1 = {
    fecha,
    detenidos: [],
    expulsados: [],
    fletados: [],
    fletadosFuturos: [],
    conduccionesPositivas: [],
    conduccionesNegativas: [],
    pendientes: []
  };

  /* --- util interno --- */
  const sinGestiones = t => !t.querySelector("tr")?.textContent?.toUpperCase().includes("GESTIONES");
  const filas   = tb => Array.from(tb.querySelectorAll("tr"));
  const celdas  = tr => Array.from(tr.querySelectorAll("td"));
  const toInt   = s  => parseInt(s) || 0;

  tablas.filter(sinGestiones).forEach(tabla => {
    const head = filas(tabla)[0]?.textContent?.toUpperCase() || "";

    // Detenidos
    if (head.includes("DETENIDOS") && head.includes("MOTIVO")) {
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (t.length < 4) return;
        g1.detenidos.push({
          numero:        toInt(t[0].textContent.trim()),
          motivo:        t[1].textContent.trim(),
          nacionalidad:  t[2].textContent.trim(),
          diligencias:   t[3].textContent.trim(),
          observaciones: t[4]?.textContent.trim() || ""
        });
      });
    }

    // Expulsados
    if (head.includes("EXPULSADOS") && head.includes("NACIONALIDAD")) {
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (!t.length) return;
        g1.expulsados.push({
          nombre:           t[0].textContent.trim(),
          nacionalidad:     t[1].textContent.trim(),
          diligencias:      t[2]?.textContent.trim() || "",
          nConduccionesPos: toInt(t[3]?.textContent.trim()),
          conduccionesNeg:  toInt(t[4]?.textContent.trim()),
          observaciones:    t[5]?.textContent.trim() || ""
        });
      });
    }

    // Fletados actuales
    if (head.includes("FLETADOS") && head.includes("DESTINO") && !head.includes("FUTUROS")) {
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (t.length < 2) return;
        g1.fletados.push({
          destino:       t[0].textContent.trim(),
          pax:           toInt(t[1].textContent.trim()),
          observaciones: t[2]?.textContent.trim() || ""
        });
      });
    }

    // Fletados futuros
    if (head.includes("FLETADOS FUTUROS")) {
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (t.length < 2) return;
        g1.fletadosFuturos.push({
          destino: t[0].textContent.trim(),
          pax:     toInt(t[1].textContent.trim()),
          fecha:   t[2]?.textContent.trim() || ""
        });
      });
    }

    // Conducciones positivas / negativas
    const conducciones = (palabra, campo) => {
      if (!head.includes(palabra)) return;
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (!t.length) return;
        g1[campo].push({ numero: toInt(t[0].textContent.trim()), fecha: t[1]?.textContent.trim() || "" });
      });
    };
    conducciones("CONDUCCIONES POSITIVAS", "conduccionesPositivas");
    conducciones("CONDUCCIONES NEGATIVAS", "conduccionesNegativas");

    // Pendientes
    if (head.includes("PENDIENTES")) {
      filas(tabla).slice(1).forEach(tr => {
        const t = celdas(tr);
        if (!t.length) return;
        g1.pendientes.push({ descripcion: t[0].textContent.trim(), fecha: t[1]?.textContent.trim() || "" });
      });
    }
  });

  // Limpieza de vacíos
  Object.keys(g1).forEach(k => {
    if (Array.isArray(g1[k]) && !g1[k].length) delete g1[k];
  });
  return g1;
}

/* ==========================================================================
 *                      PARSER DETALLADO · GRUPO 4                           *
 * =========================================================================*/
function parseGrupo4(html) {
  const root   = htmlToDiv(html);
  const tablas = Array.from(root.querySelectorAll("table"));
  const plain  = root.textContent || "";

  const g4 = { fecha: extraerFechaISO(plain) };

  const map = (claves, campos, transform) => {
    for (const t of tablas) {
      const cab = t.querySelector("tr")?.textContent?.toUpperCase() || "";
      if (!claves.every(c => cab.includes(c.toUpperCase()))) continue;
      const arr = Array.from(t.querySelectorAll("tr")).slice(1).map(tr => {
        const td = Array.from(tr.querySelectorAll("td"));
        if (td.length < campos.length) return null;
        const obj = {};
        campos.forEach((campo, i) => (obj[campo] = td[i].textContent.trim()));
        return transform ? transform(obj) : obj;
      }).filter(Boolean);
      return arr;
    }
    return [];
  };

  g4.colaboraciones      = map(["COLABORACIONES"], ["descripcion", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));
  g4.detenidos           = map(["DETENIDOS"], ["motivo", "nacionalidad", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));
  g4.citados             = map(["CITADOS"], ["descripcion", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));
  g4.gestiones           = map(["OTRAS GESTIONES"], ["descripcion", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));
  g4.inspeccionesTrabajo = map(["INSPECCIONES TRABAJO"], ["descripcion", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));
  g4.otrasInspecciones   = map(["OTRAS INSPECCIONES"], ["descripcion", "cantidad"], o => ({ ...o, cantidad: +o.cantidad || 0 }));

  // Observaciones
  for (const t of tablas) {
    const cab = t.querySelector("tr")?.textContent?.toUpperCase() || "";
    if (!cab.includes("OBSERVACIONES")) continue;
    g4.observaciones = Array.from(t.querySelectorAll("tr td")).slice(1).map(td => td.textContent.trim()).join(" ");
    break;
  }

  Object.keys(g4).forEach(k => {
    if (Array.isArray(g4[k]) && !g4[k].length) delete g4[k];
    if (typeof g4[k] === "string" && !g4[k]) delete g4[k];
  });
  return g4;
}

/* ==========================================================================
 *                   PARSER DETALLADO · GRUPO PUERTO                         *
 * =========================================================================*/
function parseGrupoPuerto(html) {
  const root   = htmlToDiv(html);
  const tablas = Array.from(root.querySelectorAll("table"));
  const plain  = root.textContent || "";

  const puerto = { fecha: extraerFechaISO(plain), ferrys: [] };

  tablas.forEach(tabla => {
    const head = tabla.querySelector("tr")?.textContent?.toUpperCase() || "";
    const rows = Array.from(tabla.querySelectorAll("tr")).slice(1);
    const cells = tr => Array.from(tr.querySelectorAll("td"));

    // Estadísticas generales (una fila, muchas columnas)
    if (head.includes("CTRL.MARINOS") && head.includes("MARINOS ARGOS")) {
      rows.forEach(tr => {
        const t = cells(tr);
        if (t.length < 14) return;
        Object.assign(puerto, {
          ctrlMarinos:     t[0].textContent.trim(),
          marinosArgos:    t[1].textContent.trim(),
          cruceros:        t[2].textContent.trim(),
          cruceristas:     t[3].textContent.trim(),
          visadosCgef:     t[4].textContent.trim(),
          visadosValencia: t[5].textContent.trim(),
          visadosExp:      t[6].textContent.trim(),
          vehChequeados:   t[7].textContent.trim(),
          paxChequeadas:   t[8].textContent.trim(),
          detenidos:       t[9].textContent.trim(),
          denegaciones:    t[10].textContent.trim(),
          entrExcep:       t[11].textContent.trim(),
          eixics:          t[12].textContent.trim(),
          ptosDeportivos:  t[13].textContent.trim()
        });
      });
    }

    // Ferrys
    if (head.includes("FERRYS")) {
      rows.forEach(tr => {
        const t = cells(tr);
        if (!t.length) return;
        puerto.ferrys.push({
          tipo:       t[0].textContent.trim(),
          destino:    t[1].textContent.trim(),
          fecha:      t[2].textContent.trim(),
          hora:       t[3].textContent.trim(),
          pasajeros:  t[4].textContent.trim(),
          vehiculos:  t[5].textContent.trim(),
          incidencia: t[6]?.textContent.trim() || ""
        });
      });
    }

    // Observaciones
    if (head.includes("OBSERVACIONES")) {
      puerto.observaciones = rows.map(tr => tr.textContent.trim()).join(" ");
    }
  });

  // Limpieza
  Object.keys(puerto).forEach(k => {
    if (Array.isArray(puerto[k]) && !puerto[k].length) delete puerto[k];
    if (typeof puerto[k] === "string" && !puerto[k]) delete puerto[k];
  });
  return puerto;
}

/* ==========================================================================
 *                       VALIDACIÓN LIGERA (solo avisos)                     *
 * =========================================================================*/
function validar(grupo, datos) {
  const vacio = Array.isArray(datos)
    ? datos.length === 0
    : typeof datos === "object"
      ? !Object.keys(datos).length
      : !datos;
  return vacio ? `⚠️ ${grupo}: sin datos` : "";
}

/* ==========================================================================
 *                       GUARDADO EN FIRESTORE (batch)                       *
 * =========================================================================*/
async function guardarParte({ fechaISO, grupos }) {
  if (!fechaISO) throw Error("No se detectó la fecha en el documento.");
  const batch  = writeBatch(db);
  const avisos = [];

  for (const [grupoClave, datos] of Object.entries(grupos)) {
    const ref     = doc(db, MAPA_COLECCION[grupoClave], fechaISO);
    const existe  = await getDoc(ref);
    let continuar = true;

    if (existe.exists()) {
      continuar = confirm(`Ya existe parte de ${grupoClave} para ${fechaISO}.\n¿Sobrescribir?`);
    }
    if (!continuar) {
      avisos.push(`↩️ ${grupoClave}: no se ha modificado (existía y se canceló).`);
      continue;
    }

    const aviso = validar(grupoClave, datos);
    if (aviso) avisos.push(aviso);
    batch.set(ref, datos, { merge: true });
  }

  await batch.commit();
  return avisos;
}

/* ==========================================================================
 *                          UI / EVENTOS PRINCIPALES                         *
 * =========================================================================*/
const inputDocx = document.getElementById("inputDocx");
if (inputDocx) {
  inputDocx.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    status("Procesando DOCX …", "info");

    try {
      const info   = await parseDocx(file);
      const avisos = await guardarParte(info);
      const okMsg  = avisos.length ? `Parte guardado.\n${avisos.join("\n")}` : "Parte guardado correctamente.";
      status(okMsg, "ok");
    } catch (err) {
      console.error(err);
      status(err.message, "err");
    } finally {
      e.target.value = ""; // limpia input file
    }
  });
} else {
  console.warn("[novedades.js] Falta el input #inputDocx en el DOM.");
}

/* ==========================================================================
 *                               FIN DEL SCRIPT                              *
 * =========================================================================*/
