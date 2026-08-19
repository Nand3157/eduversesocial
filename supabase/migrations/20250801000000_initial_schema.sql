-- Run in the Supabase SQL editor or through the Supabase CLI.
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

-- Public application user record mirrors auth.users without exposing auth internals.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade, email text not null unique, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null check (char_length(name) between 1 and 120), slug text not null unique, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'member' check (role in ('owner','admin','member')), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), primary key (workspace_id, user_id)
);
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, platform text not null, handle text not null, encrypted_token text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), unique(workspace_id, platform, handle)
);
create table public.posts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, social_account_id uuid references public.social_accounts(id) on delete set null, content text not null, published_at timestamptz, status text not null default 'draft', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.analytics (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, metric_date date not null, impressions integer not null default 0 check (impressions >= 0), reach integer not null default 0 check (reach >= 0), likes integer not null default 0 check (likes >= 0), comments integer not null default 0 check (comments >= 0), shares integer not null default 0 check (shares >= 0), sentiment numeric(5,2), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), unique(post_id, metric_date)
);
create table public.recommendations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, title text not null, rationale text not null, payload jsonb not null default '{}'::jsonb, confidence numeric(5,2), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.memory (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, category text not null, content text not null, confidence numeric(5,2), source jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, type text not null, title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique references public.workspaces(id) on delete cascade, provider_customer_id text unique, status text not null default 'active', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare workspace_id uuid := gen_random_uuid(); workspace_slug text := 'workspace-' || substr(new.id::text, 1, 8);
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  insert into public.workspaces (id, owner_id, name, slug) values (workspace_id, new.id, coalesce(new.raw_user_meta_data ->> 'workspace_name', 'My workspace'), workspace_slug);
  insert into public.workspace_members (workspace_id, user_id, role) values (workspace_id, new.id, 'owner');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create index posts_workspace_published_idx on public.posts(workspace_id, published_at desc); create index analytics_workspace_date_idx on public.analytics(workspace_id, metric_date desc); create index memory_workspace_created_idx on public.memory(workspace_id, created_at desc); create index notifications_workspace_read_idx on public.notifications(workspace_id, read_at);
create or replace function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid()); $$;
alter table public.users enable row level security; alter table public.profiles enable row level security; alter table public.workspaces enable row level security; alter table public.workspace_members enable row level security; alter table public.social_accounts enable row level security; alter table public.posts enable row level security; alter table public.analytics enable row level security; alter table public.recommendations enable row level security; alter table public.memory enable row level security; alter table public.notifications enable row level security; alter table public.subscriptions enable row level security;
create policy "users own row" on public.users for all using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles own row" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "workspaces member access" on public.workspaces for all using (public.is_workspace_member(id)) with check (owner_id = auth.uid());
create policy "members see own workspaces" on public.workspace_members for select using (user_id = auth.uid());
create policy "owners manage members" on public.workspace_members for all using (exists(select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid())) with check (exists(select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));
create policy "workspace data isolation" on public.social_accounts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.posts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.analytics for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.recommendations for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.memory for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.notifications for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation" on public.subscriptions for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create trigger users_updated_at before update on public.users for each row execute procedure public.set_updated_at(); create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at(); create trigger workspaces_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at(); create trigger social_accounts_updated_at before update on public.social_accounts for each row execute procedure public.set_updated_at(); create trigger posts_updated_at before update on public.posts for each row execute procedure public.set_updated_at(); create trigger analytics_updated_at before update on public.analytics for each row execute procedure public.set_updated_at(); create trigger recommendations_updated_at before update on public.recommendations for each row execute procedure public.set_updated_at(); create trigger memory_updated_at before update on public.memory for each row execute procedure public.set_updated_at(); create trigger notifications_updated_at before update on public.notifications for each row execute procedure public.set_updated_at(); create trigger subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
