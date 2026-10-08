
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create schema storage;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
      create function public.user_can_access_trust_workspace(uuid) returns boolean language sql stable as $$ select false $$;
      create function public.ensure_policy_definition_v2(p_schema text,p_table text,p_name text,p_command text,p_roles name[],p_using text,p_check text,p_mode text,p_migration_version text,p_replacement_reason text,p_raise_on_conflict boolean)
      returns text language plpgsql as $$
      declare existing record; role_sql text;
      begin
            select * into existing from pg_policies where schemaname=p_schema and tablename=p_table and policyname=p_name;
            if found then
                  if p_mode='intentional_replace' then
                        execute format('drop policy %I on %I.%I',p_name,p_schema,p_table);
                  else
                        if existing.cmd=p_command and existing.roles::text=p_roles::text
                               and regexp_replace(coalesce(existing.qual,''),'\s+','','g')=regexp_replace(coalesce(p_using,''),'\s+','','g')
                               and regexp_replace(coalesce(existing.with_check,''),'\s+','','g')=regexp_replace(coalesce(p_check,''),'\s+','','g') then
                              return 'UNCHANGED';
                        end if;
                        if p_raise_on_conflict then raise exception 'Conflicting policy definition: %.%.%',p_schema,p_table,p_name; end if;
                        return 'CONFLICT';
                  end if;
            end if;
            select string_agg(quote_ident(role_name::text),',') into role_sql from unnest(p_roles) role_name;
            execute format('create policy %I on %I.%I for %s to %s%s%s',p_name,p_schema,p_table,p_command,role_sql,
                  case when p_using is null then '' else format(' using (%s)',p_using) end,
                  case when p_check is null then '' else format(' with check (%s)',p_check) end);
            return 'CREATED';
      end;
      $$;
      create table public.ai_agents(id uuid, owner_user_id uuid, owner_enterprise_id uuid, enterprise_id uuid, owner_email text);
      create table public.api_keys(id uuid, owner_user_id uuid, user_id uuid, user_email text, tenant_id uuid);
      create table public.audit_logs(id uuid, owner_email text, actor text, metadata jsonb, team_id text);
      create table public.autonomy_profiles(id uuid, created_by text);
      create table public.data_rights_requests(id uuid, requester_user_id uuid, requester_email text);
      create table public.decisions(id uuid, owner_email text, team_id text, case_id uuid, verification_case_id uuid, passport_id uuid);
      create table public.enterprise_access_requests(id uuid, work_email text, name text, company text, role text, company_size text, current_problem_category text, current_problem text, ai_usage_level text, use_case text, message text, design_partner_interest boolean, governance_interest boolean, operational_ai_interest boolean, status text);
      create table public.evidence_files(id uuid, owner_email text, uploaded_by text, team_id text, verification_case_id uuid, passport_id uuid);
      create table public.execution_passports(id uuid, created_by text, passport_id uuid);
      create table public.feedback_reports(id uuid, submitted_by_user_id uuid, submitted_by_email text);
      create table public.help_questions(id uuid, created_by_user_id uuid, created_by_email text, created_by text);
      create table public.intent_requests(id uuid, created_by text);
      create table public.interest_signals(id uuid);
      create table public.knowledge_articles(id uuid, status text);
      create table public.passport_state_checks(id uuid, created_by text, passport_id uuid);
      create table public.passports(id uuid primary key, owner_email text, user_email text, team_id text, verified boolean, clearance text);
      create table public.provenance_events(id uuid, created_by text, enterprise_id uuid);
      create table public.risk_scores(id uuid, team_id text, verification_case_id uuid, case_id uuid);
      create table public.signals(id uuid, owner_email text, team_id text);
      create table public.teams(id uuid primary key);
      create table public.team_members(id uuid, team_id uuid, member_email text, invitation_status text);
      create table public.trust_alerts(id uuid, created_by uuid, enterprise_id uuid);
      create table public.trust_algorithm_runs(id uuid, subject_type text, subject_id uuid);
      create table public.trust_assistant_questions(id uuid, asked_by_user_id uuid, asked_by_email text);
      create table public.trust_certifications(id uuid, created_by uuid, enterprise_id uuid, status text, notes text, updated_at timestamptz);
      create table public.trust_graph_edges(id uuid);
      create table public.trust_graph_nodes(id uuid);
      create table public.trust_reports(id uuid primary key, owner_email text, team_id text, passport_id uuid, review_status text);
      create table public.verification_cases(id uuid primary key, owner_email text, team_id text, passport_id uuid);
      create table public.verification_passports(id uuid);
      create table public.verifiers(id uuid, created_by uuid, status text);
      create table public.waitlist(email text);
      create table storage.buckets(id text primary key, public boolean);
      create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;

create table public.trust_workspaces(id uuid primary key, created_by uuid references auth.users(id), name text);
create table public.workspace_members(workspace_id uuid references public.trust_workspaces(id),user_id uuid references auth.users(id),role text);
create view public.approval_workspace_view as select * from public.trust_workspaces;
create materialized view public.approval_workspace_materialized as select * from public.trust_workspaces;
grant select on public.approval_workspace_view, public.approval_workspace_materialized to authenticated;
create table public.trust_entities(id uuid primary key,tenant_id uuid, status text,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.trust_evidence(id uuid,tenant_id uuid,entity_id uuid,provider text,created_at timestamptz default now());
create table public.trust_graph_relationships_v2(id uuid,tenant_id uuid,source_entity uuid,target_entity uuid,removed_at timestamptz);
create table public.trust_graph_events(id uuid,tenant_id uuid,entity_id uuid,occurred_at timestamptz);
create table public.trust_sources(id uuid,tenant_id uuid);
create sequence public.approval_sequence_probe_seq;
create table public.approval_sequence_probe(id bigint primary key default nextval('public.approval_sequence_probe_seq'),enterprise_id uuid not null);
alter table public.approval_sequence_probe enable row level security;
grant select,insert on public.approval_sequence_probe to authenticated;
grant usage,select on sequence public.approval_sequence_probe_seq to authenticated;
create policy tenant on public.approval_sequence_probe for all to authenticated using(public.user_can_access_trust_workspace(enterprise_id)) with check(public.user_can_access_trust_workspace(enterprise_id));
