-- The legacy workspace_id foreign keys need their own left-prefix indexes.
create index if not exists analytics_workspace_id_fk_idx on public.analytics(workspace_id);
create index if not exists memory_workspace_id_fk_idx on public.memory(workspace_id);
create index if not exists posts_workspace_id_fk_idx on public.posts(workspace_id);
