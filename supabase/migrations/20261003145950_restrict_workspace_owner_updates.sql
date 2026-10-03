-- A workspace member must not be able to promote themselves to owner.
alter policy "workspaces owner update" on public.workspaces to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
