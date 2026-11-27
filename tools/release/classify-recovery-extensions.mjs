// Offline comparison only: never connects to a database or changes ownership.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(process.argv[2]??'');
if(!process.argv[2])throw new Error('Pass the restricted recovery artifact directory');
const read=name=>{const b=fs.readFileSync(path.join(dir,name));return b.toString(b[0]===255&&b[1]===254?'utf16le':'utf8').replace(/^\uFEFF/,'');};
const production=JSON.parse(read('production-extension-catalog-current.json'));
const raw=read('restored-extension-catalog-current.raw');
const restored=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
fs.writeFileSync(path.join(dir,'restored-extension-catalog-current.json'),JSON.stringify(restored,null,2)+'\n');
const differences=JSON.parse(read('restore-r4-continuity.json')).ownerDifferences;
const probe=JSON.parse(read('extension-probes-result.json'));
const probeSql=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'recovery-extension-probes.sql'));
const viewProbesPassed=probe.exitStatus===0 && probe.database==='recovery_validation' && probe.sqlSha256===createHash('sha256').update(probeSql).digest('hex');
const key=o=>`${o.kind==='function'?'FUNCTION':'TABLE'} ${o.name}${o.kind==='function'?'('+o.args+')':''}; Type: ACL; Schema: ${o.schema}`;
const normalizedAcl=o=>(o.effective_acl??[]).filter(a=>a.grantee!=='supabase_admin').map(({grantee,privilege,grantable})=>({grantee,privilege,grantable})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const results=differences.map((difference,index)=>{
 const p=production.objects.find(o=>key(o)===difference.object),r=restored.objects.find(o=>key(o)===difference.object);
 let classification='UNRESOLVED',reason='No unique current-catalog match';
 const checks=p&&r?{extensionVersion:production.extensions.find(e=>e.name===p.extension)?.version===restored.extensions.find(e=>e.name===r.extension)?.version,
 extensionMembership:p.extension===r.extension,applicationAcl:same(normalizedAcl(p),normalizedAcl(r)),securityDefiner:p.security_definer===r.security_definer,settings:same(p.settings,r.settings),definition:p.definition_md5===r.definition_md5,language:p.language===r.language,volatility:p.volatility===r.volatility}:null;
 if(checks){
  if(!checks.applicationAcl||!checks.securityDefiner||!checks.settings){classification='SECURITY_RELEVANT_DIFFERENCE';reason='Effective grants or execution security differs; requires investigation';}
  else if(!checks.extensionMembership||!checks.extensionVersion||!checks.definition||!checks.language||!checks.volatility){classification='UNRESOLVED';reason='Extension implementation or version differs';}
  else if(p.kind==='relation'){
   const supported=p.extension==='pg_stat_statements' && ['pg_stat_statements','pg_stat_statements_info'].includes(p.name) && p.owner==='postgres' && r.owner==='supabase_admin';
   classification=supported&&viewProbesPassed?'EXPECTED_PLATFORM_DIFFERENCE':'SECURITY_RELEVANT_DIFFERENCE';
   reason=supported&&viewProbesPassed?'Same-definition pg_stat_statements view with equal application grants. PostgreSQL native function checks invoking user for query text/queryid. Local anon/authenticated/service_role probes establish nonvacuous other-user redaction, reset denial and view availability. Administrative ownership/grantor provenance remains different.':'View owner differs without supported dependency/access evidence';
  }
  else if(!p.security_definer&&p.language==='c'&&p.owner==='postgres'&&r.owner==='supabase_admin'){
   classification='EXPECTED_PLATFORM_DIFFERENCE';reason='Same-version native SECURITY INVOKER extension function and same non-superuser grants; CREATE EXTENSION under isolated platform admin changes owner/grantor provenance, not application execution identity. Management ownership remains explicitly different.';
  }else{classification='RESTORE_FIDELITY_DEFECT';reason='Owner mismatch not explained by native invoker extension installation';}
 }
 return {index:index+1,object:difference.object,extension:p?.extension??null,production:p??null,restored:r??null,classification,reason,checks};
});
if(results.length!==51)throw new Error('Expected 51 individually enumerated differences');
const report={productionCapturedAt:production.captured_at,restoredCapturedAt:restored.captured_at,scope:'Current live catalog comparison, not retrospective dump-time evidence',noOwnershipChanges:true,viewProbeEvidence:probe,classificationRules:'Native invoker functions require version/definition/security/grant equivalence. Two stats views additionally require caller-based native security and local effective-access probes. Superuser self-grants and grantor provenance are recorded but excluded from application ACL equivalence; administrative ownership is not claimed identical.',results};
fs.writeFileSync(path.join(dir,'extension-classification.json'),JSON.stringify(report,null,2)+'\n');
const counts={};for(const r of results)counts[r.classification]=(counts[r.classification]??0)+1;
console.log(JSON.stringify({objects:results.length,counts,extensions:[...new Set(results.map(r=>r.extension))]},null,2));
