import fs from 'node:fs';import {randomUUID,randomBytes}from'node:crypto';import assert from'node:assert/strict';
import {backupStorage,restoreStorage,assertIsolatedStorage}from'./recovery-storage.mjs';
const directory=process.argv[2];if(!directory)throw new Error('Fresh restricted fixture output directory required');fs.mkdirSync(directory,{recursive:false,mode:0o700});
const key=process.env.SUPABASE_SERVICE_ROLE_KEY,source='http://127.0.0.1:5000',target='http://127.0.0.1:5001';assertIsolatedStorage(source);assertIsolatedStorage(target);
const bucket='recovery-'+randomUUID();
const report={scope:'SYNTHETIC_LOCAL_OBJECTS_ONLY_NOT_PRODUCTION_PAYLOAD_RECOVERY',startedAt:new Date().toISOString(),status:'BLOCKED',checks:[],productionConnections:0};
async function api(route,options={}){const r=await fetch(source+route,{...options,headers:{authorization:'Bearer '+key,apikey:key,...options.headers},redirect:'error'});if(!r.ok)throw new Error('Fixture API HTTP '+r.status);return r;}
try{
 await api('/bucket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false})});
 const objects=[{name:'plain.txt',data:Buffer.from('Isolated recovery fixture\n'),type:'text/plain'},{name:'nested/binary.dat',data:randomBytes(4097),type:'application/octet-stream'},{name:'nested/empty.txt',data:Buffer.alloc(0),type:'text/plain'}];
 for(const o of objects)await api('/object/'+bucket+'/'+o.name,{method:'POST',headers:{'content-type':o.type,'x-metadata':Buffer.from(JSON.stringify({synthetic:true,recoveryExercise:'20261010'})).toString('base64')},body:o.data});
 const buckets=[await(await api('/bucket/'+bucket)).json()],inventory=[];
 for(const prefix of ['','nested/']){const rows=await(await api('/object/list/'+bucket,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prefix,limit:100,offset:0})})).json();for(const row of rows)if(row.id)inventory.push({...row,bucket_id:bucket,name:prefix+row.name});}
 assert.equal(inventory.length,3);fs.writeFileSync(directory+'/source-inventory.json',JSON.stringify({buckets,objects:inventory},null,2));
 const backup=await backupStorage({url:source,key,inventory:{projectRef:'synthetic-local-fixture',buckets,objects:inventory},directory:directory+'/payloads'});assert.equal(backup.status,'PASS');report.checks.push({name:'Binary export and SHA-256 inventory',status:'PASS',objects:backup.objects.length});
 const restored=await restoreStorage({url:target,key,directory:directory+'/payloads'});assert.equal(restored.status,'PASS');report.checks.push({name:'Separate isolated Storage restore: count/path/size/SHA-256',status:'PASS',objects:restored.objects});fs.writeFileSync(directory+'/restore-result.json',JSON.stringify(restored,null,2));
 fs.cpSync(directory+'/payloads',directory+'/tampered',{recursive:true});fs.appendFileSync(directory+'/tampered/'+backup.objects[0].file,'corrupt');
 await assert.rejects(restoreStorage({url:target,key,directory:directory+'/tampered'}),/Payload checksum mismatch/);report.checks.push({name:'Corrupt payload rejected before upload',status:'PASS'});
 assert.throws(()=>assertIsolatedStorage('https://example.invalid/storage/v1'),/loopback/);report.checks.push({name:'Nonlocal restore URL rejected before connection',status:'PASS'});
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(directory+'/storage-fixture-result.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
