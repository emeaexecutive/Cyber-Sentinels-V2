// Separate local process. No environment files or hosted URLs are read.
import http from 'node:http';
import pg from 'pg';
import {createHash} from 'node:crypto';
if(process.env.TENENTE_LOCAL_PG_PORT!=='55473'||!/^swarm_test_[a-f0-9]+$/.test(process.env.EXECUTION03_DATABASE??''))throw Error('ISOLATED_DATABASE_REQUIRED');
const db=new pg.Client({host:'127.0.0.1',port:55473,user:'postgres',database:process.env.EXECUTION03_DATABASE});await db.connect();
await db.query('create schema execution03_destination; create table execution03_destination.effects (request_key text primary key, tenant_id uuid not null, lease_id text not null, effect_digest text not null, at timestamptz not null default now())');
const server=http.createServer(async(req,res)=>{
 if(req.method!=='POST'||req.url!=='/effect'||req.headers.authorization!=='Bearer '+process.env.EXECUTION03_DESTINATION_KEY){res.writeHead(403).end();return;}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>16384){res.writeHead(413).end();return;}}
 try{
  const {request,leaseId,loseAcknowledgement}=JSON.parse(body);
  if(typeof request?.idempotencyKey!=='string'||!/^10000000-0000-4000-8000-000000000001$/.test(request.enterpriseId)||!/^[a-f0-9]{64}$/.test(leaseId))throw Error('SCOPE');
  // Destination independently checks the committed lease and exact request digest.
  const value={tenantId:request.enterpriseId,transactionId:request.transactionId,entityId:request.operationalEntityId,authorityId:request.authorityId,delegationId:request.delegationId,action:request.action,decisionDigest:request.decisionDigest,idempotencyKey:request.idempotencyKey};
  const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  if(createHash('sha256').update(canonical(value)).digest('hex')!==leaseId)throw Error('DIGEST');
  const row=(await db.query('select document from swarm_private.state where tenant_id=$1',[request.enterpriseId])).rows[0];
  if(row?.document.leases[leaseId]?.state!=='DISPATCHED')throw Error('COMMITTED_DISPATCH_REQUIRED');
  const digest=createHash('sha256').update(body).digest('hex');
  const result=await db.query('insert into execution03_destination.effects(request_key,tenant_id,lease_id,effect_digest) values($1,$2,$3,$4) on conflict do nothing returning request_key',[request.idempotencyKey,request.enterpriseId,leaseId,digest]);
  if(loseAcknowledgement){req.socket.destroy();return;}
  res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({observed:true,inserted:result.rowCount===1,leaseId}));
 }catch{res.writeHead(403).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.send?.({port:server.address().port,pid:process.pid,backendPid:(await db.query('select pg_backend_pid() as pid')).rows[0].pid});
process.on('message',async message=>{if(message==='stop'){await new Promise(resolve=>server.close(resolve));await db.end();process.exit(0);}});
