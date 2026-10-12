// Existing credentials only. No login, creation, rotation, console output or secret persistence.
import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
export function storageReadCredential(config,projectRef){
 if(Boolean(config.credentialFile)===Boolean(config.useExistingCliSession))throw new Error('Choose a credential file or an existing authenticated CLI session');
 if(config.credentialFile)return fs.readFileSync(config.credentialFile,'utf8').trim();
 if(!/^[a-z0-9]{20}$/.test(projectRef??''))throw new Error('Project reference required for existing CLI access');
 const url=new URL(config.url);if(url.protocol!=='https:'||![projectRef+'.supabase.co',projectRef+'.storage.supabase.co'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname.replace(/\/$/,'')!=='/storage/v1')throw new Error('CLI credential must only be sent to its exact project Storage endpoint');
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const r=spawnSync(process.execPath,[path.join(repo,'node_modules/supabase/dist/supabase.js'),'projects','api-keys','--project-ref',projectRef,'--reveal','--output','json'],{cwd:repo,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
 if(r.status!==0)throw new Error('Existing CLI authentication unavailable; no credential was retained');
 let response;try{response=JSON.parse(r.stdout);}catch{throw new Error('CLI returned an unsupported key response');}
 const rows=Array.isArray(response)?response:response.api_keys??response.keys??[];
 for(const row of rows){const key=row.api_key??row.value??'';let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));}catch{}
  if((payload?.role==='service_role'&&(!payload.ref||payload.ref===projectRef))||key.startsWith('sb_secret_'))return key;
 }
 throw new Error('No usable existing Storage credential returned');
}
