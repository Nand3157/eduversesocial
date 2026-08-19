-- Persist the editable profile fields (role/title and bio) so the dashboard
-- name, role and bio survive reloads and stay consistent across sessions.
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists bio text;
