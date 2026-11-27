import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {catalog,targets,support,humanNode,messageId} from './public-catalog.mjs';

const snapshot=JSON.parse(readFileSync('artifacts/spanish-completion/messages.json','utf8'));
const actual=catalog();
if(JSON.stringify(snapshot.map(m=>m.id))!==JSON.stringify(actual.map(m=>m.id)))throw Error('English source catalogue changed: review translations before regenerating.');
const pinnedIds=JSON.parse(readFileSync('lib/i18n/es-public-batches/source-ids.json','utf8'));
if(JSON.stringify(pinnedIds)!==JSON.stringify(actual.map(m=>m.id)))throw Error('Reviewed translation order changed: reconcile the ID snapshot and batches explicitly.');
const batches=readdirSync('lib/i18n/es-public-batches').filter(f=>/^\d+\.json$/.test(f)).sort((a,b)=>parseInt(a)-parseInt(b));
const translations=[];
for(const file of batches){if(parseInt(file)!==translations.length)throw Error('Translation batch offset mismatch');translations.push(...JSON.parse(readFileSync('lib/i18n/es-public-batches/'+file,'utf8')));}
if(translations.length!==snapshot.length||translations.some(s=>typeof s!=='string'||!s.trim()))throw Error('Incomplete Spanish translation catalogue');
const dictionary=new Map(snapshot.map((m,i)=>[m.id,translations[i]]));
const manifest=readFileSync('lib/navigation/route-visibility.ts','utf8').split('export const canonicalPublicRoutes = [')[1].split('] as const')[0];
const routes=new Set([...manifest.matchAll(/"([^"]+)"/g)].map(m=>m[1]));
const files=new Map(support.map(source=>[source,source.startsWith('components/')?source.replace('components/','components/i18n/es/'):source==='lib/search/resources.ts'?'lib/i18n/es-search-resources.ts':'lib/i18n/es-enterprise-experience.ts']));
const imports=new Map([...files].map(([a,b])=>['@/'+a.replace(/\.tsx?$/,''),'@/'+b.replace(/\.tsx?$/,'')]));
imports.set('@/lib/search/metadata','@/lib/i18n/es-metadata');
imports.set('@/lib/i18n/public-locales','@/lib/i18n/es-metadata');
const routeTitles={ '/about':'Nuestra historia','/resources/agent-security/[slug]':'Seguridad de agentes' };
function navigationLiteral(node){
  const p=node.parent;
  if(ts.isJsxAttribute(p))return p.name.getText()==='href';
  if(ts.isPropertyAssignment(p))return ['href','canonical','url','item'].includes(p.name.getText());
  if(ts.isArrayLiteralExpression(p))return true;
  return ts.isVariableDeclaration(p)&&p.name.getText()==='RESOURCE_ROOT';
}
function cleanJsxText(text){
  const lines=text.split(/\r\n|\n|\r/);let out='';let last=0;
  for(let i=0;i<lines.length;i++)if(/\S/.test(lines[i]))last=i;
  for(let i=0;i<lines.length;i++){let line=lines[i].replaceAll('\t',' ');if(i!==0)line=line.trimStart();if(i!==lines.length-1)line=line.trimEnd();if(line){out+=line;if(i!==last)out+=' ';}}
  return out;
}
const generated=[];
function generate(source,destination,route){
  const original=readFileSync(source,'utf8'),tree=ts.createSourceFile(source,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
  const visit=node=>{
    if(ts.isStringLiteral(node)){
      const parent=node.parent;let value=node.text;
      if((ts.isImportDeclaration(parent)||ts.isExportDeclaration(parent))&&imports.has(value))value=imports.get(value);
      else if(value.startsWith('/')&&navigationLiteral(node)){
        const [path]=value.split(/[?#]/);if(routes.has(path))value='/es'+(path==='/'?'':path)+value.slice(path.length);
      }else if(humanNode(node))value=dictionary.get(messageId(value));
      else if(value==='en-GB')value='es-ES';
      else if(value==='en'&&ts.isPropertyAssignment(parent)&&parent.name.getText(tree)==='inLanguage')value='es';
      if(value!==node.text){if(!value)throw Error('Missing translation: '+node.text);edits.push({start:node.getStart(tree),end:node.end,text:ts.isJsxAttribute(parent)?'{'+JSON.stringify(value)+'}':JSON.stringify(value)});}
    }else if(ts.isJsxText(node)&&humanNode(node)){
      const clean=cleanJsxText(node.text),value=dictionary.get(messageId(node.text));
      if(!value)throw Error('Missing JSX translation');
      edits.push({start:node.pos,end:node.end,text:'{'+JSON.stringify((/^\s/.test(clean)?' ':'')+value+(/\s$/.test(clean)?' ':''))+'}'});
    }
    ts.forEachChild(node,visit);
  };visit(tree);
  let output=original;for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
  output=output.replaceAll('<ExecutiveSummary','<ExecutiveSummary locale="es"');
  if(source==='components/enterprise-visuals.tsx')output=output.replace(' compared with ', ' en comparación con ');
  if(source==='app/trust/page.tsx')output=output.replace(' provider configuration(s)', ' configuración(es) de proveedores').replace(' labelled case(s)', ' caso(s) etiquetado(s)');
  if(source==='app/developers/api-reference/page.tsx'){
    output=output.replace('import { publicApiOpenApi } from "@/lib/public-api/v1/openapi";', 'import { spanishOpenApiView as publicApiOpenApi } from "@/lib/i18n/es-api-copy";');
    output=output.replace('`Reference: ${ref}`','`Referencia: ${ref}`')
      .replace('`array of ${','`lista de ${')
      .replace('`object${','`objeto${')
      .replace('` · required: ${','` · obligatorio: ${')
      .replace(': "none"',': "ninguno"');
  }
  if(route){
    if(/export const metadata/.test(output)){
      output=output.replace(/export const metadata/,'const spanishPageMetadata');
      output='import { translatedMetadata as finishSpanishMetadata } from "@/lib/i18n/es-metadata";\n'+output;
      output+=`\nexport function generateMetadata() { return finishSpanishMetadata(${JSON.stringify(route)}, spanishPageMetadata); }\n`;
    }else if(!/export (async )?function generateMetadata/.test(output)){
      output='import { publicPageAlternates as spanishAlternates, publicSocialMetadata as spanishSocial } from "@/lib/i18n/es-metadata";\n'+output;
      const title=routeTitles[route]??'Cyber Sentinels';
      output+=`\nexport function generateMetadata() { const title=${JSON.stringify(title+' | Cyber Sentinels')}; return { title, alternates: spanishAlternates(${JSON.stringify(route)}), ...spanishSocial(title, title, ${JSON.stringify('/es'+route)}) }; }\n`;
    }
    if(!/export const dynamic\s*=/.test(output))output+='\nexport const dynamic = "force-dynamic";\n';
  }
  output='// Generated by tools/i18n/generate-spanish-public.mjs. Edit the catalogue, then regenerate.\n'+output;
  mkdirSync(dirname(destination),{recursive:true});
  if(process.argv.includes('--check')){if(readFileSync(destination,'utf8').replaceAll('\r\n','\n')!==output.replaceAll('\r\n','\n'))throw Error('Generated Spanish source drift: '+destination);}
  else writeFileSync(destination,output);
  generated.push({source,destination,displayEdits:edits.length,sourceHash:createHash('sha256').update(original.replaceAll('\r\n','\n')).digest('hex')});
}
for(const [source,destination] of files)generate(source,destination);
for(const [source,entries] of Map.groupBy(targets,t=>t.source)){
  const route=entries.length>1?'/resources/agent-security/[slug]':entries[0].path;
  generate(source,`app/es${route}/page.tsx`,route);
}
if(!process.argv.includes('--check'))writeFileSync('artifacts/spanish-completion/generated-source-manifest.json',JSON.stringify({messages:translations.length,publicRoutes:routes.size,generated},null,2)+'\n');
console.log(JSON.stringify({messages:translations.length,generatedFiles:generated.length,checked:process.argv.includes('--check')}));
