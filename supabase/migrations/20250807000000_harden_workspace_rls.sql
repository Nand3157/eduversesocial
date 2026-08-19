-- Harden workspace ownership. The original "workspaces member access" policy
-- granted `for all` to every member: any member could DELETE the workspace
-- (cascading away every tenant row) or UPDATE owner_id to themselves and take
-- ownership (a plain `with check (owner_id = auth.uid())` still allows that,
-- because the check only sees the new row). Split it into command-scoped
-- policies and verify the current owner through a SECURITY DEFINER helper
-- (same pattern as is_workspace_member) so a member can never change owner_id:
--   SELECT  -> any member may read
--   UPDATE  -> only the current owner may modify (owner_id compared against
--              the pre-update row; subqueries see the old version)
--   DELETE  -> owner only
drop policy if exists "workspaces member access" on public.workspaces;

create or replace function public.workspace_owner(target_workspace uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from public.workspaces where id = target_workspace;
$$;

create policy "workspaces member select" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces owner update" on public.workspaces
  for update using (public.is_workspace_member(id))
  with check (public.workspace_owner(id) = auth.uid());

create policy "workspaces owner delete" on public.workspaces
  for delete using (owner_id = auth.uid());