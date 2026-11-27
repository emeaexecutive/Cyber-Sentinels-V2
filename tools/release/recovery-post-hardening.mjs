// Compare complete security catalogs before/after the reviewed local-only migration.
import fs from'node:fs';import path from'node:path';import{spawnSync}from'node:child_process';
const [directory,target]=process.argv.slice(2);if(!directory||!/^cs-recovery-[a-z0-9-]+$/.test(target??''))throw new Error('Isolated target required');
const dir=fs.realpathSync(directory),exec=args=>{const r=spawnSync('docker',args,{encoding:'utf8',maxBuffer:64*1024*1024});if(r.status!==0)throw new Error('Local catalog read failed');return r.stdout.trim();};
const identity=JSON.parse(exec(['inspect',target]))[0];if(identity.HostConfig.NetworkMode!=='none'||Object.keys(identity.HostConfig.PortBindings??{}).length||identity.Config.Labels?.['cybersentinels.workstream']!=='isolated-production-restore')throw new Error('Isolation guard failed');
const sql=fs.readFileSync(new URL('./recovery-snapshot-catalog.sql',import.meta.url),'utf8');fs.writeFileSync(path.join(dir,target+'-catalog.sql'),'BEGIN READ ONLY;\n'+sql+'\nROLLBACK;\n');
const catalogs={};for(const database of ['recovery_validation','recovery_application']){const raw=exec(['exec',target,'psql','-X','-qAt','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-f','/recovery/'+target+'-catalog.sql']);catalogs[database]=JSON.parse(raw);fs.writeFileSync(path.join(dir,target+'-'+database+'-catalog.private.json'),JSON.stringify(catalogs[database],null,2)+'\n',{mode:0o600});}
const before=catalogs.recovery_validation,after=catalogs.recovery_application,checks=[];
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
function check(name,pass){checks.push({name,status:pass?'PASS':'FAIL'});}
for(const [category,key]of[['schemas','name'],['relations','name'],['functions','identity']]){
 const id=x=>(x.schema??'')+'.'+x[key];const actual=new Map(after[category].map(x=>[id(x),x]));
 check(category+' existing owners preserved',before[category].every(x=>actual.get(id(x))?.owner===x.owner));
}
for(const category of ['roles','memberships','defaultAcls','extensions'])check(category+' unchanged',stable((before[category]??[]).map(stable).sort())===stable((after[category]??[]).map(stable).sort()));
const allowedTables=new Set(['ai_agents','api_keys','audit_logs','autonomy_profiles','data_rights_requests','decisions','enterprise_access_requests','evidence_files','execution_passports','feedback_reports','help_questions','intent_requests','interest_signals','knowledge_articles','passport_state_checks','passports','provenance_events','risk_scores','signals','system_health_checks','team_members','teams','trust_alerts','trust_algorithm_runs','trust_assistant_questions','trust_certifications','trust_graph_edges','trust_graph_nodes','trust_reports','verification_cases','verification_passports','verifiers','waitlist']);
const allowedRelation=x=>(x.schema==='public'&&allowedTables.has(x.name))||(x.schema==='storage'&&x.name==='objects');
const unchangedRelations=before.relations.filter(x=>!allowedRelation(x)),actualRelations=new Map(after.relations.map(x=>[x.schema+'.'+x.name,x]));
check('Unrelated relation ACL/RLS unchanged',unchangedRelations.every(x=>stable(x)===stable(actualRelations.get(x.schema+'.'+x.name))));
const unchangedFunction=x=>!/^security_closure_/.test(x.identity.replace(/^public\./,''));const actualFunctions=new Map(after.functions.map(x=>[x.identity,x]));
check('Unrelated function definitions/ACL/security unchanged',before.functions.filter(unchangedFunction).every(x=>stable(x)===stable(actualFunctions.get(x.identity))));
const touchedPolicy=x=>x.table==='storage.objects'||allowedTables.has(x.table.replace(/^public\./,''));
check('Unrelated policies unchanged',stable(before.policies.filter(x=>!touchedPolicy(x)).map(stable).sort())===stable(after.policies.filter(x=>!touchedPolicy(x)).map(stable).sort()));
const relationDifferences=before.relations.filter(x=>stable(x)!==stable(actualRelations.get(x.schema+'.'+x.name))).map(x=>({schema:x.schema,name:x.name,before:x,after:actualRelations.get(x.schema+'.'+x.name)}));
const report={status:checks.every(x=>x.status==='PASS')?'PASS':'FAIL',checks,relationDifferences,policyCounts:{before:before.policies.length,after:after.policies.length},scope:'Reviewed local hardening delta; pristine restore remains unchanged',productionConnections:0};fs.writeFileSync(path.join(dir,target+'-post-hardening-result.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:report.status,checks,changedRelations:relationDifferences.length}));if(report.status!=='PASS')process.exitCode=1;
