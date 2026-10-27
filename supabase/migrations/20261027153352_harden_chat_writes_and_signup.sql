-- Keep signup metadata within schema constraints and support Auth users that
-- do not have an email address (for example, phone-only accounts).
alter table public.users alter column email drop not null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_workspace_id uuid := pg_catalog.gen_random_uuid();
  workspace_name text := pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'workspace_name'), ''), 'My workspace'),
    120
  );
  display_name text := coalesce(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
    'Creator'
  );
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.profiles (id, display_name)
    values (new.id, display_name);
  insert into public.workspaces (id, owner_id, name, slug)
    values (new_workspace_id, new.id, workspace_name, 'workspace-' || new.id::text);
  insert into public.workspace_members (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');
  return new;
end;
$function$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- Assistant turns are trusted server output. Clients may add only their own
-- user turns, and cannot edit or delete stored messages through the Data API.
drop policy if exists "workspace chat message isolation" on public.chat_messages;
create policy "workspace members read chat messages" on public.chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.chat_conversations as c
    where c.id = chat_messages.conversation_id
      and private.is_workspace_member(c.workspace_id)
  ));
create policy "workspace members add user chat messages" on public.chat_messages
  for insert to authenticated
  with check (
    role = 'user'
    and exists (
      select 1 from public.chat_conversations as c
      where c.id = chat_messages.conversation_id
        and private.is_workspace_member(c.workspace_id)
    )
  );
revoke update, delete on public.chat_messages from authenticated;

-- Match the stable descending chat-history pagination order and its tie-breaker.
drop index if exists public.chat_messages_conversation_created_idx;
create index chat_messages_conversation_created_id_idx
  on public.chat_messages (conversation_id, created_at desc, id desc);
