// services/firestoreService.js
// Propósito: Centralizar todas las operaciones con Firestore.
// Este módulo proporciona funciones genéricas para crear, leer, actualizar y eliminar
// documentos (CRUD), así como consultas específicas como obtener el siguiente código
// secuencial o rellenar un <select> con datos de una colección.
// Depende de la configuración de 'firebase.js' y del estado del 'viewManager.js' (para el userId y appId).

import { db } from '../firebase.js';
import { getUserId, getAppId } from './viewManager.js';
import { collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showStatus, showSpinner } from '../utils.js';

/**
 * Guarda o actualiza un documento en Firestore.
 * @param {string} collectionName - Nombre de la colección.
 * @param {object} data - Datos a guardar.
 * @param {string|null} docId - ID del documento para actualizar. Si es null, se crea uno nuevo.
 * @returns {Promise<string>} - El ID del documento guardado o actualizado.
 */
export const saveData = async (collectionName, data, docId = null) => {
    const userId = getUserId();
    const appId = getAppId();
    if (!userId) throw new Error("Usuario no autenticado.");

    try {
        const mainCollection = collection(db, `artifacts/${appId}/${collectionName}`);
        let finalId;

        if (docId) {
            await setDoc(doc(mainCollection, docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
            finalId = docId;
        } else {
            const newDocRef = await addDoc(mainCollection, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            finalId = newDocRef.id;
        }

        // Backup del documento en una subcolección para mantener un historial de cambios.
        const backupDocRef = doc(db, 'backups', appId, collectionName, finalId);
        const backupEntriesCollection = collection(backupDocRef, 'entries');
        await setDoc(doc(backupEntriesCollection, new Date().toISOString()), { ...data, backedAt: serverTimestamp() });

        return finalId;
    } catch (e) {
        console.error(`Error al guardar en ${collectionName}:`, e);
        showStatus(`Error al guardar: ${e.message}`, true);
        throw e;
    }
};

/**
 * Carga un único documento de Firestore por su ID.
 * @param {string} collectionName - Nombre de la colección.
 * @param {string} docId - ID del documento a cargar.
 * @returns {Promise<object|null>} - Los datos del documento o null si no existe.
 */
export const loadData = async (collectionName, docId) => {
    const userId = getUserId();
    const appId = getAppId();
    if (!userId) throw new Error("Usuario no autenticado.");

    try {
        const docRef = doc(db, `artifacts/${appId}/${collectionName}`, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        console.error(`Error al cargar desde ${collectionName}:`, e);
        showStatus(`Error al cargar: ${e.message}`, true);
        throw e;
    }
};

/**
 * Carga documentos de una subcolección.
 * @param {string} parentCollection - Colección principal.
 * @param {string} parentId - ID del documento padre.
 * @param {string} subCollection - Nombre de la subcolección.
 * @returns {Promise<Array>} - Un array con los documentos de la subcolección.
 */
export const loadSubCollection = async (parentCollection, parentId, subCollection) => {
    const userId = getUserId();
    const appId = getAppId();
    if (!userId) return [];
    try {
        const subCollRef = collection(db, `artifacts/${appId}/${parentCollection}`, parentId, subCollection);
        const q = query(subCollRef);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error(`Error cargando subcolección ${subCollection}:`, e);
        return [];
    }
};

/**
 * Añade un documento a una subcolección.
 * @param {string} parentCollection - Colección principal.
 * @param {string} parentId - ID del documento padre.
 * @param {string} subCollectionName - Nombre de la subcolección.
 * @param {object} data - Datos a añadir.
 * @returns {Promise<string>} - El ID del nuevo documento.
 */
export const addSubCollectionItem = async (parentCollection, parentId, subCollectionName, data) => {
    const userId = getUserId();
    const appId = getAppId();
    if (!userId) throw new Error("Usuario no autenticado.");
    if (!parentId) throw new Error("Se requiere un ID de documento padre para añadir un ítem a la subcolección.");

    const subColRef = collection(db, `artifacts/${appId}/${parentCollection}`, parentId, subCollectionName);
    const docRef = await addDoc(subColRef, { ...data, createdAt: serverTimestamp() });
    return docRef.id;
};

/**
 * Actualiza un documento en una subcolección.
 * @param {string} parentCollection - Colección principal.
 * @param {string} parentId - ID del documento padre.
 * @param {string} subCollectionName - Nombre de la subcolección.
 * @param {string} itemId - ID del documento a actualizar.
 * @param {object} data - Datos para actualizar.
 */
export const updateSubCollectionItem = async (parentCollection, parentId, subCollectionName, itemId, data) => {
    const userId = getUserId();
    const appId = getAppId();
    if (!userId) throw new Error("Usuario no autenticado.");

    const itemRef = doc(db, `artifacts/${appId}/${parentCollection}`, parentId, subCollectionName, itemId);
    await setDoc(itemRef, data, { merge: true });
};


/**
 * Rellena un elemento <select> con documentos de una colección.
 * @param {string} collectionName - Colección de la que se obtienen los datos.
 * @param {string} selectId - ID del elemento <select>.
 * @param {string} displayField1 - Campo del documento a mostrar en la opción.
 * @param {string|null} displayField2 - Campo opcional a concatenar.
 * @param {string|null} groupFilter - Nombre del grupo para filtrar (opcional).
 */
export const fetchDataForSelect = async (collectionName, selectId, displayField1, displayField2 = null, groupFilter = null) => {
    const userId = getUserId();
    if (!userId) return;

    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    showSpinner(true);

    try {
        const appId = getAppId();
        let q = collection(db, `artifacts/${appId}/${collectionName}`);
        if (groupFilter) {
            q = query(q, where("grupo", "==", groupFilter));
        }
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Ordenar por fecha de creación descendente
        docs.sort((a, b) => {
            const da = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
            const db_ = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
            return db_ - da;
        });

        docs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            let txt = d[displayField1] || '';
            if (displayField2 && d[displayField2]) txt += ` (${d[displayField2]})`;
            opt.textContent = txt;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
        showStatus("Error al cargar datos para el selector.", true);
    } finally {
        showSpinner(false);
    }
};

/**
 * Calcula el próximo código secuencial para una colección, filtrando por grupo y año.
 * @param {string} collectionName - Nombre de la colección.
 * @param {string} groupName - Nombre del grupo.
 * @param {number} year - Año.
 * @returns {Promise<number>} - El siguiente número de código.
 */
export const getNextCode = async (collectionName, groupName, year) => {
    const userId = getUserId();
    if (!userId) return 1;

    const appId = getAppId();
    const q = query(
        collection(db, `artifacts/${appId}/${collectionName}`),
        where("grupo", "==", groupName),
        where("anio", "==", year)
    );
    const querySnapshot = await getDocs(q);
    const codes = [];
    querySnapshot.forEach(d => {
        if (d.data().codigo) codes.push(Number(d.data().codigo));
    });
    codes.sort((a, b) => b - a);
    return codes.length ? codes[0] + 1 : 1;
};

/**
 * Busca un documento por un campo de fecha exacto.
 * @param {string} collectionName La colección donde buscar.
 * @param {Date} date El objeto de fecha para la búsqueda.
 * @returns {Promise<object|null>} El primer documento encontrado o null.
 */
export const findDocByDate = async (collectionName, date) => {
    if (!date) return null;
    const userId = getUserId();
    if (!userId) throw new Error("Usuario no autenticado.");
    
    const appId = getAppId();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const q = query(
        collection(db, `artifacts/${appId}/${collectionName}`),
        where('fecha', '>=', startOfDay),
        where('fecha', '<=', endOfDay)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) {
        return null;
    }
    const doc = snaps.docs[0];
    return { id: doc.id, ...doc.data() };
};