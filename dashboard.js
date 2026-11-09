/* GymTracker - Parte 4 del frontend: navegación, progreso, comparativo y racha 🔥 */
const NIVEL = { general: 1, administrativo: 2, desarrollador: 3 };
const COL = ['var(--ac)', '#38bdf8', '#facc15', '#4ade80'];
function navHTML(tab) {
  const t = [['semana', 'Semana'], ['progreso', 'Progreso'], ['comparar', 'Comparar']];
  if (NIVEL[perfilActual.rol] >= 2) t.push(['panel', 'Panel']);
  return `<nav class="flex flex-wrap gap-2 mb-4 text-sm items-center">${t.map(([k, l]) => `<button data-nav="${k}" class="px-3 py-1 rounded-full ${k === tab ? 'btn' : 'card'}">${l}</button>`).join('')}
    <span class="ml-auto" title="Racha">🔥 ${Number(perfilActual.racha) || 0} días</span></nav>`;
}
function enlazarNav() { document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => ({ semana: vistaInicio, progreso: vistaProgreso, comparar: vistaComparar, panel: vistaPanel })[b.dataset.nav]()); }
let rangoDias = 30;
const desdeStr = () => fmt(addD(new Date(), -rangoDias));
const filtroRango = () => `<select id="rg" class="inp !w-auto mb-3">${[7, 30, 90, 365].map(n => `<option value="${n}" ${n === rangoDias ? 'selected' : ''}>Últimos ${n} días</option>`).join('')}</select>`;
const sum = a => a.reduce((x, y) => x + y, 0), vol = rs => sum(rs.map(r => r.r * r.p));
const kpi = (v, l) => `<div class="card p-3 text-center"><div class="text-2xl font-bold">${v}</div><div class="text-xs text-zinc-400">${l}</div></div>`;
function lineas(series, labels) {
  const W = 320, H = 150, P = 26, max = Math.max(1, ...series.flatMap(s => s.vals.filter(v => v != null))), n = Math.max(labels.length - 1, 1);
  const X = i => P + i * (W - 2 * P) / n, Y = v => H - P - (v / max) * (H - 2 * P);
  const dib = series.map((s, k) => { const pts = s.vals.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
    return `<polyline fill="none" stroke="${COL[k % 4]}" stroke-width="2" points="${pts.map(p => p.join(',')).join(' ')}"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${COL[k % 4]}"/>`).join(''); }).join('');
  if (!labels.length) return '<p class="text-sm text-zinc-400">Sin datos en este período.</p>';
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full">${dib}<text x="2" y="12" font-size="9" fill="#a1a1aa">${Math.round(max)}</text>
    <text x="${P}" y="${H - 6}" font-size="9" fill="#a1a1aa">${esc(labels[0])}</text><text x="${W - P}" y="${H - 6}" font-size="9" fill="#a1a1aa" text-anchor="end">${esc(labels[labels.length - 1])}</text></svg>`;
}
async function cargarProgreso() { return api('progreso', { desde: desdeStr(), hasta: fmt(new Date()) }); }

async function vistaProgreso() {
  const data = await cargarProgreso(), yo = data.find(x => x.id === perfilActual.id) || { registros: [], entrenos: [], racha: 0 };
  perfilActual.racha = yo.racha;
  const fechas = [...new Set(yo.registros.map(r => r.f))].sort();
  const exs = [...new Set(yo.registros.map(r => r.e))];
  const sel = window._exSel && exs.includes(window._exSel) ? window._exSel : exs[0];
  const maxPeso = fechas.map(f => { const v = yo.registros.filter(r => r.f === f && r.e === sel).map(r => r.p); return v.length ? Math.max(...v) : null; }).filter((v, i) => v != null || false);
  const fEx = fechas.filter(f => yo.registros.some(r => r.f === f && r.e === sel));
  $('#app').innerHTML = `${navHTML('progreso')}${filtroRango()}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">${kpi('🔥 ' + yo.racha, 'Racha (días)')}${kpi(yo.entrenos.length, 'Entrenos')}${kpi(yo.registros.length, 'Series')}${kpi(Math.round(vol(yo.registros)).toLocaleString(), 'Volumen (kg)')}</div>
    <div class="card p-3 mb-4"><h3 class="font-semibold mb-2">Volumen por día</h3>${lineas([{ vals: fechas.map(f => vol(yo.registros.filter(r => r.f === f))) }], fechas)}</div>
    <div class="card p-3"><h3 class="font-semibold mb-2">Peso máximo por ejercicio</h3>
      <select id="ex" class="inp mb-2">${exs.map(id => `<option value="${esc(id)}" ${id === sel ? 'selected' : ''}>${esc(nom(id))}</option>`).join('')}</select>
      ${sel ? lineas([{ vals: fEx.map(f => Math.max(...yo.registros.filter(r => r.f === f && r.e === sel).map(r => r.p))) }], fEx) : '<p class="text-sm text-zinc-400">Aún no tienes registros.</p>'}</div>`;
  enlazarNav(); $('#rg').onchange = e => { rangoDias = +e.target.value; vistaProgreso(); };
  if ($('#ex')) $('#ex').onchange = e => { window._exSel = e.target.value; vistaProgreso(); };
}
async function vistaComparar() {
  const data = await cargarProgreso(), met = window._met || 'entrenos';
  const valor = p => ({ entrenos: p.entrenos.length, series: p.registros.length, volumen: Math.round(vol(p.registros)), racha: p.racha })[met];
  const max = Math.max(1, ...data.map(valor)), fechas = [...new Set(data.flatMap(p => p.registros.map(r => r.f)))].sort();
  $('#app').innerHTML = `${navHTML('comparar')}<div class="flex gap-2">${filtroRango()}
      <select id="mt" class="inp !w-auto mb-3">${['entrenos', 'series', 'volumen', 'racha'].map(m => `<option value="${m}" ${m === met ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}</select></div>
    <div class="card p-3 mb-4">${data.map((p, k) => `<div class="mb-3"><div class="flex justify-between text-sm"><span>${esc(p.nombre)} <span title="Racha">🔥 ${p.racha}</span></span><b>${valor(p).toLocaleString()}</b></div>
      <div class="h-3 rounded bg-zinc-800"><div class="h-3 rounded" style="width:${valor(p) / max * 100}%;background:${COL[k % 4]}"></div></div></div>`).join('')}</div>
    <div class="card p-3"><h3 class="font-semibold mb-1">Volumen diario</h3><div class="flex gap-3 text-xs mb-2">${data.map((p, k) => `<span style="color:${COL[k % 4]}">● ${esc(p.nombre)}</span>`).join('')}</div>
      ${lineas(data.map(p => ({ vals: fechas.map(f => { const rs = p.registros.filter(r => r.f === f); return rs.length ? vol(rs) : null; }) })), fechas)}</div>`;
  enlazarNav(); $('#rg').onchange = e => { rangoDias = +e.target.value; vistaComparar(); };
  $('#mt').onchange = e => { window._met = e.target.value; vistaComparar(); };
}
