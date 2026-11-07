// Dashboard: Nuestro espacio
import { db } from '../db.js';
import { S, memberView, nameOf } from '../store.js';
import { viewGen, $, $$, esc, icon, avatar, sheet, closeSheet, toast, busy, friendlyError, together, plural, ago, nextYearly, today0, daysBetween, fmtD } from '../ui.js';
import { GOALS, MOODS } from '../content.js';
import { getAppearance, MOOD_EMOJI } from '../appearance.js';
import { shareInvite } from './onboarding.js';
import { go } from '../app.js';

export default async function (el) {
  const sid = S.space.id;
  const load = () => Promise.all([db.checkins(sid), db.topics.list(sid), db.goals(sid), db.agreements.list(sid), db.activities.list(sid),
    db.journal.list(sid, (q) => q.limit(200)), db.conflicts.list(sid), db.dates.list(sid), db.memories.list(sid, (q) => q.eq('kind', 'avance').limit(5))]);

  const alive = viewGen();
  async function draw() {
    const [checks, topics, goals, agreements, acts, journal, conflicts, dates, wins] = await load();
    if (!alive()) return;
    const me = memberView(S.me), partner = memberView(S.partner);
    const T = together(S.space.start_date);
    const ap = getAppearance(S.me.settings), em = (k) => (ap.emojis ? MOOD_EMOJI[k] || '' : '');
    const hour = new Date().getHours(), hi = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    const hiEm = ap.emojis ? (hour < 12 ? ' ☀️' : hour < 19 ? ' 🌤️' : ' 🌙') : '';
    const pName = ap.nickname || S.partner?.display_name || '';
    const coverUrl = ap.hero === 'foto' && ap.cover ? S.avatars[ap.cover] : '';
    const heroCls = ap.hero === 'suave' ? 'welcome soft' : coverUrl ? 'welcome photo' : 'card tint welcome';
    const lastOf = (uid) => checks.find((c) => c.user_id === uid);
    const moodLabel = (k) => `${em(k) ? `<span class="mood-emoji">${em(k)}</span>` : ''}${esc(MOODS.find((m) => m.key === k)?.label || k)}`;
    const openTopics = topics.filter((t) => t.status !== 'resuelto');
    const myG = goals.filter((g) => g.user_id === db.uid).map((g) => g.goal), pG = goals.filter((g) => g.user_id !== db.uid).map((g) => g.goal);
    const sharedG = myG.filter((g) => pG.includes(g));
    const activeAg = agreements.filter((a) => ['activo', 'revision', 'ajustar'].includes(a.status)).length;
    const pendingAg = agreements.filter((a) => a.status === 'propuesto' && !(a.accepted_by || []).includes(db.uid));
    const doneActs = acts.filter((a) => a.status === 'hecha').length;
    const upcoming = [...dates.map((d) => ({ t: d.title, e: d.emoji, d: d.yearly ? nextYearly(d.date) : new Date(d.date + 'T00:00') })),
      ...(S.space.start_date ? [{ t: 'Aniversario', e: '◦', d: nextYearly(S.space.start_date) }] : [])]
      .filter((x) => x.d >= today0()).map((x) => ({ ...x, n: daysBetween(today0(), x.d) })).sort((a, b) => a.n - b.n).slice(0, 3);

    const moodBox = (m, c, mine) => `<div class="mood-box"><div class="row" style="gap:8px">${avatar(m, 'sm')}<span class="small"><b>${esc(mine ? 'Tú' : pName || m?.display_name || '')}</b></span></div>
      ${c ? `<div class="w">${moodLabel(c.mood)}</div><span class="tiny muted">${ago(c.created_at)}${mine && !c.shared ? ' · solo tú lo ves' : ''}</span>${c.note && (mine || c.shared) ? `<p class="small" style="margin-top:6px">“${esc(c.note)}”</p>` : ''}`
      : `<div class="w" style="color:var(--gray-2)">—</div><span class="tiny muted">${mine ? 'Aún no lo has compartido' : 'Sin registro reciente'}</span>`}</div>`;

    el.innerHTML = `<div class="page">
      <section class="card ${heroCls}" ${coverUrl ? `style="background-image:url('${coverUrl}')"` : ''}>
        <div class="row between"><span class="eyebrow" style="color:rgba(246,240,230,.7)">${esc(S.space.name || 'Nuestro espacio')}</span><span class="pair">${avatar(me, 'sm')}${partner ? avatar(partner, 'sm') : ''}</span></div>
        <h1 style="margin-top:12px;font-size:1.9rem">${hi}, ${esc(S.me.display_name)}${hiEm}</h1>${pName ? `<p style="margin-top:4px">Tu espacio con ${esc(pName)}</p>` : ''}
        ${T ? `<div class="days serif">${T.total.toLocaleString('es')}</div><p>días juntos · ${T.y ? plural(T.y, 'año', 'años') + ', ' : ''}${plural(T.m, 'mes', 'meses')} y ${plural(T.d, 'día', 'días')}</p>` : `<p style="margin-top:8px">Añade la fecha en que empezó su relación en Ajustes.</p>`}
      </section>

      ${!S.partner ? `<section class="card" style="margin-top:16px"><div class="row"><span class="ic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--terra-soft);color:var(--terra)">${icon('link')}</span>
        <div class="grow"><b>Tu pareja aún no se ha unido</b><p class="small">Código de invitación: <b style="letter-spacing:.12em">${esc(S.space.invite_code)}</b></p></div><button class="btn sm" id="inv">Invitar</button></div></section>` : ''}
      ${pendingAg.length ? `<a class="card row" href="#/acuerdos" style="margin-top:16px;display:flex;padding:16px 18px"><div class="grow"><span class="badge warn">${icon('pact')} Acuerdo propuesto</span><p class="small" style="margin-top:6px;color:var(--ink)">${esc(nameOf(pendingAg[0].created_by))} propuso “${esc(pendingAg[0].title)}”</p></div>${icon('chev')}</a>` : ''}

      <div class="grid two" style="margin-top:16px">
        <section class="card">
          <div class="card-head"><h3>Estado de nuestra conexión</h3></div>
          <div class="mood-grid">${moodBox(me, lastOf(db.uid), true)}${partner ? moodBox(partner, lastOf(partner.user_id), false) : ''}</div>
          <button class="btn soft block" id="checkin" style="margin-top:14px">¿Cómo te sientes hoy?</button>
          <p class="tiny muted center" style="margin-top:8px">Sin puntuaciones: solo palabras para entenderse mejor.</p>
        </section>

        <section class="card">
          <div class="card-head"><h3>Conversaciones pendientes</h3><button class="icon-btn" id="addTopic" aria-label="Añadir">${icon('plus')}</button></div>
          ${openTopics.length ? `<div class="list">${openTopics.slice(0, 5).map((t) => `<button class="item" data-topic="${t.id}" style="text-align:left;width:100%">
            <span class="ic">${icon(t.kind === 'acuerdo' ? 'pact' : t.kind === 'asunto' ? 'alert' : 'message')}</span>
            <div class="grow"><b>${esc(t.title)}</b><p class="tiny muted">${esc(nameOf(t.created_by))} · ${ago(t.created_at)}</p></div>
            <span class="badge ${t.status === 'hablando' ? 'terra' : ''}">${t.status === 'hablando' ? 'Hablando' : 'Pendiente'}</span></button>`).join('')}</div>`
          : `<div class="empty" style="padding:18px 6px">${icon('message')}<b>Nada pendiente</b>Anota aquí temas que quieran hablar con calma.</div>`}
        </section>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card-head"><h3>Nuestro progreso</h3><a class="link" href="#/conocernos">Perfil →</a></div>
        <div class="chips" style="margin-bottom:16px">${[...new Set([...myG, ...pG])].map((g) => `<span class="chip static ${sharedG.includes(g) ? 'on' : 'soft'}">${esc(GOALS.find((x) => x.key === g)?.label || g)}</span>`).join('') || '<span class="muted small">Sin objetivos aún.</span>'}</div>
        ${sharedG.length ? '<p class="tiny muted" style="margin:-8px 0 14px">Resaltados: objetivos que eligieron ambos.</p>' : ''}
        <div class="tiles" style="grid-template-columns:repeat(2,1fr)">
          ${[['pact', activeAg, 'acuerdos vigentes', 'acuerdos'], ['compass', doneActs, 'actividades realizadas', 'actividades'], ['book', journal.length, 'entradas en el diario', 'diario'], ['scale', conflicts.filter((c) => c.status !== 'abierto').length, 'situaciones comprendidas', 'conflictos']]
            .map(([ic, n, l, r]) => `<a class="tile" href="#/${r}"><span class="ic">${icon(ic)}</span><b class="serif" style="font-size:1.6rem;font-weight:500">${n}</b><span>${l}</span></a>`).join('')}
        </div>
        ${wins.length ? `<div class="divider"></div><p class="label" style="margin-bottom:8px">Aprendizajes y avances</p><div class="list">${wins.map((w) => `<div class="item" style="padding:8px 0"><span class="ic">${icon('leaf')}</span><p class="grow small">${esc(w.content)}</p></div>`).join('')}</div>` : ''}
      </section>

      <h3 style="margin:26px 4px 12px">Accesos</h3>
      <div class="tiles">
        ${[['asistente', 'chat', 'Hablar con el asistente', 'A solas o en pareja'], ['conflictos', 'scale', 'Comprender un conflicto', 'Dos versiones, una comprensión'],
           ['conocernos', 'users', 'Conocernos mejor', 'Perfil y respuestas'], ['diario', 'book', 'Nuestro diario', 'Momentos y recuerdos'],
           ['acuerdos', 'pact', 'Acuerdos de pareja', 'Compromisos claros'], ['actividades', 'compass', 'Actividades para conectar', 'Pensadas para ustedes']]
          .map(([r, ic, t, s]) => `<a class="tile" href="#/${r}"><span class="ic">${icon(ic)}</span><b>${t}</b><span>${s}</span></a>`).join('')}
      </div>

      ${upcoming.length ? `<section class="card" style="margin-top:16px"><div class="card-head"><h3>Próximas fechas</h3><a class="link" href="#/diario?fechas">Ver →</a></div>
        <div class="list">${upcoming.map((u) => `<div class="item"><span class="ic serif">${esc(u.e || '◦')}</span><div class="grow"><b>${esc(u.t)}</b><p class="tiny muted">${u.d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><span class="badge ${u.n === 0 ? 'wine' : ''}">${u.n === 0 ? 'Hoy' : u.n === 1 ? 'Mañana' : 'En ' + u.n + ' días'}</span></div>`).join('')}</div></section>` : ''}

      <p class="center small" style="margin:30px 0 10px"><a href="#/seguridad" class="muted" style="text-decoration:underline">¿Te sientes en riesgo? Recursos de ayuda</a></p>
    </div>`;

    const inv = $('#inv', el); if (inv) inv.onclick = shareInvite;
    $('#checkin', el).onclick = checkinSheet;
    $('#addTopic', el).onclick = () => topicSheet();
    $$('[data-topic]', el).forEach((b) => (b.onclick = () => topicSheet(topics.find((t) => t.id === b.dataset.topic))));
  }

  function checkinSheet() {
    const ap = getAppearance(S.me.settings), em = (k) => (ap.emojis ? MOOD_EMOJI[k] || '' : '');
    let mood = null;
    sheet(`<h2>¿Cómo te sientes hoy?</h2><p class="muted small">Elige la palabra que más se acerque. No hay respuestas buenas o malas.</p>
      <div class="chips" id="moods" style="margin:16px 0">${MOODS.map((m) => `<button class="chip" data-m="${m.key}">${em(m.key) ? `<span class="em">${em(m.key)}</span>` : ''}${esc(m.label)}</button>`).join('')}</div>
      <div class="field"><label>¿Quieres añadir algo? <span class="muted">(opcional)</span></label><textarea class="textarea" id="note" maxlength="400" style="min-height:80px" placeholder="Ej: hoy necesito un poco de calma después del trabajo"></textarea></div>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="sh" checked/><div><b>Compartir con ${esc(S.partner?.display_name || 'mi pareja')}</b><span>Si lo desactivas, solo tú lo verás.</span></div></label>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button></div>`, (b) => {
      $$('#moods .chip', b).forEach((c) => (c.onclick = () => { mood = c.dataset.m; $$('#moods .chip', b).forEach((x) => x.classList.toggle('on', x === c)); }));
      $('#save', b).onclick = (e) => { if (!mood) return toast('Elige cómo te sientes'); busy(e.currentTarget, async () => {
        try { await db.addCheckin(sid, mood, $('#note', b).value.trim(), $('#sh', b).checked); closeSheet(); toast('Guardado'); draw(); } catch (ex) { toast(friendlyError(ex)); } }); };
    });
  }

  function topicSheet(t) {
    const isNew = !t; t = t || { title: '', detail: '', kind: 'tema', status: 'pendiente', resolution: '' };
    sheet(`<h2>${isNew ? 'Nueva conversación pendiente' : 'Conversación pendiente'}</h2>
      <div class="stack" style="margin-top:12px">
        <div class="seg" id="kind">${[['tema', 'Tema para hablar'], ['asunto', 'Asunto sin resolver'], ['acuerdo', 'Acuerdo pendiente']].map(([k, l]) => `<button data-k="${k}" class="${t.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="field"><label>Tema</label><input class="input" id="ti" maxlength="140" value="${esc(t.title)}" placeholder="Ej: Cómo repartimos los fines de semana"/></div>
        <div class="field"><label>Contexto <span class="muted">(opcional)</span></label><textarea class="textarea" id="de" maxlength="1000" style="min-height:80px" placeholder="Desde lo que yo siento o necesito, sin acusar">${esc(t.detail || '')}</textarea></div>
        ${!isNew ? `<div class="field"><label>Estado</label><div class="seg" id="st">${[['pendiente', 'Pendiente'], ['hablando', 'Lo estamos hablando'], ['resuelto', 'Resuelto']].map(([k, l]) => `<button data-s="${k}" class="${t.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="field"><label>¿A qué llegaron? <span class="muted">(opcional)</span></label><textarea class="textarea" id="re" maxlength="1000" style="min-height:70px">${esc(t.resolution || '')}</textarea></div>` : ''}
      </div>
      ${!isNew ? `<button class="btn ghost block" id="talk" style="margin-top:14px">${icon('chat')} Hablarlo con ayuda del asistente</button>` : ''}
      <div class="actions">${isNew ? '<button class="btn ghost" data-close>Cancelar</button>' : `<button class="btn ghost" id="del">${icon('trash')}</button>`}<button class="btn" id="save">Guardar</button></div>`, (b) => {
      let kind = t.kind, status = t.status;
      $$('#kind button', b).forEach((x) => (x.onclick = () => { kind = x.dataset.k; $$('#kind button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $$('#st button', b).forEach((x) => (x.onclick = () => { status = x.dataset.s; $$('#st button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const title = $('#ti', b).value.trim(); if (!title) return toast('Escribe el tema');
        const row = { title, detail: $('#de', b).value.trim() || null, kind };
        try {
          if (isNew) await db.topics.add({ ...row, space_id: sid, created_by: db.uid });
          else await db.topics.upd(t.id, { ...row, status, resolution: $('#re', b).value.trim() || null });
          closeSheet(); draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
      const del = $('#del', b); if (del) del.onclick = async () => { await db.topics.del(t.id); closeSheet(); draw(); };
      const talk = $('#talk', b); if (talk) talk.onclick = () => busy(talk, async () => {
        const chat = await db.chats.add({ space_id: sid, mode: 'pareja', owner_id: null, title: t.title.slice(0, 80) });
        if (t.status === 'pendiente') await db.topics.upd(t.id, { status: 'hablando' });
        closeSheet(); go('asistente/' + chat.id);
      });
    });
  }

  await draw();
  const onChange = (e) => { if (['os_checkins', 'os_topics', 'os_agreements', 'os_members', 'os_journal'].includes(e.detail.table)) draw(); };
  window.addEventListener('os:change', onChange);
  return () => window.removeEventListener('os:change', onChange);
}
