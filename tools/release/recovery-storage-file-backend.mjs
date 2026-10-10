// Runs only inside the pinned isolated Storage image. Rehydrates bytes at their
// original versions through Supabase's own file adapter, without changing SQL metadata.
import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';import{createHash,createHmac,randomUUID}from'node:crypto';
import{assertIsolatedStorage,fileDigest,sha256}from'./recovery-storage.mjs';
const [directory,identityFile,output]=process.argv.slice(2),url='http://127.0.0.1:5002';assertIsolatedStorage(url);
if(process.env.STORAGE_BACKEND!=='file'||process.env.FILE_STORAGE_BACKEND_PATH!=='/var/lib/storage'||process.env.GLOBAL_S3_BUCKET!=='recovery-payload')throw new Error('Reviewed local file-backend configuration required');
const raw=fs.readFileSync(path.join(directory,'storage-manifest.json'),'utf8');if(sha256(raw)!==fs.readFileSync(path.join(directory,'storage-manifest.sha256'),'utf8').trim())throw new Error('Manifest checksum mismatch');
const manifest=JSON.parse(raw),identities=JSON.parse(fs.readFileSync(identityFile));
if(manifest.status!=='PASS'||manifest.buckets.some(b=>b.versioning_status&&b.versioning_status!=='DISABLED'))throw new Error('Complete versioning-disabled payload profile required');
const require=createRequire('/app/package.json');
const {FileBackend}=require('/app/dist/storage/backend/file.js');
const {TenantLocation}=require('/app/dist/storage/locator.js');
const {withOptionalVersion}=require('/app/dist/storage/backend/adapter.js');
const adapter=new FileBackend(),locator=new TenantLocation(process.env.GLOBAL_S3_BUCKET);
const report={status:'BLOCKED',scope:'ACTUAL_ARCHIVED_PRODUCTION_PAYLOADS_IN_LOCAL_FILE_BACKEND',checks:[],productionConnections:0,credentialsRetained:false,objectCount:manifest.objects.length,bucketCount:manifest.buckets.length};
const token=claims=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),b=Buffer.from(JSON.stringify({iss:'supabase',aud:'authenticated',role:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...claims})).toString('base64url');return h+'.'+b+'.'+createHmac('sha256',process.env.AUTH_JWT_SECRET).update(h+'.'+b).digest('base64url');};
function check(name,expected,actual,extra={}){const pass=JSON.stringify(expected)===JSON.stringify(actual);report.checks.push({name,expected,actual,status:pass?'PASS':'FAIL',...extra});if(!pass)throw new Error('Storage gate failed: '+name);}
async function get(object,key,route='/object/authenticated/'){const r=await fetch(url+route+encodeURIComponent(object.bucket_id)+'/'+object.name.split('/').map(encodeURIComponent).join('/'),{headers:key?{authorization:'Bearer '+key,apikey:process.env.ANON_KEY}:{},redirect:'error',signal:AbortSignal.timeout(30000)});return r;}
try{
 // Verify the complete corpus before the first byte is written to the backend.
 for(const o of manifest.objects){const expected='objects/'+sha256(JSON.stringify([o.bucket_id,o.name]));if(o.file!==expected)throw new Error('Unsafe payload path');const source=fs.realpathSync(path.join(directory,o.file));if(!source.startsWith(fs.realpathSync(directory)+path.sep))throw new Error('Payload escapes manifest directory');const digest=await fileDigest(source);if(digest.sha256!==o.sha256||digest.bytes!==o.bytes)throw new Error('Payload checksum mismatch');}
 for(const o of manifest.objects){
  const key=locator.getKeyLocation({tenantId:process.env.TENANT_ID,bucketId:o.bucket_id,objectName:o.name});
  const relative=withOptionalVersion(locator.getRootLocation()+'/'+key,o.version),file=path.resolve(process.env.FILE_STORAGE_BACKEND_PATH,relative);
  if(!file.startsWith(path.resolve(process.env.FILE_STORAGE_BACKEND_PATH)+path.sep))throw new Error('Backend path escapes dedicated volume');
  check('Fresh backend has no existing payload',false,fs.existsSync(file),{objectId:o.id});
  const initial=await get(o,process.env.SERVICE_KEY);report.checks.push({name:'Missing-file HTTP diagnostic',httpStatus:initial.status,status:'OBSERVED',objectId:o.id});await initial.arrayBuffer();
  if(initial.ok)throw new Error('Fresh backend unexpectedly serves bytes');
  await adapter.uploadObject(locator.getRootLocation(),key,o.version,fs.createReadStream(path.join(directory,o.file)),o.metadata.mimetype,o.metadata.cacheControl,undefined,o.bytes,o.metadata.contentEncoding);
  if(o.metadata.lastModified){const date=new Date(o.metadata.lastModified);if(!Number.isFinite(date.getTime()))throw new Error('Invalid original Last-Modified');fs.utimesSync(file,date,date);}
  const service=await get(o,process.env.SERVICE_KEY),bytes=Buffer.from(await service.arrayBuffer());
  check('Service read HTTP',200,service.status,{objectId:o.id});check('Restored byte size',o.bytes,bytes.length,{objectId:o.id});check('Restored SHA-256',o.sha256,sha256(bytes),{objectId:o.id});
  check('Content type fidelity',o.metadata.mimetype,service.headers.get('content-type'),{objectId:o.id});check('Cache control fidelity',o.metadata.cacheControl,service.headers.get('cache-control'),{objectId:o.id});
  if(o.metadata.lastModified)check('Last-Modified fidelity',new Date(o.metadata.lastModified).toUTCString(),service.headers.get('last-modified'),{objectId:o.id});
  const owner=identities.find(x=>x.objectId===o.id);if(!owner?.actorId||!owner.email)throw new Error('No restored authorized owner identity; do not invent one');
  const ownerResponse=await get(o,token({sub:owner.actorId,email:owner.email}));check('Authorized restored owner read',200,ownerResponse.status,{objectId:o.id,actorId:owner.actorId});check('Owner receives exact bytes',o.sha256,sha256(Buffer.from(await ownerResponse.arrayBuffer())),{objectId:o.id});
  for(const [label,key,route]of[['anonymous',process.env.ANON_KEY,'/object/authenticated/'],['unrelated tenant',token({sub:randomUUID(),email:'isolated-denial@example.invalid'}),'/object/authenticated/'],['public URL',null,'/object/public/']]){const denied=await get(o,key,route);check(label+' cannot read private payload',true,[400,401,403,404].includes(denied.status),{objectId:o.id,httpStatus:denied.status});await denied.arrayBuffer();}
 }
 const list=await fetch(url+'/bucket',{headers:{authorization:'Bearer '+process.env.SERVICE_KEY},signal:AbortSignal.timeout(30000)});check('Bucket inventory HTTP',200,list.status);const buckets=await list.json();check('All bucket mappings',manifest.buckets.map(x=>x.id).sort(),buckets.map(x=>x.id).sort());
 const keys=[];for(const bucket of manifest.buckets){const pending=[''];while(pending.length){const prefix=pending.pop();for(let offset=0;;offset+=100){const r=await fetch(url+'/object/list/'+encodeURIComponent(bucket.id),{method:'POST',headers:{authorization:'Bearer '+process.env.SERVICE_KEY,'content-type':'application/json'},body:JSON.stringify({prefix,offset,limit:100,sortBy:{column:'name',order:'asc'}}),signal:AbortSignal.timeout(30000)});if(r.status!==200)throw new Error('Storage object listing failed');const rows=await r.json();for(const row of rows)if(row.id)keys.push(JSON.stringify([bucket.id,prefix+row.name]));else pending.push(prefix+row.name+'/');if(rows.length<100)break;}}}
 check('Complete path/count fidelity',manifest.objects.map(x=>JSON.stringify([x.bucket_id,x.name])).sort(),keys.sort());
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;}
finally{adapter.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});}
console.log(JSON.stringify({status:report.status,objects:report.objectCount,checks:report.checks.length,error:report.error}));if(report.status!=='PASS')process.exitCode=1;
