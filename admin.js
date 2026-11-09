/* GymTracker - Parte 4 del frontend: panel maestro y administración (admin / desarrollador) */
let tabPanel = 'resumen';
const caja = h => `<div class="max-h-[75vh] overflow-y-auto">${h}</div>`;
const aviso = e => { modal(`<p class="text-red-400 mb-3">${esc(e.message)}</p><button id="x" class="btn w-full">Cerrar</button>`); $('#x').onclick = cerrar; };
async function vistaPanel() {
  if (NIVEL[perfilActual.rol] < 2) return;
  const tabs = [['resumen', 'Resumen'], ['cuentas', 'Cuentas'], ['solicitudes', 'Solicitudes'], ['ejercicios', 'Ejercicios']];
  $('#app').innerHTML = `${navHTML('panel')}<div class="flex gap-2 mb-3 text-sm overflow-x-auto">${tabs.map(([k, l]) => `<button data-pt="${k}" class="px-3 py-1 rounded ${k === tabPanel ? 'btn' : 'card'}">${l}</button>`).join('')}</div><div id="pc">Cargando…</div>`;
  enlazarNav(); document.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { tabPanel = b.dataset.pt; vistaPanel(); });
  try { await ({ resumen: pResumen, cuentas: pCuentas, solicitudes: pSolicitudes, ejercicios: pEjercicios })[tabPanel](); } catch (e) { $('#pc').textContent = e.message; }
}
async function pResumen() {
  const m = await api('master', { desde: desdeStr(), hasta: fmt(new Date()) });
  $('#pc').innerHTML = `${filtroRango()}<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">${kpi(m.cuentas, 'Cuentas')}${kpi(m.perfiles, 'Perfiles')}${kpi(m.entrenos, 'Entrenos')}${kpi(m.pendientes, 'Solicitudes pendientes')}</div>
    <div class="card p-3 mb-3"><h3 class="font-semibold mb-2">Por cuenta</h3>${m.porCuenta.map(c => `<div class="flex justify-between text-sm py-1"><span>${esc(c.email)}</span><span>${c.perfiles} perfiles · ${c.entrenos} entrenos</span></div>`).join('')}</div>
    <div class="card p-3"><h3 class="font-semibold mb-2">Mejores rachas</h3>${m.top.map(p => `<div class="flex justify-between text-sm py-1"><span>${esc(p.nombre)}</span><span>🔥 ${p.racha}</span></div>`).join('')}</div>`;
  $('#rg').onchange = e => { rangoDias = +e.target.value; pResumen(); };
}
async function pCuentas() {
  const cs = await api('listarCuentas'), dev = perfilActual.rol === 'desarrollador';
  $('#pc').innerHTML = `<div class="card p-3 mb-3"><h3 class="font-semibold mb-2">Crear cuenta</h3>
      <input id="ce" type="email" class="inp mb-2" placeholder="correo@gmail.com"><input id="cp2" type="text" class="inp mb-2" placeholder="Contraseña inicial (mín. 8)">
      <select id="cr2" class="inp mb-2"><option value="general">General</option>${dev ? '<option value="administrativo">Administrativo</option><option value="desarrollador">Desarrollador</option>' : ''}</select>
      <p id="cm" class="text-sm text-red-400 min-h-[1.25rem]"></p><button id="cg" class="btn w-full">Crear</button></div>
    ${cs.map(c => `<div class="card p-3 mb-2 flex justify-between items-center text-sm"><div><b>${esc(c.email)}</b><div class="text-zinc-400">${esc(c.rol)} · ${esc(c.estado)}</div></div>
      <div class="flex gap-2"><button data-est="${esc(c.id)}" data-v="${c.estado === 'activa' ? 'inactiva' : 'activa'}" class="underline">${c.estado === 'activa' ? 'Desactivar' : 'Activar'}</button>
      ${dev ? `<button data-rol="${esc(c.id)}" class="underline">Rol</button>` : ''}</div></div>`).join('')}`;
  $('#cg').onclick = async () => { try { await api('crearCuenta', { email: $('#ce').value, password: $('#cp2').value, rol: $('#cr2').value }); pCuentas(); } catch (e) { err($('#cm'), e); } };
  document.querySelectorAll('[data-est]').forEach(b => b.onclick = async () => { try { await api('cuentaEstado', { id: b.dataset.est, estado: b.dataset.v }); pCuentas(); } catch (e) { aviso(e); } });
  document.querySelectorAll('[data-rol]').forEach(b => b.onclick = () => {
    modal(`<h2 class="font-bold mb-3">Cambiar rol</h2><select id="nr3" class="inp mb-3"><option>general</option><option>administrativo</option><option>desarrollador</option></select>
      <button id="ok" class="btn w-full mb-2">Guardar</button><button id="x" class="inp text-center">Cancelar</button>`);
    $('#x').onclick = cerrar; $('#ok').onclick = async () => { try { await api('cuentaRol', { id: b.dataset.rol, rol: $('#nr3').value }); cerrar(); pCuentas(); } catch (e) { aviso(e); } };
  });
}
async function pSolicitudes() {
  const ss = await api('solicitudesDetalle');
  $('#pc').innerHTML = ss.map(s => `<div class="card p-3 mb-2 text-sm"><div class="flex justify-between"><b>${s.tipo === 'reset_pin' ? 'Restablecer PIN' : 'Eliminar perfil'}</b><span class="text-zinc-400">${esc(s.estado)}</span></div>
    <div>${esc(s.perfil)} · ${esc(s.email)}</div><div class="text-zinc-400">${esc(s.motivo)}</div><div class="text-xs text-zinc-500">${esc(String(s.fecha).slice(0, 10))}</div>
    ${s.estado === 'pendiente' ? `<div class="flex gap-3 mt-2"><button data-ap="${esc(s.id)}" data-t="${esc(s.tipo)}" class="btn !py-1">Aprobar</button><button data-rc="${esc(s.id)}" class="underline">Rechazar</button></div>` : ''}</div>`).join('') || '<p class="text-zinc-400">Sin solicitudes.</p>';
  const resolver = async d => { try { await api('resolverSolicitud', d); cerrar(); pSolicitudes(); } catch (e) { aviso(e); } };
  document.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => resolver({ id: b.dataset.rc, aprobar: false }));
  document.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => {
    if (b.dataset.t === 'eliminar_perfil') return resolver({ id: b.dataset.ap, aprobar: true });
    modal(`<h2 class="font-bold mb-3">PIN nuevo (4 a 6 dígitos)</h2><input id="np" type="password" inputmode="numeric" maxlength="6" class="inp mb-3">
      <button id="ok" class="btn w-full mb-2">Aplicar</button><button id="x" class="inp text-center">Cancelar</button>`);
    $('#x').onclick = cerrar; $('#ok').onclick = () => resolver({ id: b.dataset.ap, aprobar: true, nuevoPin: $('#np').value });
  });
}
const CAMPOS = [['nombre', 'Nombre'], ['categoria', 'Categoría (ej. Tren superior)'], ['subcategoria', 'Subcategoría (ej. Pecho)'], ['musculos', 'Músculos que ejercita'], ['alias', 'Otros nombres (separados por coma)'],
  ['intensidad', 'Intensidad (Baja/Media/Alta)'], ['vecesSemana', 'Veces por semana recomendadas'], ['descansoSeg', 'Descanso recomendado (segundos)'], ['series', 'Series recomendadas'], ['reps', 'Repeticiones recomendadas'], ['url', 'URL de imagen o video']];
