// Comprender un conflicto: dos versiones independientes → análisis comparativo
import { db } from '../db.js';
import { S, nameOf, aiStatus } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError, ago, confirmSheet } from '../ui.js';
import { FEELINGS } from '../content.js';
import { renderAnalysis } from '../render.js';
import { go } from '../app.js';
import { riskText } from '../safety.js';

export default async function (el, params) {
  const sid = S.space.id;
  const alive = viewGen();
  if (params[0]) return detail(params[0]);

  const list = await db.conflicts.list(sid);
  el.innerHTML = `<div class="page">
    <div class="page-head row between wrap"><div><span class="eyebrow">Comprender un conflicto</span><h1>Dos versiones, una comprensión</h1>
      <p>Cada uno describe la situación por separado. Después, un análisis busca puntos en común, malentendidos y necesidades, sin decidir quién tiene la razón.</p></div>
      <button class="btn" id="add">${icon('plus')} Nueva situación</button></div>
    ${list.length ? `<div class="stack">${list.map((c) => `<a class="card row" href="#/conflictos/${c.id}" style="padding:18px 20px;display:flex">
      <span class="ic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--terra-soft);color:var(--terra)">${icon('scale')}</span>
      <div class="grow"><b class="serif" style="font-size:1.1rem;font-weight:500">${esc(c.title)}</b><p class="tiny muted">Abierto por ${esc(nameOf(c.created_by))} · ${ago(c.updated_at)}</p></div>
      <span class="badge ${c.status === 'resuelto' ? 'ok' : c.status === 'analizado' ? 'terra' : 'warn'}">${c.status === 'resuelto' ? 'Resuelto' : c.status === 'analizado' ? 'Analizado' : 'Abierto'}</span></a>`).join('')}</div>`
    : `<div class="card empty">${icon('scale')}<b>Ninguna situación registrada</b>Cuando algo les cueste, escríbanlo aquí con calma. Cada versión es privada hasta que su autor decida compartirla.</div>`}
  </div>`;
  $('#add', el).onclick = () => sheet(`<h2>Nueva situación</h2><p class="muted small" style="margin:6px 0 14px">Dale un nombre neutral, que ambos puedan reconocer sin sentirse acusados.</p>
    <input class="input" id="t" maxlength="120" placeholder="Ej: La salida del sábado"/>
    <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="go">Crear</button></div>`, (b) => {
    $('#go', b).onclick = (e) => busy(e.currentTarget, async () => {
      const t = $('#t', b).value.trim(); if (!t) return toast('Escribe un título');
      try { const c = await db.conflicts.add({ space_id: sid, created_by: db.uid, title: t }); closeSheet(); go('conflictos/' + c.id); } catch (ex) { toast(friendlyError(ex)); }
    });
  });

  async function detail(id) {
    const [c] = (await db.conflicts.list(sid, (q) => q.eq('id', id)));
    if (!c) { el.innerHTML = '<div class="page"><div class="card empty"><b>No encontrado</b></div></div>'; return; }
    const [versions, status, ai] = await Promise.all([db.versions(id), db.conflictStatus(id), aiStatus()]);
    if (!alive()) return;
    const mine = versions.find((v) => v.user_id === db.uid) || {};
    const partnerV = versions.find((v) => v.user_id !== db.uid);
    const pStatus = status.find((s) => s.user_id !== db.uid);
    const ready = status.filter((s) => s.submitted && s.allow_analysis).length;
    let feelings = (mine.feelings || '').split(',').map((s) => s.trim()).filter(Boolean);

    el.innerHTML = `<div class="page narrow">
      <a class="back" href="#/conflictos">${icon('back')} Conflictos</a>
      <div class="page-head"><span class="eyebrow">Situación</span><h1>${esc(c.title)}</h1>
        <div class="row wrap" style="margin-top:10px">
          <span class="badge ${mine.submitted ? 'ok' : 'warn'}">${icon(mine.submitted ? 'check' : 'clock')} Tu versión ${mine.submitted ? 'enviada' : 'pendiente'}</span>
          ${S.partner ? `<span class="badge ${pStatus?.submitted ? 'ok' : ''}">${icon(pStatus?.submitted ? 'check' : 'clock')} ${esc(S.partner.display_name)}: ${pStatus?.submitted ? 'versión enviada' : 'aún no escribe'}</span>` : ''}
        </div></div>

      <section class="card">
        <div class="card-head"><h3>Tu versión</h3><span class="badge">${icon('lock')} ${mine.shared ? 'Compartida' : 'Privada'}</span></div>
        <form id="vf" class="stack">
          <div class="field"><label>¿Qué pasó?</label><span class="hint">Solo los hechos, como los describiría una cámara.</span><textarea class="textarea" name="what" maxlength="3000">${esc(mine.what_happened || '')}</textarea></div>
          <div class="field"><label>¿Cómo lo interpretaste?</label><span class="hint">Lo que pensaste que significaba. Puede no ser lo que el otro quiso decir.</span><textarea class="textarea" name="interp" maxlength="2000">${esc(mine.interpretation || '')}</textarea></div>
          <div class="field"><label>¿Qué sentiste?</label><div class="chips" id="fe">${[...new Set([...FEELINGS, ...feelings])].map((f) => `<button type="button" class="chip ${feelings.includes(f) ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}</button>`).join('')}</div></div>
          <div class="field"><label>¿Qué necesitas?</label><textarea class="textarea" name="needs" maxlength="1500" style="min-height:80px">${esc(mine.needs || '')}</textarea></div>
          <div class="field"><label>¿Qué te gustaría que pasara ahora?</label><textarea class="textarea" name="wish" maxlength="1500" style="min-height:80px">${esc(mine.wish || '')}</textarea></div>
          <div id="risk"></div>
          <label class="switch"><input type="checkbox" name="allow" ${mine.allow_analysis !== false ? 'checked' : ''}/><div><b>Usar mi versión en el análisis</b><span>El análisis lo verán ambos, pero no citará tu texto si es privado.</span></div></label>
          <label class="switch"><input type="checkbox" name="shared" ${mine.shared ? 'checked' : ''}/><div><b>Mostrar mi versión a ${esc(S.partner?.display_name || 'mi pareja')}</b><span>Si está desactivado, solo tú la ves.</span></div></label>
          <button class="btn">${mine.submitted ? 'Actualizar mi versión' : 'Enviar mi versión'}</button>
        </form>
      </section>

      ${partnerV ? `<section class="card" style="margin-top:16px"><div class="card-head"><h3>Versión de ${esc(nameOf(partnerV.user_id))}</h3><span class="badge">${icon('users')} Compartida</span></div>
        ${[['Qué pasó', partnerV.what_happened], ['Cómo lo interpretó', partnerV.interpretation], ['Qué sintió', partnerV.feelings], ['Qué necesita', partnerV.needs], ['Qué le gustaría', partnerV.wish]]
          .filter(([, v]) => v).map(([k, v]) => `<div class="an-sec"><h4>${k}</h4><p class="prose">${esc(v)}</p></div>`).join('')}</section>`
        : pStatus?.submitted ? `<div class="notice info" style="margin-top:16px">${icon('lock')}<p>${esc(S.partner.display_name)} escribió su versión pero decidió mantenerla privada. ${pStatus.allow_analysis ? 'Sí autorizó usarla en el análisis.' : 'No autorizó usarla en el análisis.'}</p></div>` : ''}

      <section class="card" style="margin-top:16px">
        <div class="card-head"><h3>Análisis comparativo</h3>${c.analysis_at ? `<span class="tiny muted">${ago(c.analysis_at)}</span>` : ''}</div>
        <div id="an">${c.analysis ? renderAnalysis(c.analysis) : `<p class="muted small">${ready === 0 ? 'Cuando haya al menos una versión enviada y autorizada podrán generar el análisis. Lo ideal es esperar las dos.' : ready === 1 && S.partner ? 'Hay una versión lista. Pueden esperar la otra o generar un análisis de una sola perspectiva.' : 'Todo listo para el análisis.'}</p>`}</div>
        ${!ai?.ai ? `<div class="notice" style="margin-top:12px">${icon('info')}<p>El asistente aún no está activado en el servidor, por eso el análisis automático no está disponible. Mientras tanto, pueden leer sus versiones (si las compartieron) y usar la guía “Para conversar”.</p></div>` : ''}
        <div class="row wrap" style="margin-top:14px">
          ${ai?.ai ? `<button class="btn" id="analyze" ${ready ? '' : 'disabled'}>${icon('sparkle')} ${c.analysis ? 'Actualizar análisis' : 'Generar análisis'}</button>` : ''}
          <button class="btn ghost" id="talk">${icon('chat')} Hablarlo en pareja</button>
          ${c.status !== 'resuelto' ? '<button class="btn ghost" id="resolve">Marcar como resuelto</button>' : ''}
          ${c.created_by === db.uid ? `<button class="icon-btn" id="del" title="Eliminar">${icon('trash')}</button>` : ''}
        </div>
      </section>
    </div>`;

    $$('#fe .chip', el).forEach((ch) => (ch.onclick = () => { const f = ch.dataset.f; feelings = feelings.includes(f) ? feelings.filter((x) => x !== f) : [...feelings, f]; ch.classList.toggle('on'); }));
    const vf = $('#vf', el);
    vf.oninput = () => { $('#risk', el).innerHTML = riskText([vf.what.value, vf.interp.value, vf.needs.value, vf.wish.value].join(' ')) ? safetyCard() : ''; };
    vf.oninput();
    vf.onsubmit = (e) => {
      e.preventDefault();
      if (!vf.what.value.trim()) return toast('Describe qué pasó');
      busy(vf.querySelector('button:not([type=button])'), async () => {
        try {
          await db.saveVersion(id, sid, { what_happened: vf.what.value.trim(), interpretation: vf.interp.value.trim() || null, feelings: feelings.join(', ') || null,
            needs: vf.needs.value.trim() || null, wish: vf.wish.value.trim() || null, allow_analysis: vf.allow.checked, shared: vf.shared.checked, submitted: true });
          await db.conflicts.upd(id, { title: c.title });
          toast('Versión guardada'); detail(id);
        } catch (ex) { toast(friendlyError(ex)); }
      });
    };
    const an = $('#analyze', el);
    if (an) an.onclick = () => busy(an, async () => {
      $('#an', el).innerHTML = '<div class="skeleton" style="min-height:160px"></div>';
      const r = await db.fn('conflict', { space_id: sid, conflict_id: id });
      if (r?.analysis) { toast('Análisis listo'); detail(id); }
      else { toast(r?.error === 'ai_not_configured' ? 'El asistente aún no está activado' : r?.error === 'no_versions' ? 'Falta una versión autorizada' : 'No se pudo generar el análisis'); detail(id); }
    });
    $('#talk', el).onclick = (e) => busy(e.currentTarget, async () => {
      const chat = await db.chats.add({ space_id: sid, mode: 'pareja', owner_id: null, title: 'Hablar de: ' + c.title.slice(0, 60) });
      go('asistente/' + chat.id);
    });
    const rs = $('#resolve', el);
    if (rs) rs.onclick = () => sheet(`<h2>¿Qué aprendieron?</h2><p class="muted small" style="margin:6px 0 14px">Opcional. Se guardará como aprendizaje compartido en la memoria, para reconocer situaciones parecidas.</p>
      <textarea class="textarea" id="lr" maxlength="600" placeholder="Ej: cuando uno necesita espacio, avisarlo con una palabra acordada"></textarea>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Marcar como resuelto</button></div>`, (b) => {
      $('#ok', b).onclick = (e) => busy(e.currentTarget, async () => {
        await db.conflicts.upd(id, { status: 'resuelto' });
        const l = $('#lr', b).value.trim();
        if (l) await db.memories.add({ space_id: sid, owner_id: db.uid, scope: 'shared', kind: 'avance', content: `Sobre “${c.title}”: ${l}`, source: 'conflictos' }).catch(() => {});
        closeSheet(); toast('Marcado como resuelto'); detail(id);
      });
    });
    const dl = $('#del', el);
    if (dl) dl.onclick = async () => { if (await confirmSheet({ title: '¿Eliminar esta situación?', text: 'Se borrarán ambas versiones y el análisis.', ok: 'Eliminar', danger: true })) { await db.conflicts.del(id); go('conflictos'); } };
  }
}

const safetyCard = () => `<div class="safety"><b>Tu seguridad es lo primero</b><p>Lo que escribes podría describir una situación de riesgo. Si es así, este análisis compartido no es el lugar adecuado: busca ayuda y apoyo seguro.</p><a class="link" href="#/seguridad">Ver recursos de ayuda →</a></div>`;
