-- Supabase installs pgcrypto in the extensions schema. These routines use
-- digest() while deliberately pinning their search_path; include extensions
-- so the cryptographic primitive remains resolvable at runtime.

alter function public.normalize_legacy_evidence_object_v1()
  set search_path = public, extensions;

alter function public.persist_trust_dna_v2(jsonb,jsonb)
  set search_path = public, extensions;
alter function public.append_replay_event_internal_v2(jsonb)
  set search_path = public, extensions;
alter function public.persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid)
  set search_path = public, extensions;
alter function public.persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid)
  set search_path = public, extensions;
alter function public.append_serious_incident_record_v1(uuid,uuid,text,jsonb,uuid,uuid)
  set search_path = public, extensions;

alter function public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb)
  set search_path = public, extensions;
alter function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid)
  set search_path = public, extensions;
alter function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  set search_path = public, extensions;
alter function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  set search_path = public, extensions;
alter function public.request_canonical_external_execution_v1(uuid,uuid,uuid,uuid,boolean)
  set search_path = public, extensions;
alter function public.record_canonical_external_acknowledgement_v1(uuid,uuid,uuid,uuid,text,timestamptz)
  set search_path = public, extensions;
alter function public.record_canonical_external_outcome_v1(uuid,uuid,uuid,uuid,text,text,timestamptz,text)
  set search_path = public, extensions;

alter function public.bind_native_enforcement_decision_v1(uuid,uuid,uuid,text,uuid,timestamptz)
  set search_path = public, extensions;
alter function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb)
  set search_path = public, extensions;
alter function public.persist_native_enforcement_correlation_v1(uuid,uuid,text,uuid,uuid,jsonb)
  set search_path = public, extensions;
