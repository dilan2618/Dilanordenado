// Diario de pareja: entradas (individuales o compartidas), fechas y planes
import { db } from '../db.js';
import { S, nameOf } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError, fmtD, todayStr, nextYearly, today0, daysBetween, compressImage, confirmSheet } from '../ui.js';
import { J_KINDS } from '../content.js';
import { importFromNR } from '../importnr.js';

export default async function (el) {
  const sid = S.space.id;
  let tab = location.hash.includes('fechas') ? 'fechas' : location.hash.includes('planes') ? 'planes' : 'entradas';
  let filter = 'todo';
  const alive = viewGen();

  async function draw() {
    el.innerHTML = `<div class="page">
      <div class="page-head row between wrap"><div><span class="eyebrow">Nuestro diario</span><h1>Lo que vamos viviendo</h1>
        <p>Momentos, recuerdos, gratitud y cartas. Cada entrada puede ser solo tuya o compartida.</p></div>
        <button class="btn" id="add">${icon('plus')} Nueva entrada</button></div>
      <div class="seg" style="max-width:420px;margin-bottom:18px">${[['entradas', 'Entradas'], ['fechas', 'Fechas'], ['planes', 'Planes juntos']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="body"><div class="skeleton"></div></div></div>`;
    $$('[data-tab]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    $('#add', el).onclick = () => (tab === 'fechas' ? dateSheet() : tab === 'planes' ? $('#planIn', el)?.focus() : entrySheet());
    if (tab === 'entradas') await drawEntries(); else if (tab === 'fechas') await drawDates(); else await drawPlans();
  }

  // ---------------- entradas ----------------
  async function drawEntries() {
    const all = await db.journal.list(sid);
    if (!alive() || !$('#body', el)) return;
    const list = all.filter((j) => filter === 'todo' || (filter === 'privadas' ? j.visibility === 'private' : filter === 'fav' ? j.favorite : j.kind === filter));
    const covers = await db.photoUrls(list.map((j) => j.photos?.[0]).filter(Boolean)).catch(() => []);
    if (!alive() || !$('#body', el)) return;
    const coverOf = {}; let k = 0; list.forEach((j) => { if (j.photos?.[0]) coverOf[j.id] = covers[k++]; });
    $('#body', el).innerHTML = `
      <div class="chips" style="margin-bottom:16px">${[['todo', 'Todo'], ...Object.entries(J_KINDS).map(([k2, v]) => [k2, v.label]), ['privadas', 'Solo mías'], ['fav', 'Favoritas']]
        .map(([k2, l]) => `<button class="chip ${filter === k2 ? 'on' : ''}" data-f="${k2}">${esc(l)}</button>`).join('')}</div>
      ${list.length ? `<div class="j-grid">${list.map((j) => {
        const sealed = j.kind === 'carta' && j.open_when && !j.opened_at;
        if (j.kind === 'carta') return `<button class="entry letter" data-id="${j.id}"><div class="bd"><span class="badge" style="background:rgba(255,255,255,.12);color:var(--cream)">${icon(sealed ? 'lock' : 'mail')} ${sealed ? 'Sellada' : 'Carta'}</span>
          <h3>${sealed ? 'Ábrela cuando ' + esc(j.open_when) : esc(j.title || 'Una carta')}</h3><p>De ${esc(nameOf(j.author_id))} · ${fmtD(j.entry_date, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div></button>`;
        return `<button class="entry" data-id="${j.id}">${coverOf[j.id] ? `<div class="ph" style="background-image:url('${coverOf[j.id]}')"></div>` : ''}
          <div class="bd"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="badge terra">${icon(J_KINDS[j.kind]?.icon)} ${esc(J_KINDS[j.kind]?.label)}</span>
          ${j.visibility === 'private' ? `<span class="badge">${icon('lock')} Privada</span>` : ''}${j.favorite ? `<span class="badge wine">${icon('star')}</span>` : ''}</div>
          <h3>${esc(j.title || fmtD(j.entry_date))}</h3>${j.body ? `<p>${esc(j.body)}</p>` : ''}
          <p class="tiny muted" style="margin-top:8px">${fmtD(j.entry_date, { day: 'numeric', month: 'short', year: 'numeric' })}${j.place ? ' · ' + esc(j.place) : ''} · ${esc(nameOf(j.author_id))}</p></div></button>`;
      }).join('')}</div>`
      : `<div class="card empty">${icon('book')}<b>${all.length ? 'Nada en este filtro' : 'Su diario está vacío'}</b>${all.length ? '' : 'Empiecen con un recuerdo, algo que agradecen o una carta.'}
          ${all.length ? '' : `<div class="row" style="justify-content:center;margin-top:16px;flex-wrap:wrap"><button class="btn sm" id="first">Escribir la primera entrada</button><button class="btn ghost sm" id="imp">Importar de Nuestro Rincón</button></div>`}</div>`}`;
    $$('[data-f]', el).forEach((b) => (b.onclick = () => { filter = b.dataset.f; drawEntries(); }));
    $$('[data-id]', el).forEach((b) => (b.onclick = () => openEntry(all.find((j) => j.id === b.dataset.id))));
    const f = $('#first', el); if (f) f.onclick = () => entrySheet();
    const imp = $('#imp', el); if (imp) imp.onclick = () => importFromNR(() => draw());
  }

  async function openEntry(j) {
    const mine = j.author_id === db.uid;
    if (j.kind === 'carta' && j.open_when && !j.opened_at) {
      if (mine) { /* el autor puede leerla */ } else {
        return sheet(`<div class="center"><div style="color:var(--wine);margin-bottom:10px">${icon('lock')}</div><h2>Carta sellada</h2>
          <p class="muted" style="margin:8px 0">${esc(nameOf(j.author_id))} escribió esta carta para cuando <b>${esc(j.open_when)}</b>.</p><p class="muted">¿Es ese momento?</p>
          <div class="actions"><button class="btn ghost" data-close>Todavía no</button><button class="btn" id="open">Abrirla</button></div></div>`, (b) => {
          $('#open', b).onclick = async () => { await db.openLetter(j.id); j.opened_at = new Date().toISOString(); openEntry(j); drawEntries(); };
        });
      }
    }
    const urls = j.photos?.length ? await db.photoUrls(j.photos).catch(() => []) : [];
    sheet(`${urls.length ? `<div class="gallery">${urls.map((u) => `<img src="${u}" alt=""/>`).join('')}</div>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><span class="badge terra">${icon(J_KINDS[j.kind]?.icon)} ${esc(J_KINDS[j.kind]?.label)}</span>
        <span class="badge">${j.visibility === 'private' ? icon('lock') + ' Solo tú' : icon('users') + ' Compartida'}</span></div>
      <h2>${esc(j.title || fmtD(j.entry_date))}</h2>
      <p class="tiny muted" style="margin-bottom:14px">${fmtD(j.entry_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${j.place ? ' · ' + esc(j.place) : ''} · ${esc(nameOf(j.author_id))}</p>
      ${j.kind === 'carta' ? `<div class="letter-paper">${esc(j.body || '')}</div>` : j.body ? `<p class="prose">${esc(j.body)}</p>` : ''}
      ${mine ? `<div class="actions"><button class="btn ghost" id="del">${icon('trash')} Borrar</button><button class="btn" id="edit">${icon('edit')} Editar</button></div>` : '<div class="actions"><button class="btn ghost" data-close>Cerrar</button></div>'}`, (b) => {
      const ed = $('#edit', b); if (ed) ed.onclick = () => entrySheet(j);
      const dl = $('#del', b); if (dl) dl.onclick = async () => {
        if (!(await confirmSheet({ title: '¿Borrar esta entrada?', text: 'También se borrarán sus fotos. No se puede deshacer.', ok: 'Borrar', danger: true }))) return;
        try { await db.removePhotos(j.photos || []); await db.journal.del(j.id); toast('Entrada borrada'); drawEntries(); } catch (ex) { toast(friendlyError(ex)); }
      };
    });
  }

  function entrySheet(j, prefill = {}) {
    const isNew = !j;
    j = j || { kind: 'momento', title: '', body: '', entry_date: todayStr(), place: '', photos: [], visibility: 'shared', open_when: '', favorite: false, ...prefill };
    let kind = j.kind, vis = j.visibility, photos = (j.photos || []).map((p) => ({ path: p })), fresh = [];
    sheet(`<h2>${isNew ? 'Nueva entrada' : 'Editar entrada'}</h2>
      <div class="stack" style="margin-top:12px">
        <div class="chips" id="kinds">${Object.entries(J_KINDS).map(([k, v]) => `<button class="chip ${kind === k ? 'on' : ''}" data-k="${k}">${esc(v.label)}</button>`).join('')}</div>
        <div class="field"><label>Título</label><input class="input" id="ti" maxlength="140" value="${esc(j.title || '')}"/></div>
        <div class="field"><label id="bodyLbl">${kind === 'carta' ? 'Tu carta' : 'Escribe'}</label><textarea class="textarea" id="bo" maxlength="8000" style="min-height:150px">${esc(j.body || '')}</textarea></div>
        <div class="field ${kind === 'carta' ? '' : 'hidden'}" id="owBox"><label>Ábrela cuando… <span class="muted">(opcional: la sella hasta que tu pareja la abra)</span></label><input class="input" id="ow" maxlength="80" value="${esc(j.open_when || '')}" placeholder="me extrañes · tengas un mal día"/></div>
        <div class="two-col"><div class="field"><label>Fecha</label><input class="input" type="date" id="da" value="${esc(j.entry_date)}"/></div>
          <div class="field"><label>Lugar <span class="muted">(opcional)</span></label><input class="input" id="pl" maxlength="80" value="${esc(j.place || '')}"/></div></div>
        <div class="field"><label>Fotos</label><div class="photos-edit" id="ph"></div><input type="file" id="pf" accept="image/*" multiple hidden/></div>
        <div class="field"><label>¿Quién puede verla?</label><div class="seg" id="vis"><button data-v="shared" class="${vis === 'shared' ? 'on' : ''}">Compartida con ${esc(S.partner?.display_name || 'mi pareja')}</button><button data-v="private" class="${vis === 'private' ? 'on' : ''}">Solo yo</button></div></div>
        <label class="switch"><input type="checkbox" id="fav" ${j.favorite ? 'checked' : ''}/><div><b>Favorita</b></div></label>
      </div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button></div>`, async (b) => {
      const drawPh = async () => {
        const urls = await db.photoUrls(photos.filter((p) => p.path).map((p) => p.path)).catch(() => []);
        let u = 0;
        $('#ph', b).innerHTML = photos.map((p, i) => `<div class="p"><img src="${p.preview || urls[u++] || ''}" alt=""/><button data-rm="${i}">×</button></div>`).join('') + (photos.length < 8 ? `<label for="pf">${icon('plus')}</label>` : '');
        $$('[data-rm]', b).forEach((x) => (x.onclick = () => { const [r] = photos.splice(+x.dataset.rm, 1); if (r.path) fresh.push({ remove: r.path }); drawPh(); }));
      };
      drawPh();
      $('#pf', b).onchange = async (e) => {
        for (const f of [...e.target.files].slice(0, 8 - photos.length)) {
          try { const blob = await compressImage(f); photos.push({ blob, preview: URL.createObjectURL(blob) }); } catch { toast('No se pudo leer una foto'); }
        }
        e.target.value = ''; drawPh();
      };
      $$('#kinds .chip', b).forEach((c) => (c.onclick = () => { kind = c.dataset.k; $$('#kinds .chip', b).forEach((x) => x.classList.toggle('on', x === c)); $('#owBox', b).classList.toggle('hidden', kind !== 'carta'); $('#bodyLbl', b).textContent = kind === 'carta' ? 'Tu carta' : 'Escribe'; }));
      $$('#vis button', b).forEach((x) => (x.onclick = () => { vis = x.dataset.v; $$('#vis button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const title = $('#ti', b).value.trim(), body = $('#bo', b).value.trim();
        if (!title && !body && !photos.length) return toast('Escribe algo o añade una foto');
        try {
          const paths = [];
          for (const p of photos) {
            if (p.blob) paths.push(await db.uploadPhoto(sid, p.blob, vis === 'private'));
            else paths.push(await db.ensurePhotoScope(p.path, sid, vis === 'private'));
          }
          await db.removePhotos(fresh.filter((x) => x.remove).map((x) => x.remove));
          const row = { kind, title: title || null, body: body || null, entry_date: $('#da', b).value || todayStr(), place: $('#pl', b).value.trim() || null,
            photos: paths, visibility: vis, open_when: kind === 'carta' ? $('#ow', b).value.trim() || null : null, favorite: $('#fav', b).checked };
          if (isNew) await db.journal.add({ ...row, space_id: sid, author_id: db.uid }); else await db.journal.upd(j.id, row);
          closeSheet(); toast('Guardado'); tab = 'entradas'; draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }

  // ---------------- fechas ----------------
  async function drawDates() {
    const ds = await db.dates.list(sid);
    if (!alive() || !$('#body', el)) return;
    const rows = ds.map((d) => { const n = d.yearly ? nextYearly(d.date) : new Date(d.date + 'T00:00'); return { ...d, next: n, days: daysBetween(today0(), n) }; }).sort((a, b) => (a.days < 0) - (b.days < 0) || a.days - b.days);
    $('#body', el).innerHTML = `<div class="card">${rows.length ? `<div class="list">${rows.map((d) => `<button class="item" data-d="${d.id}" style="text-align:left;width:100%">
      <span class="ic serif">${esc(d.emoji || '◦')}</span><div class="grow"><b>${esc(d.title)}</b><p class="tiny muted">${fmtD(d.date, d.yearly ? { day: 'numeric', month: 'long' } : undefined)}${d.yearly ? ' · cada año' : ''}</p></div>
      <span class="badge ${d.days === 0 ? 'wine' : ''}">${d.days < 0 ? 'Pasó' : d.days === 0 ? 'Hoy' : d.days === 1 ? 'Mañana' : 'En ' + d.days + ' días'}</span></button>`).join('')}</div>`
      : `<div class="empty">${icon('calendar')}<b>Sin fechas aún</b>Cumpleaños, aniversarios, viajes… lo que no quieran olvidar.</div>`}
      <button class="btn soft block" id="addD" style="margin-top:12px">${icon('plus')} Añadir fecha</button></div>`;
    $('#addD', el).onclick = () => dateSheet();
    $$('[data-d]', el).forEach((b) => (b.onclick = () => dateSheet(ds.find((x) => x.id === b.dataset.d))));
  }
  function dateSheet(d) {
    const isNew = !d; d = d || { title: '', date: todayStr(), emoji: '', yearly: true };
    sheet(`<h2>${isNew ? 'Nueva fecha' : 'Editar fecha'}</h2><div class="stack" style="margin-top:12px">
      <div class="field"><label>Nombre</label><input class="input" id="t" maxlength="80" value="${esc(d.title)}" placeholder="Ej: Cumpleaños de ${esc(S.partner?.display_name || 'mi pareja')}"/></div>
      <div class="two-col"><div class="field"><label>Fecha</label><input class="input" type="date" id="d" value="${esc(d.date)}"/></div>
      <div class="field"><label>Símbolo <span class="muted">(opcional)</span></label><input class="input" id="e" maxlength="4" value="${esc(d.emoji || '')}"/></div></div>
      <label class="switch"><input type="checkbox" id="y" ${d.yearly ? 'checked' : ''}/><div><b>Se repite cada año</b></div></label></div>
      <div class="actions">${isNew ? '<button class="btn ghost" data-close>Cancelar</button>' : `<button class="btn ghost" id="del">${icon('trash')}</button>`}<button class="btn" id="save">Guardar</button></div>`, (b) => {
      $('#save', b).onclick = (e) => busy(e.currentTarget, async () => {
        const row = { title: $('#t', b).value.trim(), date: $('#d', b).value, emoji: $('#e', b).value.trim() || null, yearly: $('#y', b).checked };
        if (!row.title || !row.date) return toast('Falta el nombre o la fecha');
        try { if (isNew) await db.dates.add({ ...row, space_id: sid, created_by: db.uid }); else await db.dates.upd(d.id, row); closeSheet(); tab = 'fechas'; draw(); } catch (ex) { toast(friendlyError(ex)); }
      });
      const del = $('#del', b); if (del) del.onclick = async () => { await db.dates.del(d.id); closeSheet(); draw(); };
    });
  }

  // ---------------- planes ----------------
  async function drawPlans() {
    const ps = await db.plans.list(sid);
    if (!alive() || !$('#body', el)) return;
    const pend = ps.filter((p) => !p.done), done = ps.filter((p) => p.done);
    const item = (p) => `<div class="item"><button class="ic" data-tg="${p.id}" style="border-radius:50%;${p.done ? 'background:var(--ok);color:#fff' : 'border:1.5px solid var(--gray-2);background:none'}">${p.done ? icon('check') : ''}</button>
      <div class="grow"><b style="${p.done ? 'text-decoration:line-through;color:var(--gray)' : ''}">${esc(p.text)}</b>${p.done_at ? `<p class="tiny muted">Cumplido el ${fmtD(p.done_at)}</p>` : ''}</div>
      ${p.done ? `<button class="icon-btn" data-mem="${p.id}" title="Guardar como recuerdo">${icon('book')}</button>` : ''}<button class="icon-btn" data-rm="${p.id}">${icon('x')}</button></div>`;
    $('#body', el).innerHTML = `<div class="card"><form class="row" id="pf"><input class="input" id="planIn" maxlength="140" placeholder="Algo que quieren vivir juntos"/><button class="btn">Añadir</button></form>
      <div class="list" style="margin-top:8px">${pend.map(item).join('') || '<p class="muted small" style="padding:14px 0">Sin planes pendientes.</p>'}</div>
      ${done.length ? `<p class="label" style="margin-top:16px">Cumplidos</p><div class="list">${done.map(item).join('')}</div>` : ''}</div>`;
    $('#pf', el).onsubmit = async (e) => { e.preventDefault(); const v = $('#planIn', el).value.trim(); if (!v) return; await db.plans.add({ space_id: sid, created_by: db.uid, text: v }); drawPlans(); setTimeout(() => $('#planIn', el)?.focus(), 50); };
    $$('[data-tg]', el).forEach((b) => (b.onclick = async () => { const p = ps.find((x) => x.id === b.dataset.tg); await db.plans.upd(p.id, { done: !p.done, done_at: p.done ? null : todayStr() }); if (!p.done) toast('¡Cumplido!'); drawPlans(); }));
    $$('[data-rm]', el).forEach((b) => (b.onclick = async () => { await db.plans.del(b.dataset.rm); drawPlans(); }));
    $$('[data-mem]', el).forEach((b) => (b.onclick = () => { const p = ps.find((x) => x.id === b.dataset.mem); entrySheet(null, { kind: 'experiencia', title: p.text, entry_date: p.done_at || todayStr() }); }));
  }

  await draw();
  const onChange = (e) => { if (['os_journal', 'os_dates', 'os_plans'].includes(e.detail.table) && !$('#sheet.open')) draw(); };
  window.addEventListener('os:change', onChange);
  return () => window.removeEventListener('os:change', onChange);
}
