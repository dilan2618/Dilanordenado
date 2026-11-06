// Etapa 1: crear el espacio o unirse con invitación
import { db } from '../db.js';
import { $, esc, icon, busy, friendlyError, todayStr } from '../ui.js';
import { REL_TYPES } from '../content.js';
import { refreshSpace, relisten } from '../app.js';

export default function (el) {
  const code = new URLSearchParams(location.search).get('invitacion') || '';
  let mode = code ? 'join' : 'choose';
  const draw = () => {
    el.innerHTML = `<div class="ob"><div class="ob-top"><span class="brand-mark" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--wine);color:var(--cream);font-family:var(--serif);font-style:italic">os</span>
      <span class="grow"></span><button class="link" id="out">Cerrar sesión</button></div>
      ${mode === 'choose' ? `
        <div class="section-intro"><div class="big-ic">${icon('home')}</div><h2>Bienvenido/a a OUR SPACE</h2>
          <p>Este es un rincón privado para dos. Antes de empezar, vamos a crear su espacio y a conocerlos un poco.</p></div>
        <div class="stack">
          <button class="tile" id="toCreate"><span class="ic">${icon('plus')}</span><b>Crear nuestro espacio</b><span>Soy la primera persona en llegar. Luego invito a mi pareja.</span></button>
          <button class="tile" id="toJoin"><span class="ic">${icon('link')}</span><b>Tengo una invitación</b><span>Mi pareja ya creó el espacio y me dio un código.</span></button>
        </div>`
      : mode === 'create' ? `
        <div class="stages"><span class="stage on">1 · El espacio</span><span class="stage">2 · Conocerte</span><span class="stage">3 · La relación</span><span class="stage">4 · Objetivos</span></div>
        <div class="q-card"><div class="q-intro">Etapa 1</div><div class="q-text">Creemos su espacio</div><p class="q-hint">Solo lo básico. Todo se puede cambiar después.</p>
        <form id="f" class="stack-lg">
          <div class="two-col"><div class="field"><label>Tu nombre</label><input class="input" name="name" required maxlength="40" autocomplete="given-name"/></div>
          <div class="field"><label>Tu edad <span class="muted">(opcional)</span></label><input class="input" name="age" type="number" min="14" max="120"/></div></div>
          <div class="field"><label>Nombre de tu pareja <span class="muted">(se confirmará cuando se una)</span></label><input class="input" name="partner" maxlength="40"/></div>
          <div class="field"><label>¿Cómo quieren llamar a su espacio? <span class="muted">(opcional)</span></label><input class="input" name="spaceName" maxlength="60" placeholder="Ej: Nuestro rincón"/></div>
          <div class="field"><label>Tipo de relación</label><div class="chips" id="types">${REL_TYPES.map((t, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
          <div class="field"><label>¿Desde cuándo están juntos?</label><input class="input" type="date" name="start" max="${todayStr()}"/><span class="hint">Con esta fecha calculamos el tiempo que llevan juntos.</span></div>
          <div class="err" id="err"></div>
          <div class="q-nav"><button type="button" class="btn ghost" id="back">Atrás</button><button class="btn">Crear espacio</button></div>
        </form></div>`
      : `
        <div class="q-card"><div class="q-intro">Unirme</div><div class="q-text">Entra al espacio de tu pareja</div><p class="q-hint">Pídele el código de invitación que aparece en su app.</p>
        <form id="f" class="stack-lg">
          <div class="field"><label>Código de invitación</label><input class="input" name="code" required maxlength="9" placeholder="XXXX-XXXX" value="${esc(code)}" style="text-transform:uppercase;letter-spacing:.15em;font-size:1.2rem;text-align:center" autocapitalize="characters"/></div>
          <div class="two-col"><div class="field"><label>Tu nombre</label><input class="input" name="name" required maxlength="40"/></div>
          <div class="field"><label>Tu edad <span class="muted">(opcional)</span></label><input class="input" name="age" type="number" min="14" max="120"/></div></div>
          <div class="privacy-note">${icon('lock')}<span>Al unirte compartirás el espacio, pero tus respuestas individuales seguirán siendo privadas salvo que decidas compartirlas.</span></div>
          <div class="err" id="err"></div>
          <div class="q-nav"><button type="button" class="btn ghost" id="back">Atrás</button><button class="btn">Unirme</button></div>
        </form></div>`}
    </div>`;
    $('#out', el).onclick = () => db.signOut();
    const c = $('#toCreate', el); if (c) c.onclick = () => { mode = 'create'; draw(); };
    const j = $('#toJoin', el); if (j) j.onclick = () => { mode = 'join'; draw(); };
    const b = $('#back', el); if (b) b.onclick = () => { mode = 'choose'; draw(); };
    let type = REL_TYPES[0];
    el.querySelectorAll('#types .chip').forEach((ch) => (ch.onclick = () => { type = ch.dataset.t; el.querySelectorAll('#types .chip').forEach((x) => x.classList.toggle('on', x === ch)); }));
    const f = $('#f', el);
    if (f) f.onsubmit = (e) => {
      e.preventDefault(); const err = $('#err', el); err.textContent = '';
      busy(f.querySelector('button:not([type=button])'), async () => {
        try {
          const age = f.age.value ? +f.age.value : null;
          if (mode === 'create') {
            await db.createSpace({ name: f.name.value.trim(), age, spaceName: f.spaceName.value.trim(), type, start: f.start.value || null });
            try { localStorage.setItem('os_partner_hint', f.partner.value.trim()); } catch {}
          } else {
            await db.joinSpace(f.code.value.trim().toUpperCase(), f.name.value.trim(), age);
            history.replaceState(null, '', location.pathname + '#/bienvenida');
          }
          await refreshSpace(false); relisten(); location.hash = '#/bienvenida'; window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (ex) { err.textContent = friendlyError(ex); }
      });
    };
  };
  draw();
}
