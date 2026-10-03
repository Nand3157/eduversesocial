-- Repair chat persistence: chat_conversations / chat_messages never reached
-- the hosted project (PostgREST returns PGRST205 for both, so every save in
-- /api/chat threw and the UI showed "Saving is temporarily unavailable").
-- 20250802000000 created them; 20250806000000 added chat_messages.image and
-- 20250901000000 hardened the policies — none of which could apply while the
-- tables were absent. This migration is the idempotent union of all three, so
-- it is safe to run against a database that already has them.
--
-- Also widens chat_messages.content from the original 4000-char check: the
-- chat route allows 8000 user characters and streams up to 4096 output tokens
-- (~16k chars) of assistant reply, so long replies violated the constraint and
-- were dropped with only a warn log.

-- 1) Tables -----------------------------------------------------------------
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  image text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2) Missing pieces on a table that already existed --------------------------
alter table public.chat_messages add column if not exists image text;

-- Relax the cap without dropping data: drop the old named check by rebuilding
-- the constraint only if the stricter one is still in place.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%4000%'
  ) then
    alter table public.chat_messages drop constraint chat_messages_content_check;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_content_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_content_check check (char_length(content) between 1 and 20000);
  end if;
end $$;

-- 3) Indexes (also from 20250822000000, which could not run without the table)
create index if not exists chat_conversations_workspace_updated_idx on public.chat_conversations(workspace_id, updated_at desc);
create index if not exists chat_conversations_workspace_idx on public.chat_conversations(workspace_id);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id, created_at);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id);

-- 4) RLS + policies. The "strict" chat_conversations policy from
--    20250901000000 wins: it additionally binds created_by to auth.uid() so a
--    member cannot forge another user's id.
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "workspace chat isolation" on public.chat_conversations;
drop policy if exists "workspace chat isolation strict" on public.chat_conversations;
create policy "workspace chat isolation strict" on public.chat_conversations
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "workspace chat message isolation" on public.chat_messages;
create policy "workspace chat message isolation" on public.chat_messages
  for all
  using (exists(select 1 from public.chat_conversations where id = conversation_id and public.is_workspace_member(workspace_id)))
  with check (exists(select 1 from public.chat_conversations where id = conversation_id and public.is_workspace_member(workspace_id)));

-- 5) updated_at triggers
drop trigger if exists chat_conversations_updated_at on public.chat_conversations;
create trigger chat_conversations_updated_at before update on public.chat_conversations
  for each row execute procedure public.set_updated_at();

drop trigger if exists chat_messages_updated_at on public.chat_messages;
create trigger chat_messages_updated_at before update on public.chat_messages
  for each row execute procedure public.set_updated_at();
