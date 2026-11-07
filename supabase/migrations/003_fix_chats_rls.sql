-- Corrige la política de lectura de os_chats: la versión anterior consultaba la propia tabla dentro de una
-- función y no "veía" la fila recién insertada, por lo que crear una conversación fallaba.
drop policy if exists os_chats_sel on public.os_chats;
drop policy if exists os_chats_upd on public.os_chats;
create policy os_chats_sel on public.os_chats for select to authenticated using (
  public.os_is_member(space_id) and (mode = 'pareja' or owner_id = (select auth.uid())));
create policy os_chats_upd on public.os_chats for update to authenticated using (
  public.os_is_member(space_id) and (mode = 'pareja' or owner_id = (select auth.uid())));
