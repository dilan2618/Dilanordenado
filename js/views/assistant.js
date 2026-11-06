// Asistente de acompañamiento: individual, pareja y análisis
import { db } from '../db.js';
import { S, nameOf, aiStatus } from '../store.js';
import { $, $$, esc, icon, toast, busy, friendlyError, ago, md, sheet, closeSheet, confirmSheet } from '../ui.js';
import { MEM_KINDS } from '../content.js';
import { go } from '../app.js';
import { riskText } from '../safety.js';

const MODE = {
  individual: { label: 'A solas', icon: 'user', desc: 'Privado: solo tú ves esta conversación.', intro: 'Este es tu espacio privado. Puedes contar lo que te molesta, lo que sientes o lo que no sabes cómo decir. Te ayudaré a ordenarlo, sin juzgar a nadie.' },
  pareja: { label: 'En pareja', icon: 'users', desc: 'Compartida: ambos leen y escriben aquí.', intro: 'Esta conversación es de los dos. Escriban por turnos; cuando quieran ayuda, usen “Pedir guía” y el asistente resumirá ambas perspectivas y propondrá cómo avanzar.' },
  analisis: { label: 'Analizar', icon: 'scale', desc: 'Privado: análisis estructurado de una situación.', intro: 'Describe la situación: qué pasó, qué pensaste, qué sentiste y qué necesitas. La analizaré separando hechos, interpretaciones, emociones, necesidades e hipótesis.' },
};

