import {readFileSync,writeFileSync} from 'node:fs';
import {existsSync} from 'node:fs';
const text=readFileSync('lib/navigation/route-visibility.ts','utf8').split('export const canonicalPublicRoutes = [')[1].split('] as const')[0];
for(const [,path] of text.matchAll(/"([^"]+)"/g)){
  const file=path==='/'?'app/page.tsx':`app${path}/page.tsx`;
  if(!existsSync(file)&&path.startsWith('/resources/agent-security/'))continue;
  let source=readFileSync(file,'utf8');
  if(!/alternates:\s*\{\s*canonical:\s*"[^"]+"\s*\}/.test(source))continue;
  source=source.replace(/alternates:\s*\{\s*canonical:\s*"([^"]+)"\s*\}/g,(_,canonical)=>`alternates: publicPageAlternates(${JSON.stringify(canonical)})`);
  if(!source.includes('import { publicPageAlternates }'))source='import { publicPageAlternates } from "@/lib/i18n/public-locales";\n'+source;
  writeFileSync(file,source);
}
