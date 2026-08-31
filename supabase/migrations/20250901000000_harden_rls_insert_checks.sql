-- Harden INSERT/UPDATE policies that previously trusted client-supplied ids
-- Addresses audit: reviews.user_id / chat_conversations.created_by / scheduled_posts.user_id spoofing
-- and client-forged PUBLISHED status. Storage bucket already private since 20250831.
-- Defensive: each block only runs if the target table exists (your remote is missing chat_conversations)

-- 1) reviews: bind user_id to auth.uid() (prevents inserting rows pointed at another user)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reviews') then
    drop policy if exists "anyone submit review" on public.reviews;
    drop policy if exists "anyone submit review strict" on public.reviews;
    create policy "anyone submit review strict" on public.reviews
    for insert with check (
      status = 'pending'
      and (user_id = auth.uid() or (user_id is null and auth.uid() is null))
    );
    alter table public.reviews enable row level security;
  end if;
end $$;

-- 2) chat_conversations: prevent created_by spoof inside own workspace
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_conversations') then
    drop policy if exists "workspace chat isolation" on public.chat_conversations;
    drop policy if exists "workspace chat isolation strict" on public.chat_conversations;
    create policy "workspace chat isolation strict" on public.chat_conversations
    for all
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
    alter table public.chat_conversations enable row level security;
  end if;
end $$;

-- also harden chat_messages if the table exists (kept permissive on purpose; uncomment to lock assistant role)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_messages') then
    alter table public.chat_messages enable row level security;
  end if;
end $$;

-- 3) scheduled_posts: bind user_id to auth.uid() (prevents impersonation in shared workspace)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='scheduled_posts') then
    drop policy if exists "scheduled workspace isolation" on public.scheduled_posts;
    drop policy if exists "scheduled workspace isolation strict" on public.scheduled_posts;
    create policy "scheduled workspace isolation strict" on public.scheduled_posts
    for all
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

    -- 4) prevent authenticated clients from forging PUBLISHED/PUBLISHING (service_role only)
    create or replace function public.forbid_client_publish() returns trigger
    language plpgsql security definer set search_path = public as $func$
    begin
      if new.status in ('PUBLISHED','PUBLISHING') and auth.role() = 'authenticated' then
        raise exception 'status PUBLISHED/PUBLISHING only via service_role';
      end if;
      return new;
    end;
    $func$;

    drop trigger if exists enforce_scheduled_status on public.scheduled_posts;
    create trigger enforce_scheduled_status
    before insert or update on public.scheduled_posts
    for each row execute function public.forbid_client_publish();

    alter table public.scheduled_posts enable row level security;
  end if;
end $$;
