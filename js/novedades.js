/* ---------------------------------------------------------------------------
   SIREX – Procesamiento de novedades (Grupo 1, Grupo 4 Operativo, Puerto, CECOREX, Gestion)
   Profesional 2025 – Auto-importa partes oficiales en DOCX y los guarda en Firebase.
--------------------------------------------------------------------------- */
let parsedDataForConfirmation = null; // { datos: { [grupo]: datos }, fecha }

document.addEventListener('DOMContentLoaded', () => {

  /* ===========================  CONFIG FIREBASE  ============================ */
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

  /* =============================  CONSTANTES  =============================== */
  const GROUP1 = "grupo1_expulsiones";
  const GROUP4 = "grupo4_operativo";
  const GROUPPUERTO = "grupoPuerto";
  const GROUPCECOREX = "cecorex";
  const GROUPGESTION = "gestion";


  /* ============================  ELEMENTOS DOM  ============================= */
  const $ = id => document.getElementById(id);

  const inputDocx = $('inputDocx');
  const statusContainer = $('status-container');
  const resultsContainer = $('results-container');
  const confirmationButtons = $('confirmation-buttons');
  const btnConfirmarGuardado = $('btnConfirmarGuardado');
  const btnCancelar = $('btnCancelar');
  const fechaEdicionDiv = $('fecha-edicion');
  const fechaManualInput = $('fechaManualInput');
  const fechaDetectadaBadge = $('fechaDetectadaBadge');
  const spinnerArea = $('spinner-area');

  /* ==============================  EVENTOS  ================================= */
  if (fechaManualInput) {
    fechaManualInput.addEventListener('input', () => {
      const fechaFinal = obtenerFechaFormateada();
      // Vuelve a validar todos los datos usando la fecha elegida
      if (parsedDataForConfirmation && parsedDataForConfirmation.datos) {
        const errores = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
        if (!errores.length) {
          btnConfirmarGuardado.disabled = false;
          showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.', 'info');
        } else {
          btnConfirmarGuardado.disabled = true;
          showStatus('<ul>' + errores.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
        }
      }
    });
  }
  if (inputDocx) inputDocx.addEventListener('change', handleDocxUpload);
  if (btnConfirmarGuardado) btnConfirmarGuardado.addEventListener('click', onConfirmSave);
  if (btnCancelar) btnCancelar.addEventListener('click', onCancel);

  /* ============================  UI HELPERS  ================================ */
  const showStatus = (msg, type = 'info') => {
    const cls = {
      info: 'alert-info',
      success: 'alert-success',
      warning: 'alert-warning',
      danger: 'alert-danger',
      error: 'alert-danger'
    };
    statusContainer.innerHTML = `<div class="alert ${cls[type]||cls.info}" role="alert">${msg}</div>`;
  };
  const showSpinner = v => spinnerArea.style.display = v ? 'flex' : 'none';
  const showConfirmationUI = v => confirmationButtons.style.display = v ? 'block' : 'none';

  const showResults = obj => {
    resultsContainer.innerHTML = '<h3><i class="bi bi-card-checklist"></i> Datos extraídos</h3>';
    Object.entries(obj).forEach(([k, datos]) => {
      if (k === 'fecha') return;
      if (Array.isArray(datos) && !datos.length) return;
      if (typeof datos === 'object' && datos !== null && !Array.isArray(datos) && !Object.keys(datos).length) return;

      const card = document.createElement('div');
      card.className = 'card mb-3 shadow-sm';
      card.innerHTML =
        `<div class="card-header bg-light"><strong>${k.toUpperCase()}</strong></div>
         <div class="card-body"><pre class="results-card">${JSON.stringify(datos,null,2)}</pre></div>`;
      resultsContainer.appendChild(card);
    });
  };

  const showFechaEditable = iso => {
    fechaEdicionDiv.style.display = "flex";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) {
      fechaManualInput.value = iso;
      fechaDetectadaBadge.textContent = "Detectada: " + iso.split('-').reverse().join('/');
      fechaDetectadaBadge.className = "badge bg-success";
    } else {
      fechaManualInput.value = "";
      fechaDetectadaBadge.textContent = "No detectada";
      fechaDetectadaBadge.className = "badge bg-secondary";
    }
  };
  const obtenerFechaFormateada = () => fechaManualInput.value || "";

  /* ==========================  SUBIR Y PARSEAR  ============================= */
  async function handleDocxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    onCancel();
    showSpinner(true);
    showStatus('Procesando archivo …', 'info');

    if (!file.name.toLowerCase().endsWith('.docx')) {
      showStatus('Solo se admiten archivos DOCX.', 'danger');
      showSpinner(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const {
        value: html
      } = await mammoth.convertToHtml({
        arrayBuffer
      });

      // === Parseo de todos los grupos reconocidos ===
      const r1 = parseGrupo1(html);
      const r4 = parseGrupo4(html);
      const rp = parseGrupoPuerto(html);
      const rc = parseGrupoCECOREX(html);
      const rg = parseGestion(html);

      // === Recopilación de resultados ===
      const resultados = {};
      if (Object.keys(r1.datos).length) resultados[GROUP1] = r1.datos;
      if (Object.keys(r4.datos).length) resultados[GROUP4] = r4.datos;
      if (Object.keys(rp.datos).length) resultados[GROUPPUERTO] = rp.datos;
      if (Object.keys(rc.datos).length) resultados[GROUPCECOREX] = rc.datos;
      if (Object.keys(rg.datos).length) resultados[GROUPGESTION] = rg.datos;

      // Extrae la fecha más significativa
      const fecha = r1.fecha || r4.fecha || rp.fecha || rc.fecha || rg.fecha || "";

      if (!Object.keys(resultados).length) {
        throw new Error("No se reconoció el formato del parte DOCX o no contenía datos en las secciones esperadas.");
      }

      parsedDataForConfirmation = {
        datos: resultados,
        fecha
      };
      showFechaEditable(fecha);
      showResults({ ...resultados,
        fecha
      });

      const erroresValidacion = validarDatosPorTodos(resultados, fecha);
      if (erroresValidacion.length) {
        showStatus('<ul>' + erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
        btnConfirmarGuardado.disabled = true;
      } else {
        showStatus('Datos extraídos. Revisa/corrige la fecha y confirma para guardar.', 'info');
        btnConfirmarGuardado.disabled = false;
      }
      showConfirmationUI(true);

    } catch (err) {
      console.error(err);
      showStatus('Error: ' + err.message, 'danger');
    } finally {
      showSpinner(false);
      inputDocx.value = '';
    }
  }

  /* ==========================  CONFIRMAR GUARDADO  ========================= */
  async function onConfirmSave() {
    if (!parsedDataForConfirmation || !parsedDataForConfirmation.datos) {
      showStatus('No hay datos para guardar.', 'danger');
      return;
    }
    const fechaFinal = obtenerFechaFormateada();
    if (!fechaFinal) {
      showStatus('Selecciona una fecha válida.', 'danger');
      fechaManualInput.focus();
      return;
    }

    // VALIDACIÓN JUSTO ANTES DE GUARDAR (usa la fecha final elegida)
    const erroresFinal = validarDatosPorTodos(parsedDataForConfirmation.datos, fechaFinal);
    if (erroresFinal.length) {
      showStatus('<ul>' + erroresFinal.map(e => `<li>${e}</li>`).join('') + '</ul>', 'danger');
      showConfirmationUI(true);
      return;
    }

    showSpinner(true);
    showConfirmationUI(false);
    statusContainer.innerHTML = '';

    const datosParaGuardar = parsedDataForConfirmation.datos;
    const collectionMap = {
      [GROUP1]: "grupo1_expulsiones",
      [GROUP4]: "grupo4_operativo",
      [GROUPPUERTO]: "grupoPuerto_registros",
      [GROUPCECOREX]: "cecorex_registros",
      [GROUPGESTION]: "gestion_registros"
    };
    const errores = [];
    const exitos = [];

    for (const grupo in datosParaGuardar) {
      if (!collectionMap[grupo]) continue;
      const collectionName = collectionMap[grupo];
      const datosDelGrupo = { ...datosParaGuardar[grupo],
        fecha: fechaFinal
      };
      try {
        const ref = db.collection(collectionName).doc(fechaFinal);
        const snapshot = await ref.get();
        if (snapshot.exists) {
          errores.push(`Ya existen datos para el día ${fechaFinal} en ${grupo}.`);
          continue;
        }
        await ref.set(datosDelGrupo, {
          merge: false
        });
        exitos.push(`¡Guardado con éxito para ${grupo}!`);
      } catch (err) {
        errores.push(`Error al guardar ${grupo}: ${err.message}`);
      }
    }

    showSpinner(false);

    if (exitos.length && exitos.length === Object.keys(datosParaGuardar).length) {
      showStatus('Todos los grupos han sido guardados correctamente.', 'success');
    } else {
      if (exitos.length) showStatus(exitos.join('<br>'), 'success');
      if (errores.length) showStatus(errores.join('<br>'), 'danger');
    }

    if (errores.length) {
      showConfirmationUI(true);
    } else {
      parsedDataForConfirmation = null;
      fechaEdicionDiv.style.display = "none";
    }
  }

  function onCancel() {
    resultsContainer.innerHTML = '';
    statusContainer.innerHTML = '';
    showConfirmationUI(false);
    parsedDataForConfirmation = null;
    fechaEdicionDiv.style.display = "none";
  }

  /* ========================= HELPERS DE PARSEO ========================= */

  /**
   * Busca un título de sección y devuelve los elementos que le siguen hasta el próximo título.
   * @param {HTMLElement} root - El elemento raíz donde buscar.
   * @param {string} sectionTitle - El título de la sección a buscar (ej. "GRUPO 1").
   * @returns {HTMLElement[]} - Un array de elementos HTML dentro de esa sección.
   */
  function findSectionElements(root, sectionTitle) {
      const allElements = Array.from(root.children);
      const titleRegex = new RegExp(`^${sectionTitle.toUpperCase()}$`);
      
      const startIndex = allElements.findIndex(el => titleRegex.test(el.textContent.trim().toUpperCase()));

      if (startIndex === -1) return [];

      const sectionElements = [];
      for (let i = startIndex + 1; i < allElements.length; i++) {
          const el = allElements[i];
          const text = el.textContent.trim().toUpperCase();
          
          // Detenerse si se encuentra otro título de sección principal
          if (el.tagName.match(/^H[1-6]$/) || el.querySelector('strong')) {
             if (text.startsWith('GRUPO') || text === 'PUERTO' || text === 'CECOREX' || text === 'GESTION') {
                break;
             }
          }
          sectionElements.push(el);
      }
      return sectionElements;
  }

  /**
   * Parsea una tabla buscando cabeceras literales y mapeándolas a nuevas claves.
   * @param {HTMLElement[]} elements - Array de elementos donde buscar la tabla.
   * @param {Object} headerMapping - Objeto que mapea cabeceras literales a claves de objeto.
   * @returns {Object[]} - Array de objetos, uno por cada fila de datos.
   */
  function parseTable(elements, headerMapping) {
      const data = [];
      const targetHeaders = Object.keys(headerMapping);

      const tables = elements.filter(el => el.tagName === 'TABLE');
      
      for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length < 2) continue; // Necesita cabecera y al menos una fila de datos

          const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent.trim());

          // Comprobación literal de que las cabeceras objetivo existen al principio de las cabeceras de la tabla
          let headersMatch = true;
          for(let i=0; i < targetHeaders.length; i++) {
              if (headerCells[i] !== targetHeaders[i]) {
                  headersMatch = false;
                  break;
              }
          }
          
          if (headersMatch) {
              // Procesar filas de datos
              for (let i = 1; i < rows.length; i++) {
                  const cells = Array.from(rows[i].querySelectorAll('td'));
                  if (cells.length === 0 || cells.every(c => !c.textContent.trim())) continue;

                  const rowData = {};
                  targetHeaders.forEach((header, index) => {
                      const newKey = headerMapping[header];
                      rowData[newKey] = cells[index] ? cells[index].textContent.trim() : '';
                  });
                  data.push(rowData);
              }
              // Si se ha procesado una tabla, se asume que es la única y se devuelve el resultado
              return data;
          }
      }
      return data;
  }
  
    /**
   * Extrae el texto de una tabla de "Gestiones".
   * @param {HTMLElement[]} elements - Elementos de la sección.
   * @param {string} title - El título literal a buscar (ej. "GESTIONES").
   * @returns {string} - El texto extraído.
   */
  function parseGestiones(elements, title) {
    const titleElement = elements.find(el => el.textContent.trim().toUpperCase() === title.toUpperCase());
    if (titleElement && titleElement.tagName === 'TABLE') {
        return titleElement.textContent.trim();
    }
    // Si el título es un P o STRONG, la tabla es el siguiente elemento
    if(titleElement) {
        let nextEl = titleElement.nextElementSibling;
        while(nextEl && nextEl.tagName !== 'TABLE') {
            nextEl = nextEl.nextElementSibling;
        }
        if (nextEl) return nextEl.textContent.trim();
    }
    return "";
  }
  
  /**
   * Extrae la primera fecha con formato dd-mm-yyyy o yyyy-mm-dd del texto.
   * @param {string} text - El texto completo del documento.
   * @returns {string} - La fecha en formato ISO (yyyy-mm-dd).
   */
  function extractDate(text) {
      let match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
      match = text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (match) {
          return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return '';
  }

  /* ========================= PARSERS LITERALES ========================= */

  function parseGrupo1(html) {
      const root = document.createElement('div');
      root.innerHTML = html;
      const data = {};
      const fecha = extractDate(root.innerText);
      const sectionElements = findSectionElements(root, "GRUPO 1");
      if (!sectionElements.length) return { datos: {}, fecha };

      // 1. Parsear tabla de DETENIDOS
      const detenidosMapping = {
          'DETENIDOS-DG1': 'DETENIDOS-G1',
          'MOTIVO-DG1': 'MOTIVO-G1',
          'NACIONALIDAD-DG1': 'NACIONALIDAD-G1',
          'DILIGENCIAS-DG1': 'DILIGENCIAS-G1',
          'OBSERVACIONES-DG1': 'OBSERVACIONES-G1'
      };
      const detenidosData = parseTable(sectionElements, detenidosMapping);
      if (detenidosData.length > 0) {
          data.detenidos = detenidosData;
      }

      // 2. Parsear GESTIONES
      const gestionesText = parseGestiones(sectionElements, 'GESTIONES');
      if (gestionesText) {
          data.gestiones = gestionesText;
      }
      
      return { datos: data, fecha };
  }

  function parseGrupo4(html) {
      const root = document.createElement('div');
      root.innerHTML = html;
      const data = {};
      const fecha = extractDate(root.innerText);
      const sectionElements = findSectionElements(root, "GRUPO 4");
      if (!sectionElements.length) return { datos: {}, fecha };

      // 1. Parsear tabla de DETENIDOS
      const detenidosMapping = {
          'N. DETENIDOS-G4': 'DETENIDOS-G4',
          'MOTIVO–G4': 'MOTIVO-G4', // Ojo: es un guion EN (–), no un guion normal
          'NACIONALIDAD-G4': 'NACIONALIDAD-G4',
          'DILIGENCIAS-G4': 'DILIGENCIAS-G4',
          'OBSERVACIONES-DG4': 'OBSERVACIONES-G4'
      };
      const detenidosData = parseTable(sectionElements, detenidosMapping);
      if (detenidosData.length > 0) {
          data.detenidos = detenidosData;
      }
      
      // 2. Parsear GESTIONES VARIAS
      const gestionesText = parseGestiones(sectionElements, 'GESTIONES VARIAS');
      if (gestionesText) {
          data.gestiones_varias = gestionesText;
      }
      
      return { datos: data, fecha };
  }

  function parseGrupoPuerto(html) {
      const root = document.createElement('div');
      root.innerHTML = html;
      const data = {};
      const fecha = extractDate(root.innerText);
      const sectionElements = findSectionElements(root, "PUERTO");
      if (!sectionElements.length) return { datos: {}, fecha };
      
      // 1. Parsear tabla de DETENIDOS
      const detenidosMapping = {
          'DETENIDOS': 'DETENIDOS-P'
          // Las otras columnas de esta tabla no tienen mapeo explícito en la petición
      };
      const detenidosData = parseTable(sectionElements, detenidosMapping);
      if (detenidosData.length > 0) {
          data.detenidos = detenidosData;
      }

      // 2. Parsear GESTIONES PUERTO
      const gestionesText = parseGestiones(sectionElements, 'GESTIONES PUERTO');
      if (gestionesText) {
          data.gestiones = gestionesText;
      }
      
      return { datos: data, fecha };
  }

  function parseGrupoCECOREX(html) {
      const root = document.createElement('div');
      root.innerHTML = html;
      const data = {};
      const fecha = extractDate(root.innerText);
      const sectionElements = findSectionElements(root, "CECOREX");
      if (!sectionElements.length) return { datos: {}, fecha };
      
      // 1. Parsear tabla de DETENIDOS
      const detenidosMapping = {
          'DETENIDOS-CC': 'DETENIDOS-C',
          'MOTIVO-CC': 'MOTIVO-C',
          'NACIONALIDAD-CC': 'NACIONALIDAD-C',
          'PRESENTA': 'PRESENTA-C', // Asumo que esta columna también se quiere
          'OBSERVACIONES-CC': 'OBSERVACIONES-C'
      };
      const detenidosData = parseTable(sectionElements, detenidosMapping);
      if (detenidosData.length > 0) {
          data.detenidos = detenidosData;
      }

      // 2. Parsear GESTIONES CECOREX
      const gestionesText = parseGestiones(sectionElements, 'GESTIONES CECOREX');
      if (gestionesText) {
          data.gestiones_varias = gestionesText;
      }

      return { datos: data, fecha };
  }
  
  function parseGestion(html) {
      const root = document.createElement('div');
      root.innerHTML = html;
      const data = {};
      const fecha = extractDate(root.innerText);
      const sectionElements = findSectionElements(root, "GESTION");
      if (!sectionElements.length) return { datos: {}, fecha };

      // 1. Parsear tabla de CITAS
      const citasMapping = {
          'CITAS-G': 'CITAS-AS',
          'FALLOS': 'FALLOS-AS',
          'CITAS': 'CITAS-AS-2', // Segunda columna "CITAS"
          'ENTRV. ASILO': 'ENTRV_ASILO-AS',
          'FALLOS ASILO': 'FALLOS_ASILO-AS',
          'ASILOS CONCEDIDOS': 'ASILOS_CONCEDIDOS-AS',
          'ASILOS DENEGADOS': 'ASILOS_DENEGADOS-AS'
      };
      const citasData = parseTable(sectionElements, citasMapping);
      if (citasData.length > 0) {
          data.citas = citasData;
      }

      return { datos: data, fecha };
  }


  /* ===========================  VALIDACIÓN  ================================ */
  // La lógica de validación original se mantiene, podría necesitar ajustes
  // si los nuevos datos no cumplen las expectativas de estas funciones.
  function validarDatos(data, grupo, fecha) {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return [`No se han extraído datos válidos para ${grupo}.`];
    }
    const errores = [];

    // Ejemplo de validación para la nueva estructura
    if (grupo === GROUP1) {
        if (!data.detenidos && !data.gestiones) {
            errores.push('Grupo 1 debe tener al menos detenidos o gestiones.');
        }
    }
     if (grupo === GROUP4) {
        if (!data.detenidos && !data.gestiones_varias) {
            errores.push('Grupo 4 debe tener al menos detenidos o gestiones varias.');
        }
    }
    
    if (!fecha || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errores.push(`La fecha es obligatoria y debe ser válida (detectada para ${grupo}).`);
    }

    return errores.length ? errores : [];
  }

  function validarDatosPorTodos(allData, fecha) {
    let errs = [];
    if (Object.keys(allData).length === 0) {
        return ['No se extrajeron datos de ningún grupo.'];
    }
    Object.entries(allData).forEach(([grupo, d]) => {
      // Se pasa una fecha global, por lo que la validación de fecha dentro de validarDatos es un poco redundante
      // pero se mantiene por si acaso.
      errs = errs.concat(validarDatos(d, grupo, fecha));
    });
    // Validar la fecha global una sola vez
    if (!fecha || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errs.push('La fecha global del documento es obligatoria o no tiene el formato correcto (YYYY-MM-DD).');
    }
    // Eliminar duplicados
    return [...new Set(errs)];
  }

}); // DOMContentLoaded
