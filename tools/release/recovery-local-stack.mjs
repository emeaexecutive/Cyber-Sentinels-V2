import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {randomBytes,createHmac} from 'node:crypto';
const [directory,target]=process.argv.slice(2);
if(!directory||!/^cs-recovery-[a-z0-9-]+$/.test(target??''))throw new Error('Restricted directory and isolated target required');
const dir=fs.realpathSync(directory),prefix=target+'-stack';
function run(args){const r=spawnSync('docker',args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error('Local stack command failed ('+args[0]+')');return r.stdout.trim();}
const identity=JSON.parse(run(['inspect',target]))[0];
if(identity.HostConfig.NetworkMode!=='none'||Object.keys(identity.HostConfig.PortBindings??{}).length||identity.Config.Labels['cybersentinels.workstream']!=='isolated-production-restore')throw new Error('Isolation guard failed');
if(identity.Config.Image!=='public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108')throw new Error('Image mismatch');
if(fs.existsSync(path.join(dir,prefix+'.json')))throw new Error('Do not reuse stack evidence');
const app=path.join(dir,'app-frozen');if(!fs.existsSync(path.join(app,'package-lock.json')))throw new Error('Frozen source required');
if(fs.readdirSync(app).some(x=>/^\.env($|\.)/.test(x)))throw new Error('Frozen app must not contain environment files');
const jwt=randomBytes(48).toString('hex'),password=randomBytes(32).toString('hex');
const token=role=>{const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})).toString('base64url');const unsigned=head+'.'+body;return unsigned+'.'+createHmac('sha256',jwt).update(unsigned).digest('base64url');};
const anon=token('anon'),service=token('service_role');
fs.writeFileSync(path.join(dir,prefix+'-service.private.key'),service,{mode:0o600});
const sql="ALTER ROLE authenticator PASSWORD '"+password+"'; ALTER ROLE supabase_auth_admin PASSWORD '"+password+"'; ALTER ROLE supabase_storage_admin PASSWORD '"+password+"';";
fs.writeFileSync(path.join(dir,prefix+'-credentials.private.sql'),sql,{mode:0o600});
run(['exec',target,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f','/recovery/'+prefix+'-credentials.private.sql']);
run(['exec',target,'createdb','-U','supabase_admin','--template=recovery_validation','--owner=postgres','recovery_application']);
const envArgs=env=>Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]);
const auth={GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:'postgres://supabase_auth_admin:'+password+'@127.0.0.1:5432/recovery_application?sslmode=disable',GOTRUE_SITE_URL:'http://127.0.0.1:3000',API_EXTERNAL_URL:'http://127.0.0.1:54321/auth/v1',GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',GOTRUE_JWT_SECRET:jwt,GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_TRACING_ENABLED:'false',GOTRUE_METRICS_ENABLED:'false'};
run(['exec','-d',...envArgs(auth),target,'sh','-c','exec /recovery/gotrue-auth.private.bin serve >/tmp/recovery-auth.stdout.private.log 2>/tmp/recovery-auth.stderr.private.log']);
const restName=prefix+'-rest',proxyName=prefix+'-proxy',appName=prefix+'-app';const started=[];
try{
 run(['run','-d','--pull','never','--name',restName,'--network','container:'+target,...envArgs({PGRST_DB_URI:'postgres://authenticator:'+password+'@127.0.0.1:5432/recovery_application',PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:jwt,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:'3001',PGRST_DB_EXTRA_SEARCH_PATH:'public,extensions'}),'postgrest/postgrest@sha256:c9dc201e555f5d8e37e7f39cdd4df0229774996e213bfd7de8d10ac609030f2c']);started.push(restName);
 const node='node@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3';
 const repo=path.resolve('tools/release');
 run(['run','-d','--pull','never','--name',proxyName,'--network','container:'+target,'--mount','type=bind,source='+repo+',target=/tools,readonly',node,'node','/tools/recovery-local-proxy.mjs']);started.push(proxyName);
 const appEnv={NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:3000',NEXT_TELEMETRY_DISABLED:'1',VERCEL_ENV:'development',VERCEL_GIT_COMMIT_SHA:'3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571'};
 run(['run','-d','--pull','never','--name',appName,'--network','container:'+target,'--mount','type=bind,source='+app+',target=/app','--mount','type=volume,source=cs-recovery-node-modules-20261010,target=/app/node_modules','--mount','type=bind,source='+dir+',target=/recovery,readonly','--workdir','/app',...envArgs(appEnv),node,'node','node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3000']);started.push(appName);
 fs.writeFileSync(path.join(dir,prefix+'-local.private.json'),JSON.stringify({jwt,anon,service,password}),{mode:0o600});
 fs.writeFileSync(path.join(dir,prefix+'.json'),JSON.stringify({target,targetId:identity.Id,database:'recovery_application',started,network:'shared network-none namespace',sourceRevision:appEnv.VERCEL_GIT_COMMIT_SHA,syntheticCredentials:true,startedAt:new Date().toISOString(),status:'RUNNING_NOT_VALIDATED'},null,2)+'\n');
 console.log(JSON.stringify({target,started,status:'RUNNING_NOT_VALIDATED'}));
}catch(error){for(const name of started)spawnSync('docker',['stop',name]);throw error;}
