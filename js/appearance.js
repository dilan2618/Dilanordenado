// =====================================================================
// Apariencia personalizable (por persona; se guarda en su cuenta)
// =====================================================================
export const THEMES = {
  vino:    { name: 'Vino y crema', dark: false, v: { cream: '#f6f0e6', cream2: '#efe6d8', beige: '#e6d9c5', white: '#fcfaf6', wine: '#5a1e2c', wine2: '#74303f', wineSoft: '#f1e3e3', terra: '#b8613f', terraSoft: '#f5e3d9', ink: '#2b2321', ink2: '#5e5450', gray: '#8b8178', gray2: '#b9afa5', line: '#e5dbcd' } },
  rosa:    { name: 'Rosa suave', dark: false, v: { cream: '#fbf1f2', cream2: '#f6e4e7', beige: '#eed3d8', white: '#fffafa', wine: '#9c2f55', wine2: '#b8456c', wineSoft: '#f9e1e9', terra: '#d9707f', terraSoft: '#fbe5e8', ink: '#2e2226', ink2: '#634e55', gray: '#94808a', gray2: '#c4b1b8', line: '#efdbe0' } },
  lavanda: { name: 'Lavanda', dark: false, v: { cream: '#f5f2fa', cream2: '#ece6f5', beige: '#ddd3ec', white: '#fcfbfe', wine: '#4f3a7a', wine2: '#664f94', wineSoft: '#ebe4f6', terra: '#9b72c9', terraSoft: '#efe6f8', ink: '#25212e', ink2: '#57506a', gray: '#8a8199', gray2: '#b8b0c6', line: '#e2dbee' } },
  salvia:  { name: 'Salvia', dark: false, v: { cream: '#f2f4ee', cream2: '#e6ebdf', beige: '#d5ddc9', white: '#fbfcf9', wine: '#2f5240', wine2: '#3f6a53', wineSoft: '#e1ece4', terra: '#7d9a5e', terraSoft: '#e8efdd', ink: '#1f2a22', ink2: '#4e5c52', gray: '#7f8a80', gray2: '#adb8ad', line: '#dde4d6' } },
  oceano:  { name: 'Océano', dark: false, v: { cream: '#eef4f6', cream2: '#e0ebef', beige: '#cbdde3', white: '#fafcfd', wine: '#1f4e63', wine2: '#2b6680', wineSoft: '#dcebf1', terra: '#3f8fa8', terraSoft: '#dceff4', ink: '#1b2a30', ink2: '#4a5d65', gray: '#7a8d95', gray2: '#a9bbc2', line: '#d6e3e8' } },
  atardecer: { name: 'Atardecer', dark: false, v: { cream: '#fbf2ea', cream2: '#f6e5d6', beige: '#efd2bb', white: '#fffaf6', wine: '#8a3b1e', wine2: '#a54d2b', wineSoft: '#f8e2d6', terra: '#e08a3c', terraSoft: '#fbe8d6', ink: '#2e2119', ink2: '#634f43', gray: '#957f70', gray2: '#c5b0a1', line: '#f0dccb' } },
  noche:   { name: 'Noche', dark: true, v: { cream: '#17131a', cream2: '#221c26', beige: '#2d2531', white: '#1e1822', wine: '#e7a1b4', wine2: '#f0b6c5', wineSoft: '#3a2633', terra: '#e8a37c', terraSoft: '#3a2a22', ink: '#f2ebef', ink2: '#cbbec6', gray: '#9a8c95', gray2: '#6e636a', line: '#332a36' } },
};
export const SIZES = { normal: 15.5, grande: 17, extra: 18.5 };
export const DEFAULTS = { theme: 'vino', size: 'normal', type: 'elegante', hero: 'degradado', emojis: true, motion: true, nickname: '', cover: '' };

export const MOOD_EMOJI = { calma: '🌿', cercania: '🤗', gratitud: '🙏', ganas: '✨', cansancio: '😴', distancia: '🌫️', preocupacion: '😟', hablar: '💬', espacio: '🫧' };

export const getAppearance = (settings) => ({ ...DEFAULTS, ...(settings?.appearance || {}) });

export function applyAppearance(a) {
  a = { ...DEFAULTS, ...(a || {}) };
  const t = THEMES[a.theme] || THEMES.vino, r = document.documentElement, v = t.v;
  const map = { '--cream': v.cream, '--cream-2': v.cream2, '--beige': v.beige, '--white': v.white, '--wine': v.wine, '--wine-2': v.wine2, '--wine-soft': v.wineSoft,
    '--terra': v.terra, '--terra-soft': v.terraSoft, '--ink': v.ink, '--ink-2': v.ink2, '--gray': v.gray, '--gray-2': v.gray2, '--line': v.line };
  for (const k in map) r.style.setProperty(k, map[k]);
  r.style.setProperty('--on-accent', t.dark ? '#1b1418' : '#fbf7f2');
  r.style.fontSize = (SIZES[a.size] || SIZES.normal) + 'px';
  r.dataset.dark = t.dark ? '1' : '';
  r.dataset.type = a.type;
  r.dataset.motion = a.motion ? '' : 'off';
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = v.cream;
  try { localStorage.setItem('os_appearance', JSON.stringify(a)); } catch {}
}

// aplicar lo último usado antes de cargar datos (evita el parpadeo)
try { const c = localStorage.getItem('os_appearance'); if (c) applyAppearance(JSON.parse(c)); } catch {}
