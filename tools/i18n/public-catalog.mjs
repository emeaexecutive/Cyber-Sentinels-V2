import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=readFileSync('lib/navigation/route-visibility.ts','utf8').split('export const canonicalPublicRoutes = [')[1].split('] as const')[0];
const routes=[...manifest.matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(p=>!p.startsWith("/tenente-swarm")&&!['/','/platform','/pricing','/help','/enterprise-access','/regulatory','/media-centre','/our-people','/careers','/accessibility','/privacy','/terms','/cookies','/legal','/modern-slavery','/security'].includes(p));
export const targets=routes.map(path=>({path,source:path==='/about'?'app/about-us/page.tsx':path==='/modern-slavery'?'app/modern-slavery-statement/page.tsx':path.startsWith('/resources/agent-security/')?'app/resources/agent-security/[slug]/page.tsx':`app${path}/page.tsx`}));
export const support=['components/enterprise-visuals.tsx','components/enterprise-breadcrumbs.tsx','components/enterprise-cta-group.tsx','components/search/security-resource.tsx','lib/enterprise-experience.ts','lib/search/resources.ts'];
const protocol=new Set(['ALLOW','REVIEW','DENY','UNKNOWN','CONFIRMED','PARTIAL','MOCKED','BLOCKED','NOT_BUILT','WORKING','LOW','MODERATE','HIGH','CRITICAL','GET','POST','PATCH','DELETE','PUT','HEAD','OPTIONS','ACCEPTED','REJECTED','FAILED','TIMEOUT','TENENTE','Cyber Sentinels','API','MCP','SDK','OpenAPI','JSON','TypeScript','PowerShell','JWT','RLS','OIDC','Bearer','HTTPS','UTC','EU','UK','AI']);
export const normalize=s=>s.replace(/\s+/g,' ').trim();
export const messageId=s=>createHash('sha256').update(normalize(s)).digest('hex').slice(0,16);
export function humanNode(node){
  if(ts.isJsxText(node))return /[A-Za-z]/.test(normalize(node.text));
  if(!ts.isStringLiteral(node))return false;
  const s=node.text,p=node.parent;
  if(ts.isBinaryExpression(p)||ts.isCaseClause(p)||ts.isElementAccessExpression(p))return false;
  if(protocol.has(s)||!/[A-Za-z]/.test(s)||/^[@/#.]|https?:|^[a-z]+:/.test(s)||s.includes('\\n')||s.includes('\n'))return false;
  if(ts.isImportDeclaration(p)||ts.isExportDeclaration(p)||ts.isLiteralTypeNode(p)||ts.isPropertyAssignment(p)&&p.name===node)return false;
  if(ts.isJsxAttribute(p)&&!['title','alt','aria-label','ariaLabel','placeholder','label','eyebrow','subtitle','description','caption'].includes(p.name.getText()))return false;
  if(ts.isPropertyAssignment(p)&&['id','type','kind','status','state','variant','className','rel','target','slug','key','method','operationId','audience','version','provider','icon'].includes(p.name.getText()))return false;
  if(/^[a-z0-9_.:/-]+$/.test(s))return false;
  if(/^(?:use client|use server|[A-Z_]+)$/.test(s))return false;
  return /\s/.test(s)||/^[A-Z][a-z]+$/.test(s);
}
export function catalog(){
  const messages=new Map();
  for(const file of new Set([...targets.map(t=>t.source),...support])){
    const source=readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const visit=node=>{if(humanNode(node)){const english=normalize(node.text),id=messageId(english);if(!messages.has(id))messages.set(id,{id,en:english,files:[]});messages.get(id).files.push(file);}ts.forEachChild(node,visit);};visit(tree);
  }
  return [...messages.values()];
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/public-catalog.mjs')){
  const messages=catalog();mkdirSync('artifacts/spanish-completion',{recursive:true});writeFileSync('artifacts/spanish-completion/messages.json',JSON.stringify(messages,null,2)+'\n');
  console.log(JSON.stringify({routes:routes.length,sourceFiles:new Set(targets.map(t=>t.source)).size,messages:messages.length,englishCharacters:messages.reduce((n,m)=>n+m.en.length,0)}));
}
