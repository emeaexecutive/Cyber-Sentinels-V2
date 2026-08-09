-- Cyber Sentinels native Operational Entity verification, Phase 1.
-- Extends the canonical Operational Entity and Evidence Graph. It does not
-- introduce a parallel entity, authority, graph or trust-decision model.

create table public.operational_entity_owner_bindings (
  owner_binding_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  operational_entity_id text not null,
  accountable_owner_id text not null,
  organization_id text not null,
  state text not null check(state in ('CONFIRMED','PENDING','EXPIRED','REVOKED','CONFLICTING','UNKNOWN')),
  approved_by uuid,
  approval_reference text,
  effective_from timestamptz not null,
  effective_to timestamptz,
  supersedes_owner_binding_id uuid references public.operational_entity_owner_bindings(owner_binding_id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(effective_to is null or effective_to>effective_from),
  unique(enterprise_id,operational_entity_id,effective_from)
);
create index operational_entity_owner_bindings_current_idx on public.operational_entity_owner_bindings(enterprise_id,operational_entity_id,effective_from desc);

create table public.operational_entity_native_credentials (
  credential_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  signing_key_id text not null,
  algorithm text not null check(algorithm='Ed25519'),
  public_jwk jsonb not null check(jsonb_typeof(public_jwk)='object' and not(public_jwk ? 'd')),
  credential_fingerprint text not null check(credential_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null check(state in ('PENDING','ACTIVE','RETIRED','REVOKED','EXPIRED')),
  valid_from timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  rotated_from_credential_id uuid references public.operational_entity_native_credentials(credential_id) on delete restrict,
  authorized_by uuid not null,
  authorization_reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(expires_at is null or expires_at>valid_from),
  check((state='REVOKED')=(revoked_at is not null)),
  unique(enterprise_id,operational_entity_id,signing_key_id),
  unique(enterprise_id,operational_entity_id,credential_fingerprint)
);
create index operational_entity_native_credentials_active_idx on public.operational_entity_native_credentials(enterprise_id,operational_entity_id,state,valid_from desc);
create unique index operational_entity_native_credentials_one_active_idx on public.operational_entity_native_credentials(enterprise_id,operational_entity_id) where state='ACTIVE';

create table public.operational_entity_manifests (
  manifest_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  manifest_version text not null check(manifest_version='1.0'),
  manifest jsonb not null check(jsonb_typeof(manifest)='object' and octet_length(manifest::text)<=65536),
  manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
  signature text not null,
  signing_key_id text not null,
  status text not null check(status in ('ACTIVE','SUPERSEDED','REVOKED','EXPIRED')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  registered_by uuid not null,
  supersedes_manifest_id uuid references public.operational_entity_manifests(manifest_id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(expires_at>issued_at),
  check((status='REVOKED')=(revoked_at is not null)),
  unique(enterprise_id,operational_entity_id,manifest_digest)
);
create index operational_entity_manifests_active_idx on public.operational_entity_manifests(enterprise_id,operational_entity_id,status,issued_at desc);
create unique index operational_entity_manifests_one_active_idx on public.operational_entity_manifests(enterprise_id,operational_entity_id) where status='ACTIVE';

alter table public.trust_signals drop constraint if exists trust_signals_entity_type_check;
alter table public.trust_signals add constraint trust_signals_entity_type_check check(entity_type in (
  'HUMAN','AI_AGENT','DEVICE','ORGANISATION','CREDENTIAL','SESSION','ENTERPRISE_WORKFLOW',
  'SERVICE','APPLICATION','MODEL_ENDPOINT','MACHINE','WORKLOAD'
));

create table public.operational_entity_native_challenges (
  challenge_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  nonce_hash text not null check(nonce_hash ~ '^[a-f0-9]{64}$'),
  audience text not null,
  issuer text not null check(issuer='cyber-sentinels'),
  subject text not null,
  manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
  signing_key_id text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check(status in ('ISSUED','VERIFIED','EXPIRED','REPLAYED','REJECTED')),
  issued_by uuid not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(expires_at>issued_at),
  unique(enterprise_id,operational_entity_id,nonce_hash)
);
create index operational_entity_native_challenges_lookup_idx on public.operational_entity_native_challenges(enterprise_id,operational_entity_id,status,expires_at);

create table public.operational_entity_native_runtime_observations (
  runtime_observation_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  operational_entity_id text not null,
  observation jsonb not null check(jsonb_typeof(observation)='object'),
  observation_digest text not null check(observation_digest ~ '^[a-f0-9]{64}$'),
  source text not null,
  observed_at timestamptz not null,
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,operational_entity_id,observation_digest)
);

create table public.operational_entity_native_software_observations (
  software_observation_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  operational_entity_id text not null,
  observation jsonb not null check(jsonb_typeof(observation)='object'),
  observation_digest text not null check(observation_digest ~ '^[a-f0-9]{64}$'),
  source text not null,
  observed_at timestamptz not null,
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,operational_entity_id,observation_digest)
);

create table public.operational_entity_native_verifications (
  verification_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  challenge_id uuid not null references public.operational_entity_native_challenges(challenge_id) on delete restrict,
  manifest_id uuid not null references public.operational_entity_manifests(manifest_id) on delete restrict,
  credential_id uuid not null references public.operational_entity_native_credentials(credential_id) on delete restrict,
  status text not null check(status in ('VERIFIED','PARTIALLY_VERIFIED','REVIEW_REQUIRED','FAILED','EXPIRED','UNKNOWN')),
  verified_claims text[] not null default '{}',
  unverified_claims text[] not null default '{}',
  conflicting_claims text[] not null default '{}',
  evidence_references text[] not null default '{}',
  manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
  credential_fingerprint text not null check(credential_fingerprint ~ '^[a-f0-9]{64}$'),
  continuity_result text not null check(continuity_result in ('CONTINUITY_ESTABLISHED','CONTINUITY_PRESERVED','CONTINUITY_CHANGED','CONTINUITY_UNAVAILABLE')),
  continuity_fingerprint text not null check(continuity_fingerprint ~ '^[a-f0-9]{64}$'),
  continuity_snapshot jsonb not null check(jsonb_typeof(continuity_snapshot)='object'),
  changed_attributes text[] not null default '{}',
  runtime_binding text not null check(runtime_binding in ('RUNTIME_MATCH','RUNTIME_CHANGED','RUNTIME_UNVERIFIED','RUNTIME_CONFLICT','INSUFFICIENT_EVIDENCE')),
  software_provenance text not null check(software_provenance in ('VERIFIED_DIGEST','DECLARED_ONLY','MISMATCH','NOT_AVAILABLE')),
  reason_codes text[] not null,
  algorithm_version text not null check(algorithm_version='native-entity-verification-v1'),
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  verified_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,challenge_id)
);
create index operational_entity_native_verifications_entity_idx on public.operational_entity_native_verifications(enterprise_id,operational_entity_id,verified_at desc);

create table public.native_entity_identity_evidence (
  evidence_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  verification_id uuid not null references public.operational_entity_native_verifications(verification_id) on delete restrict,
  evidence_type text not null check(evidence_type='NATIVE_ENTITY_IDENTITY_PROOF'),
  manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
  credential_fingerprint text not null check(credential_fingerprint ~ '^[a-f0-9]{64}$'),
  signing_key_id text not null,
  challenge_id uuid not null references public.operational_entity_native_challenges(challenge_id) on delete restrict,
  verification_algorithm text not null check(verification_algorithm='Ed25519'),
  verification_algorithm_version text not null check(verification_algorithm_version='native-entity-verification-v1'),
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  reason_codes text[] not null,
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
  provenance text not null check(provenance='CYBER_SENTINELS_NATIVE'),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,evidence_digest)
);
create index native_entity_identity_evidence_current_idx on public.native_entity_identity_evidence(enterprise_id,operational_entity_id,verified_at desc);

