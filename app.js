/* GymTracker - Parte 1 del frontend: login, perfiles, PIN, soporte, términos, temas */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token = sessionStorage.getItem('token'), perfiles = [], gestionar = false, perfilActual = null;

async function api(action, data = {}) {
  const r = await fetch(window.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, data, token }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}
function modal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function cerrar() { $('#modal').classList.add('hidden'); }
function err(el, e) { el.textContent = e.message || e; }

/* Temas */
function tema(t) { document.documentElement.dataset.tema = t; localStorage.setItem('tema', t); $('#tema').value = t; }
$('#tema').onchange = e => tema(e.target.value);
tema(localStorage.getItem('tema') || 'rojo');

/* Login */
function vistaLogin() {
  $('#top').classList.add('hidden');
  $('#app').innerHTML = `<div class="card p-6 max-w-sm mx-auto mt-16">
    <h1 class="text-2xl font-bold mb-4" style="color:var(--ac)">Iniciar sesión</h1>
    <input id="em" type="email" class="inp mb-3" placeholder="correo@gmail.com" autocomplete="username">
    <input id="pw" type="password" class="inp mb-3" placeholder="Contraseña" autocomplete="current-password">
    <p id="msg" class="text-sm text-red-400 mb-2 min-h-[1.25rem]"></p>
    <button id="go" class="btn w-full">Entrar</button>
    <button id="olv" class="text-sm text-zinc-400 mt-3 w-full">Olvidé mi contraseña</button>
  </div>`;
  $('#go').onclick = async () => {
    try {
      const r = await api('login', { email: $('#em').value, password: $('#pw').value }).catch(e => { throw e; });
      token = r.token; sessionStorage.setItem('token', token);
      r.terminosAceptados ? vistaPerfiles() : terminos();
    } catch (e) { err($('#msg'), e); }
  };
  $('#olv').onclick = async () => {
    try { $('#msg').className = 'text-sm text-green-400 mb-2'; $('#msg').textContent = await api('olvidePassword', { email: $('#em').value }); }
    catch (e) { err($('#msg'), e); }
  };
}
function terminos() {
  modal(`<h2 class="font-bold text-lg mb-2">Términos y condiciones</h2>
    <div class="text-sm text-zinc-300 max-h-48 overflow-y-auto mb-3 space-y-2">
      <p>GymTracker almacena tu correo, nombre de perfil, rutinas y registros de entrenamiento para ofrecerte el servicio de seguimiento.</p>
      <p>Los demás perfiles de tu cuenta pueden ver tu progreso y tu racha. Los administradores gestionan las cuentas y las solicitudes de soporte.</p>
      <p>Puedes solicitar la eliminación de tu perfil y datos en cualquier momento desde Soporte.</p>
    </div>
    <label class="flex gap-2 text-sm mb-3"><input id="ok" type="checkbox"> Acepto los términos y el tratamiento de mis datos personales.</label>
    <p id="m2" class="text-sm text-red-400 min-h-[1.25rem]"></p>
    <button id="acc" class="btn w-full">Continuar</button>`);
  $('#acc').onclick = async () => {
    try { await api('aceptarTerminos', { acepto: $('#ok').checked }); cerrar(); vistaPerfiles(); } catch (e) { err($('#m2'), e); }
  };
}

