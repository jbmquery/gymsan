/* GymTracker - Parte 3 del frontend: modo entrenamiento con temporizador de descanso */
const E = { dur: {}, regs: {}, saved: {}, n: {}, previos: {}, timer: null, cur: null, end: 0 };
let audioCtx;
function desbloquearAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (_) {} }
function pitido() {
  try { [0, .25, .5].forEach(t => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.value = .25;
    o.connect(g); g.connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .15); });
    navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (_) {}
}
/* Barra del temporizador (fija arriba) */
document.body.insertAdjacentHTML('beforeend', `<div id="tm" class="hidden fixed top-0 inset-x-0 z-40 p-3 flex items-center justify-center gap-2 text-white" style="background:var(--ac)">
  ⏱ <b id="tt" class="text-xl w-16 text-center">00:00</b>
  <input id="td" type="number" min="5" max="900" class="w-20 rounded p-1 text-black text-center" aria-label="Segundos de descanso"> s
  <button id="tr" class="underline text-sm">Restablecer</button><button id="tx" class="text-xl px-2" aria-label="Cerrar">✕</button></div>`);
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function arrancar(id) {
  const s = E.dur[id] ?? defs(id).desc;
  E.cur = id; $('#td').value = s; E.end = Date.now() + s * 1000; $('#tm').classList.remove('hidden');
  clearInterval(E.timer); E.timer = setInterval(tick, 250); tick();
}
function tick() {
  const r = Math.ceil((E.end - Date.now()) / 1000);
  if (r <= 0) { clearInterval(E.timer); $('#tt').textContent = '00:00'; pitido(); return; }
  $('#tt').textContent = mmss(r);
}
$('#td').onchange = () => { const v = Math.min(Math.max(parseInt($('#td').value) || 60, 5), 900); E.dur[E.cur] = v; arrancar(E.cur); };
$('#tr').onclick = () => { delete E.dur[E.cur]; arrancar(E.cur); };
$('#tx').onclick = () => { clearInterval(E.timer); $('#tm').classList.add('hidden'); };

