-- Tighten exposed database access, keep helper routines out of the PostgREST
-- schema, close the post-media bucket, and complete useful FK indexing.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  );
$function$;
revoke all on function private.is_workspace_member(uuid) from public, anon, authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_workspace_id uuid := pg_catalog.gen_random_uuid();
  new_workspace_slug text := 'workspace-' || pg_catalog.substr(new.id::text, 1, 8);
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', pg_catalog.split_part(new.email, '@', 1)));
  insert into public.workspaces (id, owner_id, name, slug)
    values (new_workspace_id, new.id, coalesce(new.raw_user_meta_data ->> 'workspace_name', 'My workspace'), new_workspace_slug);
  insert into public.workspace_members (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');
  return new;
end;
$function$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function private.forbid_client_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status in ('PUBLISHED', 'PUBLISHING') and auth.role() = 'authenticated' then
    raise exception 'PUBLISHED only via service_role';
  end if;
  return new;
end;
$function$;
revoke all on function private.forbid_client_publish() from public, anon, authenticated;

create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (schema %)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;
revoke all on function private.rls_auto_enable() from public, anon, authenticated;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function private.rls_auto_enable();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists enforce_scheduled_status on public.scheduled_posts;
create trigger enforce_scheduled_status
  before insert or update on public.scheduled_posts
  for each row execute function private.forbid_client_publish();

-- Move workspace policies to the signed-in role and hoist stable JWT lookups
-- into initplans. Review submission and approved review reads remain public.
alter policy "users own row" on public.users to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "profiles own row" on public.profiles to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "workspaces member select" on public.workspaces to authenticated
  using (private.is_workspace_member(id));
alter policy "workspaces owner update" on public.workspaces to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
alter policy "workspaces owner delete" on public.workspaces to authenticated
  using (owner_id = (select auth.uid()));

alter policy "members see own workspaces" on public.workspace_members to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "owners manage members" on public.workspace_members;
create policy "workspace owners insert members" on public.workspace_members
  for insert to authenticated
  with check (exists (
    select 1 from public.workspaces as w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (select auth.uid())
  ));
create policy "workspace owners update members" on public.workspace_members
  for update to authenticated
  using (exists (
    select 1 from public.workspaces as w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces as w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (select auth.uid())
  ));
create policy "workspace owners delete members" on public.workspace_members
  for delete to authenticated
  using (exists (
    select 1 from public.workspaces as w
    where w.id = workspace_members.workspace_id
      and w.owner_id = (select auth.uid())
  ));

alter policy "workspace data isolation" on public.analytics to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "analytics workspace isolation" on public.analytics_cache to authenticated
  using (exists (
    select 1 from public.social_accounts as a
    where a.id = analytics_cache.social_account_id
      and private.is_workspace_member(a.workspace_id)
  ))
  with check (exists (
    select 1 from public.social_accounts as a
    where a.id = analytics_cache.social_account_id
      and private.is_workspace_member(a.workspace_id)
  ));
alter policy "workspace chat isolation strict" on public.chat_conversations to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
alter policy "workspace chat message isolation" on public.chat_messages to authenticated
  using (exists (
    select 1 from public.chat_conversations as c
    where c.id = chat_messages.conversation_id
      and private.is_workspace_member(c.workspace_id)
  ))
  with check (exists (
    select 1 from public.chat_conversations as c
    where c.id = chat_messages.conversation_id
      and private.is_workspace_member(c.workspace_id)
  ));
alter policy "workspace data isolation" on public.memory to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "workspace data isolation" on public.notifications to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "workspace data isolation" on public.posts to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "attempt workspace isolation" on public.publishing_attempts to authenticated
  using (exists (
    select 1 from public.scheduled_posts as p
    where p.id = publishing_attempts.scheduled_post_id
      and private.is_workspace_member(p.workspace_id)
  ))
  with check (exists (
    select 1 from public.scheduled_posts as p
    where p.id = publishing_attempts.scheduled_post_id
      and private.is_workspace_member(p.workspace_id)
  ));
alter policy "workspace data isolation" on public.recommendations to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "scheduled workspace isolation strict" on public.scheduled_posts to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id) and user_id = (select auth.uid()));
alter policy "workspace data isolation" on public.social_accounts to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "workspace data isolation" on public.subscriptions to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
alter policy "anyone submit review strict" on public.reviews
  with check (
    status = 'pending'
    and (user_id = (select auth.uid()) or (user_id is null and (select auth.uid()) is null))
  );

drop function if exists public.is_workspace_member(uuid);
drop function if exists public.workspace_owner(uuid);
drop function if exists public.handle_new_user();
drop function if exists public.forbid_client_publish();
drop function if exists public.rls_auto_enable();

-- Unauthenticated clients need only the public reviews surface. RLS remains
-- the row-level boundary for signed-in application tables.
revoke all privileges on all tables in schema public from anon;
grant select, insert on public.reviews to anon;

-- Remove public access to the query-statistics views; the Supabase dashboard
-- retains its own dashboard_user grants.
revoke select on extensions.pg_stat_statements, extensions.pg_stat_statements_info from public, anon, authenticated;

-- Keep the timestamp trigger safe when invoked from any caller-controlled path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Make the post-media bucket private and scope every object operation to the
-- signed-in owner's uploads/<user-id>/ prefix.
update storage.buckets set public = false where id = 'post-media';
drop policy if exists "public read post media" on storage.objects;
drop policy if exists "owner read post media" on storage.objects;
drop policy if exists "authenticated upload post media" on storage.objects;
drop policy if exists "owner update post media" on storage.objects;
drop policy if exists "owner delete post media" on storage.objects;
create policy "owner read post media" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-media' and owner = (select auth.uid()));
create policy "authenticated upload post media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
create policy "owner update post media" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-media' and owner = (select auth.uid()))
  with check (
    bucket_id = 'post-media'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
create policy "owner delete post media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and owner = (select auth.uid()));

-- The app has no current query paths for these empty legacy tables. Drop their
-- unused secondary indexes and two indexes already covered by wider indexes.
drop index if exists public.posts_workspace_published_idx;
drop index if exists public.analytics_workspace_date_idx;
drop index if exists public.memory_workspace_created_idx;
drop index if exists public.chat_conversations_workspace_idx;
drop index if exists public.chat_messages_conversation_idx;

-- Index foreign-key columns not already covered by a left-prefix index.
create index if not exists chat_conversations_created_by_idx on public.chat_conversations(created_by);
create index if not exists posts_social_account_id_idx on public.posts(social_account_id);
create index if not exists publishing_attempts_scheduled_post_id_idx on public.publishing_attempts(scheduled_post_id);
create index if not exists recommendations_workspace_id_idx on public.recommendations(workspace_id);
create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists scheduled_posts_account_id_idx on public.scheduled_posts(account_id);
create index if not exists scheduled_posts_user_id_idx on public.scheduled_posts(user_id);
create index if not exists scheduled_posts_workspace_id_idx on public.scheduled_posts(workspace_id);
create index if not exists social_accounts_parent_account_id_idx on public.social_accounts(parent_account_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);

-- Repair two missing mirror rows for existing Auth accounts. This only inserts
-- missing identity rows and does not remove user or application data.
insert into public.users (id, email)
select u.id, u.email
from auth.users as u
where u.email is not null
  and not exists (select 1 from public.users as pu where pu.id = u.id)
on conflict (id) do nothing;
