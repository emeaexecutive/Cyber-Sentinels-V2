-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 4: consent catalogues, append-only receipts, preferences and audit.

begin;

do $reconciliation_gate$
declare
  v_conflict text;
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_CONSENT_FOUNDATION_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if not exists (
    select 1
    from public.schema_reconciliation_runs
    where reconciliation_key = '202607300003_canonical_trust_foundation'
      and status = 'completed'
  ) then
    raise exception
      'RECONCILIATION_CONSENT_FOUNDATION_FAILED: canonical trust foundation is required';
  end if;

  select string_agg(name, ', ' order by name)
    into v_conflict
  from (
    values
      ('consent_policy_versions'),
      ('consent_categories'),
      ('consent_purposes'),
      ('consent_providers'),
      ('consent_cookies'),
      ('consent_tracker_catalogue'),
      ('consent_region_profiles'),
      ('consent_receipts'),
      ('consent_preferences'),
      ('consent_events'),
      ('consent_audit_log')
  ) proposed(name)
  where to_regclass('public.' || proposed.name) is not null;
  if v_conflict is not null then
    raise exception
      'RECONCILIATION_CONSENT_FOUNDATION_FAILED: consent object name collision: %',
      v_conflict;
  end if;
end
$reconciliation_gate$;

create table public.consent_policy_versions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  version text not null,
  status text not null,
  effective_at timestamptz not null,
  supersedes_version text,
  locale text not null default 'en',
  content_hash text not null,
  requires_reconsent boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint consent_policy_status_reconciliation_check
    check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED')),
  constraint consent_policy_hash_reconciliation_check
    check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint consent_policy_version_reconciliation_check
    check (length(btrim(version)) between 1 and 100),
  constraint consent_policy_locale_reconciliation_check
    check (length(btrim(locale)) between 2 and 35)
);

create unique index consent_policy_version_scope_reconciliation_idx
  on public.consent_policy_versions(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    version,
    locale
  );

create table public.consent_categories (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  category_key text not null,
  display_name text not null,
  description text not null,
  legal_basis text not null,
  required boolean not null default false,
  default_enabled boolean not null default false,
  last_updated date not null,
  policy_version text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint consent_category_key_reconciliation_check
    check (
      category_key in (
        'essential', 'functional', 'analytics',
        'ai_improvements', 'marketing'
      )
    ),
  constraint consent_essential_required_reconciliation_check
    check (
      category_key <> 'essential'
      or (required and default_enabled)
    )
);

create unique index consent_category_scope_reconciliation_idx
  on public.consent_categories(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    category_key,
    policy_version
  );

create table public.consent_purposes (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  purpose_key text not null,
  category_key text not null,
  description text not null,
  legal_basis text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint consent_purpose_category_reconciliation_check
    check (
      category_key in (
        'essential', 'functional', 'analytics',
        'ai_improvements', 'marketing'
      )
    )
);

create unique index consent_purpose_scope_reconciliation_idx
  on public.consent_purposes(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    purpose_key
  );

create table public.consent_providers (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  provider_key text not null,
  display_name text not null,
  privacy_url text,
  first_or_third_party text not null,
  active boolean not null default true,
  last_reviewed date,
  notes text,
  created_at timestamptz not null default now(),
  constraint consent_provider_party_reconciliation_check
    check (first_or_third_party in ('FIRST_PARTY', 'THIRD_PARTY'))
);

create unique index consent_provider_scope_reconciliation_idx
  on public.consent_providers(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    provider_key
  );

