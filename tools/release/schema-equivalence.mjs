import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Reviewed event-trigger helper from docs/production-schema-baseline.sql.
// The name alone must never exempt an arbitrary function body from comparison.
const managedRlsHelperHash='7789ccf8369642784dfb9acc004ced5773644a687cf9c023ea663045136bcc32';
const reviewedEquivalences=JSON.parse(fs.readFileSync(new URL('./reviewed-schema-equivalences.json',import.meta.url),'utf8'));

// Preserve string literals while ignoring SQL formatting and comments.
export function sqlTokens(sql) {
  return (sql??'').match(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9$]*|\d+(?:\.\d+)?|::|->>|->|#>>|#>|<>|!=|:=|<=|>=|\S/g)
    ?.filter(t=>!t.startsWith('--')&&!t.startsWith('/*'))
    .map(t=>t.startsWith("'")?t:t.startsWith('"')&&/^"[a-z_][a-z_0-9]*"$/.test(t)?t.slice(1,-1):t.startsWith('"')?t:t.toLowerCase()).join(' ')??'';
}
function normalized(value,key) {
  if(value===null)return null;
  if(Array.isArray(value))return value.map(v=>normalized(v,key));
  if(typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalized(value[k],k)]));
  if(key==='acl')return value.replace(/^\{|\}$/g,'').split(',').sort().join(',');
  if(['definition','indexdef','default','qual','with_check','view'].includes(key))return sqlTokens(value);
  return value;
}
const identity=x=>[x.schema??x.schemaname,x.table??x.tablename,x.name??x.indexname??x.policyname,x.args,x.owner,x.type].filter(x=>x!=null).join('.');
export function schemaContract(catalog) {
 const sections={};
 for(const section of Object.keys(catalog).sort()) {
  const rows=(catalog[section]??[]).filter(row=>!(section==='functions'&&row.schema==='public'&&row.name==='rls_auto_enable'&&row.args===''&&createHash('sha256').update(sqlTokens(row.definition)).digest('hex')===managedRlsHelperHash)).map(row=>{
   const canonical={...row};
   if(section==='constraints'){
    const e=reviewedEquivalences.find(e=>e.schema===row.schema&&e.table===row.table&&e.name===row.name&&e.definitions.some(d=>sqlTokens(d)===sqlTokens(row.definition)));
    if(e)canonical.definition=e.definitions[0];
   }
   return canonical;
  }).sort((a,b)=>identity(a).localeCompare(identity(b),'en'));
  sections[section]={objects:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows.map(row=>normalized(row)))).digest('hex')};
 }
 return {format:'cyber-sentinels-application-schema-v1',sections};
}
export function compareSchemas(left,right) {
 const differences=[];
 for(const section of new Set([...Object.keys(left),...Object.keys(right)])) {
  const a=new Map((left[section]??[]).map(x=>[identity(x),x])),b=new Map((right[section]??[]).map(x=>[identity(x),x]));
  for(const key of new Set([...a.keys(),...b.keys()])) {
   const p=a.get(key),s=b.get(key);
   if(JSON.stringify(normalized(p??null))===JSON.stringify(normalized(s??null)))continue;
   const candidate=p??s;
   const managed=section==='functions'&&(!p||!s)&&candidate.schema==='public'&&candidate.name==='rls_auto_enable'&&candidate.args===''&&createHash('sha256').update(sqlTokens(candidate.definition)).digest('hex')===managedRlsHelperHash;
   const fields=p&&s?Object.keys(p).filter(k=>JSON.stringify(normalized(p[k],k))!==JSON.stringify(normalized(s[k],k))):[];
   const equivalent=section==='constraints'&&p&&s&&fields.length===1&&fields[0]==='definition'&&reviewedEquivalences.find(e=>e.schema===p.schema&&e.table===p.table&&e.name===p.name&&[p.definition,s.definition].every(def=>e.definitions.some(known=>sqlTokens(known)===sqlTokens(def))));
   const classification=managed?'SUPABASE_MANAGED':equivalent?'LEGACY_SAFE_DIFFERENCE':'MUST_RECONCILE';
   differences.push({section,key,classification,fields,left:p??null,right:s??null,...(equivalent?{reason:equivalent.reason}:{})});
  }
 }
 return {result:differences.some(d=>d.classification==='MUST_RECONCILE')?'FAIL':'PASS',differences};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/schema-equivalence.mjs')) {
 const [left,right,output]=process.argv.slice(2);
 if(!left||!right||!output)throw new Error('Usage: schema-equivalence.mjs left.json right.json output.json');
 const report=compareSchemas(JSON.parse(fs.readFileSync(left)),JSON.parse(fs.readFileSync(right)));
 fs.writeFileSync(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({result:report.result,differences:report.differences.length,bySection:Object.fromEntries([...new Set(report.differences.map(d=>d.section))].map(k=>[k,report.differences.filter(d=>d.section===k).length]))}));
 if(report.result!=='PASS')process.exitCode=1;
}
