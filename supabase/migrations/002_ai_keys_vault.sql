-- Claves de IA guardadas cifradas en Supabase Vault (no en el código).
-- Crear con: select vault.create_secret('<clave>', 'os_gemini_api_key');  (o os_groq_api_key / os_anthropic_api_key)
create or replace function public.os_ai_keys() returns jsonb
language sql security definer stable set search_path = public, vault as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets where name in ('os_gemini_api_key','os_groq_api_key','os_anthropic_api_key');
$$;
revoke all on function public.os_ai_keys() from public, anon, authenticated;
grant execute on function public.os_ai_keys() to service_role;
