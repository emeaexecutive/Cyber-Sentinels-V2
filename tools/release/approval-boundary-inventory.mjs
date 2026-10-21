// Catalog inputs contain metadata only. Outputs never include rows or credentials.
import fs from 'node:fs';
import path from 'node:path';
import {approvalBoundary} from '../../lib/auth/approval-boundary.ts';
const [catalogPath,outputPath]=process.argv.slice(2);
if(!catalogPath||!outputPath)throw new Error('Usage: node --experimental-strip-types tools/release/approval-boundary-inventory.mjs catalog.json output.md');
const c=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const cell=x=>String(x??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const lines=['# Approval boundary inventory','','Generated from a metadata snapshot and the current route tree. This inventories controls; it is not live authorization proof. Anonymous privileges are revoked on application objects by the forward migration. Authenticated access requires approval plus the existing tenant policy. Service-role callers remain responsible for server-side authorization.','','## Tables, views, sequences and Storage metadata','','Privileges below describe the input snapshot. R/I/U/D abbreviate authenticated effective grants inherited from PUBLIC or granted directly; column grants are listed separately. Policy expressions preserve the existing tenant control for review.','','| Resource | R | I | U | D | Column grants | Existing policies | Expected control |','|---|---|---|---|---|---|---|---|'];
function granted(acl,letter){return [...(acl??'').matchAll(/(?:\{|,)([^=,]*)=([^/,]*)\/[^,}]+/g)].some(m=>['','authenticated'].includes(m[1])&&m[2].includes(letter));}
const storageTables=(c.storage_tables??[]).map(t=>{const auth=t.privileges.find(p=>p.role==='authenticated');return {...t,schema:'storage',kind:'r',acl:'{authenticated='+[['r','select'],['a','insert'],['w','update'],['d','delete']].filter(([,op])=>auth?.[op]).map(([letter])=>letter).join('')+'/effective}'};});
for(const t of [...c.tables.filter(t=>t.schema==='public'||t.schema==='storage'&&['objects','buckets'].includes(t.name)),...storageTables]){
 const policies=c.policies.filter(p=>p.schemaname===t.schema&&p.tablename===t.name).map(p=>`${p.permissive} ${p.cmd} [${p.roles.join(',')}]: ${p.qual??''} CHECK ${p.with_check??''}`).join('; ');
 const columns=c.columns.filter(x=>x.schema===t.schema&&x.table===t.name&&x.acl).map(x=>`${x.name}: ${x.acl}`).join('; ');
 const expected=t.name==='account_access_approvals'?'Own status only; SELECT user_id/status/organization/reason':t.kind==='S'?'USAGE only; protected owning-table INSERT':t.kind==='m'||t.kind==='f'?'No authenticated grants':!['r','a','w','d'].some(p=>granted(t.acl,p))?'No authenticated table privileges; trusted backend only':t.kind==='v'?'security_invoker; underlying approval + tenant RLS':'Restrictive APPROVED AND existing tenant/ownership RLS';
 lines.push('| '+[`${t.schema}.${t.name} (${t.kind})`,...['r','a','w','d'].map(p=>granted(t.acl,p)?'YES':'NO'),columns,policies,expected].map(cell).join(' | ')+' |');
}
lines.push('','## RPC execution','','All public non-extension functions lose PUBLIC/anon/authenticated EXECUTE, followed by explicit grants only to approval-aware tenant helpers and guarded graph reads. Trigger functions and backend mutation RPCs remain service-only.','','| RPC signature | Authenticated effective EXECUTE before | Security definer | Existing function control | Expected |','|---|---|---|---|---|');
for(const f of c.functions.filter(f=>['public','private'].includes(f.schema)&&!f.extension))lines.push('| '+[`${f.schema}.${f.name}(${f.args})`,f.acl===null||granted(f.acl,'X')?'YES':'NO',(f.definer??/\bSECURITY DEFINER\b/i.test(f.definition))?'YES':'NO',f.config?.join('; '),f.schema==='private'?'Private trigger; not a Data API RPC':/^(security_closure_|identity_workspace_role|user_can_access_trust_workspace|user_has_trust_workspace_role|record_account_access_attempt|require_customer_approval|trust_entity_summary_v1|trust_graph_orphans_v1|trust_graph_statistics_v1)/.test(f.name)?'Explicit helper/guard grant; see forward SQL':'Service only'].map(cell).join(' | ')+' |');
lines.push('','## API methods','','CUSTOMER is the default for every unlisted method and every future route. SIGNED_CALLBACK is a transport exception and requires its route signature verification; API_KEY requires database-controlled approval of the key owner. Platform-admin handling and the Judge.me signed webhook have separate middleware checks.','','| Route | Method | Middleware classification | Route source |','|---|---|---|---|');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk('app/api').filter(f=>/route\.[jt]s$/.test(f))){
 const source=fs.readFileSync(file,'utf8'),route='/'+file.replaceAll('\\','/').replace(/^app\//,'').replace(/\/route\.[jt]s$/,'');
 const methods=[...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(m=>m[1]??m[2]);
 for(const exported of source.matchAll(/export\s*\{([^}]+)\}\s*from/g))for(const method of exported[1].split(',').map(x=>x.trim().split(/\s+as\s+/).at(-1)))if(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method))methods.push(method);
 if(!methods.length)throw new Error('Route methods need explicit inventory review: '+file);
 for(const method of new Set(methods))lines.push('| '+[route,method,approvalBoundary(route,method),file.replaceAll('\\','/')].map(cell).join(' | ')+' |');
}
fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,lines.join('\n')+'\n');
console.log(JSON.stringify({outputPath,rows:lines.filter(l=>l.startsWith('| ')).length}));
