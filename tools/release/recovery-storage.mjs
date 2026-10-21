// Payloads and metadata are private artifacts. Never prints credentials, URLs, or response bodies.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export async function fileDigest(file) {
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of fs.createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}
  return {sha256:hash.digest('hex'),bytes};
}
export function assertIsolatedStorage(url) {
  const u=new URL(url);
  if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.search||u.hash)throw new Error('Restore requires literal isolated loopback URL');
  if(process.platform!=='linux')throw new Error('Run restore in a network-none Linux recovery namespace');
  const routes=fs.readFileSync('/proc/net/route','utf8').trim().split('\n').slice(1);
  if(routes.some(r=>r.trim().split(/\s+/)[1]==='00000000'))throw new Error('Restore namespace has a default route');
  const ipv6=fs.readFileSync('/proc/net/ipv6_route','utf8');
  if(ipv6.split('\n').some(r=>/^0{32} 00 /.test(r)&&!r.endsWith('lo')))throw new Error('Restore namespace has an IPv6 default route');
}
function api(url,key) {
  const base=new URL(url);if(base.username||base.password||base.search||base.hash)throw new Error('Credential-free base URL required');
  if(base.protocol!=='https:'&&base.hostname!=='127.0.0.1')throw new Error('Remote Storage requires HTTPS');
  return async(route,options={})=>{
    const response=await fetch(base.href.replace(/\/$/,'')+route,{...options,redirect:'error',signal:AbortSignal.timeout(120000),headers:{apikey:key,authorization:'Bearer '+key,...options.headers}});
    if(!response.ok)throw new Error('Storage request failed with HTTP '+response.status);
    return response;
  };
}
const objectRoute=o=>'/object/'+encodeURIComponent(o.bucket_id)+'/'+o.name.split('/').map(encodeURIComponent).join('/');
function validateInventory(inventory){
  if(!Array.isArray(inventory.buckets)||!Array.isArray(inventory.objects))throw new Error('Bucket and object inventory required');
  if(inventory.buckets.some(b=>b.versioning_status&&b.versioning_status!=='DISABLED'))throw new Error('Versioned bucket history needs a reviewed version-aware backup profile; current-object export is insufficient');
  const keys=new Set();for(const o of inventory.objects){const key=JSON.stringify([o.bucket_id,o.name]);if(typeof o.name!=='string'||!o.name||!inventory.buckets.some(b=>b.id===o.bucket_id)||keys.has(key))throw new Error('Invalid/duplicate object identity');keys.add(key);}
}
export async function backupStorage({url,key,inventory,directory}) {
  validateInventory(inventory);fs.mkdirSync(directory,{recursive:false,mode:0o700});
  // POSIX modes do not restrict Windows ACLs. Set the new directory before writing bytes.
  if(process.platform==='win32'){
    const account=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
    execFileSync('icacls',[path.resolve(directory),'/inheritance:r','/grant:r',account+':(OI)(CI)F'],{windowsHide:true,stdio:'pipe'});
  }
  fs.mkdirSync(path.join(directory,'objects'),{mode:0o700});
  const request=api(url,key),manifest={format:'cs-storage-backup-v1',startedAt:new Date().toISOString(),projectRef:inventory.projectRef??null,databaseSnapshot:inventory.databaseSnapshot??null,buckets:inventory.buckets,objects:[],status:'BLOCKED',pointInTimeConsistency:'UNPROVEN_UNTIL_COORDINATOR_VALIDATES_QUIESCENCE'};
  try{
    for(const object of inventory.objects){
      const relative='objects/'+sha256(JSON.stringify([object.bucket_id,object.name]));
      const response=await request(objectRoute(object));let bytes=0;const digest=createHash('sha256');
      await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,done){bytes+=chunk.length;digest.update(chunk);done(null,chunk);}}),fs.createWriteStream(path.join(directory,relative),{flags:'wx',mode:0o600}));
      if(object.metadata?.size!=null&&bytes!==Number(object.metadata.size))throw new Error('Object size differs from synchronized metadata');
      manifest.objects.push({...object,file:relative,bytes,sha256:digest.digest('hex'),contentType:response.headers.get('content-type')??object.metadata?.mimetype??'application/octet-stream',capturedAt:new Date().toISOString()});
    }
    manifest.objectCount=manifest.objects.length;manifest.totalBytes=manifest.objects.reduce((n,o)=>n+o.bytes,0);manifest.bucketMapping=manifest.buckets.map(b=>({source:b.id,restored:b.id}));manifest.status='PASS';
  }catch(error){manifest.error=error.message;throw error;}
  finally{manifest.finishedAt=new Date().toISOString();const json=JSON.stringify(manifest,null,2)+'\n';fs.writeFileSync(path.join(directory,'storage-manifest.json'),json,{mode:0o600});fs.writeFileSync(path.join(directory,'storage-manifest.sha256'),sha256(json)+'\n',{mode:0o600});}
  return manifest;
}
export async function restoreStorage({url,key,directory}) {
  assertIsolatedStorage(url);
  const raw=fs.readFileSync(path.join(directory,'storage-manifest.json'),'utf8');
  if(sha256(raw)!==fs.readFileSync(path.join(directory,'storage-manifest.sha256'),'utf8').trim())throw new Error('Storage manifest checksum mismatch');
  const manifest=JSON.parse(raw);validateInventory(manifest);if(manifest.status!=='PASS')throw new Error('Incomplete payload backup');
  // Verify every byte before the first write. Do not follow external symlinks or arbitrary manifest paths.
  for(const o of manifest.objects){
    const expected='objects/'+sha256(JSON.stringify([o.bucket_id,o.name]));if(o.file!==expected)throw new Error('Unsafe payload path');
    const actual=fs.realpathSync(path.join(directory,o.file));if(!actual.startsWith(fs.realpathSync(directory)+path.sep))throw new Error('Payload escapes backup root');
    const digest=await fileDigest(actual);if(digest.sha256!==o.sha256||digest.bytes!==o.bytes)throw new Error('Payload checksum mismatch');
  }
  const request=api(url,key);const existing=await(await request('/bucket')).json();
  for(const b of manifest.buckets){
    const found=existing.find(x=>x.id===b.id);
    if(found){if(Boolean(found.public)!==Boolean(b.public))throw new Error('Existing bucket visibility differs');}
    else await request('/bucket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:b.id,name:b.name??b.id,public:Boolean(b.public),file_size_limit:b.file_size_limit,allowed_mime_types:b.allowed_mime_types})});
  }
  const checks=[];
  for(const o of manifest.objects){
    const headers={'content-type':o.contentType,'x-upsert':'true'};
    if(o.user_metadata)headers['x-metadata']=Buffer.from(JSON.stringify(o.user_metadata)).toString('base64');
    await request(objectRoute(o),{method:'POST',headers,body:fs.createReadStream(path.join(directory,o.file)),duplex:'half'});
    const response=await request(objectRoute(o));let bytes=0;const hash=createHash('sha256');
    for await(const chunk of response.body){bytes+=chunk.length;hash.update(chunk);}
    const digest=hash.digest('hex');if(bytes!==o.bytes||digest!==o.sha256)throw new Error('Restored payload verification failed');
    checks.push({bucket:o.bucket_id,key:o.name,bytes,sha256:digest,status:'PASS'});
  }
  // Exhaustive API listing, including nested prefixes and pagination, detects missing/extra paths.
  const actual=[];
  for(const b of manifest.buckets){const pending=[''];const seen=new Set();while(pending.length){const prefix=pending.pop();if(seen.has(prefix))throw new Error('Cyclic Storage listing');seen.add(prefix);for(let offset=0;;offset+=100){const rows=await(await request('/object/list/'+encodeURIComponent(b.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})})).json();if(!Array.isArray(rows))throw new Error('Invalid Storage listing');for(const row of rows){const key=prefix+row.name;if(row.id==null)pending.push(key+'/');else actual.push(JSON.stringify([b.id,key]));}if(rows.length<100)break;}}}
  const expected=manifest.objects.map(o=>JSON.stringify([o.bucket_id,o.name])).sort();actual.sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Restored path/count inventory differs');
  return {status:'PASS',checkedAt:new Date().toISOString(),objects:checks.length,checks,sourcePointInTimeConsistency:manifest.pointInTimeConsistency,limitation:'Local payload recovery does not prove source completeness without synchronized source inventory and quiescence evidence'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [mode,configPath]=process.argv.slice(2);let config;
  try{config=JSON.parse(fs.readFileSync(configPath,'utf8'));const key=fs.readFileSync(config.credentialFile,'utf8').trim();const result=mode==='backup'?await backupStorage({...config,key,inventory:JSON.parse(fs.readFileSync(config.inventoryFile,'utf8'))}):mode==='restore'?await restoreStorage({...config,key}):(()=>{throw new Error('Mode must be backup or restore');})();if(config.resultFile)fs.writeFileSync(config.resultFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:result.status,objects:result.objects?.length??result.objects}));}
  catch(error){const result={status:'FAIL',error:error.message};if(config?.resultFile)fs.writeFileSync(config.resultFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.error(JSON.stringify(result));process.exitCode=1;}
}
