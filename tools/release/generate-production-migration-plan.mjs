// Offline only: creates reviewable SQL and checksums; never connects to any DB.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {compileMigration} from './migration-execution.mjs';
const [output]=process.argv.slice(2);if(!output)throw Error('Usage: node tools/release/generate-production-migration-plan.mjs <NEW-output-directory>');
const base=JSON.parse(fs.readFileSync('docs/operations/migration-baselines-20261012.json','utf8')).production;
if(base.ledger.length!==119||base.approval_table!==null)throw Error('Reviewed Production baseline required');
fs.mkdirSync(output);const sha=value=>createHash('sha256').update(value).digest('hex');const prior=base.ledger.map(x=>x.version);
const plan={project:'kecgtsfibkypjuaxqbjx',baselineCapturedAt:base.captured_at,baselineVersions:[...prior],archiveSha256:'081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307',requiresExplicitOwnerApproval:true,migrations:[]};
for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')&&!prior.includes(n.split('_')[0])).sort()){
  const source=fs.readFileSync(path.join('supabase/migrations',name),'utf8'),sql=compileMigration(source,name,prior);
  fs.writeFileSync(path.join(output,name),sql,{flag:'wx'});plan.migrations.push({name,sourceSha256:sha(source),executionSha256:sha(sql)});prior.push(name.split('_')[0]);
}
plan.finalMigrationCount=prior.length;const text=JSON.stringify(plan,null,2)+'\n';fs.writeFileSync(path.join(output,'plan.json'),text,{flag:'wx'});fs.writeFileSync(path.join(output,'plan.sha256'),sha(text)+'\n',{flag:'wx'});console.log(JSON.stringify({directory:path.resolve(output),migrations:plan.migrations.length,planSha256:sha(text),productionConnections:0}));
