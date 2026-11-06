// Estado global de la sesión
import { db } from './db.js';

export const S = {
  session: null, space: null, members: [], me: null, partner: null,
  avatars: {}, ai: null, // ai: {ai:boolean} | {error}
};

export async function loadSpace() {
  const r = await db.mySpace();
  if (!r) { S.space = null; S.members = []; S.me = S.partner = null; return null; }
  S.space = r.space; S.members = r.members;
  S.me = r.members.find((m) => m.user_id === db.uid) || null;
  S.partner = r.members.find((m) => m.user_id !== db.uid) || null;
  // avatares guardados como rutas privadas de Storage
  const paths = r.members.map((m) => m.avatar_url).filter((p) => p && !p.startsWith('http'));
  if (paths.length) {
    try { const urls = await db.photoUrls(paths); paths.forEach((p, i) => (S.avatars[p] = urls[i])); } catch {}
  }
  return r;
}

export const memberView = (m) => m && ({ ...m, avatar_url: m.avatar_url ? (m.avatar_url.startsWith('http') ? m.avatar_url : S.avatars[m.avatar_url]) : null });
export const nameOf = (id) => S.members.find((m) => m.user_id === id)?.display_name || (id ? 'Tu pareja' : 'Asistente');
export const onboardingDone = () => {
  const p = S.me?.progress || {};
  return !!(p.individual && p.relacion && p.objetivos && p.privacidad);
};
export async function aiStatus(force) {
  if (S.ai?.ai && !force) return S.ai; // si no estaba activo, se vuelve a comprobar siempre
  try { S.ai = await db.fn('status'); } catch { S.ai = { error: 'fn_unreachable' }; }
  return S.ai;
}
