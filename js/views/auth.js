import { db } from '../db.js';
import { $, esc, icon, toast, busy, friendlyError } from '../ui.js';

export default function (el, params) {
  let mode = params[0] === 'reset' ? 'newpass' : 'login';
  const draw = () => {
    el.innerHTML = `<div class="auth"><div class="auth-box">
      <div class="auth-hero"><div class="brand-mark">os</div><h1>OUR SPACE</h1>
        <p>Un espacio seguro para comprender, cuidar y construir una relación.</p></div>
      <div class="card stack-lg">
        ${mode === 'newpass' ? `<div><h2>Nueva contraseña</h2><p class="muted small">Escribe tu nueva contraseña.</p></div>
          <form id="f" class="stack"><div class="field"><label>Contraseña nueva</label><input class="input" type="password" name="p" minlength="8" required autocomplete="new-password"/></div>
          <div class="err" id="err"></div><button class="btn block">Guardar</button></form>`
        : mode === 'forgot' ? `<div><h2>Recuperar acceso</h2><p class="muted small">Te enviaremos un enlace para crear una nueva contraseña.</p></div>
          <form id="f" class="stack"><div class="field"><label>Correo</label><input class="input" type="email" name="e" required autocomplete="email"/></div>
          <div class="err" id="err"></div><button class="btn block">Enviar enlace</button></form>
          <button class="link" id="toLogin">${icon('back', 'sr')}Volver</button>`
        : `<div class="seg"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Entrar</button><button data-m="signup" class="${mode === 'signup' ? 'on' : ''}">Crear cuenta</button></div>
          <form id="f" class="stack">
            <div class="field"><label>Correo</label><input class="input" type="email" name="e" required autocomplete="email"/></div>
            <div class="field"><label>Contraseña</label><input class="input" type="password" name="p" minlength="${mode === 'signup' ? 8 : 6}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"/>
              ${mode === 'signup' ? '<span class="hint">Mínimo 8 caracteres. Tu cuenta es individual: cada integrante de la pareja tiene la suya.</span>' : ''}</div>
            <div class="err" id="err"></div>
            <button class="btn block">${mode === 'signup' ? 'Crear mi cuenta' : 'Entrar'}</button>
          </form>
          ${mode === 'login' ? '<button class="link center" id="forgot">¿Olvidaste tu contraseña?</button>' : ''}`}
      </div>
      <div class="privacy-note" style="margin-top:16px">${icon('lock')}<span>Tus respuestas individuales son privadas por defecto. Nada se comparte con tu pareja sin tu consentimiento explícito.</span></div>
      <p class="quote">“Dos personas, dos perspectivas y una relación que merece ser comprendida desde ambas.”</p>
    </div></div>`;
    el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { mode = b.dataset.m; draw(); }));
    const fg = $('#forgot', el); if (fg) fg.onclick = () => { mode = 'forgot'; draw(); };
    const tl = $('#toLogin', el); if (tl) tl.onclick = () => { mode = 'login'; draw(); };
    $('#f', el).onsubmit = (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button'), err = $('#err', el); err.textContent = '';
      const email = f.e?.value.trim(), pass = f.p?.value;
      busy(btn, async () => {
        try {
          if (mode === 'login') { await db.signIn(email, pass); }
          else if (mode === 'signup') {
            const r = await db.signUp(email, pass);
            if (!r.session) {
              el.querySelector('.card').innerHTML = `<div class="center stack"><div class="ic" style="margin:0 auto">${icon('mail')}</div><h2>Revisa tu correo</h2>
                <p class="muted">Te enviamos un enlace a <b>${esc(email)}</b> para confirmar tu cuenta. Después vuelve aquí e inicia sesión.</p>
                <button class="btn ghost" id="back2">Ya lo confirmé</button></div>`;
              $('#back2', el).onclick = () => { mode = 'login'; draw(); };
            }
          } else if (mode === 'forgot') { await db.resetPassword(email); toast('Te enviamos un enlace a tu correo'); mode = 'login'; draw(); }
          else if (mode === 'newpass') { await db.updatePassword(pass); toast('Contraseña actualizada'); location.hash = '#/inicio'; location.reload(); }
        } catch (ex) { err.textContent = friendlyError(ex); }
      });
    };
  };
  draw();
}
