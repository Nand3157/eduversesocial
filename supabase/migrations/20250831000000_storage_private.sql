-- Fix: storage bucket was public; make private and use signed URLs (Meta fetch via token URL still works)
-- Addresses audit: "Your storage bucket is set to public"

update storage.buckets set public = false where id = 'post-media';

-- Drop overly permissive public read, replace with owner-scoped read (authenticated only)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='public read post media') then
    execute 'drop policy "public read post media" on storage.objects';
  end if;
end $$;

-- Owner can read own objects (private bucket; access via signed URL token or direct owner session)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='owner read post media') then
    execute $pol$
      create policy "owner read post media" on storage.objects
      for select to authenticated
      using (bucket_id = 'post-media' and owner = auth.uid())
    $pol$;
  end if;
end $$;

-- Ensure owner delete policy exists (already created in initial migration, but re-ensure)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='owner delete post media') then
    execute $pol$
      create policy "owner delete post media" on storage.objects
      for delete to authenticated
      using (bucket_id = 'post-media' and owner = auth.uid())
    $pol$;
  end if;
end $$;
