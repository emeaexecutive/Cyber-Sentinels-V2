import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';

test('account transition RPC prevents self approval, direct edits and missing attribution atomically',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  const read=file=>readFile(new URL('../../'+file,import.meta.url),'utf8');
  await db.exec(await read('tests/fixtures/account-approval-boundary.sql'));
  for(const file of ['202610040002_account_access_approval','20261010110000_employment_access_governance_hardening','20261012084456_audited_account_approval_transition']) await db.exec(await read('supabase/migrations/'+file+'.sql'));
  const admin='11111111-1111-4111-8111-111111111111',subject='22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[admin,'admin@example.test',subject,'subject@example.test']);
  async function as(role,fn){await db.exec('begin; set local role '+role);try{return await fn();}finally{await db.exec('rollback');}}
  await as('service_role',async()=>assert.rejects(db.query("update public.account_access_approvals set status='APPROVED' where user_id=$1",[subject]),/permission denied/));
  await as('service_role',async()=>assert.rejects(db.query("insert into public.account_access_approval_events(user_id,event_type) values($1,'ACCESS_APPROVED')",[subject]),/permission denied/));
  await as('authenticated',async()=>assert.rejects(db.query("select public.set_account_access_status($1,'APPROVED',$2,'forged')",[subject,admin]),/permission denied/));
  await as('service_role',async()=>assert.rejects(db.query("select public.set_account_access_status($1,'APPROVED',$1,'self')",[admin]),/SELF_APPROVAL/));
  for(const [actor,reason] of [[null,'reason'],[admin,' ']]) await as('service_role',async()=>assert.rejects(db.query("select public.set_account_access_status($1,'APPROVED',$2,$3)",[subject,actor,reason]),/ACTOR_AND_REASON/));
  await db.exec('set role service_role');
  await db.query("select public.set_account_access_status($1,'APPROVED',$2,'owner approved qualification')",[subject,admin]);
  await db.exec('reset role');
  const event=(await db.query("select actor_user_id,reason,metadata from public.account_access_approval_events where user_id=$1 and event_type='ACCESS_APPROVED'",[subject])).rows;
  assert.equal(event.length,1);assert.equal(event[0].actor_user_id,admin);assert.equal(event[0].metadata.previous_status,'PENDING');
  await db.query("select public.set_account_access_status($1,'APPROVED',$2,'idempotent retry')",[subject,admin]);
  assert.equal((await db.query("select count(*)::int n from public.account_access_approval_events where event_type='ACCESS_APPROVED'")).rows[0].n,1);
  await assert.rejects(db.query("update public.account_access_approvals set status='APPROVED',approved_by=user_id,reason='direct self' where user_id=$1",[admin]),/SELF_APPROVAL/);
  await assert.rejects(db.query("update public.account_access_approval_events set reason='rewrite'"),/append-only/);
  await db.query("select public.set_account_access_status($1,'REVOKED',$2,'revocation')",[subject,admin]);
  assert.equal((await db.query('select status from public.account_access_approvals where user_id=$1',[subject])).rows[0].status,'REVOKED');
  await db.query('delete from auth.users where id=$1',[admin]);
  assert.equal((await db.query("select count(*)::int n from public.account_access_approval_events where event_type in ('ACCESS_APPROVED','ACCESS_REVOKED') and actor_user_id is null")).rows[0].n,2);
});
