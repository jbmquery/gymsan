/* GymTracker - Parte 2 del frontend: calendario semanal, rutinas, cambios temporales/permanentes */
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunes = d => addD(d, -((d.getDay() + 6) % 7));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const S = { lun: lunes(new Date()), sel: fmt(new Date()), rutinas: [], ejercicios: [], prog: {} };
const ej = id => S.ejercicios.find(e => e.id === id);
const nom = id => ej(id) ? ej(id).nombre : '(eliminado)';

async function vistaInicio() {
  const [r, e, p] = await Promise.all([api('listarRutinas'),
    S.ejercicios.length ? S.ejercicios : api('listarEjercicios'),
    api('semana', { desde: fmt(S.lun), hasta: fmt(addD(S.lun, 6)) })]);
  S.rutinas = r; S.ejercicios = e; S.prog = Object.fromEntries(p.map(x => [x.fecha, x]));
  pintar();
}
function datosDia() {
  const pr = S.prog[S.sel]; if (!pr) return null;
  const rut = S.rutinas.find(r => r.id === pr.rutinaId), q = JSON.parse(pr.quitados || '[]'), ex = JSON.parse(pr.extras || '[]');
  const base = (rut ? rut.ejercicios : []).filter(x => !q.includes(x.ejercicioId)).map(x => ({ id: x.ejercicioId, extra: false }));
  return { pr, rut, q, ex, items: base.concat(ex.map(id => ({ id, extra: true }))) };
}
function pintar() {
  const hoy = fmt(new Date()), pasado = S.sel < hoy, dd = datosDia();
  const tira = DIAS.map((n, i) => { const f = fmt(addD(S.lun, i)); return `<button data-f="${f}" class="dia rounded-lg p-2 text-center ${f === S.sel ? 'btn' : 'card'}">
      <div class="text-xs">${n}</div><div class="font-bold">${f.slice(8)}</div><div>${S.prog[f] ? '●' : '&nbsp;'}</div></button>`; }).join('');
  let panel;
  if (dd) panel = `<div class="flex justify-between items-center mb-2"><h2 class="font-bold">${esc(dd.rut ? dd.rut.nombre : 'Rutina eliminada')}</h2>
      ${pasado ? '' : '<button id="cr" class="text-sm underline">Cambiar rutina</button>'}</div>
    <div class="space-y-2">${dd.items.map(it => `<div class="card p-3 flex justify-between items-center"><div><b>${esc(nom(it.id))}</b>${it.extra ? ' <span class="text-xs" style="color:var(--ac)">libre</span>' : ''}
      <div class="text-xs text-zinc-400">${esc(ej(it.id)?.musculos)}</div></div>
      ${pasado ? '' : `<div class="flex gap-3 text-xl"><button data-alt="${esc(it.id)}" title="Alternativos">⇄</button><button data-q="${esc(it.id)}" title="Quitar">✕</button></div>`}</div>`).join('') || '<p class="text-zinc-400">Sin ejercicios</p>'}</div>
    ${pasado ? '' : `<div class="flex flex-wrap gap-2 mt-3 text-sm"><button id="add" class="inp !w-auto">+ Ejercicio libre</button>
      <button id="er" class="inp !w-auto">Editar rutina</button><button id="qd" class="inp !w-auto">Quitar del día</button></div>`}
    ${S.sel === hoy ? '<button id="ini" class="btn w-full mt-4 text-lg sticky bottom-3 shadow-lg">▶ Iniciar rutina</button>'
      : pasado ? '' : '<p class="text-xs text-zinc-500 mt-4 text-center">Podrás iniciar esta rutina el mismo día en que está programada.</p>'}`;
  else if (pasado) panel = '<p class="text-zinc-400">Sin rutina programada.</p>';
  else panel = S.rutinas.length ? `<p class="mb-2">Sin rutina este día. Programa una:</p>
      <select id="pr" class="inp mb-2">${S.rutinas.map(r => `<option value="${esc(r.id)}">${esc(r.nombre)}</option>`).join('')}</select>
      <select id="sw" class="inp mb-2"><option value="1">Solo este día</option><option value="4">Repetir 4 semanas</option><option value="8">Repetir 8 semanas</option></select>
      <button id="pg" class="btn w-full">Programar</button>` : '<p class="text-zinc-400">Crea tu primera rutina para programarla.</p>';
  $('#app').innerHTML = navHTML('semana') + `<div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-2"><button id="pv" class="text-2xl">‹</button><span class="text-sm">Semana del ${S.lun.getDate()}/${S.lun.getMonth() + 1}</span><button id="nx" class="text-2xl">›</button></div>
      <div class="flex gap-2"><button id="nr" class="btn text-sm">+ Rutina</button><button id="cp" class="text-sm text-zinc-400">Perfiles</button></div></div>
    <div class="grid grid-cols-7 gap-1 mb-4">${tira}</div><div class="card p-4">${panel}</div>`;
  enlazarNav(); enlazar(dd);
}
async function mover(n) { S.lun = addD(S.lun, n * 7); S.sel = fmt(S.lun); await vistaInicio(); }
async function ejecutar(fn) { try { await fn(); await vistaInicio(); cerrar(); } catch (e) { modal(`<p class="text-red-400 mb-3">${esc(e.message)}</p><button id="x" class="btn w-full">Cerrar</button>`); $('#x').onclick = cerrar; } }
function enlazar(dd) {
  $('#pv').onclick = () => mover(-1); $('#nx').onclick = () => mover(1); $('#cp').onclick = vistaPerfiles; $('#nr').onclick = () => editorRutina(null);
  document.querySelectorAll('.dia').forEach(b => b.onclick = () => { S.sel = b.dataset.f; pintar(); });
  if ($('#pg')) $('#pg').onclick = () => ejecutar(() => api('programarDia', { fecha: S.sel, rutinaId: $('#pr').value, semanas: $('#sw').value }));
  if (!dd) return;
  if ($('#cr')) $('#cr').onclick = cambiarRutina;
  if ($('#er') && dd.rut) $('#er').onclick = () => editorRutina(dd.rut);
  if ($('#qd')) $('#qd').onclick = () => ejecutar(() => api('quitarProgramacion', { fecha: S.sel }));
  if ($('#add')) $('#add').onclick = () => elegir('Agregar ejercicio', S.ejercicios, id => agregar(dd, id));
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => quitar(dd, b.dataset.q));
  document.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => alternativos(dd, b.dataset.alt));
  if ($('#ini')) $('#ini').onclick = () => iniciarEntreno(dd);
}
/* Temporal vs permanente */
function alcance(titulo) {
  return new Promise(res => {
    modal(`<h2 class="font-bold mb-3">${esc(titulo)}</h2><button id="t" class="btn w-full mb-2">Solo este día</button>
      <button id="p" class="inp text-center mb-2">Permanente (en la rutina)</button><button id="c" class="text-sm text-zinc-400 w-full">Cancelar</button>`);
    $('#t').onclick = () => res('temp'); $('#p').onclick = () => res('perm'); $('#c').onclick = () => { cerrar(); res(null); };
  });
}
const tmp = (dd, ex, q) => api('cambiarDia', { fecha: S.sel, extras: ex, quitados: q });
async function quitar(dd, id) {
  const it = dd.items.find(x => x.id === id);
  if (it.extra) return ejecutar(() => tmp(dd, dd.ex.filter(x => x !== id), dd.q));
  const a = await alcance('¿Quitar este ejercicio?'); if (!a) return;
  ejecutar(() => a === 'temp' ? tmp(dd, dd.ex, [...dd.q, id]) : api('cambioPermanente', { rutinaId: dd.pr.rutinaId, accion: 'quitar', ejercicioId: id }));
}
async function agregar(dd, id) {
  const a = await alcance('¿Agregar ejercicio?'); if (!a) return;
  ejecutar(() => a === 'temp' ? tmp(dd, [...new Set([...dd.ex, id])], dd.q) : api('cambioPermanente', { rutinaId: dd.pr.rutinaId, accion: 'agregar', nuevoId: id }));
}
function alternativos(dd, id) {
  const o = ej(id), alts = S.ejercicios.filter(e => e.id !== id && (e.subcategoria === o.subcategoria || e.musculos.split(',')[0] === o.musculos.split(',')[0]));
  elegir(`Alternativas a ${o.nombre}`, alts, async nuevo => {
    const it = dd.items.find(x => x.id === id), a = it.extra ? 'temp' : await alcance('¿Cambiar ejercicio?'); if (!a) return;
    ejecutar(() => {
      if (it.extra) return tmp(dd, dd.ex.map(x => x === id ? nuevo : x), dd.q);
      return a === 'temp' ? tmp(dd, [...dd.ex, nuevo], [...dd.q, id]) : api('cambioPermanente', { rutinaId: dd.pr.rutinaId, accion: 'reemplazar', ejercicioId: id, nuevoId: nuevo });
    });
  });
}
function cambiarRutina() {
  modal(`<h2 class="font-bold mb-3">Cambiar rutina de este día</h2><select id="nr2" class="inp mb-3">${S.rutinas.map(r => `<option value="${esc(r.id)}">${esc(r.nombre)}</option>`).join('')}</select>
    <button id="ok" class="btn w-full mb-2">Cambiar</button><button id="x" class="text-sm text-zinc-400 w-full">Cancelar</button>`);
  $('#x').onclick = cerrar; $('#ok').onclick = () => ejecutar(() => api('programarDia', { fecha: S.sel, rutinaId: $('#nr2').value, semanas: 1 }));
}
/* Buscador de ejercicios (modal) */
function buscador(box, lista, onPick) {
  box.innerHTML = '<input class="inp mb-2" placeholder="Buscar por nombre, alias o músculo"><div class="max-h-56 overflow-y-auto space-y-1"></div>';
  const inp = box.firstChild, out = box.lastChild;
  const pinta = () => {
    const q = norm(inp.value);
    out.innerHTML = lista.filter(e => norm([e.nombre, e.alias, e.musculos, e.categoria, e.subcategoria].join(' ')).includes(q)).slice(0, 30)
      .map(e => `<button data-id="${esc(e.id)}" class="w-full text-left p-2 rounded hover:bg-zinc-800"><b>${esc(e.nombre)}</b><div class="text-xs text-zinc-400">${esc(e.subcategoria)} · ${esc(e.musculos)}</div></button>`).join('') || '<p class="text-sm text-zinc-400">Sin resultados</p>';
    out.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => onPick(b.dataset.id));
  };
  inp.oninput = pinta; pinta();
}
function elegir(titulo, lista, onPick) {
  modal(`<h2 class="font-bold mb-3">${esc(titulo)}</h2><div id="bx"></div><button id="x" class="inp mt-3 text-center">Cancelar</button>`);
  $('#x').onclick = cerrar; buscador($('#bx'), lista, onPick);
}
/* Crear / editar rutina */
function editorRutina(rut) {
  const sel = rut ? rut.ejercicios.map(x => x.ejercicioId) : [];
  modal(`<h2 class="font-bold mb-3">${rut ? 'Editar' : 'Nueva'} rutina</h2>
    <input id="rn" class="inp mb-2" maxlength="40" placeholder="Nombre de la rutina" value="${esc(rut ? rut.nombre : '')}">
    <div id="rl" class="mb-2 text-sm"></div><div id="rb"></div><p id="rm" class="text-sm text-red-400 min-h-[1.25rem]"></p>
    <div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Guardar</button></div>`);
  const pintaSel = () => {
    $('#rl').innerHTML = sel.map((id, i) => `<div class="flex justify-between py-1"><span>${esc(nom(id))}</span><button data-i="${i}">✕</button></div>`).join('') || '<span class="text-zinc-400">Aún sin ejercicios</span>';
    $('#rl').querySelectorAll('button').forEach(b => b.onclick = () => { sel.splice(+b.dataset.i, 1); pintaSel(); });
  };
  pintaSel();
  buscador($('#rb'), S.ejercicios, id => { if (!sel.includes(id)) sel.push(id); pintaSel(); });
  $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    try {
      const ejercicios = sel.map(id => { const p = rut && rut.ejercicios.find(x => x.ejercicioId === id), e = ej(id);
        return { ejercicioId: id, series: p ? p.series : e.series, reps: p ? p.reps : e.reps, descansoSeg: p ? p.descansoSeg : e.descansoSeg }; });
      await api('guardarRutina', { id: rut && rut.id, nombre: $('#rn').value, ejercicios }); cerrar(); vistaInicio();
    } catch (e) { err($('#rm'), e); }
  };
}