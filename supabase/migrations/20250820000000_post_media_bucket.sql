-- Public storage bucket for images uploaded in the Meta post publisher.
-- Meta requires public HTTPS media URLs, so the bucket is public; uploads are
-- restricted to signed-in users and only their own objects can be changed.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "public read post media" on storage.objects
for select using (bucket_id = 'post-media');

create policy "authenticated upload post media" on storage.objects
for insert with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "owner update post media" on storage.objects
for update using (bucket_id = 'post-media' and owner = auth.uid());

create policy "owner delete post media" on storage.objects
for delete using (bucket_id = 'post-media' and owner = auth.uid());