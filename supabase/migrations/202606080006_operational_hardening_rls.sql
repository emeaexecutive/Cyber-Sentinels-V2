-- Operational Hardening & Trust Readiness
-- Tighten public access and workspace separation for controlled exposure.

revoke all on table public.passports from anon;
revoke all on table public.evidence_files from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.signals from anon;
revoke all on table public.trust_relationships from anon;
revoke all on table public.trust_timeline_events from anon;
revoke all on table public.trust_workspaces from anon;
revoke all on table public.workspace_members from anon;
revoke all on table public.trust_cases from anon;
revoke all on table public.trust_case_relationships from anon;
revoke all on table public.governance_actions from anon;
revoke all on table public.governance_policies from anon;
revoke all on table public.ai_agents from anon;
revoke all on table public.subscriptions from anon;

alter table public.passports enable row level security;
alter table public.evidence_files enable row level security;
alter table public.audit_logs enable row level security;
alter table public.signals enable row level security;
alter table public.trust_relationships enable row level security;
alter table public.trust_timeline_events enable row level security;
alter table public.trust_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.trust_cases enable row level security;
alter table public.trust_case_relationships enable row level security;
alter table public.governance_actions enable row level security;
alter table public.governance_policies enable row level security;
alter table public.ai_agents enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "authenticated manage trust_workspaces" on public.trust_workspaces;
drop policy if exists "authenticated manage workspace_members" on public.workspace_members;
drop policy if exists "authenticated manage trust_cases" on public.trust_cases;
drop policy if exists "authenticated manage trust_case_relationships" on public.trust_case_relationships;

create policy "workspace owners and members read workspaces"
  on public.trust_workspaces
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = trust_workspaces.id
      and workspace_members.user_id = auth.uid()
    )
  );

create policy "authenticated users create own workspaces"
  on public.trust_workspaces
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "workspace owners update workspaces"
  on public.trust_workspaces
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "workspace participants read members"
  on public.workspace_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = workspace_members.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
  );

create policy "workspace owners and self add members"
  on public.workspace_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = workspace_members.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
  );

create policy "workspace owners update members"
  on public.workspace_members
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = workspace_members.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = workspace_members.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
  );

create policy "workspace members read trust cases"
  on public.trust_cases
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = trust_cases.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = trust_cases.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members create trust cases"
  on public.trust_cases
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1
        from public.trust_workspaces
        where trust_workspaces.id = trust_cases.workspace_id
        and trust_workspaces.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.workspace_members
        where workspace_members.workspace_id = trust_cases.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('admin', 'reviewer')
      )
    )
  );

create policy "workspace reviewers update trust cases"
  on public.trust_cases
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = trust_cases.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = trust_cases.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'reviewer')
    )
  )
  with check (
    exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = trust_cases.workspace_id
      and trust_workspaces.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = trust_cases.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'reviewer')
    )
  );

create policy "workspace members read case relationships"
  on public.trust_case_relationships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trust_cases
      where trust_cases.id = trust_case_relationships.case_id
      and (
        trust_cases.created_by = auth.uid()
        or exists (
          select 1
          from public.trust_workspaces
          where trust_workspaces.id = trust_cases.workspace_id
          and trust_workspaces.created_by = auth.uid()
        )
        or exists (
          select 1
          from public.workspace_members
          where workspace_members.workspace_id = trust_cases.workspace_id
          and workspace_members.user_id = auth.uid()
        )
      )
    )
  );

create policy "workspace reviewers create case relationships"
  on public.trust_case_relationships
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.trust_cases
      where trust_cases.id = trust_case_relationships.case_id
      and (
        exists (
          select 1
          from public.trust_workspaces
          where trust_workspaces.id = trust_cases.workspace_id
          and trust_workspaces.created_by = auth.uid()
        )
        or exists (
          select 1
          from public.workspace_members
          where workspace_members.workspace_id = trust_cases.workspace_id
          and workspace_members.user_id = auth.uid()
          and workspace_members.role in ('admin', 'reviewer')
        )
      )
    )
  );
