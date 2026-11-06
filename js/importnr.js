// Importar recuerdos desde la app anterior "Nuestro Rincón" (código de pareja)
import { db } from './db.js';
import { S } from './store.js';
import { $, esc, sheet, closeSheet, toast, busy, dataUrlToBlob, todayStr } from './ui.js';

export function importFromNR(onDone) {
  sheet(`<h2>Traer recuerdos de Nuestro Rincón</h2>
    <p class="muted small" style="margin:6px 0 16px">Escribe el código de pareja de Nuestro Rincón (Más → Teléfonos conectados). Se copiarán sus experiencias con fotos, fechas, planes, cartas y razones al diario compartido. No se duplica lo ya importado.</p>
    <input class="input" id="code" maxlength="11" placeholder="XXXXX-XXXXX" style="text-align:center;letter-spacing:.12em;text-transform:uppercase;font-size:1.15rem"/>
    <p class="small muted" id="st" style="min-height:1.4em;margin-top:10px"></p>
    <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="go">Importar</button></div>`, (b) => {
    const st = (t) => ($('#st', b).textContent = t);
    $('#go', b).onclick = (e) => busy(e.currentTarget, async () => {
      const code = $('#code', b).value.trim().toUpperCase().replace(/\s/g, '');
      if (code.replace(/[^A-Z0-9]/g, '').length !== 10) return st('El código tiene 10 letras o números.');
      try {
        st('Buscando…');
        if (!(await db.nr('nr_join', { p_code: code }))) return st('Ese código no existe.');
        const { items } = await db.nr('nr_pull', { p_code: code, p_since: 0 });
        const live = items.filter((x) => !x.deleted && x.data);
        const sid = S.space.id;
        const existing = new Set((await db.journal.list(sid)).map((j) => j.source).filter(Boolean));
        const n = { exp: 0, date: 0, bucket: 0, note: 0, reason: 0, photos: 0 };

        const settings = live.find((x) => x.kind === 'settings')?.data;
        if (settings?.start && !S.space.start_date) { S.space = await db.updateSpace(sid, { start_date: settings.start }); }

        const exps = live.filter((x) => x.kind === 'exp' && !existing.has('nr:' + x.id));
        for (const [i, x] of exps.entries()) {
          st(`Recuerdos ${i + 1}/${exps.length}…`);
          const d = x.data, paths = [];
          const ids = (d.photos || []).slice(0, 8);
          for (let k = 0; k < ids.length; k += 4) {
            const got = (await db.nr('nr_photo_get', { p_code: code, p_ids: ids.slice(k, k + 4) })) || {};
            for (const id of ids.slice(k, k + 4)) if (got[id]) { paths.push(await db.uploadPhoto(sid, dataUrlToBlob(got[id]), false)); n.photos++; }
          }
          await db.journal.add({ space_id: sid, author_id: db.uid, kind: ['primera', 'especial'].includes(d.cat) ? 'momento' : 'experiencia',
            title: d.title || null, body: d.desc || null, entry_date: d.date || todayStr(), place: d.place || null, photos: paths, favorite: !!d.fav,
            visibility: 'shared', source: 'nr:' + x.id });
          n.exp++;
        }
        st('Fechas, planes y cartas…');
        const curDates = new Set((await db.dates.list(sid)).map((d) => d.title + d.date));
        for (const x of live.filter((x) => x.kind === 'date')) {
          if (curDates.has(x.data.title + x.data.date)) continue;
          await db.dates.add({ space_id: sid, created_by: db.uid, title: x.data.title, date: x.data.date, emoji: x.data.emoji || null, yearly: x.data.yearly !== false }); n.date++;
        }
        const curPlans = new Set((await db.plans.list(sid)).map((p) => p.text));
        for (const x of live.filter((x) => x.kind === 'bucket')) {
          if (curPlans.has(x.data.text)) continue;
          await db.plans.add({ space_id: sid, created_by: db.uid, text: x.data.text, done: !!x.data.done, done_at: x.data.doneDate || null }); n.bucket++;
        }
        for (const x of live.filter((x) => x.kind === 'note' && !existing.has('nr:' + x.id))) {
          const d = x.data;
          await db.journal.add({ space_id: sid, author_id: db.uid, kind: 'carta', title: d.title || null, body: (d.from ? `De ${d.from}:\n\n` : '') + (d.body || ''),
            entry_date: d.date || todayStr(), open_when: d.openWhen || null, opened_at: d.opened ? new Date().toISOString() : null, visibility: 'shared', source: 'nr:' + x.id });
          n.note++;
        }
        const reasons = live.filter((x) => x.kind === 'reason').map((x) => x.data.text).filter(Boolean);
        if (reasons.length && !existing.has('nr:reasons:' + code)) {
          await db.journal.add({ space_id: sid, author_id: db.uid, kind: 'gratitud', title: 'Razones por las que te amo', body: reasons.map((r) => '• ' + r).join('\n'),
            entry_date: todayStr(), visibility: 'shared', source: 'nr:reasons:' + code });
          n.reason = reasons.length;
        }
        closeSheet();
        toast(`Importado: ${n.exp} recuerdos, ${n.photos} fotos, ${n.date} fechas, ${n.bucket} planes, ${n.note} cartas`);
        onDone && onDone(n);
      } catch (ex) { st('No se pudo importar: ' + (ex.message || ex)); }
    });
  });
}
