import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
const sql=async file=>readFile(new URL('../../'+file,import.meta.url),'utf8');
const migrations=['202610040001_p0p1_security_closure','202610040002_account_access_approval','202610040003_require_approved_accounts_for_data_api','202610040004_lock_legacy_passport_decision_writes','20261007150222_account_approval_default_deny','20261007150835_canonical_workspace_bootstrap','20261008112858_evidence_download_approval_revalidation','20261010110000_employment_access_governance_hardening'];
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const wa='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',wb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const resources=['canonical_trust_transactions','canonical_trust_transaction_events','trust_memory_index','evidence_objects','operational_entities','authority_delegations','enterprise_policies','decision_receipts','replay_events','provider_configuration','webhook_deliveries','audit_surfaces','model_approvals'];
test('all approval states compose with tenant isolation, writes, RPCs, storage and bootstrap',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(await sql('tests/fixtures/account-approval-boundary.sql'));
 await db.exec(`create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb->>'role' $$;`);
 for(const table of resources){await db.exec(`create table public.${table}(id uuid primary key default gen_random_uuid(),enterprise_id uuid not null,value text); alter table public.${table} enable row level security; grant select,insert,update,delete on public.${table} to authenticated; create policy tenant on public.${table} for all to authenticated using(enterprise_id::text=auth.jwt()->>'tenant') with check(enterprise_id::text=auth.jwt()->>'tenant');`);}
 await db.exec("alter table public.trust_memory_index add column subject_id text, add column domain_key text, add column memory_type text, add column source_id text, add column occurred_at timestamptz, add column summary jsonb default '{}', add column correlation_id uuid; alter table public.trust_memory_index add constraint trust_memory_index_employment_test_uidx unique(enterprise_id,memory_type,source_id);");
 await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)',[a,'a@example.test',b,'b@example.test']);
 for(const file of migrations) await db.exec(await sql('supabase/migrations/'+file+'.sql'));
 assert.equal((await db.query("select has_sequence_privilege('authenticated','public.approval_sequence_probe_seq','USAGE') allowed")).rows[0].allowed,true);
 assert.equal((await db.query("select has_sequence_privilege('authenticated','public.approval_sequence_probe_seq','SELECT') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select 'security_invoker=true'=any(reloptions) enabled from pg_class where oid='public.approval_workspace_view'::regclass")).rows[0].enabled,true);
 assert.equal((await db.query("select has_table_privilege('authenticated','public.approval_workspace_materialized','SELECT') allowed")).rows[0].allowed,false);
 await db.query('insert into public.trust_workspaces(id,created_by,name) values($1,$2,$3),($4,$5,$6)',[wa,a,'A',wb,b,'B']);
 // Replace synthetic tenant claims with the real database membership predicate.
 for(const table of resources){await db.exec(`drop policy tenant on public.${table};create policy tenant on public.${table} for all to authenticated using(public.user_can_access_trust_workspace(enterprise_id)) with check(public.user_can_access_trust_workspace(enterprise_id));`);await db.query(`insert into public.${table}(enterprise_id,value) values($1,'A'),($2,'B')`,[wa,wb]);}
 await db.query('insert into public.verification_cases(id,owner_email) values($1,$2),($3,$4)',[wa,'a@example.test',wb,'b@example.test']);
 await db.exec(`insert into storage.buckets(id,public) values('evidence-files',false); grant usage on schema storage to authenticated;`);
 await db.query("insert into storage.objects(bucket_id,name) values('evidence-files',$1),('evidence-files',$2)",[wa+'/proof',wb+'/proof']);
 const claims={sub:a,email:'a@example.test',role:'authenticated',tenant:wb,approval:'APPROVED',admin:true,user_metadata:{approval:'APPROVED',role:'admin',workspace:wb,tenant:wb,owner:b,authority:'all'}};
 async function asUser(run){await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[a,JSON.stringify(claims)]);await db.exec('set local role authenticated');await run();}finally{await db.exec('rollback');}}
 for(const state of ['PENDING','REJECTED','SUSPENDED','REVOKED','APPROVED'])await t.test(state,async()=>{
   await db.query('update public.account_access_approvals set status=$1 where user_id=$2',[state,a]);
   const approved=state==='APPROVED';
   await asUser(async()=>{assert.equal((await db.query('select public.security_closure_user_approved() ok')).rows[0].ok,approved);
     for(const table of ['trust_workspaces','workspace_members',...resources]){const rows=(await db.query(`select * from public.${table}`)).rows;assert.equal(rows.length,approved?1:0,table);if(approved)assert.ok(!rows.some(r=>r.enterprise_id===wb||r.workspace_id===wb||r.id===wb),table);}
    assert.equal((await db.query('select * from public.approval_workspace_view')).rows.length,approved?1:0);
    await db.exec('savepoint materialized_view_denied');
    await assert.rejects(db.query('select * from public.approval_workspace_materialized'),/permission denied/);
    await db.exec('rollback to savepoint materialized_view_denied');
     assert.equal((await db.query('select * from storage.objects')).rows.length,0);
     for(const op of ['storage.object.get_authenticated','storage.object.sign','storage.object.sign_many','storage.render.image_authenticated','storage.s3.object.get']) {
       await db.query("select set_config('storage.operation',$1,true)",[op]);
       assert.equal((await db.query('select * from storage.objects')).rows.length,0,op);
     }
     await db.exec("select set_config('storage.operation','storage.object.list',true)");
     assert.equal((await db.query('select * from storage.objects')).rows.length,approved?1:0);
    if(approved)assert.equal((await db.query('insert into public.approval_sequence_probe(enterprise_id) values($1) returning id',[wa])).rows.length,1);
    else {await db.exec('savepoint denied_sequence');await assert.rejects(db.query('insert into public.approval_sequence_probe(enterprise_id) values($1)',[wa]),/row-level security/);await db.exec('rollback to savepoint denied_sequence');}
     assert.equal((await db.query('select status from public.account_access_approvals')).rows.length,1);
   });
   await asUser(async()=>{
     for(const tenant of [wa,wb]) {
       const allowed=approved&&tenant===wa;
       await db.exec("select set_config('storage.operation','storage.object.upload',true)");
       await db.exec('savepoint storage_insert');
       const insert=()=>db.query("insert into storage.objects(bucket_id,name) values('evidence-files',$1) returning name",[tenant+'/new-proof']);
       if(allowed)assert.equal((await insert()).rows.length,1);
       else await assert.rejects(insert(),/row-level security|permission denied/);
       await db.exec('rollback to savepoint storage_insert');
       await db.exec("select set_config('storage.operation','storage.object.upload_update',true)");
       assert.equal((await db.query("update storage.objects set name=$1 where name=$2 returning name",[tenant+'/renamed',tenant+'/proof'])).rows.length,allowed?1:0);
       await db.exec("select set_config('storage.operation','storage.object.delete_many',true)");
       assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[tenant+'/renamed'])).rows.length,allowed?1:0);
     }
     for(const table of resources) {
       await db.exec('savepoint wrong_tenant');
       await assert.rejects(db.query(`insert into public.${table}(enterprise_id,value) values($1,'forged')`,[wb]),/row-level security|permission denied/);
       await db.exec('rollback to savepoint wrong_tenant');
       assert.equal((await db.query(`update public.${table} set value='forged' where enterprise_id=$1 returning id`,[wb])).rows.length,0);
       assert.equal((await db.query(`delete from public.${table} where enterprise_id=$1 returning id`,[wb])).rows.length,0);
     }
   });
   for(const operation of ['insert','update','delete'])await asUser(async()=>{
     for(const table of resources){if(operation==='insert'){if(approved)await db.query(`insert into public.${table}(enterprise_id,value) values($1,'new')`,[wa]);else {await db.exec('savepoint denied');await assert.rejects(db.query(`insert into public.${table}(enterprise_id,value) values($1,'new')`,[wa]),/row-level security|permission denied/);await db.exec('rollback to savepoint denied');}}
       else {const rows=await db.query(operation==='update'?`update public.${table} set value='changed' returning id`:`delete from public.${table} returning id`);assert.equal(rows.rows.length,approved?1:0,table+' '+operation);}}
   });
   if(!approved){await asUser(async()=>{await assert.rejects(db.query('select public.trust_graph_statistics_v1($1)',[wa]),/ACCESS_APPROVAL_REQUIRED/);});await asUser(async()=>{await assert.rejects(db.query('insert into public.trust_workspaces(id,created_by,name) values(gen_random_uuid(),$1,$2)',[a,'unauthorized']),/row-level security/);});}
   else {await asUser(async()=>{const rows=await db.query('insert into public.trust_workspaces(id,created_by,name) values(gen_random_uuid(),$1,$2) returning id',[a,'approved']);assert.equal(rows.rows.length,1);assert.equal((await db.query('select count(*)::int n from public.workspace_members where workspace_id=$1',[rows.rows[0].id])).rows[0].n,1);});}
   await asUser(async()=>{await assert.rejects(db.query('update public.account_access_approvals set status=$1 where user_id=$2',['APPROVED',a]),/permission denied/);});
 });
 await t.test('no public table or customer view escapes the approval policy',async()=>{const result=await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname<>'account_access_approvals' and not exists(select 1 from pg_policy p where p.polrelid=c.oid and p.polname='customer approval required' and not p.polpermissive)`);assert.deepEqual(result.rows,[]);});
 await t.test('approval audit events cannot be rewritten or deleted',async()=>{const event=(await db.query('select id from public.account_access_approval_events limit 1')).rows[0];assert.ok(event);await assert.rejects(db.query('update public.account_access_approval_events set reason=$1 where id=$2',['rewritten',event.id]),/append-only/);await assert.rejects(db.query('delete from public.account_access_approval_events where id=$1',[event.id]),/append-only/);});
 await t.test('canonical employment events project into the existing Trust Memory index',async()=>{await db.query("insert into public.trust_events(event_id,enterprise_id,event_type,subject_id,workflow_id,occurred_at,evidence_references,event_hash,correlation_id) values(gen_random_uuid(),$1,'governance.employment_decision.opened','candidate:case-1',$2,now(),array['evidence:1'],repeat('a',64),gen_random_uuid())",[wa,'cccccccc-cccc-4ccc-8ccc-cccccccccccc']);const memory=(await db.query("select domain_key,memory_type,summary->>'eventHash' event_hash from public.trust_memory_index where enterprise_id=$1 and subject_id='candidate:case-1'",[wa])).rows[0];assert.equal(memory.domain_key,'EMPLOYMENT');assert.equal(memory.memory_type,'GOVERNANCE_EMPLOYMENT_DECISION_OPENED');assert.equal(memory.event_hash,'a'.repeat(64));});
 await t.test('account erasure anonymizes actor and subject IDs without deleting approval history',async()=>{const c='33333333-3333-4333-8333-333333333333';await db.query('insert into auth.users(id,email) values($1,$2)',[c,'c@example.test']);await db.query("insert into public.account_access_approval_events(user_id,event_type,actor_user_id,reason) values($1,'ACCESS_APPROVED',$1,'Approved for retention test')",[c]);const event=(await db.query("select id from public.account_access_approval_events where user_id=$1 and event_type='ACCESS_APPROVED'",[c])).rows[0];assert.ok(event);await db.query('delete from auth.users where id=$1',[c]);const retained=(await db.query('select user_id,actor_user_id,event_type,reason from public.account_access_approval_events where id=$1',[event.id])).rows[0];assert.equal(retained.user_id,null);assert.equal(retained.actor_user_id,null);assert.equal(retained.event_type,'ACCESS_APPROVED');assert.equal(retained.reason,'Approved for retention test');});
});
