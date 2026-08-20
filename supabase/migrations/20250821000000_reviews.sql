-- Real user reviews for the landing page. Only 'approved' rows are readable
-- publicly; submissions land in 'pending' so spam can be moderated before it
-- ever appears. Anyone (signed in or not) can submit, and the API route rate
-- limits submissions per IP.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) between 1 and 120),
  rating integer not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 1 and 800),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

create index reviews_approved_created_idx on public.reviews(status, created_at desc);

alter table public.reviews enable row level security;

create policy "public read approved reviews" on public.reviews
for select using (status = 'approved');

create policy "anyone submit review" on public.reviews
for insert with check (status = 'pending');