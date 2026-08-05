-- EPIC 34: Enterprise Trust Learning derived projections.
-- Canonical Trust Events, Trust Fabric decisions, Evidence Graph, Replay and Trust Memory remain authoritative.
-- Development migration only; application to any environment requires the separate release process.

create extension if not exists pgcrypto;

create table public.enterprise_trust_patterns (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  pattern_id uuid not null,
  pattern_type text not null,
  pattern jsonb not null check (jsonb_typeof(pattern) = 'object'),
  status text not null check (status in ('active','corrected','superseded')),
  reviewer_state text not null check (reviewer_state in ('pending','accepted','partially_accepted','rejected','corrected')),
  canonical_digest text not null check (canonical_digest ~ '^[a-f0-9]{64}$'),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  supporting_event_count integer not null check (supporting_event_count >= 2),
  supersedes_pattern_id uuid,
  actor_id uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (enterprise_id, pattern_id),
  foreign key (enterprise_id, supersedes_pattern_id) references public.enterprise_trust_patterns(enterprise_id, pattern_id) on delete restrict,
  check (last_observed_at >= first_observed_at),
  check (supersedes_pattern_id is null or supersedes_pattern_id <> pattern_id)
);
create index enterprise_trust_patterns_type_idx on public.enterprise_trust_patterns(enterprise_id, pattern_type, last_observed_at desc);

create table public.enterprise_trust_pattern_versions (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  version_id uuid not null,
  pattern_id uuid not null,
  pattern jsonb not null check (jsonb_typeof(pattern) = 'object'),
  canonical_digest text not null check (canonical_digest ~ '^[a-f0-9]{64}$'),
  source_references text[] not null default '{}',
  actor_id uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, version_id),
  unique (enterprise_id, pattern_id, canonical_digest),
  foreign key (enterprise_id, pattern_id) references public.enterprise_trust_patterns(enterprise_id, pattern_id) deferrable initially deferred
);

create table public.trust_intelligence_ai_outputs (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  output_id text not null check (output_id ~ '^[A-Za-z0-9_.:@-]{1,160}$'),
  provider_id text not null,
  model_id text not null,
  model_version text not null,
  prompt_template_version text not null,
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  redaction_state text not null check (redaction_state = 'redacted'),
  evidence_references text[] not null default '{}',
  output jsonb not null check (jsonb_typeof(output) = 'object'),
  output_classification text not null check (output_classification in ('ai_draft','evidence_retrieval_result','semantic_similarity_result','reviewer_assistance','translated_summary','unverified_suggestion')),
  limitations text[] not null default '{}',
  review_state text not null check (review_state in ('pending','accepted','partially_accepted','rejected','corrected','not_applicable')),
  supersedes_output_id text,
  canonical_digest text not null check (canonical_digest ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, output_id),
  foreign key (enterprise_id, supersedes_output_id) references public.trust_intelligence_ai_outputs(enterprise_id, output_id) on delete restrict,
  check (supersedes_output_id is null or supersedes_output_id <> output_id)
);
comment on table public.trust_intelligence_ai_outputs is 'Immutable redacted model-output envelopes. Raw prompts and raw customer payloads are prohibited.';

create table public.trust_intelligence_reviewer_feedback (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  feedback_id uuid not null,
  output_id text not null,
  reviewer_id uuid not null,
  reviewer_role text not null,
  source_version text not null,
  label text not null check (label in ('accepted','partially_accepted','rejected','unsupported','misleading','missing_evidence','incorrect_similarity','useful_recommendation','not_useful','corrected')),
  reason text not null check (char_length(reason) between 3 and 1000),
  correction text,
  feedback jsonb not null check (jsonb_typeof(feedback) = 'object'),
  canonical_digest text not null check (canonical_digest ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, feedback_id),
  unique (enterprise_id, output_id, reviewer_id, source_version),
  foreign key (enterprise_id, output_id) references public.trust_intelligence_ai_outputs(enterprise_id, output_id) on delete restrict
);

create table public.trust_simulation_runs (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  simulation_id uuid not null,
  simulation_type text not null check (simulation_type in ('authority_expiry','provider_outage','delegated_agent_impact','economic_limit')),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  snapshot_digest text not null check (snapshot_digest ~ '^[a-f0-9]{64}$'),
  simulation_digest text not null check (simulation_digest ~ '^[a-f0-9]{64}$'),
  actor_id uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, simulation_id)
);

create table public.trust_resilience_assessments (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  assessment_id uuid not null,
  state text not null check (state in ('resilient','partially_resilient','single_source_dependency','evidence_gap','authority_gap','provider_dependency','recovery_required','unknown')),
  assessment jsonb not null check (jsonb_typeof(assessment) = 'object'),
  canonical_digest text not null check (canonical_digest ~ '^[a-f0-9]{64}$'),
  actor_id uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, assessment_id)
);

create table public.model_evaluation_runs (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  evaluation_id uuid not null,
  provider_id text not null,
  model_id text not null,
  model_version text not null,
  prompt_template_version text not null,
  status text not null check (status in ('not_run','measured','failed')),
  metrics jsonb,
  thresholds jsonb not null check (jsonb_typeof(thresholds) = 'object'),
  promotion_eligible boolean not null default false,
  limitations text[] not null default '{}',
  corpus_digest text not null check (corpus_digest ~ '^[a-f0-9]{64}$'),
  actor_id uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (enterprise_id, evaluation_id)
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'enterprise_trust_patterns','enterprise_trust_pattern_versions','trust_intelligence_ai_outputs',
    'trust_intelligence_reviewer_feedback','trust_simulation_runs','trust_resilience_assessments','model_evaluation_runs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant all privileges on public.%I to service_role', table_name);
  end loop;
end $$;

grant select on public.enterprise_trust_patterns, public.enterprise_trust_pattern_versions,
  public.trust_intelligence_ai_outputs, public.trust_intelligence_reviewer_feedback,
  public.trust_simulation_runs, public.trust_resilience_assessments, public.model_evaluation_runs to authenticated;

create policy "tenant reads trust patterns" on public.enterprise_trust_patterns for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust pattern versions" on public.enterprise_trust_pattern_versions for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust intelligence outputs" on public.trust_intelligence_ai_outputs for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "reviewers read bounded trust feedback" on public.trust_intelligence_reviewer_feedback for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id) and (reviewer_id = auth.uid() or public.identity_workspace_role(enterprise_id) in ('owner','admin')));
create policy "tenant reads trust simulations" on public.trust_simulation_runs for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust resilience" on public.trust_resilience_assessments for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads model evaluations" on public.model_evaluation_runs for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));

create trigger enterprise_trust_pattern_versions_append_only before update or delete on public.enterprise_trust_pattern_versions for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_intelligence_ai_outputs_append_only before update or delete on public.trust_intelligence_ai_outputs for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_intelligence_reviewer_feedback_append_only before update or delete on public.trust_intelligence_reviewer_feedback for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_simulation_runs_append_only before update or delete on public.trust_simulation_runs for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_resilience_assessments_append_only before update or delete on public.trust_resilience_assessments for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger model_evaluation_runs_append_only before update or delete on public.model_evaluation_runs for each row execute function public.prevent_trust_architecture_history_mutation();

comment on table public.enterprise_trust_patterns is 'Correctable current derived pattern projection; canonical source systems remain authoritative.';
comment on table public.enterprise_trust_pattern_versions is 'Append-only pattern versions with source references and deterministic digests.';
comment on table public.model_evaluation_runs is 'Offline evaluation evidence only; a passing record does not itself authorize staging or Production promotion.';
