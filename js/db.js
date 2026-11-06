// =====================================================================
// Capa de datos (Supabase). Toda la app pasa por aquí.
// =====================================================================
import { SUPABASE_URL, SUPABASE_KEY, ASSISTANT_FN } from './config.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
const ok = ({ data, error }) => { if (error) throw error; return data; };
let uid = null;

const table = (name, order = ['created_at', false]) => ({
  list: (space, q = (x) => x) => q(sb.from(name).select('*').eq('space_id', space).order(order[0], { ascending: order[1] })).then(ok),
  add: (row) => sb.from(name).insert(row).select().single().then(ok),
  upd: (id, patch) => sb.from(name).update(patch).eq('id', id).select().single().then(ok),
  del: (id) => sb.from(name).delete().eq('id', id).then(ok),
});

const signedCache = new Map();

export const db = {
  sb,
  get uid() { return uid; },

  // ---------------- auth ----------------
  async session() { const { data } = await sb.auth.getSession(); uid = data.session?.user?.id || null; return data.session; },
  onAuth(cb) { return sb.auth.onAuthStateChange((ev, s) => { uid = s?.user?.id || null; cb(ev, s); }); },
  signUp: (email, password) => sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }).then(ok),
  signIn: (email, password) => sb.auth.signInWithPassword({ email, password }).then(ok),
  signOut: () => sb.auth.signOut(),
  resetPassword: (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#/nueva-clave' }).then(ok),
  updatePassword: (password) => sb.auth.updateUser({ password }).then(ok),
  async user() { const { data } = await sb.auth.getUser(); return data.user; },

  // ---------------- espacio ----------------
  async mySpace() {
    const m = await sb.from('os_members').select('space_id').eq('user_id', uid).maybeSingle().then(ok);
    if (!m) return null;
    const [space, members] = await Promise.all([
      sb.from('os_spaces').select('*').eq('id', m.space_id).single().then(ok),
      sb.from('os_members').select('*').eq('space_id', m.space_id).order('joined_at').then(ok),
    ]);
    return { space, members };
  },
  createSpace: (a) => sb.rpc('os_create_space', { p_display_name: a.name, p_name: a.spaceName || null, p_relationship_type: a.type, p_start_date: a.start || null, p_age: a.age || null }).then(ok),
  joinSpace: (code, name, age) => sb.rpc('os_join_space', { p_code: code, p_display_name: name, p_age: age || null }).then(ok),
  updateSpace: (id, patch) => sb.from('os_spaces').update(patch).eq('id', id).select().single().then(ok),
  updateMe: (space, patch) => sb.from('os_members').update(patch).eq('space_id', space).eq('user_id', uid).select().single().then(ok),
  leaveSpace: (space) => sb.rpc('os_leave_space', { p_space: space }).then(ok),

  // ---------------- cuestionarios ----------------
  myAnswers: (space) => sb.from('os_answers').select('*').eq('space_id', space).eq('user_id', uid).then(ok),
  partnerAnswers: (space, partner) => sb.from('os_answers').select('*').eq('space_id', space).eq('user_id', partner).then(ok), // RLS: solo compartidas
  saveAnswer: (space, q, value, shared = false) => sb.from('os_answers').upsert({ space_id: space, user_id: uid, qkey: q.key, section: q.section, qtype: q.type, value, shared }, { onConflict: 'space_id,user_id,qkey' }).then(ok),
  shareSection: (space, section, shared) => sb.from('os_answers').update({ shared }).eq('space_id', space).eq('user_id', uid).eq('section', section).then(ok),
  deleteMyAnswers: (space) => sb.from('os_answers').delete().eq('space_id', space).eq('user_id', uid).then(ok),
  goals: (space) => sb.from('os_goals').select('*').eq('space_id', space).then(ok),
  async setMyGoals(space, keys) {
    await sb.from('os_goals').delete().eq('space_id', space).eq('user_id', uid).then(ok);
    if (keys.length) await sb.from('os_goals').insert(keys.map((goal) => ({ space_id: space, user_id: uid, goal }))).then(ok);
  },
  profileInputs: (space) => sb.rpc('os_profile_inputs', { p_space: space }).then(ok),

  // ---------------- conexión ----------------
  checkins: (space) => sb.from('os_checkins').select('*').eq('space_id', space).order('created_at', { ascending: false }).limit(30).then(ok),
  addCheckin: (space, mood, note, shared) => sb.from('os_checkins').insert({ space_id: space, user_id: uid, mood, note: note || null, shared }).select().single().then(ok),

  topics: table('os_topics'),
  agreements: table('os_agreements'),
  dates: table('os_dates', ['date', true]),
  plans: table('os_plans', ['created_at', true]),
  journal: table('os_journal', ['entry_date', false]),
  conflicts: table('os_conflicts', ['updated_at', false]),
  memories: table('os_memories', ['updated_at', false]),
  activities: table('os_activity_log'),
  chats: table('os_chats', ['updated_at', false]),
  openLetter: (id) => sb.rpc('os_open_letter', { p_id: id }).then(ok),

  // ---------------- conflictos ----------------
  versions: (cid) => sb.from('os_conflict_versions').select('*').eq('conflict_id', cid).then(ok),
  saveVersion: (cid, space, patch) => sb.from('os_conflict_versions').upsert({ conflict_id: cid, space_id: space, user_id: uid, ...patch }, { onConflict: 'conflict_id,user_id' }).select().single().then(ok),
  conflictStatus: (cid) => sb.rpc('os_conflict_status', { p_conflict: cid }).then(ok),

  // ---------------- asistente ----------------
  messages: (chat) => sb.from('os_messages').select('*').eq('chat_id', chat).order('created_at').limit(300).then(ok),
  postMessage: (chat, space, content) => sb.from('os_messages').insert({ chat_id: chat, space_id: space, author_id: uid, role: 'user', content }).select().single().then(ok),
  async fn(action, body = {}) {
    const { data, error } = await sb.functions.invoke(ASSISTANT_FN, { body: { action, ...body } });
    if (error) {
      let detail = null; try { detail = await error.context?.json?.(); } catch {}
      if (detail?.error) return detail;
      return { error: 'fn_unreachable', detail: String(error.message || error) };
    }
    return data;
  },

  // ---------------- fotos (Storage privado) ----------------
  async uploadPhoto(space, blob, isPrivate) {
    const path = `${space}/${isPrivate ? uid : 'shared'}/${crypto.randomUUID()}.jpg`;
    await sb.storage.from('os-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(ok);
    return path;
  },
  async photoUrls(paths) {
    const need = paths.filter((p) => !signedCache.has(p));
    if (need.length) {
      const data = await sb.storage.from('os-photos').createSignedUrls(need, 3600).then(ok);
      for (const d of data || []) if (d.signedUrl) signedCache.set(d.path, d.signedUrl);
    }
    return paths.map((p) => signedCache.get(p)).filter(Boolean);
  },
  async ensurePhotoScope(path, space, isPrivate) {
    const want = `${space}/${isPrivate ? uid : 'shared'}/`;
    if (path.startsWith(want)) return path;
    const np = want + path.split('/').pop();
    await sb.storage.from('os-photos').move(path, np).then(ok);
    signedCache.delete(path);
    return np;
  },
  removePhotos: (paths) => (paths.length ? sb.storage.from('os-photos').remove(paths) : Promise.resolve()),

  // ---------------- tiempo real ----------------
  subscribe(space, onChange) {
    const tables = ['os_journal', 'os_topics', 'os_agreements', 'os_checkins', 'os_conflicts', 'os_members', 'os_plans', 'os_dates', 'os_spaces'];
    let ch = sb.channel('os-space-' + space);
    for (const t of tables) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: t === 'os_spaces' ? `id=eq.${space}` : `space_id=eq.${space}` }, (p) => onChange(t, p));
    ch.subscribe();
    return () => sb.removeChannel(ch);
  },
  subscribeChat(chat, onMsg) {
    const ch = sb.channel('os-chat-' + chat).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'os_messages', filter: `chat_id=eq.${chat}` }, (p) => onMsg(p.new)).subscribe();
    return () => sb.removeChannel(ch);
  },

  // ---------------- Nuestro Rincón (importación) ----------------
  async nr(fn, args) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, body: JSON.stringify(args) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch {} throw new Error(m || 'HTTP ' + r.status); }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  },
};
