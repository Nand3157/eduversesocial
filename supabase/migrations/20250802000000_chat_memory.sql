create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index chat_conversations_workspace_updated_idx on public.chat_conversations(workspace_id, updated_at desc);
create index chat_messages_conversation_created_idx on public.chat_messages(conversation_id, created_at);
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
create policy "workspace chat isolation" on public.chat_conversations for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace chat message isolation" on public.chat_messages for all using (exists(select 1 from public.chat_conversations where id = conversation_id and public.is_workspace_member(workspace_id))) with check (exists(select 1 from public.chat_conversations where id = conversation_id and public.is_workspace_member(workspace_id)));
create trigger chat_conversations_updated_at before update on public.chat_conversations for each row execute procedure public.set_updated_at();
create trigger chat_messages_updated_at before update on public.chat_messages for each row execute procedure public.set_updated_at();
