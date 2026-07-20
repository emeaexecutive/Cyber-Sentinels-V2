-- EPIC 17.1E: Enterprise Trust Consent Manager.
-- Forward-only. Consent receipts/events are append-only; preferences are current state.

alter table public.trust_events drop constraint if exists trust_events_v1_event_type_check;
alter table public.trust_events add constraint trust_events_v1_event_type_check check (
  schema_version is distinct from 'trust-event-v1' or
  event_type ~ '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system|consent)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
) not valid;

create table public.consent_policy_versions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  version text not null,
  status text not null check (status in ('DRAFT','ACTIVE','SUPERSEDED','RETIRED')),
  effective_at timestamptz not null,
  supersedes_version text,
  locale text not null default 'en',
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  requires_reconsent boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index consent_policy_version_scope_idx on public.consent_policy_versions(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),version,locale);

create table public.consent_categories (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  category_key text not null check (category_key in ('essential','functional','analytics','ai_improvements','marketing')),
  display_name text not null, description text not null, legal_basis text not null, required boolean not null default false,
  default_enabled boolean not null default false, last_updated date not null, policy_version text not null, active boolean not null default true,
  created_at timestamptz not null default now(), constraint consent_essential_required_check check (category_key <> 'essential' or (required and default_enabled))
);
create unique index consent_category_scope_idx on public.consent_categories(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),category_key,policy_version);

create table public.consent_purposes (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  purpose_key text not null, category_key text not null check (category_key in ('essential','functional','analytics','ai_improvements','marketing')),
  description text not null, legal_basis text not null, active boolean not null default true, created_at timestamptz not null default now()
);
create unique index consent_purpose_scope_idx on public.consent_purposes(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),purpose_key);

create table public.consent_providers (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  provider_key text not null, display_name text not null, privacy_url text, first_or_third_party text not null check (first_or_third_party in ('FIRST_PARTY','THIRD_PARTY')),
  active boolean not null default true, last_reviewed date, notes text, created_at timestamptz not null default now()
);
create unique index consent_provider_scope_idx on public.consent_providers(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),provider_key);

create table public.consent_cookies (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  name text not null, domain text not null, provider_key text not null, category_key text not null check (category_key in ('essential','functional','analytics','ai_improvements','marketing')),
  purpose text not null, duration text not null, storage_type text not null check (storage_type in ('COOKIE','LOCAL_STORAGE','SESSION_STORAGE','INDEXED_DB','OTHER')),
  first_or_third_party text not null check (first_or_third_party in ('FIRST_PARTY','THIRD_PARTY')), active boolean not null default true,
  registration_source text not null check (registration_source in ('DISCOVERED','MANUAL')), last_reviewed date, notes text, created_at timestamptz not null default now()
);
create index consent_cookies_scope_idx on public.consent_cookies(enterprise_id,category_key,active);

create table public.consent_tracker_catalogue (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  tracker_key text not null, name text not null, domain text, provider_key text, category_key text check (category_key in ('essential','functional','analytics','ai_improvements','marketing')),
  purpose text, duration text, storage_type text, first_or_third_party text check (first_or_third_party in ('FIRST_PARTY','THIRD_PARTY')),
  active boolean not null default true, registration_source text not null check (registration_source in ('DISCOVERED','MANUAL')),
  classification_status text not null default 'UNKNOWN' check (classification_status in ('REVIEWED','UNKNOWN','BLOCKED')),
  last_reviewed date, notes text, created_at timestamptz not null default now(),
  constraint unknown_trackers_not_essential check (classification_status <> 'UNKNOWN' or category_key is null)
);
create unique index consent_tracker_scope_idx on public.consent_tracker_catalogue(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),tracker_key);

create table public.consent_region_profiles (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid references public.trust_workspaces(id) on delete cascade,
  profile_key text not null check (profile_key in ('EEA','UK','US_GENERAL','US_OPT_OUT','GLOBAL_DEFAULT')),
  configuration jsonb not null, active boolean not null default true, updated_at timestamptz not null default now()
);
create unique index consent_region_scope_idx on public.consent_region_profiles(coalesce(enterprise_id,'00000000-0000-0000-0000-000000000000'::uuid),profile_key);

