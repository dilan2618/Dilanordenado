// =====================================================================
// Utilidades de interfaz
// =====================================================================
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  message: '<path d="M4 5h16v11H8l-4 4z"/>',
  wave: '<path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0"/><path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0" opacity=".5"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-6.5 0-4-3-6.5-4-10.5-2 2-3 4-3 6-1-1-2-2-2.5-4C7 9 5 12 5 15.5 5 19.3 8 22 12 22z"/>',
  anchor: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M8 11h8"/>',
  leaf: '<path d="M5 21c0-9 5-15 15-16-1 10-7 15-15 16z"/><path d="M5 21 13 13"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  feather: '<path d="M20 4c-8 0-14 6-14 14v2h2c8 0 14-6 14-14z"/><path d="M4 20 14 10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.5-2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.2 7.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h0a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
  pact: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 12l2.5 2.5L16 9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  back: '<path d="M15 5 8 12l7 7"/>', chev: '<path d="m9 6 6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>', upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  scale: '<path d="M12 4v16M5 20h14M5 8l-3 7h6zM19 8l-3 7h6zM5 8h14"/>',
};
export const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.sparkle}</svg>`;

// ---------- vigencia de la vista (evita pintar en una vista que ya se dejó) ----------
export const viewGen = () => { const g = window.__osGen; return () => g === window.__osGen; };

// ---------- fechas ----------
export const parseD = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
export const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayStr = () => toStr(today0());
export const fmtD = (s, o = { day: 'numeric', month: 'long', year: 'numeric' }) => { const d = parseD(s); return d ? d.toLocaleDateString('es', o) : ''; };
export const fmtDT = (s) => new Date(s).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const ago = (s) => {
  const m = Math.round((Date.now() - new Date(s)) / 60000);
  if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); if (d < 30) return `hace ${d} día${d > 1 ? 's' : ''}`; return fmtD(String(s).slice(0, 10), { day: 'numeric', month: 'short' });
};
export const daysBetween = (a, b) => Math.round((b - a) / 864e5);
export const nextYearly = (s) => { const d = parseD(s), t = today0(); let n = new Date(t.getFullYear(), d.getMonth(), d.getDate()); if (n < t) n = new Date(t.getFullYear() + 1, d.getMonth(), d.getDate()); return n; };
export function together(start) {
  const s = parseD(start); if (!s) return null; const n = today0();
  let y = n.getFullYear() - s.getFullYear(), m = n.getMonth() - s.getMonth(), d = n.getDate() - s.getDate();
  if (d < 0) { m--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; }
  return { y, m, d, total: daysBetween(s, n) };
}
export const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

// ---------- avatar ----------
export const initials = (n) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
export const avatar = (m, cls = '') => `<span class="av ${cls}">${m?.avatar_url ? `<img src="${esc(m.avatar_url)}" alt=""/>` : esc(initials(m?.display_name))}</span>`;

// ---------- markdown ligero (seguro) ----------
export function md(text) {
  const lines = esc(text || '').split(/\n/);
  let html = '', list = null;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^[-•*]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else if (!l) { close(); }
    else if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); html += `<p><strong>${inline(m[1])}</strong></p>`; }
    else { close(); html += `<p>${inline(l)}</p>`; }
  }
  close();
  return html;
}

// ---------- toast ----------
let tt;
export function toast(msg) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- sheet (modal) ----------
export function sheet(html, onMount) {
  let bg = $('#sheet');
  if (!bg) {
    bg = document.createElement('div'); bg.id = 'sheet'; bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body"></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', (e) => { if (e.target === bg && !bg.dataset.lock) closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bg.classList.contains('open') && !bg.dataset.lock) closeSheet(); });
  }
  const body = $('.sheet-body', bg); body.innerHTML = html; $('.sheet', bg).scrollTop = 0;
  requestAnimationFrame(() => bg.classList.add('open'));
  body.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));
  onMount && onMount(body);
  return body;
}
export function closeSheet() { const bg = $('#sheet'); if (bg) bg.classList.remove('open'); }

export function confirmSheet({ title, text, ok = 'Confirmar', danger = false }) {
  return new Promise((res) => {
    sheet(`<h2>${esc(title)}</h2><p class="muted" style="margin-top:6px">${esc(text)}</p>
      <div class="actions"><button class="btn ghost" id="cNo">Cancelar</button><button class="btn ${danger ? 'danger' : ''}" id="cYes">${esc(ok)}</button></div>`, (b) => {
      $('#cNo', b).onclick = () => { closeSheet(); res(false); };
      $('#cYes', b).onclick = () => { closeSheet(); res(true); };
    });
  });
}

// ---------- botones con estado de carga ----------
export async function busy(btn, fn) {
  if (!btn) return fn();
  const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

// ---------- imágenes ----------
export function compressImage(file, max = 1600, q = 0.82) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        let { width: w, height: h } = im; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
        c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', q);
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
export function dataUrlToBlob(u) {
  const [h, b] = u.split(','); const mime = h.match(/:(.*?);/)[1]; const bin = atob(b); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime });
}

export const friendlyError = (e) => {
  const m = String(e?.message || e || '');
  const map = {
    invalid_code: 'Ese código de invitación no existe.', space_full: 'Ese espacio ya tiene dos integrantes.', already_in_space: 'Ya perteneces a un espacio.',
    name_required: 'Escribe tu nombre.', 'Invalid login credentials': 'Correo o contraseña incorrectos.', 'Email not confirmed': 'Confirma tu correo antes de entrar (revisa tu bandeja).',
    'User already registered': 'Ese correo ya tiene cuenta. Inicia sesión.', 'Failed to fetch': 'No hay conexión. Revisa tu internet.',
  };
  for (const k in map) if (m.includes(k)) return map[k];
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un momento.';
  return m || 'Algo salió mal. Intenta de nuevo.';
};