/* Perfiles */
async function vistaPerfiles() {
  $('#top').classList.replace('hidden', 'flex');
  perfiles = await api('listarPerfiles').catch(() => { cerrarSesion(); return []; });
  const tarjetas = perfiles.map(p => `<button data-id="${esc(p.id)}" class="perfil text-center">
      <div class="w-24 h-24 mx-auto rounded-xl flex items-center justify-center text-3xl font-bold" style="background:var(--ac)">${esc(p.avatar)}</div>
      <div class="mt-2 font-semibold">${esc(p.nombre)}</div>
      <div class="text-sm">🔥 ${Number(p.racha) || 0}</div></button>`).join('');
  const nuevo = perfiles.length < 4 ? `<button id="nuevo" class="text-center">
      <div class="w-24 h-24 mx-auto rounded-xl border-2 border-dashed border-zinc-600 flex items-center justify-center text-4xl">+</div>
      <div class="mt-2">Nuevo perfil</div></button>` : '';
  $('#app').innerHTML = `<h1 class="text-2xl font-bold text-center my-8">${perfiles.length ? '¿Quién entrena hoy?' : 'Crea tu primer perfil'}</h1>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">${tarjetas}${nuevo}</div>
    ${perfiles.length ? `<div class="text-center mt-8"><button id="adm" class="border border-zinc-600 rounded px-4 py-2">${gestionar ? 'Listo' : 'Administrar perfiles'}</button></div>` : ''}`;
  document.querySelectorAll('.perfil').forEach(b => b.onclick = () =>
    gestionar ? solicitud(null, b.dataset.id) : pedirPin(perfiles.find(p => p.id === b.dataset.id)));
  if ($('#nuevo')) $('#nuevo').onclick = nuevoPerfil;
  if ($('#adm')) $('#adm').onclick = () => { gestionar = !gestionar; vistaPerfiles(); };
  if (!perfiles.length) nuevoPerfil();
}
function nuevoPerfil() {
  modal(`<h2 class="font-bold text-lg mb-3">Nuevo perfil</h2>
    <input id="pn" class="inp mb-3" placeholder="Nombre" maxlength="20">
    <input id="pa" class="inp mb-2" placeholder="Siglas (2 letras) o elige un emoji" maxlength="4">${pickerAvatar()}
    <input id="pp" type="password" inputmode="numeric" maxlength="6" class="inp mb-3" placeholder="PIN (4 a 6 dígitos)">
    <p id="m3" class="text-sm text-red-400 min-h-[1.25rem]"></p>
    <div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Crear</button></div>`);
  enlazarPicker(); $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    try { await api('crearPerfil', { nombre: $('#pn').value, avatar: $('#pa').value.toUpperCase(), pin: $('#pp').value }); cerrar(); vistaPerfiles(); }
    catch (e) { err($('#m3'), e); }
  };
}
function pedirPin(p) {
  modal(`<h2 class="font-bold text-lg mb-3 text-center">PIN de ${esc(p.nombre)}</h2>
    <input id="pin" type="password" inputmode="numeric" maxlength="6" class="inp text-center text-2xl tracking-widest mb-3" autofocus>
    <p id="m4" class="text-sm text-red-400 min-h-[1.25rem] text-center"></p>
    <div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Entrar</button></div>`);
  $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    try { perfilActual = await api('entrarPerfil', { perfilId: p.id, pin: $('#pin').value }); cerrar(); vistaInicio(); }
    catch (e) { err($('#m4'), e); }
  };
}
function vistaInicio() {
  $('#app').innerHTML = `<div class="card p-6 mt-8 text-center">
    <div class="text-xl">Hola, <b>${esc(perfilActual.nombre)}</b> 🔥 ${Number(perfilActual.racha) || 0}</div>
    <p class="text-zinc-400 mt-2">Rol: ${esc(perfilActual.rol)}. El calendario semanal llega en la siguiente entrega.</p>
    <button id="cp" class="btn mt-4">Cambiar de perfil</button></div>`;
  $('#cp').onclick = vistaPerfiles;
}

/* Soporte */
$('#soporteBtn').onclick = () => $('#soporteMenu').classList.toggle('hidden');
document.querySelectorAll('#soporteMenu [data-s]').forEach(b => b.onclick = () => { $('#soporteMenu').classList.add('hidden'); solicitud(b.dataset.s); });
function solicitud(tipo, perfilId) {
  const opts = perfiles.map(p => `<option value="${esc(p.id)}" ${p.id === perfilId ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');
  modal(`<h2 class="font-bold text-lg mb-3">Solicitud a administración</h2>
    <select id="st" class="inp mb-3"><option value="reset_pin" ${tipo === 'reset_pin' ? 'selected' : ''}>Restablecer PIN</option>
      <option value="eliminar_perfil" ${tipo === 'eliminar_perfil' ? 'selected' : ''}>Eliminar perfil</option></select>
    <select id="sp" class="inp mb-3">${opts}</select>
    <textarea id="sm" class="inp mb-3" rows="3" maxlength="300" placeholder="Motivo (obligatorio)"></textarea>
    <p id="m5" class="text-sm text-red-400 min-h-[1.25rem]"></p>
    <div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Enviar</button></div>`);
  $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    try { await api('crearSolicitud', { tipo: $('#st').value, perfilId: $('#sp').value, motivo: $('#sm').value }); cerrar(); }
    catch (e) { err($('#m5'), e); }
  };
}

/* Salir */
async function cerrarSesion() { try { await api('logout'); } catch (_) {} sessionStorage.clear(); token = null; vistaLogin(); }
$('#salir').onclick = cerrarSesion;
token ? vistaPerfiles() : vistaLogin();
