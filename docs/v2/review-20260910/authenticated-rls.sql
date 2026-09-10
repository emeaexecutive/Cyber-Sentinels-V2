begin;
select set_config('request.jwt.claims','{"sub":"a116afe9-883b-47b4-a600-26d5d5a5882a","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.incident_evidence_links where incident_id='fc75985b-9363-4033-8c99-cbbc5076acc9')<>8 then raise exception 'Owner authenticated read failed'; end if;
 begin insert into public.incident_evidence_links(id) values(gen_random_uuid()); raise exception 'Direct write unexpectedly permitted'; exception when insufficient_privilege then null; end;
 begin perform public.persist_operational_incident_v2(null,null,null,null,'open','{}'); raise exception 'RPC unexpectedly permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"79d52689-68e4-4f88-b42b-ec51ee5d7ec1","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.incident_evidence_links where enterprise_id='f8deb39c-b626-4755-9202-bb58be3f8c94') then raise exception 'Cross tenant link read'; end if;
 if exists(select 1 from public.incident_regulatory_assessments where id='fc75985b-9363-4033-8c99-cbbc5076acc9') then raise exception 'Cross tenant incident read'; end if;
 if exists(select 1 from public.incident_submission_packages where incident_id='fc75985b-9363-4033-8c99-cbbc5076acc9') then raise exception 'Cross tenant export read'; end if;
end $$;
reset role;
rollback;
select 'PASS' as result,'authenticated, actual Staging workspace ownership and RLS' as role_test,
(select relrowsecurity from pg_class where oid='public.incident_evidence_links'::regclass) as rls,
(select count(*) from pg_constraint where conrelid='public.incident_evidence_links'::regclass and contype='f') as foreign_keys,
has_function_privilege('authenticated','public.persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') as authenticated_rpc,
has_function_privilege('anon','public.persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') as anon_rpc,
has_function_privilege('service_role','public.persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb)','execute') as service_rpc;
