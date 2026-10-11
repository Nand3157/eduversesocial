alter table public.scheduled_posts
  add column approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'rejected'));
create index scheduled_posts_calendar_idx
  on public.scheduled_posts (workspace_id, scheduled_at)
  where status in ('SCHEDULED', 'DRAFT');

create table public.recurring_content_slots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'threads')),
  label text not null check (char_length(label) between 1 and 100),
  weekday smallint not null check (weekday between 0 and 6),
  local_time time not null,
  timezone text not null default 'UTC',
  content_type text not null default 'TEXT' check (content_type in ('IMAGE', 'VIDEO', 'CAROUSEL', 'TEXT')),
  approval_required boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recurring_content_slots_calendar_idx
  on public.recurring_content_slots (workspace_id, weekday, local_time)
  where enabled;

alter table public.recurring_content_slots enable row level security;
revoke all on public.recurring_content_slots from public, anon, authenticated;
create policy "recurring slots workspace isolation" on public.recurring_content_slots
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.social_accounts as account
      where account.id = recurring_content_slots.account_id
        and account.workspace_id = recurring_content_slots.workspace_id
        and account.platform = recurring_content_slots.platform
    )
  );

grant select, insert, update, delete on public.recurring_content_slots to authenticated;

create trigger set_recurring_content_slots_updated_at
  before update on public.recurring_content_slots
  for each row execute function public.set_updated_at();
