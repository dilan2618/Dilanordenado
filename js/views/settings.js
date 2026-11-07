// Privacidad y ajustes
import { db } from '../db.js';
import { S, loadSpace, aiStatus, memberView } from '../store.js';
import { $, esc, icon, toast, busy, friendlyError, compressImage, avatar, confirmSheet, todayStr } from '../ui.js';
import { REL_TYPES } from '../content.js';
import { THEMES, getAppearance, applyAppearance } from '../appearance.js';
import { importFromNR } from '../importnr.js';
import { shareInvite } from './onboarding.js';
import { refreshSpace } from '../app.js';

export default async function (el) {
  const sid = S.space.id;
  const ai = await aiStatus(true);
  const user = await db.user();
  const st = S.me.settings || {};
  el.innerHTML = `<div class="page narrow">
    <div class="page-head"><span class="eyebrow">Privacidad y ajustes</span><h1>Tu cuenta, tus datos</h1><p>La privacidad es parte del diseño: aquí decides qué se usa, qué se comparte y qué se borra.</p></div>

    <section class="card" id="look"><div class="card-head"><h3>Apariencia</h3><span class="tiny muted">Solo cambia en tu cuenta</span></div><div id="lookBody"></div></section>

    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Mi perfil</h3></div>
      <div class="row" style="margin-bottom:16px"><span id="av">${avatar(memberView(S.me), 'lg')}</span><label class="btn soft sm" for="avf">Cambiar foto</label><input type="file" id="avf" accept="image/*" hidden/></div>
      <form id="pf" class="stack"><div class="two-col"><div class="field"><label>Nombre</label><input class="input" name="n" maxlength="40" value="${esc(S.me.display_name)}" required/></div>
        <div class="field"><label>Edad <span class="muted">(opcional)</span></label><input class="input" name="a" type="number" min="14" max="120" value="${S.me.age || ''}"/></div></div>
        <p class="tiny muted">Cuenta: ${esc(user?.email || '')}</p><button class="btn sm" style="align-self:flex-start">Guardar</button></form></section>

    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Nuestro espacio</h3></div>
      <form id="sf" class="stack"><div class="field"><label>Nombre del espacio</label><input class="input" name="n" maxlength="60" value="${esc(S.space.name || '')}"/></div>
        <div class="two-col"><div class="field"><label>Tipo de relación</label><select class="select" name="t">${REL_TYPES.map((t) => `<option ${S.space.relationship_type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field"><label>Juntos desde</label><input class="input" type="date" name="d" value="${esc(S.space.start_date || '')}" max="${todayStr()}"/></div></div>
        <button class="btn sm" style="align-self:flex-start">Guardar</button></form>
      ${!S.partner ? `<div class="divider"></div><div class="row"><div class="grow"><b>Invitar a tu pareja</b><p class="small">Código: <b style="letter-spacing:.12em">${esc(S.space.invite_code)}</b></p></div><button class="btn sm" id="inv">Compartir</button></div>` : ''}
    </section>

    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Privacidad</h3>${icon('shield')}</div><div class="stack">
      <label class="switch"><input type="checkbox" data-s="profile_consent" ${st.profile_consent ? 'checked' : ''}/><div><b>Mis respuestas de opción y escala en el perfil compartido</b><span>Sin respuestas escritas.</span></div></label>
      <label class="switch"><input type="checkbox" data-s="ai_use_answers" ${st.ai_use_answers ? 'checked' : ''}/><div><b>El asistente puede usar mis respuestas para comprender</b><span>Nunca las revela ni las cita a tu pareja.</span></div></label>
      <label class="switch"><input type="checkbox" data-s="memory_enabled" ${st.memory_enabled !== false ? 'checked' : ''}/><div><b>Memoria del asistente</b><span>Ver y editar en <a href="#/memoria">Memoria</a>.</span></div></label>
      <p class="small muted">Para compartir secciones de tus respuestas con tu pareja, ve a <a href="#/conocernos">Conocernos → Mis respuestas</a>. Tus conversaciones “A solas” y “Analizar” son siempre privadas.</p></div></section>

    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Asistente</h3><span class="badge ${ai?.ai ? 'ok' : 'warn'}">${ai?.ai ? 'Activo' : ai?.error === 'fn_unreachable' ? 'No disponible' : 'Sin activar'}</span></div>
      <p class="small">${ai?.ai ? `Conectado a: ${esc(ai.model || '')}. Las conversaciones se procesan en el servidor; la clave nunca está en tu teléfono.` : 'Falta configurar una clave de IA en el servidor (Supabase → Edge Functions → Secrets): GEMINI_API_KEY o GROQ_API_KEY (gratis) o ANTHROPIC_API_KEY. Todo lo demás funciona normalmente.'}</p></section>

    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Tus datos</h3></div><div class="stack">
      <button class="btn ghost" id="imp">${icon('upload')} Traer recuerdos de Nuestro Rincón</button>
      <button class="btn ghost" id="exp">${icon('download')} Descargar mis datos</button>
      <button class="btn ghost" id="out">${icon('logout')} Cerrar sesión</button>
      <div class="divider"></div>
      <button class="btn ghost" id="leave" style="color:var(--danger)">Salir del espacio y borrar mis datos privados</button>
      <button class="btn danger" id="delacc">Eliminar mi cuenta</button>
      <p class="tiny muted">Salir del espacio borra tus respuestas, check-ins, entradas privadas, memoria privada, tus versiones de conflictos y tus conversaciones privadas. Lo compartido (diario compartido, acuerdos) se conserva para tu pareja.</p>
    </div></section>
    <p class="center small" style="margin:24px 0"><a href="#/seguridad" class="muted" style="text-decoration:underline">Recursos de seguridad</a></p>
  </div>`;

  // ---------- Apariencia ----------
  let ap = getAppearance(S.me.settings);
  const saveLook = async (patch, msg) => {
    ap = { ...ap, ...patch }; applyAppearance(ap); drawLook();
    try { S.me = await db.updateMe(sid, { settings: { ...(S.me.settings || {}), appearance: ap } }); if (msg) toast(msg); } catch (ex) { toast(friendlyError(ex)); }
  };
  function drawLook() {
    const seg = (key, opts) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${ap[key] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    $('#lookBody', el).innerHTML = `<div class="stack-lg">
      <div><p class="label" style="margin-bottom:10px">Colores</p><div class="swatches">${Object.entries(THEMES).map(([k, t]) => `<button class="swatch ${ap.theme === k ? 'on' : ''}" data-theme="${k}">
        <i style="background:linear-gradient(135deg,${t.v.wine} 0 50%,${t.v.terra} 50% 100%);${t.dark ? 'outline:2px solid #000;' : ''}"></i>${t.name}</button>`).join('')}</div></div>
      <div class="field"><label>Tamaño del texto</label>${seg('size', [['normal', 'Normal'], ['grande', 'Grande'], ['extra', 'Muy grande']])}</div>
      <div class="field"><label>Estilo de letra</label>${seg('type', [['elegante', '<span style="font-family:var(--serif)">Elegante</span>'], ['moderna', 'Moderna']])}</div>
      <div class="field"><label>Portada del inicio</label>${seg('hero', [['degradado', 'Color'], ['suave', 'Suave'], ['foto', 'Foto']])}
        ${ap.hero === 'foto' ? `<div class="row" style="margin-top:10px"><label class="btn soft sm" for="coverf">${icon('image')} ${ap.cover ? 'Cambiar foto' : 'Elegir foto'}</label><input type="file" id="coverf" accept="image/*" hidden/>
          <span class="tiny muted">${ap.cover ? 'Foto lista ✓' : 'Una foto de ustedes queda genial'}</span></div>` : ''}</div>
      <div class="field"><label>¿Cómo le dices a tu pareja? <span class="muted">(opcional)</span></label>
        <div class="row"><input class="input" id="nick" maxlength="30" value="${esc(ap.nickname)}" placeholder="Ej: mi amor, Vale, gordi…"/><button class="btn soft sm" id="nickSave">Guardar</button></div>
        <span class="hint">Se usa en tu pantalla de inicio. Tu pareja no lo ve.</span></div>
      <label class="switch"><input type="checkbox" id="emo" ${ap.emojis ? 'checked' : ''}/><div><b>Emojis en estados y saludos</b><span>Un toque más cálido 🌿</span></div></label>
      <label class="switch"><input type="checkbox" id="mot" ${ap.motion ? 'checked' : ''}/><div><b>Animaciones</b><span>Desactívalas si prefieres todo quieto.</span></div></label>
      <div class="preview-mini"><span class="brand-mark" style="width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-family:var(--serif);font-style:italic">os</span>
        <div class="grow"><b class="serif" style="font-size:1.05rem">Así se ve tu espacio</b><p class="tiny muted">Los cambios se aplican al instante.</p></div><span class="btn sm">Botón</span></div>
    </div>`;
    el.querySelectorAll('[data-theme]').forEach((b) => (b.onclick = () => saveLook({ theme: b.dataset.theme }, 'Colores guardados')));
    el.querySelectorAll('[data-seg]').forEach((g) => g.querySelectorAll('button').forEach((b) => (b.onclick = () => saveLook({ [g.dataset.seg]: b.dataset.v }))));
    $('#emo', el).onchange = (e) => saveLook({ emojis: e.target.checked });
    $('#mot', el).onchange = (e) => saveLook({ motion: e.target.checked });
    $('#nickSave', el).onclick = () => saveLook({ nickname: $('#nick', el).value.trim() }, 'Guardado');
    const cf = $('#coverf', el);
    if (cf) cf.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { toast('Subiendo foto…'); const blob = await compressImage(f, 1600, 0.82); const path = await db.uploadPhoto(sid, blob, true);
        await saveLook({ cover: path }); await loadSpace(); toast('Portada lista. Mírala en Inicio'); } catch (ex) { toast(friendlyError(ex)); }
    };
  }
  drawLook();

  $('#avf', el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const blob = await compressImage(f, 400, 0.85);
      const path = await db.uploadPhoto(sid, blob, false);
      S.me = await db.updateMe(sid, { avatar_url: path });
      await loadSpace(); $('#av', el).innerHTML = avatar(memberView(S.me), 'lg'); toast('Foto actualizada');
    } catch (ex) { toast(friendlyError(ex)); }
  };
  $('#pf', el).onsubmit = (e) => { e.preventDefault(); const f = e.target; busy(f.querySelector('button'), async () => {
    try { S.me = await db.updateMe(sid, { display_name: f.n.value.trim(), age: f.a.value ? +f.a.value : null }); toast('Guardado'); refreshSpace(); } catch (ex) { toast(friendlyError(ex)); } }); };
  $('#sf', el).onsubmit = (e) => { e.preventDefault(); const f = e.target; busy(f.querySelector('button'), async () => {
    try { S.space = await db.updateSpace(sid, { name: f.n.value.trim() || null, relationship_type: f.t.value, start_date: f.d.value || null }); toast('Guardado'); } catch (ex) { toast(friendlyError(ex)); } }); };
  const inv = $('#inv', el); if (inv) inv.onclick = shareInvite;
  el.querySelectorAll('[data-s]').forEach((c) => (c.onchange = async () => {
    try { S.me = await db.updateMe(sid, { settings: { ...(S.me.settings || {}), [c.dataset.s]: c.checked } }); toast('Preferencia guardada'); } catch (ex) { toast(friendlyError(ex)); }
  }));
  $('#imp', el).onclick = () => importFromNR();
  $('#out', el).onclick = () => db.signOut();
  $('#exp', el).onclick = (e) => busy(e.currentTarget, async () => {
    try {
      const [answers, journal, memories, checkins, chats, conflicts, agreements, dates, plans, goals] = await Promise.all([
        db.myAnswers(sid), db.journal.list(sid), db.memories.list(sid), db.checkins(sid), db.chats.list(sid), db.conflicts.list(sid), db.agreements.list(sid), db.dates.list(sid), db.plans.list(sid), db.goals(sid)]);
      const messages = {}; for (const c of chats) messages[c.id] = await db.messages(c.id);
      const versions = {}; for (const c of conflicts) versions[c.id] = (await db.versions(c.id)).filter((v) => v.user_id === db.uid);
      const data = { exportado: new Date().toISOString(), cuenta: user?.email, espacio: S.space, yo: S.me, respuestas: answers, objetivos: goals, diario: journal, memoria: memories,
        estado: checkins.filter((c) => c.user_id === db.uid), conversaciones: chats, mensajes: messages, conflictos: conflicts, mis_versiones: versions, acuerdos: agreements, fechas: dates, planes: plans };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `ourspace-mis-datos-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
    } catch (ex) { toast(friendlyError(ex)); }
  });
  $('#leave', el).onclick = async () => {
    if (!(await confirmSheet({ title: '¿Salir del espacio?', text: 'Se borrarán tus datos privados de este espacio. Lo compartido se conserva para tu pareja. No se puede deshacer.', ok: 'Salir y borrar', danger: true }))) return;
    try { await db.leaveSpace(sid); toast('Saliste del espacio'); await refreshSpace(); } catch (ex) { toast(friendlyError(ex)); }
  };
  $('#delacc', el).onclick = async () => {
    if (!(await confirmSheet({ title: '¿Eliminar tu cuenta?', text: 'Se borrarán tu cuenta y tus datos privados. No se puede deshacer.', ok: 'Eliminar cuenta', danger: true }))) return;
    const r = await db.fn('delete_account');
    if (r?.ok) { toast('Cuenta eliminada'); await db.signOut(); }
    else toast('No se pudo eliminar la cuenta ahora. Puedes salir del espacio para borrar tus datos privados.');
  };
}
