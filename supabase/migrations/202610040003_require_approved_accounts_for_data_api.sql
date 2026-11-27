create or replace function public.security_closure_user_approved()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.account_access_approvals approval
    where approval.user_id = auth.uid()
      and approval.status = 'APPROVED'
  );
$$;

revoke all on function public.security_closure_user_approved() from public, anon;
grant execute on function public.security_closure_user_approved() to authenticated, service_role;

do $$
declare
  v_table_name text;
  protected_tables text[] := array[
    'ai_agents', 'api_keys', 'audit_logs', 'autonomy_profiles',
    'data_rights_requests', 'decisions', 'evidence_files', 'execution_passports',
    'feedback_reports', 'help_questions', 'intent_requests', 'interest_signals',
    'knowledge_articles', 'passport_state_checks', 'passports', 'provenance_events',
    'risk_scores', 'signals', 'system_health_checks', 'team_members', 'teams',
    'trust_alerts', 'trust_algorithm_runs', 'trust_assistant_questions',
    'trust_certifications', 'trust_graph_edges', 'trust_graph_nodes', 'trust_reports',
    'verification_cases', 'verification_passports', 'verifiers'
  ];
begin
  foreach v_table_name in array protected_tables loop
    if to_regclass(format('public.%I', v_table_name)) is null then
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', 'account approval required', v_table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.security_closure_user_approved()) with check (public.security_closure_user_approved())',
      'account approval required', v_table_name
    );
  end loop;
end;
$$;