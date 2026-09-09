-- Run only on Staging agpyhygpfmppjkxwcpac. All synthetic writes roll back.
begin;
create function pg_temp.qualify_v1() returns jsonb language plpgsql security invoker as $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid();
 ta uuid:=gen_random_uuid(); tb uuid:=gen_random_uuid(); da uuid:=gen_random_uuid(); db uuid:=gen_random_uuid(); ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid();
 t jsonb; d jsonb; review jsonb; result jsonb; row_data jsonb; replay_data jsonb; memory_data jsonb;
 denied boolean; n int; original_role text:=current_user;
begin
 begin
 insert into public.trust_workspaces(id,name,slug,created_by) values(a,'V1 synthetic qualification A','v1-qualification-'||a,ua),(b,'V1 synthetic qualification B','v1-qualification-'||b,ub);
 t:=jsonb_build_object('enterpriseId',a,'transactionId',ta,'actorId',ua,'actorType','human','subjectType','HUMAN','subjectId',ua::text,'workflowId','synthetic-qualification','actionType','qualification','actionPurpose','staging release verification','actionResource','synthetic','actionEnvironment','staging','requestDigest',repeat('a',64),'idempotencyKey',ta::text,'correlationId',ca,'requestedAt',now()-interval '1 minute','decision','ALLOW','trustState','verified','decisionId',da,'authorityReference','synthetic-qualification','policyId','synthetic-qualification','policyVersion','1','policyHash',repeat('b',64),'evidenceDigest',repeat('c',64),'evidenceComplete',true,'evidenceFresh',true,'reasonCodes',jsonb_build_array('STAGING_QUALIFICATION'),'materialChange',true,'evidenceIndependence','insufficient');
 d:=jsonb_build_object('decisionId',da,'subject',jsonb_build_object('type','HUMAN','id',ua),'decisionType','provider','outcome','ALLOW','trustState','verified','policyId','synthetic-qualification','policyVersion','1','correlationId',ca,'deterministicDigest',repeat('d',64),'createdAt',now()-interval '1 minute');
 execute 'set local role service_role';
 perform public.persist_canonical_trust_transaction_decision_v1(t,d);
 perform public.persist_canonical_trust_transaction_decision_v1(t||jsonb_build_object('enterpriseId',b,'transactionId',tb,'actorId',ub,'subjectId',ub::text,'decisionId',db,'correlationId',cb,'idempotencyKey',tb::text),d||jsonb_build_object('decisionId',db,'subject',jsonb_build_object('type','HUMAN','id',ub),'correlationId',cb));
 review:=jsonb_build_object('originalDecision','ALLOW','policyVersion','1','decisionReasonCodes',jsonb_build_array('STAGING_QUALIFICATION'),'evaluationStatus','CONTRADICTED','adjudicatedOutcome','DENY','providerOutcome','FAILED','runtimeOutcome','FAILED','destinationOutcome','FAILED','humanOverride',null);
 perform public.attach_canonical_decision_outcome_review_v1(a,ta,ua,review);
 perform public.attach_canonical_decision_outcome_review_v1(b,tb,ub,review);
 perform public.append_canonical_trust_transaction_replay_v1(a,ta,ua,ca);
 perform public.emit_canonical_trust_transaction_memory_v1(a,ta,ua,ca);
 select to_jsonb(x) into row_data from public.canonical_trust_transactions x where enterprise_id=a and transaction_id=ta;
 if row_data->>'decision'<>'ALLOW' or row_data#>>'{decision_outcome_review,adjudicatedOutcome}'<>'DENY' or row_data#>>'{decision_outcome_review,evaluationStatus}'<>'CONTRADICTED' then raise exception 'Persisted review assertion failed'; end if;
 select replay_summary::jsonb into replay_data from public.trust_replay_sessions where id=(row_data->>'replay_reference')::uuid;
 if replay_data->>'originalDecision'<>'ALLOW' or replay_data#>>'{decisionOutcomeReview,adjudicatedOutcome}'<>'DENY' then raise exception 'Replay assertion failed'; end if;
 select jsonb_agg(jsonb_build_object('type',memory_type,'occurredAt',occurred_at,'summary',summary) order by occurred_at) into memory_data from public.trust_memory_index where enterprise_id=a and source_id=ta::text;
 if jsonb_array_length(memory_data)<>2 or memory_data#>>'{0,type}'<>'CANONICAL_TRUST_TRANSACTION' or memory_data#>>'{1,type}'<>'DECISION_OUTCOME_REVIEW' or memory_data#>>'{1,summary,laterAdjudication,adjudicatedOutcome}'<>'DENY' then raise exception 'Memory chronology assertion failed'; end if;
 denied:=false;
 begin update public.canonical_trust_transactions set decision='DENY' where transaction_id=ta and enterprise_id=a; exception when others then if sqlerrm ilike '%immutable%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Original decision mutation was allowed'; end if;
 denied:=false;
 begin perform public.attach_canonical_decision_outcome_review_v1(a,tb,ua,review); exception when others then if sqlerrm ilike '%Cross-tenant%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Cross-tenant attachment allowed'; end if;
 denied:=false;
 begin perform public.persist_canonical_trust_transaction_decision_v1(t||jsonb_build_object('transactionId',gen_random_uuid(),'idempotencyKey',gen_random_uuid()::text,'previousTransactionId',tb),d); exception when others then if sqlerrm ilike '%tenant mismatch%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Cross-tenant linkage allowed'; end if;
 execute 'set local role '||quote_ident(original_role);
 perform set_config('request.jwt.claim.sub',ua::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.canonical_trust_transactions where enterprise_id=a and transaction_id=ta;
 if n<>1 or current_user<>'authenticated' or auth.uid()<>ua then raise exception 'RLS positive control failed'; end if;
 select count(*) into n from public.canonical_trust_transactions where enterprise_id=b and transaction_id=tb;
 if n<>0 then raise exception 'Cross-tenant review visible'; end if;
 denied:=false;
 begin perform public.attach_canonical_decision_outcome_review_v1(b,tb,ua,review); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Authenticated attachment RPC allowed'; end if;
 result:=jsonb_build_object('outcomeReview','PASS','tenantIsolation','PASS','rlsEffectiveRole',current_user,'ownRowVisible',true,'otherTenantRowVisible',false,'authenticatedAttachmentDenied',true,'crossTenantLinkageDenied',true,'originalDecisionImmutable',true,'row',row_data,'replay',replay_data,'memory',memory_data);
 execute 'set local role '||quote_ident(original_role);
 raise exception using errcode='PZ001',message='Rollback successful synthetic qualification';
 exception when sqlstate 'PZ001' then null;
 end;
 if exists(select 1 from public.trust_workspaces where id in(a,b)) or exists(select 1 from public.canonical_trust_transactions where transaction_id in(ta,tb)) then raise exception 'Cleanup failed'; end if;
 return result||jsonb_build_object('cleanup','PASS');
end $$;
select pg_temp.qualify_v1() as qualification;
rollback;