create table public.consent_cookies (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  name text not null,
  domain text not null,
  provider_key text not null,
  category_key text not null,
  purpose text not null,
  duration text not null,
  storage_type text not null,
  first_or_third_party text not null,
  active boolean not null default true,
  registration_source text not null,
  last_reviewed date,
  notes text,
  created_at timestamptz not null default now(),
  constraint consent_cookie_category_reconciliation_check
    check (
      category_key in (
        'essential', 'functional', 'analytics',
        'ai_improvements', 'marketing'
      )
    ),
  constraint consent_cookie_storage_reconciliation_check
    check (
      storage_type in (
        'COOKIE', 'LOCAL_STORAGE', 'SESSION_STORAGE', 'INDEXED_DB', 'OTHER'
      )
    ),
  constraint consent_cookie_party_reconciliation_check
    check (first_or_third_party in ('FIRST_PARTY', 'THIRD_PARTY')),
  constraint consent_cookie_source_reconciliation_check
    check (registration_source in ('DISCOVERED', 'MANUAL'))
);

create unique index consent_cookie_identity_reconciliation_idx
  on public.consent_cookies(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    name,
    domain,
    storage_type
  );
create index consent_cookies_scope_reconciliation_idx
  on public.consent_cookies(enterprise_id, category_key, active);

create table public.consent_tracker_catalogue (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  tracker_key text not null,
  name text not null,
  domain text,
  provider_key text,
  category_key text,
  purpose text,
  duration text,
  storage_type text,
  first_or_third_party text,
  active boolean not null default true,
  registration_source text not null,
  classification_status text not null default 'UNKNOWN',
  last_reviewed date,
  notes text,
  created_at timestamptz not null default now(),
  constraint consent_tracker_category_reconciliation_check
    check (
      category_key is null
      or category_key in (
        'essential', 'functional', 'analytics',
        'ai_improvements', 'marketing'
      )
    ),
  constraint consent_tracker_party_reconciliation_check
    check (
      first_or_third_party is null
      or first_or_third_party in ('FIRST_PARTY', 'THIRD_PARTY')
    ),
  constraint consent_tracker_source_reconciliation_check
    check (registration_source in ('DISCOVERED', 'MANUAL')),
  constraint consent_tracker_classification_reconciliation_check
    check (classification_status in ('REVIEWED', 'UNKNOWN', 'BLOCKED')),
  constraint unknown_trackers_not_essential_reconciliation_check
    check (
      classification_status <> 'UNKNOWN'
      or category_key is null
    )
);

create unique index consent_tracker_scope_reconciliation_idx
  on public.consent_tracker_catalogue(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    tracker_key
  );

create table public.consent_region_profiles (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  profile_key text not null,
  configuration jsonb not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint consent_region_profile_reconciliation_check
    check (
      profile_key in (
        'EEA', 'UK', 'US_GENERAL', 'US_OPT_OUT', 'GLOBAL_DEFAULT'
      )
    ),
  constraint consent_region_configuration_reconciliation_check
    check (jsonb_typeof(configuration) = 'object')
);

