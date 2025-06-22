// views/statisticsView.js
import { showSpinner, showStatus, formatDate, parseDate } from '../utils.js';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { groups } from '../groups.js';
import { getUserId, getAppId } from '../services/viewManager.js';
import { mainContent } from '../ui/common.js';

export const renderStatistics = () => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const html = `
    <div class="max-w-4xl mx-auto p-4 space-y-6">
        <div class="card space-y-4">
            <h3 class="text-xl font-bold">Consultar Estadísticas</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label>Desde</label><input type="date" id="startDate" class="w-full rounded border px-2 py-1" value="${formatDate(weekAgo)}"></div>
                <div><label>Hasta</label><input type="date" id="endDate" class="w-full rounded border px-2 py-1" value="${formatDate(today)}"></div>
                <button id="statsBtn" class="btn-primary">Generar Estadísticas</button>
            </div>
            <div id="statsResult" class="mt-4"></div>
        </div>
    </div>`;
    mainContent().innerHTML = html;
    document.getElementById('statsBtn').addEventListener('click', generateStats);
};

async function generateStats() {
    const resultDiv = document.getElementById('statsResult');
    if (!resultDiv) return;
    resultDiv.innerHTML = '';
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) {
        showStatus("Selecciona rango de fechas.", true);
        return;
    }
    const userId = getUserId();
    if (!userId) {
        showStatus("Usuario no autenticado.", true);
        return;
    }
    showSpinner(true);
    try {
        const sDt = parseDate(start);
        const eDt = parseDate(end);
        if (!sDt || !eDt) throw new Error('Fechas inválidas');
        eDt.setHours(23, 59, 59, 999);

        const cols = Object.values(groups).filter(g => g.collection && g.collection !== 'estadistica').map(g => g.collection);
        const uniqueCols = [...new Set(cols)];
        const stats = {};
        Object.values(groups).forEach(g => {
            if (g.name !== 'Estadística' && g.name !== 'Resumen') stats[g.name] = 0;
        });
        let total = 0;

        for (const colName of uniqueCols) {
            const q = query(
                collection(db, `artifacts/${getAppId()}/${colName}`),
                where("fecha", ">=", sDt),
                where("fecha", "<=", eDt)
            );
            const snaps = await getDocs(q);
            snaps.forEach(d => {
                const data = d.data();
                let gName = data.grupo || Object.values(groups).find(gr => gr.collection === colName)?.name;
                if (gName && stats.hasOwnProperty(gName)) {
                    stats[gName]++;
                    total++;
                }
            });
        }
        
        let tbl = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registros</th>
        </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
        Object.keys(stats).sort().forEach(gName => {
            tbl += `<tr>
                <td class="px-6 py-4 whitespace-nowrap">${gName}</td>
                <td class="px-6 py-4 whitespace-nowrap">${stats[gName]}</td>
            </tr>`;
        });
        tbl += `<tr class="font-bold bg-gray-100">
            <td class="px-6 py-4">Total</td>
            <td class="px-6 py-4">${total}</td>
        </tr></tbody></table>`;
        resultDiv.innerHTML = tbl;
    } catch (e) {
        console.error(e);
        resultDiv.innerHTML = `<p class="text-red-500">Error: ${e.message}</p>`;
    } finally {
        showSpinner(false);
    }
}