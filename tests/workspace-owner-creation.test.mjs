import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const source=ts.createSourceFile('page.tsx',readFileSync(new URL('../app/workspace/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const bootstrapMigration=readFileSync(new URL('../supabase/migrations/20261007150835_canonical_workspace_bootstrap.sql',import.meta.url),'utf8');
const action=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createWorkspace');
assert.ok(action);
const executable=ts.transpileModule(`${action.getText(source)}; createWorkspace`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;

function fixture({authenticated=true,insertError=null}={}) {
  const writes=[],ownerMemberships=[];
  const db={auth:{async getUser(){return {data:{user:authenticated?{id:'owner-user'}:null}};}},from(table){return {insert(row){
    writes.push({table,row});
    if(table==='trust_workspaces'&&!insertError)ownerMemberships.push({workspace_id:row.id,user_id:row.created_by,role:'owner'});
    const result=Promise.resolve({error:table==='trust_workspaces'?insertError:null});
    result.select=()=>{throw new Error('Tenant read policy cannot resolve the new row within INSERT RETURNING');};
    return result;
  }};}};
  const createWorkspace=vm.runInNewContext(executable,{crypto:webcrypto,createClient:async()=>db,slugifyWorkspaceName:name=>name.toLowerCase().replaceAll(' ','-'),redirect(location){const error=new Error('Navigation');error.location=location;throw error;}});
  const form=new FormData();form.set('name','Customer Zero Isolation');form.set('description','Controlled release qualification');
  return {writes,ownerMemberships,run:()=>createWorkspace(form)};
}

test('database trigger creates the owner membership with the workspace',()=>{
  assert.match(bootstrapMigration,/after insert on public\.trust_workspaces[\s\S]*execute function private\.establish_workspace_owner_membership\(\)/i);
  assert.match(bootstrapMigration,/values \(new\.id, new\.created_by, 'owner'\)/i);
  assert.match(bootstrapMigration,/create unique index if not exists workspace_members_workspace_user_uidx/i);
});

test('workspace form relies on the atomic database owner-membership trigger',async()=>{
  const {writes,ownerMemberships,run}=fixture();
  await assert.rejects(run(),error=>error.location===`/workspace/${writes[0].row.id}`);
  assert.deepEqual(writes.map(write=>write.table),['trust_workspaces']);
  assert.match(writes[0].row.id,/^[a-f0-9-]{36}$/);
  assert.equal(writes[0].row.created_by,'owner-user');
  assert.deepEqual(ownerMemberships,[{workspace_id:writes[0].row.id,user_id:'owner-user',role:'owner'}]);
});

test('failed workspace insert does not create membership or navigate to a nonexistent workspace',async()=>{
  const {writes,ownerMemberships,run}=fixture({insertError:{code:'42501'}});
  await assert.rejects(run(),error=>error.location==='/workspace?workspace_error=create_failed');
  assert.equal(writes.length,1);
  assert.deepEqual(ownerMemberships,[]);
});

test('unauthenticated workspace creation is rejected before any write',async()=>{
  const {writes,run}=fixture({authenticated:false});
  await assert.rejects(run(),error=>error.location==='/login?next=/workspace');
  assert.equal(writes.length,0);
});