create table public.operational_entity_native_verification_attempts (
  attempt_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  operational_entity_id text not null,
  challenge_id uuid references public.operational_entity_native_challenges(challenge_id) on delete restrict,
  status text not null check(status in ('VERIFIED','EXPIRED','REPLAYED','REJECTED')),
  reason_codes text[] not null,
  attempt_digest text not null check(attempt_digest ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz not null,
  actor_id uuid,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,attempt_digest)
);

create table public.operational_entity_native_replay_events (
  event_id uuid primary key,
  enterprise_id uuid not null,
  operational_entity_id text not null,
  event_type text not null check(event_type in (
    'MANIFEST_REGISTERED','CREDENTIAL_REGISTERED','CHALLENGE_ISSUED','CHALLENGE_VERIFIED','NATIVE_IDENTITY_VERIFIED',
    'OWNER_CONFIRMED','RUNTIME_BOUND','BUILD_VERIFIED','ENTITY_CHANGED','CREDENTIAL_ROTATED','CREDENTIAL_REVOKED',
    'VERIFICATION_EXPIRED','REVERIFICATION_COMPLETED','ENTITY_SUSPENDED','AUTHORITY_REVOKED','OWNER_REVOKED','MANIFEST_REVOKED'
  )),
  actor_reference text not null,
  attribution text not null check(attribution in ('CUSTOMER_DECISION','CYBER_SENTINELS_INTERPRETATION','RUNTIME_OBSERVATION','HUMAN_REVIEWER_CONCLUSION')),
  evidence_references text[] not null default '{}',
  reason_codes text[] not null default '{}',
  payload jsonb not null default '{}',
  event_digest text not null check(event_digest ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,event_digest)
);
create index operational_entity_native_replay_idx on public.operational_entity_native_replay_events(enterprise_id,operational_entity_id,occurred_at,event_id);

