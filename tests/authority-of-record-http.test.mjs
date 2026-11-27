import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {createHttpToolAdapter,verifyToolDispatch} from '../lib/operational-entities/http-tool-adapter.ts';
import {deriveEnforcementActionDigest,signDestinationObservation} from '../lib/operational-entities/native-enforcement.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';

test('HTTP/MCP execution boundary verifies exact payload, dispatch and bounded destination evidence',async t=>{
 const key=randomBytes(32).toString('hex'),payload={financialAmount:100,tool:'refund',parameters:{customer:'customer:1'}};
 const request={requestId:randomUUID(),enterpriseId:randomUUID(),transactionId:randomUUID(),operationalEntityId:'agent:worker',authorityId:randomUUID(),delegationId:randomUUID(),action:{type:'REFUND',target:'customer:1',environment:'test',payloadDigest:hashCanonical(payload)},decisionDigest:'a'.repeat(64),idempotencyKey:randomUUID(),requestedAt:new Date().toISOString()};
 request.actionDigest=deriveEnforcementActionDigest(request);
 let mode='valid',calls=0;
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  if(!verifyToolDispatch(body,String(req.headers['x-tenente-dispatch-signature']),key)){res.writeHead(403);res.end();return;}
  calls++;const parsed=JSON.parse(body),isMcp=parsed.method==='tools/call';
  if(mode==='redirect'){res.writeHead(302,{location:'http://127.0.0.1:1/forbidden'});res.end();return;}
  if(mode==='oversized'){res.writeHead(200);res.end('x'.repeat(140000));return;}
  const observation=signDestinationObservation({observationId:randomUUID(),enterpriseId:request.enterpriseId,transactionId:request.transactionId,operationalEntityId:request.operationalEntityId,destinationId:'local-tool',action:'REFUND',target:'customer:1',actionDigest:request.actionDigest,idempotencyKey:request.idempotencyKey,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),result:'OBSERVED',destinationReference:'refund:1',sourcePartyId:'local-tool'},key);
  if(mode==='tampered')observation.target='customer:attacker';
  const result={status:'ACCEPTED',adapterReference:'refund:1',acknowledgedAt:new Date().toISOString(),executionClaim:null,runtimeObservation:null,destinationObservation:observation,reasonCodes:['LOCAL_OBSERVED']};
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(isMcp?{jsonrpc:'2.0',id:mode==='wrong-id'?'other':parsed.id,result:{structuredContent:result}}:result));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const config={endpoint:`http://127.0.0.1:${server.address().port}/tool`,tool:'refund',payload,evidenceKey:key,allowLocal:true,transport:'http'};
 await t.test('HTTP succeeds only with the authorized payload',async()=>{assert.equal((await createHttpToolAdapter(config).execute(request)).status,'ACCEPTED');});
 await t.test('MCP binds response ID and verified destination evidence',async()=>{assert.equal((await createHttpToolAdapter({...config,transport:'mcp'}).execute(request)).status,'ACCEPTED');mode='wrong-id';await assert.rejects(createHttpToolAdapter({...config,transport:'mcp'}).execute(request),{code:'MCP_RESPONSE_INVALID'});});
 await t.test('100-to-1000 parameter substitution is blocked before network',async()=>{const before=calls;await assert.rejects(createHttpToolAdapter({...config,payload:{...payload,financialAmount:1000}}).execute(request),{code:'EXECUTION_PAYLOAD_MISMATCH'});assert.equal(calls,before);});
 await t.test('tampered destination observation fails authentication',async()=>{mode='tampered';await assert.rejects(createHttpToolAdapter(config).execute(request),{code:'DESTINATION_EVIDENCE_TAMPERED'});});
 await t.test('redirects are never followed',async()=>{mode='redirect';await assert.rejects(createHttpToolAdapter(config).execute(request));});
 await t.test('response is bounded while streaming',async()=>{mode='oversized';await assert.rejects(createHttpToolAdapter(config).execute(request),{code:'DESTINATION_EVIDENCE_INVALID'});});
 await t.test('non-loopback plaintext and credential-bearing endpoint rejected',()=>{assert.throws(()=>createHttpToolAdapter({...config,endpoint:'http://example.com/tool'}));assert.throws(()=>createHttpToolAdapter({...config,endpoint:'https://user:password@example.com/tool'}));});
 await t.test('forged or expired dispatch never passes destination verification',()=>{
  const body=JSON.stringify({authority:{...request,requestedAt:new Date(Date.now()-61000).toISOString()}});
  const signature=createHmac('sha256',key).update('tenente-dispatch-v1\n').update(body).digest('hex');
  assert.equal(verifyToolDispatch(body,signature,key),false);assert.equal(verifyToolDispatch(body,'f'.repeat(64),key),false);
 });
});
