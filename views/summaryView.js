// views/summaryView.js
import { showSpinner, showStatus, formatDate, parseDate } from '../utils.js';
import { db } from '../firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { groups } from '../groups.js';
import { getUserId, getAppId } from '../services/viewManager.js';
import { mainContent } from '../ui/common.js';

export const renderSummary = () => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const html = `
    <div class="max-w-4xl mx-auto p-4 space-y-6">
        <div class="card space-y-4">
            <h3 class="text-xl font-bold">Resumen por Fechas</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label>Desde</label><input type="date" id="resumenStartDate" class="w-full rounded border px-2 py-1" value="${formatDate(weekAgo)}"></div>
                <div><label>Hasta</label><input type="date" id="resumenEndDate" class="w-full rounded border px-2 py-1" value="${formatDate(today)}"></div>
                <button id="resumenBtn" class="btn-primary">Generar Resumen</button>
            </div>
            <div id="resumenResult" class="overflow-x-auto mt-4"></div>
        </div>
    </div>`;
    mainContent().innerHTML = html;
    document.getElementById('resumenBtn').addEventListener('click', generateResumen);
};

async function generateResumen() {
    const outDiv = document.getElementById('resumenResult');
    if (!outDiv) return;
    outDiv.innerHTML = '';
    const start = document.getElementById('resumenStartDate').value;
    const end = document.getElementById('resumenEndDate').value;
    if (!start || !end) { showStatus('Selecciona rango de fechas.', true); return; }
    const userId = getUserId();
    if (!userId) { showStatus('Usuario no autenticado.', true); return; }
    showSpinner(true);
    try {
        const sDt = parseDate(start);
        const eDt = parseDate(end);
        if (!sDt || !eDt) throw new Error('Fechas inválidas');
        eDt.setHours(23, 59, 59, 999);
        const cols = [...new Set(Object.values(groups).filter(g => g.collection).map(g => g.collection))];
        const rows = [];
        for (const colName of cols) {
            const q = query(collection(db, `artifacts/${getAppId()}/${colName}`), where('fecha', '>=', sDt), where('fecha', '<=', eDt));
            const snaps = await getDocs(q);
            snaps.forEach(d => {
                const data = d.data();
                const fecha = data.fecha ? (typeof data.fecha.toDate === 'function' ? formatDate(data.fecha.toDate()) : formatDate(parseDate(data.fecha))) : 'Sin fecha';
                const grupo = data.grupo || Object.values(groups).find(gr => gr.collection === colName)?.name || colName;
                const desc = data.descripcionBreve || data.nombreActuacion || data.nombreOperacion || '';
                rows.push({ fecha, grupo, desc });
            });
        }
        rows.sort((a, b) => new Date(a.fecha.split('-').reverse().join('-')) - new Date(b.fecha.split('-').reverse().join('-')));
        let tbl = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>
            <th class="px-4 py-2 text-left">Fecha</th>
            <th class="px-4 py-2 text-left">Grupo</th>
            <th class="px-4 py-2 text-left">Descripción</th>
            </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
        if (rows.length === 0) {
            tbl += `<tr><td colspan="3" class="px-4 py-2 text-center text-gray-500">Sin datos para este rango de fechas</td></tr>`;
        } else {
            rows.forEach(r => { tbl += `<tr><td class="px-4 py-2">${r.fecha}</td><td class="px-4 py-2">${r.grupo}</td><td class="px-4 py-2">${r.desc}</td></tr>`; });
        }
        tbl += `</tbody></table>`;
        outDiv.innerHTML = tbl;
    } catch (e) {
        console.error(e);
        outDiv.innerHTML = `<p class="text-red-500">Error: ${e.message}</p>`;
    } finally {
        showSpinner(false);
    }
}