do $$ declare table_name text; begin foreach table_name in array array[
  'operational_entity_owner_bindings','operational_entity_native_credentials','operational_entity_manifests',
  'operational_entity_native_challenges','operational_entity_native_runtime_observations','operational_entity_native_software_observations',
  'operational_entity_native_verifications','native_entity_identity_evidence','operational_entity_native_verification_attempts',
  'operational_entity_native_replay_events'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
end loop; end $$;

create trigger operational_entity_owner_bindings_append_only before update or delete on public.operational_entity_owner_bindings for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_native_runtime_observations_append_only before update or delete on public.operational_entity_native_runtime_observations for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_native_software_observations_append_only before update or delete on public.operational_entity_native_software_observations for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_native_verifications_append_only before update or delete on public.operational_entity_native_verifications for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_native_verification_attempts_append_only before update or delete on public.operational_entity_native_verification_attempts for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_native_replay_events_append_only before update or delete on public.operational_entity_native_replay_events for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.preserve_native_manifest_payload_v1() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Native manifest history is immutable'; end if;
  if old.enterprise_id<>new.enterprise_id or old.operational_entity_id<>new.operational_entity_id or old.manifest_version<>new.manifest_version
    or old.manifest is distinct from new.manifest or old.manifest_digest<>new.manifest_digest or old.signature<>new.signature
    or old.signing_key_id<>new.signing_key_id or old.issued_at<>new.issued_at or old.expires_at<>new.expires_at
    or old.registered_by<>new.registered_by or old.supersedes_manifest_id is distinct from new.supersedes_manifest_id
  then raise exception 'Native manifest signed payload is immutable'; end if;
  return new;
end $$;
create trigger operational_entity_manifests_preserve_payload before update or delete on public.operational_entity_manifests for each row execute function public.preserve_native_manifest_payload_v1();

create or replace function public.preserve_native_evidence_payload_v1() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Native identity evidence is immutable'; end if;
  if old.enterprise_id<>new.enterprise_id or old.operational_entity_id<>new.operational_entity_id or old.verification_id<>new.verification_id
    or old.evidence_type<>new.evidence_type or old.manifest_digest<>new.manifest_digest or old.credential_fingerprint<>new.credential_fingerprint
    or old.signing_key_id<>new.signing_key_id or old.challenge_id<>new.challenge_id or old.verification_algorithm<>new.verification_algorithm
    or old.verification_algorithm_version<>new.verification_algorithm_version or old.verified_at<>new.verified_at or old.expires_at<>new.expires_at
    or old.reason_codes is distinct from new.reason_codes or old.evidence_digest<>new.evidence_digest or old.provenance<>new.provenance
  then raise exception 'Native identity evidence payload is immutable'; end if;
  return new;
end $$;
create trigger native_entity_identity_evidence_preserve_payload before update or delete on public.native_entity_identity_evidence for each row execute function public.preserve_native_evidence_payload_v1();

create or replace function public.register_native_entity_manifest_v1(
  p_manifest_id uuid,
  p_enterprise_id uuid,
  p_operational_entity_id text,
  p_manifest_version text,
  p_manifest jsonb,
  p_manifest_digest text,
  p_signature text,
  p_signing_key_id text,
  p_issued_at timestamptz,
  p_expires_at timestamptz,
  p_registered_by uuid
) returns jsonb language plpgsql security definer set search_path=public as $$
declare prior_manifest_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Native verification service path required'; end if;
  perform 1 from public.operational_entities
  where enterprise_id=p_enterprise_id and entity_id=p_operational_entity_id
  for update;
  if not found then raise exception 'Canonical Operational Entity not found'; end if;

  select manifest_id into prior_manifest_id from public.operational_entity_manifests
  where enterprise_id=p_enterprise_id and operational_entity_id=p_operational_entity_id and status='ACTIVE'
  order by issued_at desc limit 1 for update;
  if prior_manifest_id is not null then
    update public.operational_entity_manifests set status='SUPERSEDED'
    where manifest_id=prior_manifest_id and enterprise_id=p_enterprise_id and operational_entity_id=p_operational_entity_id and status='ACTIVE';
  end if;

  insert into public.operational_entity_manifests(
    manifest_id,enterprise_id,operational_entity_id,manifest_version,manifest,manifest_digest,signature,signing_key_id,
    status,issued_at,expires_at,registered_by,supersedes_manifest_id
  ) values (
    p_manifest_id,p_enterprise_id,p_operational_entity_id,p_manifest_version,p_manifest,p_manifest_digest,p_signature,p_signing_key_id,
    'ACTIVE',p_issued_at,p_expires_at,p_registered_by,prior_manifest_id
  );
  return jsonb_build_object('status','ACTIVE','manifestId',p_manifest_id,'supersedesManifestId',prior_manifest_id);
end $$;
revoke all on function public.register_native_entity_manifest_v1(uuid,uuid,text,text,jsonb,text,text,text,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.register_native_entity_manifest_v1(uuid,uuid,text,text,jsonb,text,text,text,timestamptz,timestamptz,uuid) to service_role;

create or replace function public.consume_native_entity_challenge_v1(
  p_enterprise_id uuid,
  p_operational_entity_id text,
  p_challenge_id uuid,
  p_actor_id uuid,
  p_submitted_at timestamptz,
  p_attempt_digest text,
  p_verification jsonb,
  p_evidence jsonb,
  p_replay jsonb,
  p_memory jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare challenge public.operational_entity_native_challenges%rowtype;
declare existing_verification uuid;
declare replay_event jsonb;
declare memory_event jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Native verification service path required'; end if;
  select * into challenge from public.operational_entity_native_challenges
  where enterprise_id=p_enterprise_id and operational_entity_id=p_operational_entity_id and challenge_id=p_challenge_id
  for update;
  if not found then raise exception 'Native challenge not found'; end if;

  if challenge.status<>'ISSUED' then
    insert into public.operational_entity_native_verification_attempts(enterprise_id,operational_entity_id,challenge_id,status,reason_codes,attempt_digest,submitted_at,actor_id)
    values(p_enterprise_id,p_operational_entity_id,p_challenge_id,'REPLAYED',array['CHALLENGE_REPLAY'],p_attempt_digest,p_submitted_at,p_actor_id)
    on conflict(enterprise_id,attempt_digest) do nothing;
    return jsonb_build_object('status','REPLAYED','reasonCode','CHALLENGE_REPLAY');
  end if;
  if challenge.expires_at<=p_submitted_at then
    update public.operational_entity_native_challenges set status='EXPIRED',consumed_at=p_submitted_at where challenge_id=p_challenge_id;
    insert into public.operational_entity_native_verification_attempts(enterprise_id,operational_entity_id,challenge_id,status,reason_codes,attempt_digest,submitted_at,actor_id)
    values(p_enterprise_id,p_operational_entity_id,p_challenge_id,'EXPIRED',array['EXPIRED_CHALLENGE'],p_attempt_digest,p_submitted_at,p_actor_id)
    on conflict(enterprise_id,attempt_digest) do nothing;
    return jsonb_build_object('status','EXPIRED','reasonCode','EXPIRED_CHALLENGE');
  end if;

  update public.operational_entity_native_challenges set status='VERIFIED',consumed_at=p_submitted_at where challenge_id=p_challenge_id and status='ISSUED';
  if not found then
    return jsonb_build_object('status','REPLAYED','reasonCode','CHALLENGE_REPLAY');
  end if;

  insert into public.operational_entity_native_verifications(
    verification_id,enterprise_id,operational_entity_id,challenge_id,manifest_id,credential_id,status,verified_claims,unverified_claims,
    conflicting_claims,evidence_references,manifest_digest,credential_fingerprint,continuity_result,continuity_fingerprint,
    continuity_snapshot,changed_attributes,runtime_binding,software_provenance,reason_codes,algorithm_version,verified_at,expires_at,verified_by
  ) values (
    (p_verification->>'verificationId')::uuid,p_enterprise_id,p_operational_entity_id,p_challenge_id,(p_verification->>'manifestId')::uuid,
    (p_verification->>'credentialId')::uuid,p_verification->>'status',array(select jsonb_array_elements_text(p_verification->'verifiedClaims')),
    array(select jsonb_array_elements_text(p_verification->'unverifiedClaims')),array(select jsonb_array_elements_text(p_verification->'conflictingClaims')),
    array(select jsonb_array_elements_text(p_verification->'evidenceReferences')),p_verification->>'manifestDigest',p_verification->>'credentialFingerprint',
    p_verification->>'continuityResult',p_verification->>'continuityFingerprint',p_verification->'continuitySnapshot',
    array(select jsonb_array_elements_text(p_verification->'changedAttributes')),p_verification->>'runtimeBinding',p_verification->>'softwareProvenance',
    array(select jsonb_array_elements_text(p_verification->'reasonCodes')),p_verification->>'algorithmVersion',(p_verification->>'verifiedAt')::timestamptz,
    (p_verification->>'expiresAt')::timestamptz,p_actor_id
  );
  existing_verification:=(p_verification->>'verificationId')::uuid;

  insert into public.native_entity_identity_evidence(
    evidence_id,enterprise_id,operational_entity_id,verification_id,evidence_type,manifest_digest,credential_fingerprint,signing_key_id,
    challenge_id,verification_algorithm,verification_algorithm_version,verified_at,expires_at,reason_codes,evidence_digest,provenance
  ) values (
    (p_evidence->>'evidenceId')::uuid,p_enterprise_id,p_operational_entity_id,existing_verification,p_evidence->>'evidenceType',p_evidence->>'manifestDigest',
    p_evidence->>'credentialFingerprint',p_evidence->>'signingKeyId',p_challenge_id,p_evidence->>'verificationAlgorithm',p_evidence->>'verificationAlgorithmVersion',
    (p_evidence->>'verifiedAt')::timestamptz,(p_evidence->>'expiresAt')::timestamptz,array(select jsonb_array_elements_text(p_evidence->'reasonCodes')),
    p_evidence->>'evidenceDigest',p_evidence->>'provenance'
  );

  if p_verification->'runtimeObservation' is not null and p_verification->'runtimeObservation'<>'null'::jsonb then
    insert into public.operational_entity_native_runtime_observations(
      enterprise_id,operational_entity_id,observation,observation_digest,source,observed_at,recorded_by
    ) values (
      p_enterprise_id,p_operational_entity_id,p_verification->'runtimeObservation',p_verification->>'runtimeObservationDigest',
      p_verification->'runtimeObservation'->>'source',(p_verification->'runtimeObservation'->>'observedAt')::timestamptz,p_actor_id
    ) on conflict(enterprise_id,operational_entity_id,observation_digest) do nothing;
  end if;
  if p_verification->'softwareObservation' is not null and p_verification->'softwareObservation'<>'null'::jsonb then
    insert into public.operational_entity_native_software_observations(
      enterprise_id,operational_entity_id,observation,observation_digest,source,observed_at,recorded_by
    ) values (
      p_enterprise_id,p_operational_entity_id,p_verification->'softwareObservation',p_verification->>'softwareObservationDigest',
      p_verification->'softwareObservation'->>'source',(p_verification->'softwareObservation'->>'observedAt')::timestamptz,p_actor_id
    ) on conflict(enterprise_id,operational_entity_id,observation_digest) do nothing;
  end if;

  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,
    received_at,expires_at,payload_hash,canonicalization,hash_algorithm,reason_codes,observed_at,freshness_policy_seconds
  ) values (
    (p_evidence->>'evidenceId')::uuid,(p_evidence->>'evidenceId')::uuid,p_enterprise_id,'cyber_sentinels_native','NATIVE_ENTITY_IDENTITY_PROOF',
    'NORMALIZED_LEDGER',p_evidence,(p_evidence->>'verifiedAt')::timestamptz,(p_evidence->>'expiresAt')::timestamptz,
    case (select entity_type from public.operational_entities where enterprise_id=p_enterprise_id and entity_id=p_operational_entity_id)
      when 'ai_agent' then 'AI_AGENT' when 'device' then 'DEVICE' when 'machine' then 'DEVICE' else 'IDENTITY' end,
    p_operational_entity_id,
    case (select entity_type from public.operational_entities where enterprise_id=p_enterprise_id and entity_id=p_operational_entity_id)
      when 'ai_agent' then 'AI_AGENT' when 'model_endpoint' then 'AI_AGENT' when 'device' then 'DEVICE' when 'machine' then 'DEVICE'
      when 'workload' then 'WORKLOAD' else 'SERVICE' end,
    'NATIVE_ENTITY_IDENTITY_PROOF','CYBER_SENTINELS_NATIVE','cyber_sentinels_native','POSITIVE','HIGH',true,true,
    p_submitted_at,(p_evidence->>'expiresAt')::timestamptz,p_evidence->>'evidenceDigest','JCS','SHA-256',array(select jsonb_array_elements_text(p_evidence->'reasonCodes')),
    (p_evidence->>'verifiedAt')::timestamptz,3600
  );

  insert into public.operational_entity_native_verification_attempts(enterprise_id,operational_entity_id,challenge_id,status,reason_codes,attempt_digest,submitted_at,actor_id)
  values(p_enterprise_id,p_operational_entity_id,p_challenge_id,'VERIFIED',array(select jsonb_array_elements_text(p_verification->'reasonCodes')),p_attempt_digest,p_submitted_at,p_actor_id);
  insert into public.operational_entity_native_replay_events(event_id,enterprise_id,operational_entity_id,event_type,actor_reference,attribution,evidence_references,reason_codes,payload,event_digest,occurred_at)
  values((p_replay->>'eventId')::uuid,p_enterprise_id,p_operational_entity_id,p_replay->>'eventType',p_replay->>'actorReference',p_replay->>'attribution',
    array(select jsonb_array_elements_text(p_replay->'evidenceReferences')),array(select jsonb_array_elements_text(p_replay->'reasonCodes')),p_replay->'payload',p_replay->>'eventDigest',(p_replay->>'occurredAt')::timestamptz);
  for replay_event in select value from jsonb_array_elements(coalesce(p_replay->'additionalEvents','[]'::jsonb)) loop
    insert into public.operational_entity_native_replay_events(event_id,enterprise_id,operational_entity_id,event_type,actor_reference,attribution,evidence_references,reason_codes,payload,event_digest,occurred_at)
    values((replay_event->>'eventId')::uuid,p_enterprise_id,p_operational_entity_id,replay_event->>'eventType',replay_event->>'actorReference',replay_event->>'attribution',
      array(select jsonb_array_elements_text(replay_event->'evidenceReferences')),array(select jsonb_array_elements_text(replay_event->'reasonCodes')),replay_event->'payload',replay_event->>'eventDigest',(replay_event->>'occurredAt')::timestamptz);
  end loop;
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
  values(p_enterprise_id,p_operational_entity_id,coalesce(p_memory->>'domainKey','IDENTITY'),p_memory->>'memoryType',p_memory->>'sourceId',(p_memory->>'occurredAt')::timestamptz,p_memory->'summary')
  on conflict(enterprise_id,memory_type,source_id) do nothing;
  for memory_event in select value from jsonb_array_elements(coalesce(p_memory->'additionalMemories','[]'::jsonb)) loop
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
    values(p_enterprise_id,p_operational_entity_id,coalesce(memory_event->>'domainKey','IDENTITY'),memory_event->>'memoryType',memory_event->>'sourceId',(memory_event->>'occurredAt')::timestamptz,memory_event->'summary')
    on conflict(enterprise_id,memory_type,source_id) do nothing;
  end loop;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_enterprise_id,'NATIVE_ENTITY_IDENTITY_VERIFIED','user:'||p_actor_id::text,'OPERATIONAL_ENTITY',p_operational_entity_id,gen_random_uuid(),
    jsonb_build_object('verificationId',existing_verification,'evidenceId',p_evidence->>'evidenceId','algorithmVersion',p_verification->>'algorithmVersion'));

  if exists(select 1 from public.operational_entity_native_credentials where credential_id=(p_verification->>'credentialId')::uuid and state='PENDING') then
    update public.operational_entity_native_credentials set state='RETIRED',updated_at=p_submitted_at
    where credential_id=(select rotated_from_credential_id from public.operational_entity_native_credentials where credential_id=(p_verification->>'credentialId')::uuid)
      and state='ACTIVE';
    update public.operational_entity_native_credentials set state='ACTIVE',updated_at=p_submitted_at
    where credential_id=(p_verification->>'credentialId')::uuid and state='PENDING';
  end if;
  return jsonb_build_object('status','VERIFIED','verificationId',existing_verification,'evidenceId',p_evidence->>'evidenceId');
end $$;
revoke all on function public.consume_native_entity_challenge_v1(uuid,text,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.consume_native_entity_challenge_v1(uuid,text,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb) to service_role;

comment on table public.operational_entity_manifests is 'Versioned, signed manifests for canonical Operational Entities. No private credentials are stored.';
comment on table public.native_entity_identity_evidence is 'First-party cryptographic identity evidence. Provenance is CYBER_SENTINELS_NATIVE and is never independent corroboration of itself.';
comment on table public.operational_entity_native_challenges is 'Tenant/entity-bound short-lived challenge metadata. Only the nonce hash is persisted.';
