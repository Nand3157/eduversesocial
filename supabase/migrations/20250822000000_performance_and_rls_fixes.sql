-- Performance indexes + storage RLS hardening (P1)
-- Covers hot paths: workspace lookup per request, scheduler scan, analytics cache fan-out

-- 1) workspace_members(user_id) is queried on every auth (supabase.auth.getUser -> workspace_members.eq(user_id))
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- 2) social_accounts lookups by workspace + status (meta-analytics active accounts)
create index if not exists social_accounts_workspace_status_idx on public.social_accounts(workspace_id, status);

-- 3) scheduled_posts scheduler scans: status + scheduled_at, and stale PUBLISHING recovery
create index if not exists scheduled_posts_status_scheduled_idx on public.scheduled_posts(status, scheduled_at);
create index if not exists scheduled_posts_status_updated_idx on public.scheduled_posts(status, updated_at);
-- composite for workspace isolation + status
create index if not exists scheduled_posts_workspace_status_idx on public.scheduled_posts(workspace_id, status);

-- 4) publishing_attempts lookup by scheduled_post
create index if not exists publishing_attempts_post_idx on public.publishing_attempts(scheduled_post_id);

-- 5) chat persistence hot paths (already indexed but ensure workspace_id exists)
create index if not exists chat_conversations_workspace_idx on public.chat_conversations(workspace_id);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id);

-- 6) analytics_cache already unique (social_account_id, metric_date) — add workspace-adjacent index via join not needed

-- 7) Storage bucket post-media — harden insert to owner folder only
-- Ensure storage.buckets RLS exists; tighten post-media insert policy to folder = auth.uid()
-- Drop permissive policy if exists and recreate scoped one
do $$
begin
  -- only run if storage schema exists (supabase local vs cloud)
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    -- remove overly permissive insert if present
    if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='post-media authenticated insert') then
      execute 'drop policy "post-media authenticated insert" on storage.objects';
    end if;
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='post-media owner insert') then
      execute $pol$
        create policy "post-media owner insert" on storage.objects for insert to authenticated
        with check (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
      $pol$;
    end if;
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='post-media owner update') then
      execute $pol$
        create policy "post-media owner update" on storage.objects for update to authenticated
        using (bucket_id = 'post-media' and owner = auth.uid())
        with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text)
      $pol$;
    end if;
  end if;
end $$;

-- 8) scheduled_posts: tighten RLS so non-owners can read but only owners/admins manage?
-- For now keep is_workspace_member for reads but add ownership check example as comment:
-- Consider: using (workspace_id in (select workspace_id from workspace_members where user_id=auth.uid() and role in ('owner','admin')))
-- Left as is to avoid breaking existing member publish flows; index above already speeds up.