async function pEjercicios() {
  S.ejercicios = await api('listarEjercicios');
  $('#pc').innerHTML = `<button id="ne" class="btn w-full mb-3">+ Nuevo ejercicio</button>${S.ejercicios.map(e => `<div class="card p-3 mb-2 flex justify-between items-center text-sm">
    <div><b>${esc(e.nombre)}</b><div class="text-zinc-400">${esc(e.categoria)} · ${esc(e.subcategoria)}</div></div>
    <div class="flex gap-3"><button data-ed="${esc(e.id)}" class="underline">Editar</button><button data-dl="${esc(e.id)}" class="underline text-red-400">Borrar</button></div></div>`).join('')}`;
  $('#ne').onclick = () => formEj({});
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formEj(ej(b.dataset.ed)));
  document.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { if (confirm('¿Borrar ejercicio?')) { try { await api('eliminarEjercicio', { id: b.dataset.dl }); pEjercicios(); } catch (e) { aviso(e); } } });
}
function formEj(e) {
  modal(caja(`<h2 class="font-bold mb-3">${e.id ? 'Editar' : 'Nuevo'} ejercicio</h2>${CAMPOS.map(([k, l]) => `<label class="text-xs text-zinc-400">${esc(l)}</label><input data-k="${k}" class="inp mb-2" value="${esc(e[k] || '')}">`).join('')}
    <label class="text-xs text-zinc-400">Instrucciones</label><textarea data-k="instrucciones" rows="4" class="inp mb-2">${esc(e.instrucciones || '')}</textarea>
    <p id="fm" class="text-sm text-red-400 min-h-[1.25rem]"></p><div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Guardar</button></div>`));
  $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    const o = { id: e.id }; document.querySelectorAll('[data-k]').forEach(i => o[i.dataset.k] = i.value.trim());
    try { await api('guardarEjercicio', { ejercicio: o }); cerrar(); pEjercicios(); } catch (x) { err($('#fm'), x); }
  };
}
