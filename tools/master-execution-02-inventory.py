import subprocess,re,json,pathlib,datetime
root=pathlib.Path.cwd(); out=root/'tmp/master-execution-02-inventory';out.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(['git',*args],text=True,encoding='utf-8',errors='replace').strip()
refs=['HEAD','origin/main','origin/feat/tenente-swarm-authority-control','origin/feat/watchtower-controlled-demos-20261109','origin/test/watchtower-river-boundary-20261109','origin/website/watchtowers-ribagorza-20261109','origin/fix/approval-single-use-20261106','origin/migration/approval-consumption-20261108','origin/codex/p0-typecheck-20261111','origin/pr-118']
inventory=[]; snapshots=[]
for ref in refs:
 try:sha=git('rev-parse',ref); paths=git('ls-tree','-r','--name-only',ref).splitlines()
 except subprocess.CalledProcessError:continue
 snapshots.append({'ref':ref,'sha':sha})
 matches={}
 try: lines=git('grep','-n','-E','export[[:space:]]+(async[[:space:]]+)?(function|class|const)[[:space:]]+|ALSAMORA|VIACAMP|CHIRIVETA|TORCH|Authority Sentinel|Identity Sentinel|Runtime Sentinel|Evidence Sentinel|Deployment Sentinel|Workforce Sentinel|Robotics Sentinel',ref,'--','lib','src','packages','app/api','tools','scripts','docs').splitlines()
 except subprocess.CalledProcessError:lines=[]
 for line in lines:
  prefix=f'{ref}:'
  fields=line[len(prefix):].split(':',2)
  if len(fields)==3:matches.setdefault(fields[0],[]).append(fields[2])
 for path in paths:
  if not path.endswith(('.ts','.tsx','.mjs','.cjs','.sql','.yml','.json','.md')):continue
  selected=(path.startswith(('lib/','src/','packages/','app/api/','supabase/migrations/','.github/workflows/')) or path in ['vercel.json'] or (path.startswith(('tools/','scripts/','docs/')) and re.search(r'agent|swarm|watchtower|river|torch|qualification|tenente',path,re.I)))
  if not selected:continue
  content='\n'.join(matches.get(path,[]))
  exports=re.findall(r'export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)',content)
  names=sorted(set(re.findall(r'\b(?:ALSAMORA|VIACAMP(?:-2)?|CHIRIVETA|TORCH|Watcher|Analyst|Guardian|Witness|Recovery|Coordinator|Research|Analysis|Execution|Audit|Authority Sentinel|Identity Sentinel|Runtime Sentinel|Evidence Sentinel|Deployment Sentinel|Workforce Sentinel|Robotics Sentinel)\b',content)))
  isroute=path.startswith('app/api/') and path.endswith('/route.ts')
  if exports or names or isroute or path.startswith(('supabase/migrations/','.github/workflows/')) or path=='vercel.json':
   inventory.append({'branch':ref,'sha':sha,'path':path,'exports':exports,'named_components':names,'kind':'API_ROUTE' if isroute else 'MIGRATION' if path.endswith('.sql') else 'WORKFLOW' if path.startswith('.github/') else 'MODULE','status':'CODE PRESENT — UNQUALIFIED','hosted_evidence':'NOT VERIFIED IN THIS RUN'})
(out/'runtime-source-index.json').write_text(json.dumps({'generated_at':'2026-11-12','snapshots':snapshots,'entries':inventory},indent=2),encoding='utf-8')
print(json.dumps({'snapshots':snapshots,'entries':len(inventory),'output':str(out/'runtime-source-index.json')},indent=2))
