// Memoria contextual: transparente, editable y eliminable
import { db } from '../db.js';
import { S, nameOf } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError, ago, confirmSheet } from '../ui.js';
import { MEM_KINDS } from '../content.js';

export default async function (el) {
  const sid = S.space.id;
  const alive = viewGen();
  async function draw() {
    const mems = await db.memories.list(sid);
    if (!alive()) return;
    const priv = mems.filter((m) => m.scope === 'private'), shared = mems.filter((m) => m.scope === 'shared');
    const on = S.me.settings?.memory_enabled !== false;
    const group = (title, list, desc) => `<section class="card" style="margin-top:16px"><div class="card-head"><h3>${title}</h3><span class="badge">${list.length}</span></div><p class="small muted" style="margin:-6px 0 8px">${desc}</p>
      ${list.length ? `<div class="list">${list.map((m) => `<div class="item"><span class="ic">${icon(m.kind === 'avance' ? 'leaf' : m.kind === 'objetivo' ? 'target' : m.kind === 'tema' ? 'refresh' : 'brain')}</span>
        <div class="grow"><span class="badge">${esc(MEM_KINDS[m.kind] || m.kind)}</span><p style="margin-top:6px;color:var(--ink)">${esc(m.content)}</p>
        <p class="tiny muted" style="margin-top:4px">${m.source ? 'Desde ' + esc(m.source) + ' · ' : ''}${esc(nameOf(m.owner_id))} · ${ago(m.updated_at)}</p></div>
        <button class="icon-btn" data-ed="${m.id}" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-rm="${m.id}" aria-label="Borrar">${icon('trash')}</button></div>`).join('')}</div>`
      : '<p class="muted small" style="padding:10px 0">Nada guardado aún.</p>'}</section>`;
    el.innerHTML = `<div class="page narrow">
      <div class="page-head row between wrap"><div><span class="eyebrow">Memoria</span><h1>Lo que el asistente recuerda</h1>
        <p>Solo se guarda lo que ustedes aprueban. Aquí pueden verlo todo, corregirlo o borrarlo.</p></div><button class="btn" id="add">${icon('plus')} Añadir</button></div>
      <label class="switch">${'<input type="checkbox" id="on" ' + (on ? 'checked' : '') + '/>'}<div><b>Usar la memoria en mis conversaciones</b><span>Si la desactivas, el asistente no usará tu memoria privada ni la compartida al hablar contigo.</span></div></label>
      ${group('Compartida', shared, 'Visible para ambos. La usan ambos en sus conversaciones.')}
      ${group('Solo mía', priv, `Privada: ${esc(S.partner?.display_name || 'tu pareja')} no puede verla.`)}
    </div>`;
    $('#on', el).onchange = async (e) => { S.me = await db.updateMe(sid, { settings: { ...(S.me.settings || {}), memory_enabled: e.target.checked } }); toast('Preferencia guardada'); };
    $('#add', el).onclick = () => form();
    $$('[data-ed]', el).forEach((b) => (b.onclick = () => form(mems.find((m) => m.id === b.dataset.ed))));
    $$('[data-rm]', el).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet({ title: '¿Borrar este recuerdo?', text: 'El asistente dejará de tenerlo en cuenta.', ok: 'Borrar', danger: true }))) return;
      await db.memories.del(b.dataset.rm); toast('Borrado'); draw();
    }));
  }
  function form(m) {
    const isNew = !m; m = m || { scope: 'private', kind: 'preferencia', content: '' };
    let scope = m.scope, kind = m.kind;
    sheet(`<h2>${isNew ? 'Añadir a la memoria' : 'Editar'}</h2><div class="stack" style="margin-top:12px">
      <div class="seg" id="sc"><button data-s="private" class="${scope === 'private' ? 'on' : ''}">Solo mía</button><button data-s="shared" class="${scope === 'shared' ? 'on' : ''}">Compartida</button></div>
      <div class="chips" id="kd">${Object.entries(MEM_KINDS).map(([k, l]) => `<button class="chip ${kind === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      <textarea class="textarea" id="ct" maxlength="400" placeholder="Ej: Para mí la iniciativa afectiva es importante">${esc(m.content)}</textarea></div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button></div>`, (b) => {
      $$('#sc button', b).forEach((x) => (x.onclick = () => { scope = x.dataset.s; $$('#sc button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $$('#kd .chip', b).forEach((x) => (x.onclick = () => { kind = x.dataset.k; $$('#kd .chip', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const content = $('#ct', b).value.trim(); if (!content) return toast('Escribe algo');
        try {
          if (isNew) await db.memories.add({ space_id: sid, owner_id: db.uid, scope, kind, content, source: 'manual' });
          else await db.memories.upd(m.id, { kind, content, ...(m.owner_id === db.uid ? { scope } : {}) });
          closeSheet(); draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }
  await draw();
}
