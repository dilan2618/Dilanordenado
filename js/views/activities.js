// Actividades para conectar, ordenadas según objetivos y perfil
import { db } from '../db.js';
import { S, aiStatus, nameOf } from '../store.js';
import { viewGen, $, $$, esc, icon, sheet, closeSheet, toast, busy, friendlyError, ago } from '../ui.js';
import { ACTIVITIES, GOALS } from '../content.js';

const TYPES = { preguntas: 'Conocerse', conversacion: 'Conversaciones profundas', gratitud: 'Gratitud', escucha: 'Escucha activa', reconexion: 'Reconexión', futuro: 'Futuro', necesidades: 'Expresar necesidades' };
const TAGWHY = { ritmo: 'tienen ritmos distintos para resolver problemas', afecto: 'expresan y reciben el cariño de formas distintas', iniciativa: 'la iniciativa pesa distinto para cada uno', espacio: 'necesitan cantidades distintas de espacio', escucha: 'alguien no siempre se siente escuchado', persecucion: 'al discutir, uno podría buscar y el otro alejarse', intimidad: 'el contacto físico tiene un peso distinto para cada uno' };

export default async function (el) {
  const sid = S.space.id;
  let type = 'todas';
  const alive = viewGen();

  async function draw() {
    const [goals, log, ai] = await Promise.all([db.goals(sid), db.activities.list(sid), aiStatus()]);
    if (!alive()) return;
    const g = [...new Set(goals.map((x) => x.goal))];
    const tags = S.space.profile?.tags || [];
    const done = new Set(log.filter((l) => l.status === 'hecha').map((l) => l.activity_key));
    const scored = ACTIVITIES.map((a) => {
      const gHits = a.tags.filter((t) => g.includes(t)), pHits = a.tags.filter((t) => tags.includes(t) && TAGWHY[t]);
      return { a, score: gHits.length * 2 + pHits.length * 3 - (done.has(a.key) ? 10 : 0), gHits, pHits };
    }).sort((x, y) => y.score - x.score);
    const top = scored.filter((x) => x.score > 0).slice(0, 3);
    const aiSug = log.filter((l) => l.activity_key === 'ia' && l.status !== 'hecha').slice(0, 3);
    const history = log.filter((l) => l.status === 'hecha');
    const reason = (x) => x.pHits.length ? `Porque ${TAGWHY[x.pHits[0]]}.` : x.gHits.length ? `Porque eligieron: ${GOALS.find((gg) => gg.key === x.gHits[0])?.label.toLowerCase()}.` : '';
    const card = (a, why) => `<button class="tile" data-act="${a.key}"><span class="badge terra" style="align-self:flex-start">${esc(TYPES[a.type] || a.type)}</span>
      <b style="font-size:1.02rem;margin-top:6px">${esc(a.title)}</b><span>${esc(why || a.why)}</span><span class="tiny" style="margin-top:4px">${icon('clock', 'sr')}${esc(a.duration)}${done.has(a.key) ? ' · ya la hicieron' : ''}</span></button>`;

    el.innerHTML = `<div class="page">
      <div class="page-head"><span class="eyebrow">Actividades para conectar</span><h1>Pensadas para ustedes</h1>
        <p>Se ordenan según sus objetivos y lo que muestra su perfil. No son tareas: son invitaciones.</p></div>
      ${top.length ? `<h3 style="margin:0 4px 10px">Para ustedes ahora</h3><div class="tiles" style="margin-bottom:24px">${top.map((x) => card(x.a, reason(x))).join('')}</div>` : ''}
      <section class="card" style="margin-bottom:24px">
        <div class="card-head"><h3>Sugeridas por el asistente</h3>${ai?.ai ? `<button class="btn sm ghost" id="gen">${icon('sparkle')} Proponer nuevas</button>` : ''}</div>
        ${aiSug.length ? `<div class="tiles">${aiSug.map((l) => `<button class="tile" data-log="${l.id}"><span class="badge wine" style="align-self:flex-start">${esc(TYPES[l.payload?.tipo] || 'Personalizada')}</span><b style="margin-top:6px">${esc(l.title)}</b><span>${esc(l.payload?.por_que || '')}</span></button>`).join('')}</div>`
          : `<p class="muted small">${ai?.ai ? 'El asistente puede proponer actividades a partir de sus objetivos, acuerdos y temas pendientes.' : 'Disponible cuando se active el asistente.'}</p>`}
      </section>
      <div class="row between wrap" style="margin-bottom:10px"><h3 style="margin:0 4px">Biblioteca</h3></div>
      <div class="chips" style="margin-bottom:14px">${[['todas', 'Todas'], ...Object.entries(TYPES)].map(([k, l]) => `<button class="chip ${type === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div class="tiles">${scored.filter((x) => type === 'todas' || x.a.type === type).map((x) => card(x.a)).join('')}</div>
      ${history.length ? `<section class="card" style="margin-top:24px"><div class="card-head"><h3>Lo que ya hicieron</h3></div><div class="list">${history.map((h) => `<div class="item"><span class="ic">${icon('check')}</span><div class="grow"><b>${esc(h.title)}</b>
        <p class="tiny muted">${ago(h.done_at || h.created_at)} · ${esc(nameOf(h.created_by))}</p>${h.reflection ? `<p class="small" style="margin-top:4px">“${esc(h.reflection)}”</p>` : ''}</div></div>`).join('')}</div></section>` : ''}
    </div>`;
    $$('[data-t]', el).forEach((b) => (b.onclick = () => { type = b.dataset.t; draw(); }));
    $$('[data-act]', el).forEach((b) => (b.onclick = () => detail(ACTIVITIES.find((a) => a.key === b.dataset.act))));
    $$('[data-log]', el).forEach((b) => (b.onclick = () => { const l = log.find((x) => x.id === b.dataset.log); const p = l.payload || {};
      detail({ key: 'ia', title: l.title, type: p.tipo, duration: p.duracion || '', why: p.por_que || '', steps: p.pasos || [], questions: p.preguntas || [] }, l); }));
    const gen = $('#gen', el);
    if (gen) gen.onclick = () => busy(gen, async () => {
      const r = await db.fn('activities', { space_id: sid });
      if (r?.activities?.length) { toast('Nuevas actividades propuestas'); draw(); } else toast(r?.error === 'ai_not_configured' ? 'El asistente aún no está activado' : 'No se pudieron generar');
    });
  }

  function detail(a, logRow) {
    sheet(`<span class="badge terra">${esc(TYPES[a.type] || 'Actividad')}</span><h2 style="margin-top:10px">${esc(a.title)}</h2>
      <p class="tiny muted">${esc(a.duration || '')}</p>
      ${a.why ? `<p style="margin:12px 0">${esc(a.why)}</p>` : ''}
      ${a.steps?.length ? `<div class="an-sec"><h4>Cómo hacerlo</h4><ol style="padding-left:20px;display:flex;flex-direction:column;gap:6px">${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${a.questions?.length ? `<div class="an-sec"><h4>Preguntas</h4><ul>${a.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>` : ''}
      <div class="field" style="margin-top:14px"><label>Después: ¿qué se llevan? <span class="muted">(opcional, lo verán ambos)</span></label><textarea class="textarea" id="rf" maxlength="800" style="min-height:70px"></textarea></div>
      <div class="actions"><button class="btn ghost" data-close>Cerrar</button><button class="btn" id="done">${icon('check')} La hicimos</button></div>`, (b) => {
      $('#done', b).onclick = (e) => busy(e.currentTarget, async () => {
        try {
          const row = { status: 'hecha', reflection: $('#rf', b).value.trim() || null, done_at: new Date().toISOString() };
          if (logRow) await db.activities.upd(logRow.id, row);
          else await db.activities.add({ space_id: sid, created_by: db.uid, activity_key: a.key, title: a.title, payload: { type: a.type }, ...row });
          closeSheet(); toast('Registrado'); draw();
        } catch (ex) { toast(friendlyError(ex)); }
      });
    });
  }

  await draw();
}