/* Datos por ejercicio */
function defs(id) {
  const r = E.dd.rut && E.dd.rut.ejercicios.find(x => x.ejercicioId === id), e = ej(id) || {};
  return { series: parseInt(r ? r.series : e.series) || 3, reps: (r ? r.reps : e.reps) || '', desc: Number(r ? r.descansoSeg : e.descansoSeg) || 60 };
}
function nSeries(id) {
  if (E.n[id]) return E.n[id];
  const guardadas = Object.keys(E.regs).filter(k => k.startsWith(id + '|')).map(k => +k.split('|')[1]);
  const prev = (E.previos[id] || []).length;
  return E.n[id] = Math.max(prev || defs(id).series, 1, ...guardadas);
}
async function iniciarEntreno(dd) {
  try {
    const r = await api('iniciarEntreno', { fecha: S.sel });
    E.entreno = r.entreno; E.previos = r.previos; E.regs = {}; E.saved = {}; E.n = {}; E.dur = {}; E.dd = dd;
    r.registros.forEach(x => { const k = x.ejercicioId + '|' + x.serie; E.regs[k] = { reps: x.reps, peso: x.peso }; E.saved[k] = x.reps + '|' + x.peso; });
    pintarEntreno();
  } catch (e) { modal(`<p class="text-red-400 mb-3">${esc(e.message)}</p><button id="x" class="btn w-full">Cerrar</button>`); $('#x').onclick = cerrar; }
}
function pintarEntreno() {
  const tarjetas = E.dd.items.map(it => {
    const d = defs(it.id), prev = E.previos[it.id] || [], n = nSeries(it.id);
    let filas = '';
    for (let s = 1; s <= n; s++) {
      const g = E.regs[it.id + '|' + s], p = prev.find(x => +x.serie === s);
      filas += `<div class="fila grid grid-cols-[2rem_1fr_1fr_auto] gap-2 items-center mb-2" data-e="${esc(it.id)}" data-s="${s}">
        <span class="text-sm text-zinc-400">S${s}</span>
        <input data-r type="number" inputmode="numeric" min="0" class="inp" placeholder="${esc(p ? 'ant. ' + p.reps : d.reps)}" value="${g ? esc(g.reps) : ''}" aria-label="Repeticiones">
        <input data-p type="number" inputmode="decimal" min="0" class="inp" placeholder="${esc(p && p.peso ? 'ant. ' + p.peso : 'kg')}" value="${g ? esc(g.peso) : ''}" aria-label="Peso en kg">
        <button data-d class="btn text-sm">${g ? '✓ ' : ''}Descanso</button></div>`;
    }
    return `<div class="card p-3 mb-3" data-card="${esc(it.id)}"><div class="flex justify-between items-start mb-1"><div><b>${esc(nom(it.id))}</b>
      <div class="text-xs text-zinc-400">Recomendado: ${d.series}×${esc(d.reps)} · descanso ${d.desc}s${prev.length ? ` · vez anterior: ${prev.length} series` : ''}</div></div>
      <button data-sw="${esc(it.id)}" class="text-sm underline">Cambiar</button></div>
      <div class="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 text-xs text-zinc-500 mb-1"><span></span><span>Reps</span><span>Kg</span><span class="w-20"></span></div>${filas}
      <div class="flex gap-4 text-sm mt-1"><button data-mas="${esc(it.id)}">+ Serie</button><button data-menos="${esc(it.id)}">− Serie</button></div></div>`;
  }).join('');
  $('#app').innerHTML = `<div class="pt-14"><div class="flex justify-between items-center mb-3"><h2 class="font-bold text-lg">${esc(E.dd.rut ? E.dd.rut.nombre : 'Entrenamiento')}</h2>
    <button id="sal" class="text-sm text-zinc-400">Salir (se guarda)</button></div><p id="est" class="text-xs text-zinc-500 mb-2 min-h-[1rem]"></p>${tarjetas}
    <button id="fin" class="btn w-full my-4">Finalizar rutina</button></div>`;
  enlazarEntreno();
}
function guardar(fila) {
  const id = fila.dataset.e, s = fila.dataset.s, reps = fila.querySelector('[data-r]').value, peso = fila.querySelector('[data-p]').value, k = id + '|' + s;
  if (reps === '') return;
  E.regs[k] = { reps, peso };
  if (E.saved[k] === reps + '|' + peso) return;
  E.saved[k] = reps + '|' + peso;
  api('guardarSerie', { entrenoId: E.entreno.id, ejercicioId: id, serie: s, reps, peso })
    .then(() => { $('#est') && ($('#est').textContent = 'Guardado ✓'); const b = fila.querySelector('[data-d]'); if (!b.textContent.includes('✓')) b.textContent = '✓ Descanso'; })
    .catch(e => { delete E.saved[k]; $('#est') && ($('#est').innerHTML = `<span class="text-red-400">No se guardó: ${esc(e.message)}</span>`); });
}
function enlazarEntreno() {
  document.querySelectorAll('.fila').forEach(f => {
    f.querySelectorAll('input').forEach(i => i.onchange = () => guardar(f));
    f.querySelector('[data-d]').onclick = () => { desbloquearAudio(); guardar(f); arrancar(f.dataset.e); };
  });
  document.querySelectorAll('[data-mas]').forEach(b => b.onclick = () => { E.n[b.dataset.mas] = nSeries(b.dataset.mas) + 1; pintarEntreno(); });
  document.querySelectorAll('[data-menos]').forEach(b => b.onclick = () => { const id = b.dataset.menos; if (nSeries(id) > 1 && !E.regs[id + '|' + nSeries(id)]) { E.n[id]--; pintarEntreno(); } });
  document.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => cambiarEnVivo(b.dataset.sw));
  $('#sal').onclick = () => { $('#tx').onclick(); vistaInicio(); };
  $('#fin').onclick = () => {
    modal('<h2 class="font-bold mb-3">¿Finalizar la rutina de hoy?</h2><button id="si" class="btn w-full mb-2">Sí, finalizar</button><button id="no" class="inp text-center">Seguir entrenando</button>');
    $('#no').onclick = cerrar;
    $('#si').onclick = async () => { try { await api('finalizarEntreno', { entrenoId: E.entreno.id }); cerrar(); $('#tx').onclick(); vistaInicio(); }
      catch (e) { modal(`<p class="text-red-400 mb-3">${esc(e.message)}</p><button id="x" class="btn w-full">Cerrar</button>`); $('#x').onclick = cerrar; } };
  };
}
/* Cambiar de ejercicio en plena rutina (solo por hoy) */
function cambiarEnVivo(id) {
  const o = ej(id), alts = S.ejercicios.filter(e => e.id !== id && (e.subcategoria === o.subcategoria || e.musculos.split(',')[0] === o.musculos.split(',')[0]));
  elegir(`Cambiar ${o.nombre} (solo hoy)`, alts, async nuevo => {
    try {
      const dd = E.dd, it = dd.items.find(x => x.id === id);
      const ex = it.extra ? dd.ex.map(x => x === id ? nuevo : x) : [...dd.ex, nuevo], q = it.extra ? dd.q : [...dd.q, id];
      await tmp(dd, ex, q);
      const p = await api('semana', { desde: fmt(S.lun), hasta: fmt(addD(S.lun, 6)) });
      S.prog = Object.fromEntries(p.map(x => [x.fecha, x])); E.dd = datosDia(); cerrar(); pintarEntreno();
    } catch (e) { modal(`<p class="text-red-400 mb-3">${esc(e.message)}</p><button id="x" class="btn w-full">Cerrar</button>`); $('#x').onclick = cerrar; }
  });
}
