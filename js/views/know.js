// Conocernos: perfil de la relación, mis respuestas y lo que mi pareja compartió
import { db } from '../db.js';
import { S, loadSpace, aiStatus } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError } from '../ui.js';
import { SECTIONS, QUESTIONS } from '../content.js';
import { buildRuleProfile } from '../profile.js';
import { renderProfile } from '../render.js';

const show = (v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? `${v} de 5` : v);

export default async function (el) {
  const sid = S.space.id;
  let tab = 'perfil';
  const alive = viewGen();

  async function draw() {
    el.innerHTML = `<div class="page">
      <div class="page-head"><span class="eyebrow">Conocernos</span><h1>Comprender quiénes somos</h1>
        <p>El perfil de la relación, tus respuestas y lo que ${esc(S.partner?.display_name || 'tu pareja')} decidió compartir contigo.</p></div>
      <div class="seg" style="max-width:520px;margin-bottom:18px">${[['perfil', 'Nuestro perfil'], ['mias', 'Mis respuestas'], ['pareja', S.partner ? 'Lo que compartió ' + S.partner.display_name : 'Mi pareja']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      <div id="body"><div class="skeleton"></div></div></div>`;
    $$('[data-tab]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    if (tab === 'perfil') await drawProfile(); else if (tab === 'mias') await drawMine(); else await drawPartner();
  }

  async function drawProfile() {
    const ai = await aiStatus();
    if (!alive() || !$('#body', el)) return;
    const st = S.me.settings || {};
    $('#body', el).innerHTML = `<section class="card"><div id="prof">${renderProfile(S.space.profile)}</div>
      <div class="row wrap" style="margin-top:16px"><button class="btn ghost" id="upd">${icon('refresh')} Actualizar perfil</button>
      ${ai?.ai ? `<button class="btn" id="ai" ${st.ai_use_answers ? '' : 'disabled'}>${icon('sparkle')} Profundizar con el asistente</button>` : ''}</div>
      ${ai?.ai && !st.ai_use_answers ? '<p class="tiny muted" style="margin-top:8px">Para usar el asistente, activa “Permitir que el asistente use mis respuestas” abajo.</p>' : ''}</section>
      <section class="card" style="margin-top:16px"><div class="card-head"><h3>Privacidad del perfil</h3></div><div class="stack">
        <label class="switch"><input type="checkbox" id="c1" ${st.profile_consent ? 'checked' : ''}/><div><b>Usar mis respuestas de opción y escala en el perfil compartido</b><span>Tu pareja verá similitudes y diferencias generales, nunca tus respuestas escritas.</span></div></label>
        <label class="switch"><input type="checkbox" id="c2" ${st.ai_use_answers ? 'checked' : ''}/><div><b>Permitir que el asistente use mis respuestas</b><span>Para comprender mejor; no las citará ni revelará.</span></div></label></div></section>`;
    $('#upd', el).onclick = (e) => busy(e.currentTarget, async () => {
      try { const p = buildRuleProfile(await db.profileInputs(sid)); await db.updateSpace(sid, { profile: p, profile_updated_at: new Date().toISOString() }); await loadSpace(); toast('Perfil actualizado'); drawProfile(); }
      catch (ex) { toast(friendlyError(ex)); }
    });
    const aiB = $('#ai', el);
    if (aiB) aiB.onclick = () => busy(aiB, async () => {
      const r = await db.fn('profile', { space_id: sid });
      if (r?.profile) { await loadSpace(); toast('Perfil actualizado por el asistente'); drawProfile(); } else toast(r?.error === 'ai_not_configured' ? 'El asistente aún no está activado' : 'No se pudo generar');
    });
    ['c1', 'c2'].forEach((k) => ($('#' + k, el).onchange = async () => {
      const settings = { ...(S.me.settings || {}), profile_consent: $('#c1', el).checked, ai_use_answers: $('#c2', el).checked };
      try { S.me = await db.updateMe(sid, { settings }); toast('Preferencias guardadas'); drawProfile(); } catch (ex) { toast(friendlyError(ex)); }
    }));
  }

  async function drawMine() {
    const rows = await db.myAnswers(sid);
    if (!alive() || !$('#body', el)) return;
    const by = Object.fromEntries(rows.map((r) => [r.qkey, r]));
    $('#body', el).innerHTML = `<div class="privacy-note" style="margin:0 0 14px">${icon('lock')}<span>Tus respuestas son privadas. Puedes compartir una sección completa con ${esc(S.partner?.display_name || 'tu pareja')}, y dejar de compartirla cuando quieras.</span></div>
      <div class="stack">${SECTIONS.map((s) => {
        const qs = QUESTIONS.filter((q) => q.section === s.key);
        const shared = qs.some((q) => by[q.key]?.shared);
        return `<section class="card"><div class="card-head"><h3>${esc(s.title)}</h3>
          <label class="row small" style="gap:8px;cursor:pointer"><span class="muted">${shared ? 'Compartida' : 'Privada'}</span><span class="switch" style="padding:0;background:none"><input type="checkbox" data-share="${s.key}" ${shared ? 'checked' : ''}/></span></label></div>
          <div class="list">${qs.map((q) => `<button class="item" data-q="${q.key}" style="text-align:left;width:100%"><div class="grow"><p class="small muted">${esc(q.text)}</p>
            <b style="font-weight:500;margin-top:2px">${by[q.key] ? esc(show(by[q.key].value)) : '<span class="muted">Sin responder</span>'}</b></div>${icon('edit')}</button>`).join('')}</div></section>`;
      }).join('')}</div>
      <button class="btn ghost" id="wipe" style="margin-top:18px">${icon('trash')} Borrar todas mis respuestas</button>`;
    $$('[data-share]', el).forEach((c) => (c.onchange = async () => {
      try {
        const sec = c.dataset.share;
        await db.shareSection(sid, sec, c.checked);
        toast(c.checked ? 'Sección compartida' : 'Sección privada de nuevo'); drawMine();
      } catch (ex) { toast(friendlyError(ex)); }
    }));
    $$('[data-q]', el).forEach((b) => (b.onclick = () => editQ(QUESTIONS.find((q) => q.key === b.dataset.q), by[b.dataset.q])));
    $('#wipe', el).onclick = (e) => busy(e.currentTarget, async () => {
      if (!confirm('¿Borrar todas tus respuestas? No se puede deshacer.')) return;
      await db.deleteMyAnswers(sid); toast('Respuestas borradas'); drawMine();
    });
  }

  function editQ(q, row) {
    let val = row?.value ?? (q.type === 'multi' ? [] : null);
    const opts = q.type === 'multi' ? [...new Set([...q.options, ...(val || [])])] : q.options;
    sheet(`<h2 style="font-size:1.3rem">${esc(q.text)}</h2>${q.hint ? `<p class="muted small">${esc(q.hint)}</p>` : ''}<div style="margin-top:16px" id="box">
      ${q.type === 'text' ? `<textarea class="textarea" id="v" maxlength="2000">${esc(val || '')}</textarea>`
      : q.type === 'scale' ? `<div class="scale"><div class="scale-row">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${val === n ? 'on' : ''}">${n}</button>`).join('')}</div><div class="scale-ends"><span>${esc(q.ends[0])}</span><span>${esc(q.ends[1])}</span></div></div>`
      : `<div class="chips">${opts.map((o) => `<button class="chip ${(q.type === 'multi' ? val.includes(o) : val === o) ? 'on' : ''}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`}</div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button></div>`, (b) => {
      $$('[data-n]', b).forEach((x) => (x.onclick = () => { val = +x.dataset.n; $$('[data-n]', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $$('[data-o]', b).forEach((x) => (x.onclick = () => {
        const o = x.dataset.o;
        if (q.type === 'multi') { val = val.includes(o) ? val.filter((y) => y !== o) : [...val, o]; x.classList.toggle('on'); }
        else { val = o; $$('[data-o]', b).forEach((y) => y.classList.toggle('on', y === x)); }
      }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        if (q.type === 'text') val = $('#v', b).value.trim();
        try { await db.saveAnswer(sid, q, val, row?.shared || false); closeSheet(); toast('Guardado'); drawMine(); } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }

  async function drawPartner() {
    if (!S.partner) { $('#body', el).innerHTML = `<div class="card empty">${icon('users')}<b>Tu pareja aún no se ha unido</b>Comparte el código <b>${esc(S.space.invite_code)}</b>.</div>`; return; }
    const rows = await db.partnerAnswers(sid, S.partner.user_id);
    if (!alive() || !$('#body', el)) return;
    const by = Object.fromEntries(rows.map((r) => [r.qkey, r]));
    const secs = SECTIONS.filter((s) => QUESTIONS.some((q) => q.section === s.key && by[q.key]));
    $('#body', el).innerHTML = secs.length ? `<div class="stack">${secs.map((s) => `<section class="card"><div class="card-head"><h3>${esc(s.title)}</h3><span class="badge terra">Compartida contigo</span></div>
      <div class="list">${QUESTIONS.filter((q) => q.section === s.key && by[q.key]).map((q) => `<div class="item"><div class="grow"><p class="small muted">${esc(q.text)}</p><b style="font-weight:500">${esc(show(by[q.key].value))}</b></div></div>`).join('')}</div></section>`).join('')}
      <p class="tiny muted center">Léelo con curiosidad, no para debatir. Si algo te sorprende, puede ser un buen tema para conversar.</p></div>`
      : `<div class="card empty">${icon('lock')}<b>${esc(S.partner.display_name)} aún no ha compartido respuestas</b>Cada persona decide qué compartir. Sus respuestas privadas nunca se muestran aquí.</div>`;
  }

  await draw();
}