export default async function (el, params) {
  const sid = S.space.id;
  const ai = await aiStatus();
  if (params[0]) return chatView(params[0]);

  const chats = await db.chats.list(sid);
  el.innerHTML = `<div class="page">
    <div class="page-head"><span class="eyebrow">Asistente de acompañamiento</span><h1>Un facilitador, no un juez</h1>
      <p>Te escucha, hace preguntas y ayuda a comprender ambas perspectivas. Nunca le da la razón automáticamente a quien escribe.</p></div>
    ${!ai?.ai ? `<div class="notice" style="margin-bottom:16px">${icon('info')}<p><b>El asistente aún no está activado.</b> Falta configurar la clave de IA en el servidor. Mientras tanto, la conversación en pareja funciona como chat privado entre ustedes dos.</p></div>` : ''}
    <div class="tiles" style="margin-bottom:22px">${Object.entries(MODE).map(([k, m]) => `<button class="tile" data-new="${k}"><span class="ic">${icon(m.icon)}</span><b>${k === 'individual' ? 'Hablar a solas' : k === 'pareja' ? 'Conversación guiada en pareja' : 'Analizar una situación'}</b><span>${m.desc}</span></button>`).join('')}</div>
    <h3 style="margin:0 4px 10px">Conversaciones</h3>
    ${chats.length ? `<div class="card" style="padding:6px 20px"><div class="list">${chats.map((c) => `<a class="item" href="#/asistente/${c.id}">
      <span class="ic">${icon(MODE[c.mode].icon)}</span><div class="grow"><b>${esc(c.title)}</b><p class="tiny muted">${MODE[c.mode].label} · ${ago(c.updated_at)}</p></div>
      ${c.mode !== 'pareja' ? `<span class="badge">${icon('lock')} Privada</span>` : '<span class="badge terra">Compartida</span>'}</a>`).join('')}</div></div>`
    : `<div class="card empty">${icon('chat')}<b>Aún no hay conversaciones</b>Elige una forma de empezar.</div>`}
  </div>`;
  $$('[data-new]', el).forEach((b) => (b.onclick = () => busy(b, async () => {
    const mode = b.dataset.new;
    try {
      const chat = await db.chats.add({ space_id: sid, mode, owner_id: mode === 'pareja' ? null : db.uid, title: mode === 'pareja' ? 'Conversación en pareja' : mode === 'analisis' ? 'Análisis de una situación' : 'Conversación privada' });
      go('asistente/' + chat.id);
    } catch (ex) { toast(friendlyError(ex)); }
  })));

  async function chatView(id) {
    const [chat] = await db.chats.list(sid, (q) => q.eq('id', id));
    if (!chat) { el.innerHTML = '<div class="page"><div class="card empty"><b>Conversación no disponible</b></div></div>'; return; }
    const m = MODE[chat.mode];
    const canAI = !!ai?.ai;
    const memOn = S.me.settings?.memory_enabled !== false;
    const seen = new Set();
    let msgs = await db.messages(id);

    el.innerHTML = `<div class="page narrow" style="padding-bottom:0">
      <div class="row" style="margin-bottom:8px"><a class="icon-btn" href="#/asistente" aria-label="Volver">${icon('back')}</a>
        <div class="grow"><b class="serif" style="font-size:1.15rem;font-weight:500" id="ttl">${esc(chat.title)}</b><p class="tiny muted">${m.desc}</p></div>
        <button class="icon-btn" id="menu" aria-label="Opciones">${icon('settings')}</button></div>
      <div class="chat">
        <div class="chat-log" id="log"></div>
        ${!canAI && chat.mode !== 'pareja' ? `<div class="notice" style="margin-bottom:10px">${icon('info')}<p>El asistente aún no está activado en el servidor. Cuando se configure, podrás conversar aquí.</p></div>` : ''}
        <div id="riskBox"></div>
        <div class="composer"><textarea id="in" rows="1" maxlength="6000" placeholder="${chat.mode === 'pareja' ? 'Escribe tu mensaje…' : 'Escribe lo que necesites…'}" ${!canAI && chat.mode !== 'pareja' ? 'disabled' : ''}></textarea>
          ${chat.mode === 'pareja' ? `<button class="btn soft sm" id="post" title="Enviar sin pedir intervención">Enviar</button>${canAI ? '<button class="btn sm" id="guide">Pedir guía</button>' : ''}`
            : `<button class="btn sm" id="send" ${canAI ? '' : 'disabled'} aria-label="Enviar">${icon('send')}</button>`}</div>
        <p class="tiny muted center" style="margin:8px 0 6px">El asistente puede equivocarse y no reemplaza a un profesional. <a href="#/seguridad" class="muted" style="text-decoration:underline">Recursos de seguridad</a></p>
      </div></div>`;
    const log = $('#log', el), input = $('#in', el);

    const bubble = (x) => {
      if (x.role === 'assistant') {
        const forMe = !x.meta?.for_user || x.meta.for_user === db.uid;
        const sugs = forMe && memOn ? x.meta?.memory_suggestions || [] : [];
        return `<div class="msg ai" data-mid="${x.id}"><span class="who">Asistente</span>${md(x.content)}
          ${x.meta?.risk && forMe ? `<div class="safety" style="margin-top:10px"><b>Tu seguridad es lo primero</b><a class="link" href="#/seguridad">Ver recursos de ayuda →</a></div>` : ''}
          ${sugs.length ? `<div class="mem-sug"><span class="tiny muted">¿Guardar en la memoria? Solo si estás de acuerdo:</span>${sugs.map((s, i) => `<button data-sug="${x.id}:${i}">${icon('brain')}<span><b>${s.scope === 'shared' ? 'Compartida' : 'Privada'} · ${esc(MEM_KINDS[s.kind] || s.kind)}</b><br/>${esc(s.content)}</span></button>`).join('')}</div>` : ''}</div>`;
      }
      const me = x.author_id === db.uid;
      return `<div class="msg ${me ? 'me' : 'other'}" data-mid="${x.id}">${chat.mode === 'pareja' ? `<span class="who">${esc(me ? 'Tú' : nameOf(x.author_id))}</span>` : ''}${esc(x.content).replace(/\n/g, '<br/>')}</div>`;
    };
    const paint = () => {
      log.innerHTML = (msgs.length ? '' : `<div class="msg ai"><span class="who">Asistente</span><p>${esc(m.intro)}</p></div>`) + msgs.map(bubble).join('');
      msgs.forEach((x) => seen.add(x.id));
      bindSugs(); log.scrollTop = log.scrollHeight;
    };
    const append = (x) => { if (seen.has(x.id)) return; seen.add(x.id); msgs.push(x); if (msgs.length === 1) return paint(); log.insertAdjacentHTML('beforeend', bubble(x)); bindSugs(); log.scrollTop = log.scrollHeight; };
    const bindSugs = () => $$('[data-sug]', log).forEach((b) => (b.onclick = async () => {
      if (b.classList.contains('saved')) return;
      const [mid, i] = b.dataset.sug.split(':'); const s = msgs.find((x) => x.id === mid)?.meta?.memory_suggestions?.[+i]; if (!s) return;
      try { await db.memories.add({ space_id: sid, owner_id: db.uid, scope: s.scope === 'shared' ? 'shared' : 'private', kind: s.kind, content: s.content, source: 'asistente' }); b.classList.add('saved'); b.querySelector('svg').outerHTML = icon('check'); toast('Guardado en la memoria'); }
      catch (ex) { toast(friendlyError(ex)); }
    }));
    paint();
    const unsub = db.subscribeChat(id, append);

    const typing = () => { log.insertAdjacentHTML('beforeend', '<div class="msg ai" id="typing"><span class="typing"><i></i><i></i><i></i></span></div>'); log.scrollTop = log.scrollHeight; };
    const untype = () => $('#typing', el)?.remove();
    input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; $('#riskBox', el).innerHTML = riskText(input.value) ? `<div class="safety" style="margin-bottom:10px"><b>Tu seguridad es lo primero</b><p>Si estás en riesgo, busca ayuda inmediata.${chat.mode === 'pareja' ? ' Esta conversación la ve tu pareja: considera usar una conversación privada.' : ''}</p><a class="link" href="#/seguridad">Ver recursos →</a></div>` : ''; };

    async function ask(text, guide) {
      typing();
      const r = await db.fn('chat', { space_id: sid, chat_id: id, message: text, guide_only: guide && !text });
      untype();
      if (r?.message) append(r.message);
      else if (r?.error === 'ai_not_configured') toast('El asistente aún no está activado');
      else if (r?.error) toast(r.error === 'fn_unreachable' ? 'No se pudo contactar al asistente' : 'El asistente no pudo responder. Intenta de nuevo.');
      msgs = await db.messages(id); paint();
    }
    const send = $('#send', el);
    if (send) {
      send.onclick = () => { const t = input.value.trim(); if (!t) return; input.value = ''; input.oninput(); append({ id: 'tmp' + Date.now(), role: 'user', author_id: db.uid, content: t }); busy(send, () => ask(t)); };
      input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 720) { e.preventDefault(); send.click(); } };
    }
    const post = $('#post', el);
    if (post) post.onclick = () => busy(post, async () => {
      const t = input.value.trim(); if (!t) return; input.value = ''; input.oninput();
      try { append(await db.postMessage(id, sid, t)); await db.chats.upd(id, { title: chat.title }); } catch (ex) { toast(friendlyError(ex)); }
    });
    const guide = $('#guide', el);
    if (guide) guide.onclick = () => busy(guide, async () => {
      const t = input.value.trim(); input.value = ''; input.oninput();
      if (!t && !msgs.some((x) => x.role === 'user')) return toast('Escriban algo primero');
      if (t) append({ id: 'tmp' + Date.now(), role: 'user', author_id: db.uid, content: t });
      await ask(t, true);
    });

    $('#menu', el).onclick = () => sheet(`<h2>Conversación</h2><div class="field" style="margin-top:12px"><label>Nombre</label><input class="input" id="nt" maxlength="80" value="${esc(chat.title)}"/></div>
      <div class="actions"><button class="btn ghost" id="del">${icon('trash')} Borrar</button><button class="btn" id="save">Guardar</button></div>`, (b) => {
      $('#save', b).onclick = async () => { const t = $('#nt', b).value.trim(); if (t) { chat.title = t; await db.chats.upd(id, { title: t }); $('#ttl', el).textContent = t; } closeSheet(); };
      $('#del', b).onclick = async () => { closeSheet(); if (await confirmSheet({ title: '¿Borrar la conversación?', text: chat.mode === 'pareja' ? 'Se borrará para ambos.' : 'Se borrará de forma permanente.', ok: 'Borrar', danger: true })) { await db.chats.del(id); go('asistente'); } };
    });
    return () => unsub();
  }
}
