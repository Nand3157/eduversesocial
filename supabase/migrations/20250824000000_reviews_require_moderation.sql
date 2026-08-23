-- Revert reviews to moderated flow: submissions are stored as 'pending' and only
-- 'approved' rows are ever rendered publicly. The previous auto-publish policy
-- allowed instant SEO spam by accepting status='approved' directly.
drop policy if exists "anyone submit review" on public.reviews;

create policy "anyone submit review" on public.reviews
for insert with check (status = 'pending');
