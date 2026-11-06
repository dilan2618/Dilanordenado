// Acuerdos y compromisos (sin vigilancia: se revisan conversando)
import { db } from '../db.js';
import { S, nameOf } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError, fmtD, todayStr, toStr, today0, ago, confirmSheet } from '../ui.js';
import { AGREEMENT_STATUS } from '../content.js';

export default async function (el) {
  const sid = S.space.id;
  const alive = viewGen();
  const plusDays = (n) => { const d = today0(); d.setDate(d.getDate() + n); return toStr(d); };

  async function draw() {
    const all = await db.agreements.list(sid);
    if (!alive()) return;
    const dueReview = (a) => a.status === 'activo' && a.review_date && a.review_date <= todayStr();
    const groups = [
      ['Esperando respuesta', all.filter((a) => a.status === 'propuesto')],
      ['Vigentes', all.filter((a) => ['activo', 'revision', 'ajustar'].includes(a.status))],
      ['Integrados o en pausa', all.filter((a) => ['cumplido', 'pausado'].includes(a.status))],
    ];
    el.innerHTML = `<div class="page">
      <div class="page-head row between wrap"><div><span class="eyebrow">Acuerdos y compromisos</span><h1>Lo que decidimos juntos</h1>
        <p>Acuerdos concretos, con su motivo y el compromiso de cada uno.</p></div><button class="btn" id="add">${icon('plus')} Nuevo acuerdo</button></div>
      <div class="notice info" style="margin-bottom:18px">${icon('shield')}<p>Los acuerdos se revisan conversando, no se vigilan. No hay registro de “faltas” ni puntuaciones: si algo no funciona, se ajusta juntos.</p></div>
      ${all.length ? groups.filter(([, l]) => l.length).map(([t, l]) => `<h3 style="margin:18px 4px 10px">${t}</h3><div class="stack">${l.map((a) => {
        const s = AGREEMENT_STATUS[dueReview(a) ? 'revision' : a.status];
        const needsMe = a.status === 'propuesto' && (a.involved || []).includes(db.uid) && !(a.accepted_by || []).includes(db.uid);
        return `<button class="card" data-a="${a.id}" style="text-align:left;padding:18px 20px">
          <div class="row between"><b class="serif" style="font-size:1.15rem;font-weight:500">${esc(a.title)}</b><span class="badge ${s.cls}">${dueReview(a) ? 'Toca revisar' : s.label}</span></div>
          ${a.description ? `<p class="small" style="margin-top:6px">${esc(a.description)}</p>` : ''}
          <p class="tiny muted" style="margin-top:8px">${(a.involved || []).map(nameOf).join(' y ')} · ${a.review_date ? 'revisión ' + fmtD(a.review_date, { day: 'numeric', month: 'short' }) : 'sin fecha de revisión'}</p>
          ${needsMe ? `<span class="badge warn" style="margin-top:10px">${icon('alert')} Espera tu respuesta</span>` : ''}</button>`;
      }).join('')}</div>`).join('')
      : `<div class="card empty">${icon('pact')}<b>Aún no tienen acuerdos</b>Un buen acuerdo es concreto, posible y revisable. Pueden empezar con algo pequeño.</div>`}
    </div>`;
    $('#add', el).onclick = () => form();
    $$('[data-a]', el).forEach((b) => (b.onclick = () => detail(all.find((a) => a.id === b.dataset.a))));
  }

  function form(a) {
    const isNew = !a;
    a = a || { title: '', description: '', reason: '', commitments: {}, involved: [db.uid, ...(S.partner ? [S.partner.user_id] : [])], review_date: plusDays(30) };
    let inv = a.involved.length > 1 ? 'both' : 'me';
    sheet(`<h2>${isNew ? 'Nuevo acuerdo' : 'Editar acuerdo'}</h2><div class="stack" style="margin-top:12px">
      <div class="field"><label>Acuerdo</label><input class="input" id="t" maxlength="140" value="${esc(a.title)}" placeholder="Ej: Hablar de los problemas antes de dormir, sin pantallas"/></div>
      <div class="field"><label>Descripción</label><textarea class="textarea" id="d" maxlength="1500" style="min-height:80px" placeholder="¿Qué significa en la práctica?">${esc(a.description || '')}</textarea></div>
      <div class="field"><label>Motivo</label><textarea class="textarea" id="r" maxlength="1000" style="min-height:70px" placeholder="¿Por qué es importante para nosotros?">${esc(a.reason || '')}</textarea></div>
      ${S.partner ? `<div class="field"><label>Personas involucradas</label><div class="seg" id="inv"><button data-i="both" class="${inv === 'both' ? 'on' : ''}">Ambos</button><button data-i="me" class="${inv === 'me' ? 'on' : ''}">Solo yo</button></div></div>` : ''}
      <div class="field"><label>Mi compromiso</label><textarea class="textarea" id="c" maxlength="600" style="min-height:70px" placeholder="Lo que yo me comprometo a hacer">${esc(a.commitments?.[db.uid] || '')}</textarea>
        <span class="hint">${S.partner ? `${esc(S.partner.display_name)} escribirá el suyo al aceptar.` : ''} Cada persona escribe solo su propio compromiso.</span></div>
      <div class="field"><label>Fecha de revisión</label><input class="input" type="date" id="rv" value="${esc(a.review_date || '')}" min="${todayStr()}"/></div></div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">${isNew && inv === 'both' && S.partner ? 'Proponer' : 'Guardar'}</button></div>`, (b) => {
      $$('#inv button', b).forEach((x) => (x.onclick = () => { inv = x.dataset.i; $$('#inv button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const title = $('#t', b).value.trim(), mine = $('#c', b).value.trim();
        if (!title) return toast('Escribe el acuerdo'); if (!mine) return toast('Escribe tu compromiso');
        const involved = inv === 'both' && S.partner ? [db.uid, S.partner.user_id] : [db.uid];
        const row = { title, description: $('#d', b).value.trim() || null, reason: $('#r', b).value.trim() || null, review_date: $('#rv', b).value || null,
          involved, commitments: { ...(a.commitments || {}), [db.uid]: mine } };
        try {
          if (isNew) await db.agreements.add({ ...row, space_id: sid, created_by: db.uid, accepted_by: [db.uid], status: involved.length > 1 ? 'propuesto' : 'activo' });
          else await db.agreements.upd(a.id, row);
          closeSheet(); toast(isNew && involved.length > 1 ? 'Acuerdo propuesto' : 'Guardado'); draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }

  function detail(a) {
    const s = AGREEMENT_STATUS[a.status];
    const involvedMe = (a.involved || []).includes(db.uid), accepted = (a.accepted_by || []).includes(db.uid);
    sheet(`<span class="badge ${s.cls}">${s.label}</span><h2 style="margin-top:10px">${esc(a.title)}</h2>
      <p class="tiny muted">Propuesto por ${esc(nameOf(a.created_by))} · ${ago(a.created_at)}${a.review_date ? ' · revisión ' + fmtD(a.review_date) : ''}</p>
      ${a.description ? `<div class="an-sec"><h4>Descripción</h4><p class="prose">${esc(a.description)}</p></div>` : ''}
      ${a.reason ? `<div class="an-sec"><h4>Motivo</h4><p class="prose">${esc(a.reason)}</p></div>` : ''}
      <div class="an-sec"><h4>Compromisos</h4>${(a.involved || []).map((u) => `<p style="margin-bottom:8px"><b>${esc(nameOf(u))}:</b> ${a.commitments?.[u] ? esc(a.commitments[u]) : '<span class="muted">aún no lo escribe</span>'}</p>`).join('')}</div>
      ${(a.reviews || []).length ? `<div class="an-sec"><h4>Revisiones</h4>${a.reviews.map((r) => `<p class="small" style="margin-bottom:8px"><b>${esc(nameOf(r.by))}</b> · ${fmtD(r.at)}<br/>${esc(r.text)}</p>`).join('')}</div>` : ''}
      ${a.status === 'propuesto' && involvedMe && !accepted ? `<div class="field" style="margin-top:12px"><label>Tu compromiso</label><textarea class="textarea" id="myc" maxlength="600" style="min-height:70px" placeholder="Lo que tú te comprometes a hacer"></textarea></div>
        <div class="actions"><button class="btn ghost" id="talk">Prefiero hablarlo</button><button class="btn" id="accept">Aceptar acuerdo</button></div>`
      : `<div class="actions">${a.created_by === db.uid ? `<button class="btn ghost" id="del">${icon('trash')}</button>` : ''}
        ${a.status === 'propuesto' && a.created_by === db.uid ? '<button class="btn ghost" id="edit">Editar</button>' : ''}
        ${a.status !== 'propuesto' && involvedMe ? '<button class="btn" id="review">Revisar juntos</button>' : '<button class="btn ghost" data-close>Cerrar</button>'}</div>`}`, (b) => {
      const ac = $('#accept', b); if (ac) ac.onclick = (e) => busy(e.currentTarget, async () => {
        const c = $('#myc', b).value.trim(); if (!c) return toast('Escribe tu compromiso');
        const accepted_by = [...new Set([...(a.accepted_by || []), db.uid])];
        const all = (a.involved || []).every((u) => accepted_by.includes(u));
        try { await db.agreements.upd(a.id, { accepted_by, commitments: { ...(a.commitments || {}), [db.uid]: c }, status: all ? 'activo' : 'propuesto' }); closeSheet(); toast('Acuerdo aceptado'); draw(); } catch (ex) { toast(friendlyError(ex)); }
      });
      const tk = $('#talk', b); if (tk) tk.onclick = async () => { await db.topics.add({ space_id: sid, created_by: db.uid, title: 'Acuerdo: ' + a.title, kind: 'acuerdo' }); closeSheet(); toast('Añadido a conversaciones pendientes'); };
      const ed = $('#edit', b); if (ed) ed.onclick = () => form(a);
      const dl = $('#del', b); if (dl) dl.onclick = async () => { if (await confirmSheet({ title: '¿Eliminar este acuerdo?', text: 'Se borrará para ambos.', ok: 'Eliminar', danger: true })) { await db.agreements.del(a.id); draw(); } };
      const rv = $('#review', b); if (rv) rv.onclick = () => reviewSheet(a);
    });
  }

  function reviewSheet(a) {
    let status = 'activo';
    sheet(`<h2>Revisar “${esc(a.title)}”</h2><p class="muted small" style="margin:6px 0 14px">Una revisión es una conversación: ¿cómo nos ha ido?, ¿qué aprendimos?, ¿qué ajustamos?</p>
      <div class="field"><label>Mi reflexión</label><textarea class="textarea" id="tx" maxlength="1200" placeholder="Lo que he notado, lo que me ha costado, lo que valoro del esfuerzo del otro…"></textarea></div>
      <div class="field" style="margin-top:12px"><label>¿Cómo sigue el acuerdo?</label><div class="chips" id="st">${[['activo', 'Seguimos igual'], ['ajustar', 'Hay que ajustarlo'], ['cumplido', 'Ya es parte de nosotros'], ['pausado', 'Pausarlo']].map(([k, l]) => `<button class="chip ${k === status ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:12px"><label>Próxima revisión <span class="muted">(opcional)</span></label><input class="input" type="date" id="nx" value="${plusDays(30)}" min="${todayStr()}"/></div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar revisión</button></div>`, (b) => {
      $$('#st .chip', b).forEach((c) => (c.onclick = () => { status = c.dataset.s; $$('#st .chip', b).forEach((x) => x.classList.toggle('on', x === c)); }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const text = $('#tx', b).value.trim(); if (!text) return toast('Escribe tu reflexión');
        try {
          await db.agreements.upd(a.id, { status, reviews: [...(a.reviews || []), { by: db.uid, at: todayStr(), text }], review_date: ['activo', 'ajustar'].includes(status) ? $('#nx', b).value || null : a.review_date });
          if (status === 'cumplido') await db.memories.add({ space_id: sid, owner_id: db.uid, scope: 'shared', kind: 'avance', content: `Integraron el acuerdo “${a.title}”.`, source: 'acuerdos' }).catch(() => {});
          closeSheet(); toast('Revisión guardada'); draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }

  await draw();
  const onChange = (e) => { if (e.detail.table === 'os_agreements' && !$('#sheet.open')) draw(); };
  window.addEventListener('os:change', onChange);
  return () => window.removeEventListener('os:change', onChange);
}
