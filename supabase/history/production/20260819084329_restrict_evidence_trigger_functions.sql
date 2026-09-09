revoke all on function public.materialize_consent_receipt_evidence_v1() from public, anon, authenticated;
revoke all on function public.materialize_provider_observation_evidence_v1() from public, anon, authenticated;
grant execute on function public.materialize_consent_receipt_evidence_v1() to service_role;
grant execute on function public.materialize_provider_observation_evidence_v1() to service_role;
