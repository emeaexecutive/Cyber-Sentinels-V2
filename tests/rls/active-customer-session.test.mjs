import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
const sql=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const session='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('customer sessions compose with approval, tenant reads, writes and audit RPCs',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(await sql('tests/fixtures/account-approval-boundary.sql'));
 await db.exec("create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz); create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;");
 for(const name of ['202610040001_p0p1_security_closure','202610040002_account_access_approval','202610040003_require_approved_accounts_for_data_api','20261007150222_account_approval_default_deny','20261007150835_canonical_workspace_bootstrap','20261012122704_require_active_customer_sessions'])await db.exec(await sql('supabase/migrations/'+name+'.sql'));
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[user,'session-a@example.test',other,'session-b@example.test']);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,user,foreign,other]);
 await db.query("insert into public.trust_workspaces(id,created_by,name) values($1,$2,'own'),($3,$4,'other')",[session,user,foreign,other]);
 async function asUser(sid,run){await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[user,JSON.stringify({sub:user,role:'authenticated',session_id:sid})]);await db.exec('set local role authenticated');await run();}finally{await db.exec('rollback');}}
 await t.test('pending session sees own status and records denied login, without tenant access',()=>asUser(session,async()=>{
  assert.equal((await db.query('select user_id from public.account_access_approvals')).rows.length,1);
  assert.equal((await db.query('select * from public.trust_workspaces')).rows.length,0);
  await db.query('select public.record_account_access_attempt(false)');
 }));
 await db.query("update public.account_access_approvals set status='APPROVED' where user_id=$1",[user]);
 await t.test('active approved session sees only own tenant',()=>asUser(session,async()=>{
  assert.deepEqual((await db.query('select name from public.trust_workspaces')).rows,[{name:'own'}]);
  await db.query('select public.record_account_access_attempt(true)');
 }));
 for(const [label,sid] of [['missing',undefined],['malformed','not-a-uuid'],['foreign',foreign],['absent','cccccccc-cccc-4ccc-8ccc-cccccccccccc']])await t.test(label+' session denies reads and audit writes',()=>asUser(sid,async()=>{
  assert.equal((await db.query('select public.security_closure_user_approved() ok')).rows[0].ok,false);
  assert.equal((await db.query('select user_id from public.account_access_approvals')).rows.length,0);
  assert.equal((await db.query('select * from public.trust_workspaces')).rows.length,0);
  await assert.rejects(db.query('select public.record_account_access_attempt(false)'),e=>e.code==='42501');
 }));
 await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[session]);
 await t.test('expired session denies approved customer',()=>asUser(session,async()=>assert.equal((await db.query('select public.security_closure_user_approved() ok')).rows[0].ok,false)));
 await db.query('delete from auth.sessions where id=$1',[session]);
 await t.test('logout deletion denies retained claims and tenant writes',()=>asUser(session,async()=>{
  assert.equal((await db.query('select * from public.trust_workspaces')).rows.length,0);
  await assert.rejects(db.query('insert into public.trust_workspaces(name,created_by) values($1,$2)',['forbidden',user]),e=>e.code==='42501');
 }));
 await t.test('session data and anonymous helper execution remain private',async()=>{
  assert.equal((await db.query("select has_table_privilege('authenticated','auth.sessions','select') ok")).rows[0].ok,false);
  assert.equal((await db.query("select has_function_privilege('anon','session_security.current_session_active()','execute') ok")).rows[0].ok,false);
 });
});
