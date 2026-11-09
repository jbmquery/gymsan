/* GymTracker - Extras: ajustes (avatar, contraseña, instalar app) y selector de avatar */
const EMOJIS = ['🦁', '🐯', '🐺', '🦅', '🐻', '🦍', '🐉', '🔥', '⚡', '💪', '🏋️', '🚀'];
function pickerAvatar() {
  return `<div class="flex flex-wrap gap-2 mb-3">${EMOJIS.map(e => `<button type="button" data-em="${e}" class="text-2xl w-10 h-10 rounded card" aria-label="Avatar ${e}">${e}</button>`).join('')}</div>`;
}
function enlazarPicker() { document.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { $('#pa').value = b.dataset.em; }); }

let eventoInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); eventoInstalar = e; });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

$('#ajustes').onclick = () => {
  modal(`<h2 class="font-bold text-lg mb-3">Ajustes</h2>
    <button id="a1" class="inp text-left mb-2">🎨 Cambiar avatar</button>
    <button id="a2" class="inp text-left mb-2">🔑 Cambiar contraseña</button>
    <button id="a3" class="inp text-left mb-2">📲 Instalar en el celular</button>
    <button id="x" class="text-sm text-zinc-400 w-full mt-1">Cerrar</button>`);
  $('#x').onclick = cerrar; $('#a1').onclick = cambiarAvatar; $('#a2').onclick = cambiarPassword;
  $('#a3').onclick = async () => {
    if (eventoInstalar) { eventoInstalar.prompt(); eventoInstalar = null; cerrar(); return; }
    modal(`<h2 class="font-bold mb-2">Instalar GymTracker</h2><p class="text-sm text-zinc-300 mb-3">En <b>Android (Chrome)</b>: menú ⋮ → "Instalar aplicación". En <b>iPhone (Safari)</b>: botón Compartir → "Añadir a pantalla de inicio".</p><button id="x" class="btn w-full">Entendido</button>`);
    $('#x').onclick = cerrar;
  };
};
function cambiarAvatar() {
  if (!perfilActual) return modal('<p class="mb-3">Primero entra a un perfil.</p><button id="x" class="btn w-full">Cerrar</button>'), $('#x').onclick = cerrar;
  modal(`<h2 class="font-bold text-lg mb-3">Tu avatar</h2><input id="pa" class="inp mb-2" maxlength="4" placeholder="Siglas o elige un emoji" value="${esc(perfilActual.avatar)}">${pickerAvatar()}
    <p id="m6" class="text-sm text-red-400 min-h-[1.25rem]"></p><div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Guardar</button></div>`);
  enlazarPicker(); $('#x').onclick = cerrar;
  $('#ok').onclick = async () => { try { perfilActual.avatar = await api('editarPerfil', { avatar: $('#pa').value.trim().toUpperCase() }); cerrar(); } catch (e) { err($('#m6'), e); } };
}
function cambiarPassword() {
  modal(`<h2 class="font-bold text-lg mb-3">Cambiar contraseña</h2>
    <input id="c1" type="password" class="inp mb-2" placeholder="Contraseña actual" autocomplete="current-password">
    <input id="c2" type="password" class="inp mb-2" placeholder="Nueva contraseña (mín. 8)" autocomplete="new-password">
    <input id="c3" type="password" class="inp mb-2" placeholder="Repite la nueva contraseña" autocomplete="new-password">
    <p id="m7" class="text-sm text-red-400 min-h-[1.25rem]"></p><div class="flex gap-2"><button id="x" class="inp !w-1/3">Cancelar</button><button id="ok" class="btn flex-1">Guardar</button></div>`);
  $('#x').onclick = cerrar;
  $('#ok').onclick = async () => {
    if ($('#c2').value !== $('#c3').value) return err($('#m7'), 'Las contraseñas nuevas no coinciden');
    try { await api('cambiarPassword', { actual: $('#c1').value, nueva: $('#c2').value }); modal('<p class="mb-3">Contraseña actualizada ✓</p><button id="x" class="btn w-full">Cerrar</button>'); $('#x').onclick = cerrar; }
    catch (e) { err($('#m7'), e); }
  };
}
