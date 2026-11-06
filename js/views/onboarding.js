// Etapas 2–4 + consentimiento + perfil inicial
import { db } from '../db.js';
import { S, loadSpace, aiStatus } from '../store.js';
import { $, $$, esc, icon, busy, toast, friendlyError, todayStr } from '../ui.js';
import { SECTIONS, QUESTIONS, GOALS } from '../content.js';
import { buildRuleProfile } from '../profile.js';
import { renderProfile } from '../render.js';

export default async function (el) {
  const space = S.space;
  let answers = {};
  (await db.myAnswers(space.id)).forEach((a) => (answers[a.qkey] = a.value));
  let myGoals = (await db.goals(space.id)).filter((g) => g.user_id === db.uid).map((g) => g.goal);

  // ----- construir pasos -----
  const steps = [{ t: 'welcome' }];
  for (const s of SECTIONS) {
    steps.push({ t: 'section', s });
    QUESTIONS.filter((q) => q.section === s.key).forEach((q) => steps.push({ t: 'q', q, s }));
    if (s.key === 'expectativas') steps.push({ t: 'mark', key: 'individual' });
  }
  steps.push({ t: 'history' }, { t: 'mark', key: 'relacion' }, { t: 'goals' }, { t: 'privacy' }, { t: 'profile' });
  const real = steps.filter((x) => x.t !== 'mark');

  // reanudar donde se quedó
  const p = S.me.progress || {};
  let i = 0;
  if (p.individual || Object.keys(answers).length) {
    const firstMissing = real.findIndex((x) => x.t === 'q' && !(x.q.key in answers) && !(p.individual && x.s.stage === 'individual'));
    if (p.objetivos) i = real.findIndex((x) => x.t === 'privacy');
    else if (p.relacion) i = real.findIndex((x) => x.t === 'goals');
    else if (firstMissing > 0) i = Math.max(1, firstMissing - (real[firstMissing - 1].t === 'section' ? 1 : 0));
    else if (p.individual) i = real.findIndex((x) => x.t === 'section' && x.s.key === 'relacion');
  }
  let dir = 1;

  const setProgress = async (key) => {
    const progress = { ...(S.me.progress || {}), [key]: true };
    S.me = await db.updateMe(space.id, { progress });
  };
  const stageOf = (st) => (st.t === 'welcome' ? 0 : st.t === 'history' ? 2 : st.t === 'goals' ? 3 : st.t === 'privacy' || st.t === 'profile' ? 4 : st.s?.stage === 'relacion' ? 2 : 1);
  const next = async () => {
    const cur = real[i];
    // marcas de progreso al cruzar etapas
    if (cur.t === 'q' && cur.q.key === 'e_construir') await setProgress('individual');
    if (cur.t === 'history') await setProgress('relacion');
    i = Math.min(real.length - 1, i + 1); dir = 1; draw();
  };
  const prev = () => { i = Math.max(0, i - 1); dir = -1; draw(); };

  function frame(inner) {
    const st = real[i], stage = stageOf(st);
    const pct = Math.round((i / (real.length - 1)) * 100);
    const names = ['Bienvenida', 'Conocerte', 'La relación', 'Objetivos', 'Perfil'];
    el.innerHTML = `<div class="ob">
      <div class="ob-top">${i > 0 ? `<button class="icon-btn" id="prev" aria-label="Atrás">${icon('back')}</button>` : ''}
        <div class="ob-progress"><i style="width:${pct}%"></i></div><button class="link small" id="out">Salir</button></div>
      <div class="stages">${names.map((n, k) => `<span class="stage ${k === stage ? 'on' : k < stage ? 'done' : ''}">${n}</span>`).join('')}</div>
      <div class="q-card ${dir < 0 ? 'back' : ''}">${inner}</div></div>`;
    const pv = $('#prev', el); if (pv) pv.onclick = prev;
    $('#out', el).onclick = () => db.signOut();
  }

  function draw() {
    const st = real[i];
    if (st.t === 'welcome') return drawWelcome();
    if (st.t === 'section') return drawSection(st.s);
    if (st.t === 'q') return drawQuestion(st.q, st.s);
    if (st.t === 'history') return drawHistory();
    if (st.t === 'goals') return drawGoals();
    if (st.t === 'privacy') return drawPrivacy();
    if (st.t === 'profile') return drawProfile();
  }

  function drawWelcome() {
    const isCreator = space.created_by === db.uid;
    frame(`<div class="q-intro">Hola, ${esc(S.me.display_name)}</div>
      <div class="q-text">Antes de entrar, queremos conocerlos.</div>
      <p class="q-hint" style="font-size:.95rem">OUR SPACE no da consejos genéricos: todo lo que verás después se construye a partir de lo que nos cuenten. Serán pequeñas conversaciones, a tu ritmo. Puedes salir y retomar cuando quieras.</p>
      <div class="list" style="margin:8px 0">
        <div class="item"><span class="ic">${icon('user')}</span><div><b>Conocerte</b><p>Tu personalidad, cómo te sientes querido/a, cómo te comunicas y qué esperas.</p></div></div>
        <div class="item"><span class="ic">${icon('link')}</span><div><b>La relación</b><p>Lo que funciona, lo que se repite y lo que les gustaría mejorar.</p></div></div>
        <div class="item"><span class="ic">${icon('target')}</span><div><b>Objetivos</b><p>En qué quieren trabajar juntos.</p></div></div>
      </div>
      <div class="privacy-note">${icon('lock')}<span>Tus respuestas son <b>privadas por defecto</b>. Tu pareja no las verá a menos que tú decidas compartirlas.</span></div>
      ${isCreator && !S.partner ? `<div class="notice info" style="margin-top:12px">${icon('link')}<div><p><b>Invita a tu pareja</b> con este código: <b style="letter-spacing:.12em">${esc(space.invite_code)}</b></p>
        <button class="link" id="share" style="margin-top:4px">Compartir invitación</button></div></div>` : ''}
      <div class="q-nav"><button class="btn" id="go">Empezar</button></div>`);
    const sh = $('#share', el);
    if (sh) sh.onclick = () => shareInvite();
    $('#go', el).onclick = next;
  }

  function drawSection(s) {
    const qs = QUESTIONS.filter((q) => q.section === s.key);
    frame(`<div class="section-intro" style="padding:14px 0 0"><div class="big-ic">${icon(s.icon)}</div>
      <div class="eyebrow">${s.stage === 'relacion' ? 'Etapa 3 · La relación' : 'Etapa 2 · Conocerte'}</div>
      <h2 style="margin-top:6px">${esc(s.title)}</h2><p>${esc(s.intro)}</p><p class="muted small" style="margin-top:10px">${qs.length} preguntas · unos ${Math.ceil(qs.length * 0.6)} minutos</p></div>
      <div class="q-nav"><button class="btn" id="go">Continuar</button></div>`);
    $('#go', el).onclick = next;
  }

  function drawQuestion(q) {
    let val = answers[q.key];
    if (q.type === 'multi' && !Array.isArray(val)) val = [];
    const custom = q.type === 'multi' ? (val || []).filter((v) => !q.options.includes(v)) : [];
    let body = '';
    if (q.type === 'text') body = `<textarea class="textarea" id="v" maxlength="2000" placeholder="Escribe con tus palabras…">${esc(val || '')}</textarea>`;
    if (q.type === 'single') body = `<div class="chips" id="v">${q.options.map((o) => `<button type="button" class="chip ${val === o ? 'on' : ''}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    if (q.type === 'multi') body = `<div class="chips" id="v">${[...q.options, ...custom].map((o) => `<button type="button" class="chip ${val.includes(o) ? 'on' : ''}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="row" style="margin-top:12px"><input class="input" id="own" maxlength="80" placeholder="Otra respuesta (opcional)"/><button type="button" class="btn soft sm" id="addOwn">Añadir</button></div>`;
    if (q.type === 'scale') body = `<div class="scale"><div class="scale-row" id="v">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${val === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="scale-ends"><span>${esc(q.ends[0])}</span><span>${esc(q.ends[1])}</span></div></div>`;
    frame(`<div class="q-text">${esc(q.text)}</div>${q.hint ? `<p class="q-hint">${esc(q.hint)}</p>` : '<div style="height:14px"></div>'}
      ${body}
      <p class="tiny muted row" style="margin-top:14px;gap:6px">${icon('lock')} Solo tú ves esta respuesta.</p>
      <div class="q-nav"><button class="btn ghost" id="skip">Saltar</button><button class="btn" id="go">Siguiente</button></div>`);
    const box = $('#v', el);
    if (q.type === 'single') $$('.chip', box).forEach((c) => (c.onclick = () => { val = c.dataset.o; $$('.chip', box).forEach((x) => x.classList.toggle('on', x === c)); }));
    if (q.type === 'multi') {
      const bind = () => $$('.chip', box).forEach((c) => (c.onclick = () => { const o = c.dataset.o; val = val.includes(o) ? val.filter((x) => x !== o) : [...val, o]; c.classList.toggle('on'); }));
      bind();
      $('#addOwn', el).onclick = () => { const t = $('#own', el).value.trim(); if (!t || val.includes(t)) return; val = [...val, t]; box.insertAdjacentHTML('beforeend', `<button type="button" class="chip on" data-o="${esc(t)}">${esc(t)}</button>`); $('#own', el).value = ''; bind(); };
    }
    if (q.type === 'scale') $$('button', box).forEach((b) => (b.onclick = () => { val = +b.dataset.n; $$('button', box).forEach((x) => x.classList.toggle('on', x === b)); }));
    if (q.type === 'text') setTimeout(() => box.focus(), 300);
    $('#skip', el).onclick = next;
    $('#go', el).onclick = (e) => busy(e.currentTarget, async () => {
      if (q.type === 'text') val = box.value.trim();
      const empty = val == null || val === '' || (Array.isArray(val) && !val.length);
      try {
        if (!empty) { await db.saveAnswer(space.id, q, val); answers[q.key] = val; }
        await next();
      } catch (ex) { toast(friendlyError(ex)); }
    });
  }

  function drawHistory() {
    const rows = [{ d: '', t: '' }];
    frame(`<div class="q-intro">Nuestra historia</div><div class="q-text">¿Qué momentos marcaron su relación?</div>
      <p class="q-hint">Opcional. Se guardarán en el diario compartido; luego podrás añadir fotos y detalles. ${S.partner ? '' : 'Tu pareja también podrá añadir los suyos.'}</p>
      <div class="stack" id="rows"></div>
      <button class="link" id="more" style="margin-top:10px">+ Añadir otro momento</button>
      <div class="q-nav"><button class="btn ghost" id="skip">Ahora no</button><button class="btn" id="go">Guardar y seguir</button></div>`);
    const draw = () => { $('#rows', el).innerHTML = rows.map((r, k) => `<div class="two-col"><input class="input" type="date" data-k="${k}" data-f="d" value="${esc(r.d)}" max="${todayStr()}"/>
      <input class="input" data-k="${k}" data-f="t" maxlength="120" placeholder="Ej: El día que nos conocimos" value="${esc(r.t)}"/></div>`).join('');
      $$('#rows input', el).forEach((inp) => (inp.oninput = () => (rows[+inp.dataset.k][inp.dataset.f] = inp.value))); };
    draw();
    $('#more', el).onclick = () => { rows.push({ d: '', t: '' }); draw(); };
    $('#skip', el).onclick = next;
    $('#go', el).onclick = (e) => busy(e.currentTarget, async () => {
      const ok = rows.filter((r) => r.t.trim());
      try {
        for (const r of ok) await db.journal.add({ space_id: space.id, author_id: db.uid, kind: 'recuerdo', title: r.t.trim(), entry_date: r.d || todayStr(), visibility: 'shared', source: 'bienvenida' });
        if (ok.length) toast(`${ok.length} momento${ok.length > 1 ? 's' : ''} guardado${ok.length > 1 ? 's' : ''} en el diario`);
        await next();
      } catch (ex) { toast(friendlyError(ex)); }
    });
  }

  async function drawGoals() {
    const all = await db.goals(space.id);
    const partnerGoals = all.filter((g) => g.user_id !== db.uid).map((g) => g.goal);
    frame(`<div class="q-intro">Etapa 4</div><div class="q-text">¿En qué quieres que trabajemos?</div>
      <p class="q-hint">Elige los objetivos que más te importan ahora. ${S.partner ? 'Tu pareja elige los suyos y verán en cuáles coinciden.' : ''}</p>
      <div class="stack" id="g">${GOALS.map((g) => `<button type="button" class="tile" data-g="${g.key}" style="flex-direction:row;align-items:center;gap:12px;padding:14px 16px">
        <span class="ic" style="margin:0">${icon(g.icon)}</span><b class="grow">${esc(g.label)}</b>
        ${partnerGoals.includes(g.key) ? `<span class="badge terra">${esc(S.partner?.display_name || 'Pareja')} también</span>` : ''}<span class="ck">${myGoals.includes(g.key) ? icon('check') : ''}</span></button>`).join('')}</div>
      <div class="q-nav"><button class="btn" id="go">Continuar</button></div>`);
    const paint = () => $$('[data-g]', el).forEach((b) => { const on = myGoals.includes(b.dataset.g); b.style.borderColor = on ? 'var(--wine)' : ''; b.style.background = on ? 'var(--wine-soft)' : ''; $('.ck', b).innerHTML = on ? icon('check') : ''; });
    paint();
    $$('[data-g]', el).forEach((b) => (b.onclick = () => { const k = b.dataset.g; myGoals = myGoals.includes(k) ? myGoals.filter((x) => x !== k) : [...myGoals, k]; paint(); }));
    $('#go', el).onclick = (e) => {
      if (!myGoals.length) return toast('Elige al menos un objetivo');
      busy(e.currentTarget, async () => { try { await db.setMyGoals(space.id, myGoals); await setProgress('objetivos'); await next(); } catch (ex) { toast(friendlyError(ex)); } });
    };
  }

  function drawPrivacy() {
    const st = { profile_consent: true, ai_use_answers: false, memory_enabled: true, ...(S.me.settings || {}) };
    if (!S.me.progress?.privacidad) st.profile_consent = true;
    frame(`<div class="q-intro">Tu privacidad</div><div class="q-text">Tú decides qué se usa y qué se comparte</div>
      <p class="q-hint">Puedes cambiar todo esto cuando quieras en “Privacidad y ajustes”.</p>
      <div class="stack">
        <label class="switch"><input type="checkbox" id="c1" ${st.profile_consent ? 'checked' : ''}/><div><b>Usar mis respuestas de opción y escala para el perfil de la relación</b>
          <span>Tu pareja verá coincidencias y diferencias generales (por ejemplo, “para ${esc(S.me.display_name)} el contacto físico pesa más”), nunca tus respuestas escritas.</span></div></label>
        <label class="switch"><input type="checkbox" id="c2" ${st.ai_use_answers ? 'checked' : ''}/><div><b>Permitir que el asistente use todas mis respuestas para comprender mejor</b>
          <span>Incluye tus respuestas escritas. El asistente tiene instrucciones de no citarlas ni revelarlas a tu pareja.</span></div></label>
        <label class="switch"><input type="checkbox" id="c3" ${st.memory_enabled ? 'checked' : ''}/><div><b>Memoria del asistente</b>
          <span>Podrá recordar preferencias, temas y avances que tú apruebes. Todo es visible, editable y eliminable en “Memoria”.</span></div></label>
      </div>
      <div class="privacy-note">${icon('shield')}<span>Además, en “Conocernos” puedes compartir secciones completas de tus respuestas con tu pareja, si lo deseas.</span></div>
      <div class="q-nav"><button class="btn" id="go">Generar nuestro perfil</button></div>`);
    $('#go', el).onclick = (e) => busy(e.currentTarget, async () => {
      try {
        const settings = { ...(S.me.settings || {}), profile_consent: $('#c1', el).checked, ai_use_answers: $('#c2', el).checked, memory_enabled: $('#c3', el).checked };
        S.me = await db.updateMe(space.id, { settings });
        await next();
      } catch (ex) { toast(friendlyError(ex)); }
    });
  }

  async function drawProfile() {
    frame(`<div class="center" style="padding:30px 0"><span class="spin"></span><p class="muted" style="margin-top:12px">Construyendo su perfil inicial…</p></div>`);
    let profile;
    try {
      const inputs = await db.profileInputs(space.id);
      profile = buildRuleProfile(inputs);
      const sp = (await loadSpace()).space;
      if (!sp.profile || sp.profile.source !== 'ia') await db.updateSpace(space.id, { profile, profile_updated_at: new Date().toISOString() });
      else profile = sp.profile;
    } catch (ex) { profile = null; toast(friendlyError(ex)); }
    const ai = await aiStatus();
    const canAI = ai?.ai && S.me.settings?.ai_use_answers;
    frame(`<div class="q-intro">Su perfil inicial</div><div class="q-text">Esto es lo que entendemos hasta ahora</div>
      <p class="q-hint">Es un punto de partida, no una conclusión. Se irá actualizando a medida que usen el espacio.</p>
      ${!S.partner ? `<div class="notice info" style="margin-bottom:10px">${icon('users')}<p>Cuando ${esc(localStorage.getItem('os_partner_hint') || 'tu pareja')} se una y responda, el perfil mostrará coincidencias y diferencias.</p></div>` : ''}
      <div id="prof">${renderProfile(profile)}</div>
      ${canAI ? `<button class="btn ghost block" id="ai" style="margin-top:14px">${icon('sparkle')} Profundizar con el asistente</button>` : ''}
      <div class="q-nav"><button class="btn" id="go">Entrar a nuestro espacio</button></div>`);
    const aiBtn = $('#ai', el);
    if (aiBtn) aiBtn.onclick = () => busy(aiBtn, async () => {
      const r = await db.fn('profile', { space_id: space.id });
      if (r?.profile) { $('#prof', el).innerHTML = renderProfile(r.profile); aiBtn.remove(); } else toast(r?.error === 'ai_not_configured' ? 'El asistente aún no está activado' : 'No se pudo generar con el asistente');
    });
    $('#go', el).onclick = (e) => busy(e.currentTarget, async () => {
      await setProgress('privacidad');
      location.hash = '#/inicio'; window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  draw();
}

export function shareInvite() {
  const url = `${location.origin}${location.pathname}?invitacion=${S.space.invite_code}`;
  const text = `Te invito a nuestro espacio en OUR SPACE. Código: ${S.space.invite_code}`;
  if (navigator.share) navigator.share({ title: 'OUR SPACE', text, url }).catch(() => {});
  else { navigator.clipboard?.writeText(`${text}\n${url}`); toast('Invitación copiada'); }
}