create unique index consent_region_scope_reconciliation_idx
  on public.consent_region_profiles(
    coalesce(
      enterprise_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    profile_key
  );

create table public.consent_receipts (
  receipt_id uuid primary key,
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete restrict,
  user_id uuid,
  anonymous_id_hash text,
  subject_key text not null,
  policy_version text not null,
  banner_version text not null,
  preference_schema_version text not null,
  region_profile text not null,
  language text not null,
  categories jsonb not null,
  purposes text[] not null default '{}',
  providers text[] not null default '{}',
  consent_action text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null,
  expires_at timestamptz,
  source text not null,
  user_agent_hash text,
  coarse_country text,
  receipt_hash text not null,
  hash_algorithm text not null,
  canonicalization text not null,
  canonical_receipt jsonb not null,
  idempotency_key text not null,
  request_hash text not null,
  created_at timestamptz not null default now(),
  constraint consent_receipt_region_reconciliation_check
    check (
      region_profile in (
        'EEA', 'UK', 'US_GENERAL', 'US_OPT_OUT', 'GLOBAL_DEFAULT'
      )
    ),
  constraint consent_receipt_action_reconciliation_check
    check (
      consent_action in (
        'ACCEPT_ALL', 'REJECT_OPTIONAL', 'SAVE_PREFERENCES',
        'WITHDRAW', 'POLICY_RECONSENT', 'SYSTEM_MIGRATION'
      )
    ),
  constraint consent_receipt_hash_reconciliation_check
    check (receipt_hash ~ '^[a-f0-9]{64}$'),
  constraint consent_receipt_request_hash_reconciliation_check
    check (request_hash ~ '^[a-f0-9]{64}$'),
  constraint consent_receipt_hash_algorithm_reconciliation_check
    check (hash_algorithm = 'SHA-256'),
  constraint consent_receipt_canonicalization_reconciliation_check
    check (canonicalization = 'RFC8785-JCS'),
  constraint consent_receipt_canonical_object_reconciliation_check
    check (jsonb_typeof(canonical_receipt) = 'object'),
  constraint consent_receipt_one_subject_reconciliation_check
    check ((user_id is null) <> (anonymous_id_hash is null)),
  constraint consent_receipt_subject_key_reconciliation_check
    check (length(btrim(subject_key)) between 1 and 300),
  constraint consent_receipt_idempotency_reconciliation_check
    check (length(btrim(idempotency_key)) between 8 and 160),
  constraint consent_receipt_categories_reconciliation_check
    check (
      jsonb_typeof(categories) = 'object'
      and categories ->> 'essential' = 'true'
      and jsonb_typeof(categories -> 'essential') = 'boolean'
      and jsonb_typeof(categories -> 'functional') = 'boolean'
      and jsonb_typeof(categories -> 'analytics') = 'boolean'
      and jsonb_typeof(categories -> 'ai_improvements') = 'boolean'
      and jsonb_typeof(categories -> 'marketing') = 'boolean'
    ),
  constraint consent_receipt_expiry_reconciliation_check
    check (expires_at is null or expires_at > occurred_at),
  unique (enterprise_id, subject_key, idempotency_key)
);

create index consent_receipts_subject_reconciliation_idx
  on public.consent_receipts(
    enterprise_id,
    subject_key,
    occurred_at desc,
    receipt_id desc
  );
create index consent_receipts_expiry_reconciliation_idx
  on public.consent_receipts(enterprise_id, expires_at)
  where expires_at is not null;

create table public.consent_preferences (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete cascade,
  user_id uuid,
  anonymous_id_hash text,
  subject_key text not null,
  policy_version text not null,
  region_profile text not null,
  categories jsonb not null,
  current_receipt_id uuid not null
    references public.consent_receipts(receipt_id) on delete restrict,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint consent_preference_one_subject_reconciliation_check
    check ((user_id is null) <> (anonymous_id_hash is null)),
  constraint consent_preference_categories_reconciliation_check
    check (
      jsonb_typeof(categories) = 'object'
      and categories ->> 'essential' = 'true'
      and jsonb_typeof(categories -> 'essential') = 'boolean'
      and jsonb_typeof(categories -> 'functional') = 'boolean'
      and jsonb_typeof(categories -> 'analytics') = 'boolean'
      and jsonb_typeof(categories -> 'ai_improvements') = 'boolean'
      and jsonb_typeof(categories -> 'marketing') = 'boolean'
    ),
  unique (enterprise_id, subject_key)
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete cascade,
  receipt_id uuid references public.consent_receipts(receipt_id) on delete restrict,
  subject_key text not null,
  event_type text not null,
  reason_code text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint consent_event_type_reconciliation_check
    check (
      event_type in (
        'consent.banner.displayed',
        'consent.accept_all',
        'consent.reject_optional',
        'consent.preferences.saved',
        'consent.withdrawn',
        'consent.policy.reconsent_required',
        'consent.policy.version_changed',
        'consent.receipt.created',
        'consent.account.deleted'
      )
    ),
  constraint consent_event_metadata_reconciliation_check
    check (jsonb_typeof(metadata) = 'object')
);

create index consent_events_subject_reconciliation_idx
  on public.consent_events(
    enterprise_id,
    subject_key,
    occurred_at desc,
    id desc
  );

create table public.consent_audit_log (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete cascade,
  receipt_id uuid references public.consent_receipts(receipt_id) on delete restrict,
  action text not null,
  actor_reference text not null,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint consent_audit_metadata_reconciliation_check
    check (jsonb_typeof(metadata) = 'object')
);

create index consent_audit_enterprise_reconciliation_idx
  on public.consent_audit_log(enterprise_id, created_at desc);

alter table public.consent_policy_versions enable row level security;
alter table public.consent_policy_versions force row level security;
alter table public.consent_categories enable row level security;
alter table public.consent_categories force row level security;
alter table public.consent_purposes enable row level security;
alter table public.consent_purposes force row level security;
alter table public.consent_providers enable row level security;
alter table public.consent_providers force row level security;
alter table public.consent_cookies enable row level security;
alter table public.consent_cookies force row level security;
alter table public.consent_tracker_catalogue enable row level security;
alter table public.consent_tracker_catalogue force row level security;
alter table public.consent_region_profiles enable row level security;
alter table public.consent_region_profiles force row level security;
alter table public.consent_receipts enable row level security;
alter table public.consent_receipts force row level security;
alter table public.consent_preferences enable row level security;
alter table public.consent_preferences force row level security;
alter table public.consent_events enable row level security;
alter table public.consent_events force row level security;
alter table public.consent_audit_log enable row level security;
alter table public.consent_audit_log force row level security;

revoke all on table public.consent_policy_versions from public, anon, authenticated;
revoke all on table public.consent_categories from public, anon, authenticated;
revoke all on table public.consent_purposes from public, anon, authenticated;
revoke all on table public.consent_providers from public, anon, authenticated;
revoke all on table public.consent_cookies from public, anon, authenticated;
revoke all on table public.consent_tracker_catalogue from public, anon, authenticated;
revoke all on table public.consent_region_profiles from public, anon, authenticated;
revoke all on table public.consent_receipts from public, anon, authenticated;
revoke all on table public.consent_preferences from public, anon, authenticated;
revoke all on table public.consent_events from public, anon, authenticated;
revoke all on table public.consent_audit_log from public, anon, authenticated;

grant all privileges on table public.consent_policy_versions to service_role;
grant all privileges on table public.consent_categories to service_role;
grant all privileges on table public.consent_purposes to service_role;
grant all privileges on table public.consent_providers to service_role;
grant all privileges on table public.consent_cookies to service_role;
grant all privileges on table public.consent_tracker_catalogue to service_role;
grant all privileges on table public.consent_region_profiles to service_role;
grant all privileges on table public.consent_receipts to service_role;
grant all privileges on table public.consent_preferences to service_role;
grant all privileges on table public.consent_events to service_role;
grant all privileges on table public.consent_audit_log to service_role;

create function public.prevent_consent_history_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'Consent history is append-only';
end;
$function$;

revoke all on function public.prevent_consent_history_mutation_v1()
  from public, anon, authenticated;

create trigger consent_receipts_append_only
before update or delete on public.consent_receipts
for each row
execute function public.prevent_consent_history_mutation_v1();

create trigger consent_events_append_only
before update or delete on public.consent_events
for each row
execute function public.prevent_consent_history_mutation_v1();

create trigger consent_audit_append_only
before update or delete on public.consent_audit_log
for each row
execute function public.prevent_consent_history_mutation_v1();

comment on table public.consent_receipts is
  'NOT APPROVED FOR PRODUCTION. Append-only, tamper-evident Consent Receipts.';
comment on column public.consent_receipts.anonymous_id_hash is
  'Rotated anonymous subject digest only; raw anonymous identifiers are prohibited.';
comment on table public.consent_tracker_catalogue is
  'Unknown trackers remain unclassified and cannot default to Essential.';

insert into public.schema_reconciliation_runs(
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
)
values (
  '202607300004_consent_foundation',
  'consent_foundation',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'tablesCreated', 11,
    'catalogueSeedRows', 0,
    'receiptRowsBackfilled', 0,
    'legacyDataModified', false
  )
);

commit;
