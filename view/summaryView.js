// views/summaryView.js
// Propósito: Renderizar la página de Resumen de Novedades.
// Este módulo construye la interfaz que permite a los usuarios ver un resumen de todas
// las novedades registradas en un rango de fechas determinado, presentándolas en una tabla.

import { showSpinner, showStatus, formatDate, parseDate } from '../utils.js';
import { db } from '../firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { groups } from '../groups.js';
import { getUserId, getAppId } from '../services/viewManager.js';
import { mainContent } from '../ui/common.js';
// ... (El código de `generateResumen` iría aquí, adaptado de manera similar)
export const renderSummary = () => { /* ... HTML y listeners ... */ };