create table public.consent_receipts (
  receipt_id uuid primary key, enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  user_id uuid, anonymous_id_hash text, subject_key text not null, policy_version text not null, banner_version text not null,
  preference_schema_version text not null, region_profile text not null check (region_profile in ('EEA','UK','US_GENERAL','US_OPT_OUT','GLOBAL_DEFAULT')),
  language text not null, categories jsonb not null, purposes text[] not null default '{}', providers text[] not null default '{}',
  consent_action text not null check (consent_action in ('ACCEPT_ALL','REJECT_OPTIONAL','SAVE_PREFERENCES','WITHDRAW','POLICY_RECONSENT','SYSTEM_MIGRATION')),
  occurred_at timestamptz not null, received_at timestamptz not null, expires_at timestamptz, source text not null,
  user_agent_hash text, coarse_country text, receipt_hash text not null check (receipt_hash ~ '^[a-f0-9]{64}$'),
  hash_algorithm text not null check (hash_algorithm = 'SHA-256'), canonicalization text not null check (canonicalization = 'RFC8785-JCS'),
  canonical_receipt jsonb not null check (jsonb_typeof(canonical_receipt)='object'),
  idempotency_key text not null, request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now(),
  constraint consent_receipt_one_subject_check check ((user_id is null) <> (anonymous_id_hash is null)),
  constraint consent_receipt_categories_check check (jsonb_typeof(categories)='object' and categories->>'essential'='true'),
  unique (enterprise_id,subject_key,idempotency_key)
);
create index consent_receipts_subject_idx on public.consent_receipts(enterprise_id,subject_key,occurred_at desc,receipt_id desc);

