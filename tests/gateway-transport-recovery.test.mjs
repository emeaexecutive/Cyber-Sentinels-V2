import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedText } from '../lib/qualification/bounded-body.ts';
import { RestrictedPreviewClient } from '../lib/qualification/restricted-preview-client.ts';
import { POST } from '../app/api/restricted-preview/v1/execute/route.ts';
test('chunked oversized input is cancelled before the rest of the body is allocated',async()=>{
  let cancelled=false;
  const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024));},cancel(){cancelled=true;}});
  await assert.rejects(readBoundedText(body,1500),/BODY_TOO_LARGE/);assert.equal(cancelled,true);
});
test('client retries carry the same persistent key; explicit logical requests can differ',async()=>{
  const prior={...process.env};const keys=[];
  process.env.ACCEPTANCE_GATEWAY_URL='https://preview.example.test/api/restricted-preview/v1/execute';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_ACCESS_TOKEN;
  try{
    const client=new RestrictedPreviewClient({gatewayUrl:process.env.ACCEPTANCE_GATEWAY_URL,runId:'run:1',capabilityToken:'synthetic',fetchImpl:async(_url,init)=>{keys.push(init.headers['idempotency-key']);return Response.json({ok:true});}});
    await client.execute('qualification.schema.read',{});await client.execute('qualification.schema.read',{});await client.execute('qualification.schema.read',{},'request:another');
    assert.equal(keys[0],keys[1]);assert.notEqual(keys[0],keys[2]);
  }finally{for(const k of Object.keys(process.env))if(!(k in prior))delete process.env[k];Object.assign(process.env,prior);}
});
test('missing Vercel environment does not activate the restricted gateway in production',async()=>{
  const enabled=process.env.RESTRICTED_PREVIEW_ENABLED,env=process.env.VERCEL_ENV;
  process.env.RESTRICTED_PREVIEW_ENABLED='true';delete process.env.VERCEL_ENV;
  try{const r=await POST(new Request('https://example.test/api/restricted-preview/v1/execute',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json','x-acceptance-run-id':'run:1'},body:'{"operation":"qualification.schema.read","payload":{}}'}));assert.equal(r.status,404);assert.equal((await r.json()).error,'GATEWAY_PREVIEW_ONLY');}
  finally{if(enabled===undefined)delete process.env.RESTRICTED_PREVIEW_ENABLED;else process.env.RESTRICTED_PREVIEW_ENABLED=enabled;if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;}
});
