-- Reviews now publish immediately: submissions are stored as 'approved' so the
-- author sees their review on the landing page right away. The API route keeps
-- its per-IP rate limit as the spam control. 'pending'/'rejected' stay valid
-- states so moderation can still hide a row manually.
drop policy if exists "anyone submit review" on public.reviews;

create policy "anyone submit review" on public.reviews
for insert with check (status in ('pending', 'approved'));