create table public.consent_preferences (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  user_id uuid, anonymous_id_hash text, subject_key text not null, policy_version text not null, region_profile text not null,
  categories jsonb not null check (jsonb_typeof(categories)='object' and categories->>'essential'='true'),
  current_receipt_id uuid not null references public.consent_receipts(receipt_id) on delete restrict,
  expires_at timestamptz, updated_at timestamptz not null default now(), unique (enterprise_id,subject_key),
  constraint consent_preference_one_subject_check check ((user_id is null) <> (anonymous_id_hash is null))
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  receipt_id uuid references public.consent_receipts(receipt_id) on delete restrict, subject_key text not null,
  event_type text not null check (event_type in ('consent.banner.displayed','consent.accept_all','consent.reject_optional','consent.preferences.saved','consent.withdrawn','consent.policy.reconsent_required','consent.policy.version_changed','consent.receipt.created','consent.account.deleted')),
  reason_code text not null, metadata jsonb not null default '{}', occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create index consent_events_subject_idx on public.consent_events(enterprise_id,subject_key,occurred_at desc,id desc);

create table public.consent_audit_log (
  id uuid primary key default gen_random_uuid(), enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  receipt_id uuid references public.consent_receipts(receipt_id) on delete restrict, action text not null,
  actor_reference text not null, correlation_id uuid not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

do $$ declare table_name text; begin
  foreach table_name in array array['consent_policy_versions','consent_categories','consent_purposes','consent_providers','consent_cookies','consent_tracker_catalogue','consent_preferences','consent_receipts','consent_events','consent_region_profiles','consent_audit_log'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon, authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
  end loop;
end $$;

grant select on public.consent_policy_versions,public.consent_categories,public.consent_purposes,public.consent_providers,public.consent_cookies,public.consent_tracker_catalogue,public.consent_region_profiles,public.consent_preferences,public.consent_receipts,public.consent_events to authenticated;

create policy "users read own consent preferences" on public.consent_preferences for select to authenticated using (user_id=auth.uid() and public.user_can_access_trust_workspace(enterprise_id));
create policy "users read own consent receipts" on public.consent_receipts for select to authenticated using (user_id=auth.uid() and public.user_can_access_trust_workspace(enterprise_id));
create policy "users read own consent events" on public.consent_events for select to authenticated using (exists(select 1 from public.consent_receipts r where r.receipt_id=consent_events.receipt_id and r.user_id=auth.uid() and public.user_can_access_trust_workspace(r.enterprise_id)));
create policy "tenant members read consent policies" on public.consent_policy_versions for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent categories" on public.consent_categories for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent purposes" on public.consent_purposes for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent providers" on public.consent_providers for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent cookies" on public.consent_cookies for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent trackers" on public.consent_tracker_catalogue for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read consent regions" on public.consent_region_profiles for select to authenticated using (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id));

create or replace function public.prevent_consent_history_mutation() returns trigger language plpgsql security definer set search_path=public as $$ begin raise exception 'Consent history is append-only'; end $$;
create trigger consent_receipts_append_only before update or delete on public.consent_receipts for each row execute function public.prevent_consent_history_mutation();
create trigger consent_events_append_only before update or delete on public.consent_events for each row execute function public.prevent_consent_history_mutation();
create trigger consent_audit_append_only before update or delete on public.consent_audit_log for each row execute function public.prevent_consent_history_mutation();

create or replace function public.persist_consent_change_v1(p_receipt jsonb,p_subject_key text,p_idempotency_key text,p_request_hash text,p_trust_events jsonb,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid := (p_receipt->>'enterpriseId')::uuid; receipt uuid := (p_receipt->>'receiptId')::uuid; existing public.consent_receipts%rowtype; first_choice boolean; trust_status text; action_event text; trust_event jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted consent path required'; end if;
  if p_receipt->>'canonicalization'<>'RFC8785-JCS' or p_receipt->>'hashAlgorithm'<>'SHA-256' or (p_receipt->>'receiptHash') !~ '^[a-f0-9]{64}$' or p_receipt#>>'{categories,essential}'<>'true' then raise exception 'Invalid Consent Receipt metadata'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||p_subject_key,23));
  select * into existing from public.consent_receipts where enterprise_id=enterprise and subject_key=p_subject_key and idempotency_key=p_idempotency_key for update;
  if found then
    if existing.request_hash=p_request_hash then return jsonb_build_object('status','DUPLICATE','receiptId',existing.receipt_id,'receiptHash',existing.receipt_hash,'expiresAt',existing.expires_at,'categories',existing.categories); end if;
    return jsonb_build_object('status','CONFLICT','receiptId',existing.receipt_id);
  end if;
  first_choice := not exists(select 1 from public.consent_preferences where enterprise_id=enterprise and subject_key=p_subject_key);
  insert into public.consent_receipts(receipt_id,enterprise_id,user_id,anonymous_id_hash,subject_key,policy_version,banner_version,preference_schema_version,region_profile,language,categories,purposes,providers,consent_action,occurred_at,received_at,expires_at,source,user_agent_hash,coarse_country,receipt_hash,hash_algorithm,canonicalization,canonical_receipt,idempotency_key,request_hash)
  values(receipt,enterprise,nullif(p_receipt->>'userId','')::uuid,nullif(p_receipt->>'anonymousId',''),p_subject_key,p_receipt->>'policyVersion',p_receipt->>'bannerVersion',p_receipt->>'preferenceSchemaVersion',p_receipt->>'regionProfile',p_receipt->>'language',p_receipt->'categories',array(select jsonb_array_elements_text(p_receipt->'purposes')),array(select jsonb_array_elements_text(p_receipt->'providers')),p_receipt->>'consentAction',(p_receipt->>'occurredAt')::timestamptz,(p_receipt->>'receivedAt')::timestamptz,nullif(p_receipt->>'expiresAt','')::timestamptz,p_receipt->>'source',nullif(p_receipt->>'userAgentHash',''),nullif(p_receipt->>'coarseCountry',''),p_receipt->>'receiptHash',p_receipt->>'hashAlgorithm',p_receipt->>'canonicalization',p_receipt,p_idempotency_key,p_request_hash);
  insert into public.consent_preferences(enterprise_id,user_id,anonymous_id_hash,subject_key,policy_version,region_profile,categories,current_receipt_id,expires_at)
  values(enterprise,nullif(p_receipt->>'userId','')::uuid,nullif(p_receipt->>'anonymousId',''),p_subject_key,p_receipt->>'policyVersion',p_receipt->>'regionProfile',p_receipt->'categories',receipt,nullif(p_receipt->>'expiresAt','')::timestamptz)
  on conflict(enterprise_id,subject_key) do update set policy_version=excluded.policy_version,region_profile=excluded.region_profile,categories=excluded.categories,current_receipt_id=excluded.current_receipt_id,expires_at=excluded.expires_at,updated_at=now();
  action_event := case p_receipt->>'consentAction' when 'ACCEPT_ALL' then 'consent.accept_all' when 'REJECT_OPTIONAL' then 'consent.reject_optional' when 'WITHDRAW' then 'consent.withdrawn' when 'POLICY_RECONSENT' then 'consent.policy.reconsent_required' else 'consent.preferences.saved' end;
  if first_choice then insert into public.consent_events(enterprise_id,receipt_id,subject_key,event_type,reason_code,metadata,occurred_at) values(enterprise,receipt,p_subject_key,'consent.banner.displayed','CONSENT_BANNER_FIRST_CHOICE',jsonb_build_object('policyVersion',p_receipt->>'policyVersion'),(p_receipt->>'occurredAt')::timestamptz); end if;
  insert into public.consent_events(enterprise_id,receipt_id,subject_key,event_type,reason_code,metadata,occurred_at) values
    (enterprise,receipt,p_subject_key,action_event,'CONSENT_'||(p_receipt->>'consentAction'),jsonb_build_object('policyVersion',p_receipt->>'policyVersion','regionProfile',p_receipt->>'regionProfile'),(p_receipt->>'occurredAt')::timestamptz),
    (enterprise,receipt,p_subject_key,'consent.receipt.created','CONSENT_RECEIPT_INTEGRITY_RECORDED',jsonb_build_object('receiptHash',p_receipt->>'receiptHash'),(p_receipt->>'receivedAt')::timestamptz);
  if jsonb_typeof(p_trust_events)<>'array' or jsonb_array_length(p_trust_events)<1 then raise exception 'Consent Trust Events are required'; end if;
  for trust_event in select value from jsonb_array_elements(p_trust_events) loop
    trust_status := public.append_trust_event_v1(trust_event,null,p_correlation_id);
    if trust_status<>'APPENDED' then raise exception 'Consent Trust Event chain conflict'; end if;
  end loop;
  insert into public.consent_audit_log(enterprise_id,receipt_id,action,actor_reference,correlation_id,metadata) values(enterprise,receipt,'CONSENT_RECEIPT_CREATED',p_subject_key,p_correlation_id,jsonb_build_object('action',p_receipt->>'consentAction','policyVersion',p_receipt->>'policyVersion'));
  return jsonb_build_object('status','CREATED','receiptId',receipt,'receiptHash',p_receipt->>'receiptHash','expiresAt',p_receipt->>'expiresAt','categories',p_receipt->'categories');
end $$;

revoke all on function public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid) to service_role;

create or replace function public.create_consent_policy_v1(p_policy jsonb,p_trust_events jsonb,p_correlation_id uuid,p_actor_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid := (p_policy->>'enterpriseId')::uuid; policy_id uuid; trust_event jsonb; trust_status text; event_name text;
begin
  if auth.role()<>'service_role' then raise exception 'Trusted consent policy path required'; end if;
  if (p_policy->>'contentHash') !~ '^[a-f0-9]{64}$' or p_policy->>'status' not in ('DRAFT','ACTIVE') then raise exception 'Invalid consent policy metadata'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':consent-policy',29));
  insert into public.consent_policy_versions(enterprise_id,version,status,effective_at,supersedes_version,locale,content_hash,requires_reconsent,created_by)
  values(enterprise,p_policy->>'version',p_policy->>'status',(p_policy->>'effectiveAt')::timestamptz,nullif(p_policy->>'supersedesVersion',''),p_policy->>'locale',p_policy->>'contentHash',coalesce((p_policy->>'requiresReconsent')::boolean,false),nullif(p_policy->>'createdBy','')::uuid) returning id into policy_id;
  for trust_event in select value from jsonb_array_elements(p_trust_events) loop
    event_name := trust_event->>'eventType';
    insert into public.consent_events(enterprise_id,subject_key,event_type,reason_code,metadata,occurred_at) values(enterprise,'enterprise:'||enterprise::text,event_name,case when event_name='consent.policy.reconsent_required' then 'CONSENT_POLICY_RECONSENT_REQUIRED' else 'CONSENT_POLICY_VERSION_CHANGED' end,jsonb_build_object('policyVersion',p_policy->>'version'),now());
    trust_status := public.append_trust_event_v1(trust_event,null,p_correlation_id);
    if trust_status<>'APPENDED' then raise exception 'Consent policy Trust Event chain conflict'; end if;
  end loop;
  insert into public.consent_audit_log(enterprise_id,action,actor_reference,correlation_id,metadata) values(enterprise,'CONSENT_POLICY_CREATED',p_actor_reference,p_correlation_id,jsonb_build_object('policyId',policy_id,'version',p_policy->>'version','status',p_policy->>'status'));
  return jsonb_build_object('id',policy_id,'version',p_policy->>'version','status',p_policy->>'status','effectiveAt',p_policy->>'effectiveAt','locale',p_policy->>'locale','requiresReconsent',coalesce((p_policy->>'requiresReconsent')::boolean,false));
end $$;

revoke all on function public.create_consent_policy_v1(jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_consent_policy_v1(jsonb,jsonb,uuid,text) to service_role;

-- Strict defaults. US opt-out behavior is configurable and never treated as a legal conclusion.
insert into public.consent_region_profiles(profile_key,configuration) values
('EEA','{"optionalDefault":false,"mode":"OPT_IN"}'),('UK','{"optionalDefault":false,"mode":"OPT_IN"}'),
('US_GENERAL','{"optionalDefault":false,"mode":"CONFIGURABLE"}'),('US_OPT_OUT','{"optionalDefault":false,"mode":"OPT_OUT","afterNotice":true}'),
('GLOBAL_DEFAULT','{"optionalDefault":false,"mode":"STRICT_UNKNOWN_LOCATION"}');

insert into public.consent_policy_versions(version,status,effective_at,locale,content_hash,requires_reconsent)
values('2026-07-20.1','ACTIVE','2026-07-20T00:00:00Z','en','f2d19e39fe316f17c3360e5011fa051fd4d6a7a4991b014d59aec4349a338a8d',true);
insert into public.consent_categories(category_key,display_name,description,legal_basis,required,default_enabled,last_updated,policy_version) values
('essential','Essential','Required secure service delivery.','Required service operation; enterprise legal review applies.',true,true,'2026-07-20','2026-07-20.1'),
('functional','Functional','Optional interface preferences.','Consent where required.',false,false,'2026-07-20','2026-07-20.1'),
('analytics','Analytics','Optional usage and performance measurement.','Consent where prior consent is required.',false,false,'2026-07-20','2026-07-20.1'),
('ai_improvements','AI Improvements','Optional privacy-minimised workflow quality evaluation.','Explicit consent and enterprise configuration.',false,false,'2026-07-20','2026-07-20.1'),
('marketing','Marketing','Optional campaign attribution and advertising.','Consent or configured opt-out rules after review.',false,false,'2026-07-20','2026-07-20.1');
insert into public.consent_purposes(purpose_key,category_key,description,legal_basis) values
('secure_service_delivery','essential','Authentication, session security, CSRF and consent storage.','Required service operation.'),
('interface_preferences','functional','Remember optional interface choices.','Consent where required.'),
('product_analytics','analytics','Privacy-minimised product and performance analysis.','Consent where required.'),
('workflow_improvement','ai_improvements','Evaluate product workflow quality without automatic confidential-data use.','Explicit consent.'),
('campaign_attribution','marketing','Configured marketing attribution.','Consent or reviewed opt-out policy.');
insert into public.consent_providers(provider_key,display_name,first_or_third_party,last_reviewed,notes) values('cyber_sentinels','Cyber Sentinels','FIRST_PARTY','2026-07-20','Consent manager and preference storage.');
insert into public.consent_cookies(name,domain,provider_key,category_key,purpose,duration,storage_type,first_or_third_party,registration_source,last_reviewed,notes) values
('cs_consent','cybersentinels.com','cyber_sentinels','essential','Signed minimal consent state.','Up to 180 days','COOKIE','FIRST_PARTY','MANUAL','2026-07-20','Readable by the consent loader; HMAC protected.'),
('cs_consent_anon','cybersentinels.com','cyber_sentinels','essential','Secure anonymous subject continuity.','Up to 180 days','COOKIE','FIRST_PARTY','MANUAL','2026-07-20','HttpOnly; database stores only a digest.');

comment on table public.consent_receipts is 'Append-only, tamper-evident and integrity-verifiable Consent Receipts. Not described as immutable.';
comment on column public.consent_receipts.anonymous_id_hash is 'Rotated anonymous subject digest. Raw anonymous identifiers and full IP addresses are prohibited.';
comment on table public.consent_tracker_catalogue is 'Unknown trackers remain unclassified and cannot default to Essential.';
