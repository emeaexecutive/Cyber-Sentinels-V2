-- Proven exposed SECURITY DEFINER writers: called by trusted database triggers,
-- not browser/API RPC clients. Preserve owners, bodies and service execution.
-- Forward-only repair; deliberately not applied to Production by this branch.
revoke execute on function public.ensure_governance_policy(text,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_governance_action_if_needed(uuid,text,uuid,text,text) from public, anon, authenticated;
revoke execute on function public.notification_insert(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.trust_timeline_record_event(jsonb,text,text,text,text,text) from public, anon, authenticated;

grant execute on function public.ensure_governance_policy(text,text,text,text,text) to service_role;
grant execute on function public.create_governance_action_if_needed(uuid,text,uuid,text,text) to service_role;
grant execute on function public.notification_insert(uuid,text,text,text,text,jsonb) to service_role;
grant execute on function public.trust_timeline_record_event(jsonb,text,text,text,text,text) to service_role;
