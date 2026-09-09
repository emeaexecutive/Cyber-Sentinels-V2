// Test provisioning only, explicitly restricted to the existing Staging project.
// Never prints credentials. Runtime public API proof uses a separate process without database credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const directory=process.env.V2_PRIVATE_DIRECTORY;
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!directory)throw new Error('Exact Staging target and private directory required');
const buffer=await readFile(`${directory}/staging-keys-credential-export.json`);
const all=JSON.parse(buffer.toString(buffer[0]===255?'utf16le':'utf8').replace(/^\uFEFF/,'' )).flat();
const service=all.find(key=>key.name==='service_role')?.api_key;
const anon=all.find(key=>key.name==='anon')?.api_key;
if(!service||!anon)throw new Error('Staging keys unavailable');
for(const key of [service,anon])if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).ref!=='agpyhygpfmppjkxwcpac')throw new Error('Key project mismatch');
const url='https://agpyhygpfmppjkxwcpac.supabase.co', origin='https://localhost:3443';
const env={NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:service,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_SITE_URL:origin,NEXT_PUBLIC_APP_URL:origin,CYBER_SENTINELS_ENVIRONMENT:'staging',CYBER_SENTINELS_PUBLIC_ORIGIN:origin,CONTROL_PLANE_STAGING_QUALIFICATION:'true',SYNTHETIC_FIXTURES:'false',API_KEY_ROTATION_SECRET:randomBytes(32).toString('hex'),PUBLIC_API_KEY_ROTATION_SECRET:randomBytes(32).toString('hex'),API_EXECUTION_SIGNING_SECRET:randomBytes(32).toString('hex')};
await writeFile('.env.local',Object.entries(env).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n');
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const accounts=[];
for(const suffix of ['a','b']) {
 const email=`v2-incident-qualification-${suffix}@example.com`;
 const generated=await admin.auth.admin.generateLink({type:'magiclink',email});
 if(generated.error)throw new Error(`Staging test identity provisioning failed: ${generated.error.code}`);
 const user=generated.data.user;
 const cookies=[];
 const auth=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}});
 const signed=await auth.auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:generated.data.properties.verification_type});
 if(signed.error)throw new Error(`Staging test session failed: ${signed.error.code}`);
 const existing=await admin.from('trust_workspaces').select('id').eq('created_by',user.id).eq('name',`V2 Incident Qualification ${suffix.toUpperCase()}`).maybeSingle();
 if(existing.error)throw new Error('Staging fixture workspace lookup failed');
 let tenant=existing.data?.id;
 if(!tenant){const created=await admin.from('trust_workspaces').insert({name:`V2 Incident Qualification ${suffix.toUpperCase()}`,created_by:user.id}).select('id').single();if(created.error)throw new Error(`Workspace fixture failed: ${created.error.code}`);tenant=created.data.id;}
 accounts.push({user_id:user.id,tenant,email,cookies:cookies.map(c=>({name:c.name,value:c.value,domain:'localhost',path:'/',secure:true,httpOnly:false,sameSite:'Lax'}))});
}
await writeFile(`${directory}/staging-session-credential-export.json`,JSON.stringify(accounts));
console.log(JSON.stringify({project:'agpyhygpfmppjkxwcpac',origin,accounts:accounts.map(({user_id,tenant})=>({user_id,tenant})),databaseCredentials:'local ignored environment only',productionChanged:false}));
