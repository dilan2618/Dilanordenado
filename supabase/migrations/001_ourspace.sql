-- =====================================================================
-- OUR SPACE · esquema de base de datos (Supabase / Postgres)
-- Todas las tablas usan prefijo os_ y Row Level Security.
-- Principio: lo individual es privado por defecto; lo compartido solo
-- es visible para los dos integrantes del espacio.
-- =====================================================================

-- ---------- utilidades ----------
create or replace function public.os_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- perfiles de usuario ----------
create table if not exists public.os_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- espacios (una relación) ----------
create table if not exists public.os_spaces(
  id uuid primary key default gen_random_uuid(),
  name text,
  relationship_type text,
  start_date date,
  invite_code text unique,
  created_by uuid references auth.users(id) on delete set null,
  profile jsonb,
  profile_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_spaces_touch before update on public.os_spaces for each row execute function public.os_touch();

create table if not exists public.os_members(
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  age int check (age is null or age between 14 and 120),
  avatar_url text,
  progress jsonb not null default '{}'::jsonb,          -- {individual:true, relacion:true, objetivos:true}
  settings jsonb not null default '{"profile_consent":false,"ai_use_answers":false,"memory_enabled":true}'::jsonb,
  joined_at timestamptz not null default now(),
  primary key(space_id,user_id)
);
create index if not exists os_members_user on public.os_members(user_id);

create or replace function public.os_is_member(p_space uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from os_members where space_id = p_space and user_id = auth.uid());
$$;

-- ---------- respuestas de cuestionarios (privadas por defecto) ----------
create table if not exists public.os_answers(
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qkey text not null,
  section text not null,
  qtype text not null default 'text' check (qtype in ('text','single','multi','scale')),
  value jsonb,
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(space_id,user_id,qkey)
);
create trigger os_answers_touch before update on public.os_answers for each row execute function public.os_touch();

create table if not exists public.os_goals(
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  created_at timestamptz not null default now(),
  primary key(space_id,user_id,goal)
);

-- ---------- estado de conexión ----------
create table if not exists public.os_checkins(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  note text,
  shared boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists os_checkins_space on public.os_checkins(space_id, created_at desc);

-- ---------- conversaciones pendientes ----------
create table if not exists public.os_topics(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  detail text,
  kind text not null default 'tema' check (kind in ('tema','asunto','acuerdo')),
  status text not null default 'pendiente' check (status in ('pendiente','hablando','resuelto')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_topics_touch before update on public.os_topics for each row execute function public.os_touch();

-- ---------- acuerdos ----------
create table if not exists public.os_agreements(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  reason text,
  commitments jsonb not null default '{}'::jsonb,       -- {user_id: "compromiso"}
  involved uuid[] not null default '{}',
  accepted_by uuid[] not null default '{}',
  status text not null default 'propuesto' check (status in ('propuesto','activo','revision','cumplido','ajustar','pausado')),
  review_date date,
  reviews jsonb not null default '[]'::jsonb,           -- [{by, at, text}] reflexiones, nunca puntuaciones
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_agreements_touch before update on public.os_agreements for each row execute function public.os_touch();

-- ---------- diario ----------
create table if not exists public.os_journal(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'momento' check (kind in ('momento','recuerdo','experiencia','pensamiento','gratitud','superado','carta')),
  title text,
  body text,
  entry_date date not null default current_date,
  place text,
  photos text[] not null default '{}',
  visibility text not null default 'shared' check (visibility in ('private','shared')),
  open_when text,
  opened_at timestamptz,
  favorite boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists os_journal_space on public.os_journal(space_id, entry_date desc);
create trigger os_journal_touch before update on public.os_journal for each row execute function public.os_touch();

create table if not exists public.os_dates(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  date date not null,
  emoji text,
  yearly boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.os_plans(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  text text not null,
  done boolean not null default false,
  done_at date,
  created_at timestamptz not null default now()
);

-- ---------- conflictos ----------
create table if not exists public.os_conflicts(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'abierto' check (status in ('abierto','analizado','resuelto')),
  analysis jsonb,
  analysis_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_conflicts_touch before update on public.os_conflicts for each row execute function public.os_touch();

create table if not exists public.os_conflict_versions(
  conflict_id uuid not null references public.os_conflicts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  what_happened text,
  interpretation text,
  feelings text,
  needs text,
  wish text,
  allow_analysis boolean not null default false,
  shared boolean not null default false,
  submitted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(conflict_id,user_id)
);
create trigger os_conflict_versions_touch before update on public.os_conflict_versions for each row execute function public.os_touch();

-- ---------- asistente ----------
create table if not exists public.os_chats(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,   -- null solo en modo pareja
  mode text not null check (mode in ('individual','pareja','analisis')),
  title text not null default 'Conversación',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_chats_touch before update on public.os_chats for each row execute function public.os_touch();

create or replace function public.os_can_see_chat(p_chat uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from os_chats c join os_members m on m.space_id = c.space_id and m.user_id = auth.uid()
                where c.id = p_chat and (c.mode = 'pareja' or c.owner_id = auth.uid()));
$$;

create table if not exists public.os_messages(
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.os_chats(id) on delete cascade,
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists os_messages_chat on public.os_messages(chat_id, created_at);

-- ---------- memoria contextual (transparente y editable) ----------
create table if not exists public.os_memories(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('private','shared')),
  kind text not null default 'preferencia' check (kind in ('preferencia','tema','objetivo','avance','acuerdo','situacion')),
  content text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger os_memories_touch before update on public.os_memories for each row execute function public.os_touch();

-- ---------- actividades ----------
create table if not exists public.os_activity_log(
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.os_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  activity_key text,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'guardada' check (status in ('sugerida','guardada','hecha')),
  reflection text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.os_profiles enable row level security;
alter table public.os_spaces enable row level security;
alter table public.os_members enable row level security;
alter table public.os_answers enable row level security;
alter table public.os_goals enable row level security;
alter table public.os_checkins enable row level security;
alter table public.os_topics enable row level security;
alter table public.os_agreements enable row level security;
alter table public.os_journal enable row level security;
alter table public.os_dates enable row level security;
alter table public.os_plans enable row level security;
alter table public.os_conflicts enable row level security;
alter table public.os_conflict_versions enable row level security;
alter table public.os_chats enable row level security;
alter table public.os_messages enable row level security;
alter table public.os_memories enable row level security;
alter table public.os_activity_log enable row level security;

revoke all on public.os_profiles, public.os_spaces, public.os_members, public.os_answers, public.os_goals, public.os_checkins,
  public.os_topics, public.os_agreements, public.os_journal, public.os_dates, public.os_plans, public.os_conflicts,
  public.os_conflict_versions, public.os_chats, public.os_messages, public.os_memories, public.os_activity_log from anon;

-- perfiles: cada quien el suyo; los miembros del mismo espacio ven nombre/avatar
create policy os_profiles_sel on public.os_profiles for select to authenticated using (
  user_id = (select auth.uid()) or exists(select 1 from os_members a join os_members b on a.space_id=b.space_id
    where a.user_id=(select auth.uid()) and b.user_id=os_profiles.user_id));
create policy os_profiles_ins on public.os_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy os_profiles_upd on public.os_profiles for update to authenticated using (user_id = (select auth.uid()));

-- espacios: solo miembros (la creación es por RPC)
create policy os_spaces_sel on public.os_spaces for select to authenticated using (public.os_is_member(id));
create policy os_spaces_upd on public.os_spaces for update to authenticated using (public.os_is_member(id));

-- miembros: ver a los miembros del propio espacio; editar solo tu fila
create policy os_members_sel on public.os_members for select to authenticated using (public.os_is_member(space_id));
create policy os_members_upd on public.os_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy os_members_del on public.os_members for delete to authenticated using (user_id = (select auth.uid()));

-- respuestas: propias siempre; de la pareja SOLO si las marcó como compartidas
create policy os_answers_sel on public.os_answers for select to authenticated using (
  user_id = (select auth.uid()) or (shared and public.os_is_member(space_id)));
create policy os_answers_ins on public.os_answers for insert to authenticated with check (user_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_answers_upd on public.os_answers for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy os_answers_del on public.os_answers for delete to authenticated using (user_id = (select auth.uid()));

-- objetivos: visibles para ambos, cada quien gestiona los suyos
create policy os_goals_sel on public.os_goals for select to authenticated using (public.os_is_member(space_id));
create policy os_goals_ins on public.os_goals for insert to authenticated with check (user_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_goals_del on public.os_goals for delete to authenticated using (user_id = (select auth.uid()));

-- check-ins: propios, o compartidos del espacio
create policy os_checkins_sel on public.os_checkins for select to authenticated using (
  user_id = (select auth.uid()) or (shared and public.os_is_member(space_id)));
create policy os_checkins_ins on public.os_checkins for insert to authenticated with check (user_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_checkins_del on public.os_checkins for delete to authenticated using (user_id = (select auth.uid()));

-- contenido compartido de la pareja: temas, acuerdos, fechas, planes, conflictos, actividades
create policy os_topics_all on public.os_topics for all to authenticated using (public.os_is_member(space_id)) with check (public.os_is_member(space_id));
create policy os_agreements_all on public.os_agreements for all to authenticated using (public.os_is_member(space_id)) with check (public.os_is_member(space_id));
create policy os_dates_all on public.os_dates for all to authenticated using (public.os_is_member(space_id)) with check (public.os_is_member(space_id));
create policy os_plans_all on public.os_plans for all to authenticated using (public.os_is_member(space_id)) with check (public.os_is_member(space_id));
create policy os_activity_all on public.os_activity_log for all to authenticated using (public.os_is_member(space_id)) with check (public.os_is_member(space_id));
create policy os_conflicts_sel on public.os_conflicts for select to authenticated using (public.os_is_member(space_id));
create policy os_conflicts_ins on public.os_conflicts for insert to authenticated with check (public.os_is_member(space_id) and created_by = (select auth.uid()));
create policy os_conflicts_upd on public.os_conflicts for update to authenticated using (public.os_is_member(space_id));
create policy os_conflicts_del on public.os_conflicts for delete to authenticated using (created_by = (select auth.uid()));

-- versiones de conflicto: privadas salvo que se compartan
create policy os_cv_sel on public.os_conflict_versions for select to authenticated using (
  user_id = (select auth.uid()) or (shared and public.os_is_member(space_id)));
create policy os_cv_ins on public.os_conflict_versions for insert to authenticated with check (user_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_cv_upd on public.os_conflict_versions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy os_cv_del on public.os_conflict_versions for delete to authenticated using (user_id = (select auth.uid()));

-- diario: privado = solo autor; compartido = ambos. Solo el autor edita/borra.
create policy os_journal_sel on public.os_journal for select to authenticated using (
  author_id = (select auth.uid()) or (visibility = 'shared' and public.os_is_member(space_id)));
create policy os_journal_ins on public.os_journal for insert to authenticated with check (author_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_journal_upd on public.os_journal for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy os_journal_del on public.os_journal for delete to authenticated using (author_id = (select auth.uid()));

-- asistente
create policy os_chats_sel on public.os_chats for select to authenticated using (public.os_can_see_chat(id));
create policy os_chats_ins on public.os_chats for insert to authenticated with check (
  public.os_is_member(space_id) and ((mode = 'pareja' and owner_id is null) or (mode <> 'pareja' and owner_id = (select auth.uid()))));
create policy os_chats_upd on public.os_chats for update to authenticated using (public.os_can_see_chat(id));
create policy os_chats_del on public.os_chats for delete to authenticated using (owner_id = (select auth.uid()) or (mode='pareja' and public.os_is_member(space_id)));
create policy os_messages_sel on public.os_messages for select to authenticated using (public.os_can_see_chat(chat_id));
create policy os_messages_ins on public.os_messages for insert to authenticated with check (
  role = 'user' and author_id = (select auth.uid()) and public.os_can_see_chat(chat_id));

-- memoria: privada = dueño; compartida = ambos
create policy os_mem_sel on public.os_memories for select to authenticated using (
  (scope = 'private' and owner_id = (select auth.uid())) or (scope = 'shared' and public.os_is_member(space_id)));
create policy os_mem_ins on public.os_memories for insert to authenticated with check (
  owner_id = (select auth.uid()) and public.os_is_member(space_id));
create policy os_mem_upd on public.os_memories for update to authenticated using (
  (scope = 'private' and owner_id = (select auth.uid())) or (scope = 'shared' and public.os_is_member(space_id)));
create policy os_mem_del on public.os_memories for delete to authenticated using (
  (scope = 'private' and owner_id = (select auth.uid())) or (scope = 'shared' and public.os_is_member(space_id)));

-- =====================================================================
-- Funciones (RPC)
-- =====================================================================
create or replace function public.os_new_code() returns text language plpgsql set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text := ''; b bytea := extensions.gen_random_bytes(8); i int;
begin
  for i in 0..7 loop c := c || substr(alphabet, (get_byte(b,i) % 31) + 1, 1); end loop;
  return substr(c,1,4) || '-' || substr(c,5,4);
end $$;

create or replace function public.os_create_space(p_display_name text, p_name text, p_relationship_type text, p_start_date date, p_age int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; uid uuid := auth.uid(); code text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_display_name),'') = '' then raise exception 'name_required'; end if;
  if exists(select 1 from os_members where user_id = uid) then raise exception 'already_in_space'; end if;
  loop code := os_new_code(); exit when not exists(select 1 from os_spaces where invite_code = code); end loop;
  insert into os_spaces(name, relationship_type, start_date, invite_code, created_by)
    values (nullif(trim(p_name),''), p_relationship_type, p_start_date, code, uid) returning id into sid;
  insert into os_members(space_id, user_id, display_name, age) values (sid, uid, trim(p_display_name), p_age);
  insert into os_profiles(user_id, display_name) values (uid, trim(p_display_name))
    on conflict (user_id) do update set display_name = excluded.display_name;
  return sid;
end $$;

create or replace function public.os_join_space(p_code text, p_display_name text, p_age int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_display_name),'') = '' then raise exception 'name_required'; end if;
  if exists(select 1 from os_members where user_id = uid) then raise exception 'already_in_space'; end if;
  select id into sid from os_spaces where invite_code = upper(trim(p_code));
  if sid is null then raise exception 'invalid_code'; end if;
  if (select count(*) from os_members where space_id = sid) >= 2 then raise exception 'space_full'; end if;
  insert into os_members(space_id, user_id, display_name, age) values (sid, uid, trim(p_display_name), p_age);
  insert into os_profiles(user_id, display_name) values (uid, trim(p_display_name))
    on conflict (user_id) do update set display_name = excluded.display_name;
  return sid;
end $$;

-- Entradas para el perfil compartido: solo respuestas de opción/escala de quienes dieron su consentimiento.
create or replace function public.os_profile_inputs(p_space uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not os_is_member(p_space) then raise exception 'not_member'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', m.display_name,
      'consent', coalesce((m.settings->>'profile_consent')::boolean,false),
      'answers', case when coalesce((m.settings->>'profile_consent')::boolean,false) then
        coalesce((select jsonb_object_agg(a.qkey, a.value) from os_answers a
                  where a.space_id = p_space and a.user_id = m.user_id and a.qtype in ('single','multi','scale')), '{}'::jsonb)
        else '{}'::jsonb end,
      'goals', coalesce((select jsonb_agg(g.goal) from os_goals g where g.space_id = p_space and g.user_id = m.user_id), '[]'::jsonb)))
    from os_members m where m.space_id = p_space), '[]'::jsonb);
end $$;

-- Estado de las versiones de un conflicto (sin contenido)
create or replace function public.os_conflict_status(p_conflict uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare sid uuid;
begin
  select space_id into sid from os_conflicts where id = p_conflict;
  if sid is null or not os_is_member(sid) then raise exception 'not_member'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'submitted', submitted, 'allow_analysis', allow_analysis, 'shared', shared))
                   from os_conflict_versions where conflict_id = p_conflict), '[]'::jsonb);
end $$;

-- Abrir una carta sellada compartida (la puede abrir cualquiera de los dos)
create or replace function public.os_open_letter(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update os_journal set opened_at = coalesce(opened_at, now())
   where id = p_id and visibility = 'shared' and os_is_member(space_id);
end $$;

-- Borrar mis datos privados del espacio y salir de él
create or replace function public.os_leave_space(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not os_is_member(p_space) then raise exception 'not_member'; end if;
  delete from os_answers where space_id = p_space and user_id = uid;
  delete from os_goals where space_id = p_space and user_id = uid;
  delete from os_checkins where space_id = p_space and user_id = uid;
  delete from os_journal where space_id = p_space and author_id = uid and visibility = 'private';
  delete from os_memories where space_id = p_space and owner_id = uid and scope = 'private';
  delete from os_conflict_versions where space_id = p_space and user_id = uid;
  delete from os_chats where space_id = p_space and owner_id = uid;
  delete from os_members where space_id = p_space and user_id = uid;
  if not exists(select 1 from os_members where space_id = p_space) then delete from os_spaces where id = p_space; end if;
end $$;

revoke all on function public.os_create_space(text,text,text,date,int), public.os_join_space(text,text,int),
  public.os_profile_inputs(uuid), public.os_conflict_status(uuid), public.os_open_letter(uuid), public.os_leave_space(uuid),
  public.os_new_code(), public.os_is_member(uuid), public.os_can_see_chat(uuid) from public, anon;
grant execute on function public.os_create_space(text,text,text,date,int), public.os_join_space(text,text,int),
  public.os_profile_inputs(uuid), public.os_conflict_status(uuid), public.os_open_letter(uuid), public.os_leave_space(uuid),
  public.os_is_member(uuid), public.os_can_see_chat(uuid) to authenticated;

-- =====================================================================
-- Fotos (Storage privado)
-- Ruta: <space_id>/shared/<archivo>  o  <space_id>/<user_id>/<archivo> (privadas)
-- =====================================================================
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('os-photos','os-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create or replace function public.os_storage_ok(p_name text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare parts text[] := storage.foldername(p_name); sid uuid;
begin
  begin sid := parts[1]::uuid; exception when others then return false; end;
  if not os_is_member(sid) then return false; end if;
  return parts[2] = 'shared' or parts[2] = auth.uid()::text;
end $$;
revoke all on function public.os_storage_ok(text) from public, anon;
grant execute on function public.os_storage_ok(text) to authenticated;

create policy os_photos_sel on storage.objects for select to authenticated using (bucket_id = 'os-photos' and public.os_storage_ok(name));
create policy os_photos_ins on storage.objects for insert to authenticated with check (bucket_id = 'os-photos' and public.os_storage_ok(name));
create policy os_photos_del on storage.objects for delete to authenticated using (bucket_id = 'os-photos' and public.os_storage_ok(name));
create policy os_photos_upd on storage.objects for update to authenticated using (bucket_id = 'os-photos' and public.os_storage_ok(name)) with check (bucket_id = 'os-photos' and public.os_storage_ok(name));

-- =====================================================================
-- Tiempo real (respeta RLS)
-- =====================================================================
alter publication supabase_realtime add table public.os_messages, public.os_journal, public.os_topics, public.os_agreements,
  public.os_checkins, public.os_conflicts, public.os_members, public.os_plans, public.os_dates, public.os_spaces;
