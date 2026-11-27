"""Real, synthetic-only PostgreSQL ownership/RLS regression. Never uses hosted env."""
import argparse, concurrent.futures, datetime, hashlib, json, os, pathlib, random, re, socket, subprocess, time, uuid
parser=argparse.ArgumentParser()
parser.add_argument('--postgres-bin',required=True)
parser.add_argument('--evidence',required=True)
parser.add_argument('--baseline',action='store_true')
args=parser.parse_args()
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(args.evidence).resolve();OUT.mkdir(parents=True,exist_ok=True)
BIN=pathlib.Path(args.postgres_bin).resolve()
RUN=ROOT/'tmp'/('ownership-email-'+str(uuid.uuid4()));RUN.mkdir(parents=True)
DATA=RUN/'data'
with socket.socket() as sock:sock.bind(('127.0.0.1',0));PORT=sock.getsockname()[1]
assert PORT not in [5432,55473,55439]
ADMIN='ownership_test_admin'
env={k:v for k,v in os.environ.items() if not re.search(r'PG|DATABASE|SUPABASE|SECRET|TOKEN|PASSWORD|API_KEY',k,re.I)}
env.update(PGHOST='127.0.0.1',PGPORT=str(PORT),PGUSER=ADMIN,PGDATABASE='postgres',PGSSLMODE='disable',PGCONNECT_TIMEOUT='5',PGPASSWORD='')
def command(name,argv,stdin=None):
    p=subprocess.run([str(BIN/(name+'.exe')),*argv],input=stdin,capture_output=True,text=True,env=env,timeout=90,creationflags=subprocess.CREATE_NO_WINDOW)
    if p.returncode:raise RuntimeError(name+': '+p.stdout+p.stderr)
    return p.stdout
def sql(q):return command('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],q)
def literal(v):return 'null' if v is None else "'"+str(v).replace("'","''")+"'"
def ident(v):return '"'+v.replace('"','""')+'"'
def uid(n):return f'10000000-0000-4000-8000-{n:012d}'
ACTOR='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';SESSION='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
FOREIGN='cccccccc-cccc-4ccc-8ccc-cccccccccccc';FOREIGN_SESSION='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
def claims(email=None,actor=ACTOR,session=SESSION):
    x={'sub':actor,'session_id':session}
    if email is not None:x['email']=email
    return x
def as_user(q,c,role='authenticated'):
    return sql(f"set role {ident(role)};select set_config('request.jwt.claims',{literal(json.dumps(c))},false);"+q).splitlines()[-1]
observations=[]
def observe(name,actual,expected,**details):
    observations.append(dict(name=name,actual=actual,expected=expected,unexpected=actual!=expected,**details))
baseline=(ROOT/'tests/fixtures/ownership-email-baseline.sql').read_text()
policies=json.loads((ROOT/'tests/fixtures/ownership-email-policies.json').read_text())
migration=next((ROOT/'supabase/migrations').glob('*_fail_closed_email_ownership.sql'))
started=False
try:
    command('initdb',['-D',str(DATA),'-U',ADMIN,'--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale'])
    with open(RUN/'postgres.log','w') as log:
        server=subprocess.Popen([str(BIN/'postgres.exe'),'-D',str(DATA),'-h','127.0.0.1','-p',str(PORT),'-c','max_connections=16'],stdin=subprocess.DEVNULL,stdout=log,stderr=log,env=env,creationflags=subprocess.CREATE_NO_WINDOW)
    started=True
    for attempt in range(80):
        try:
            assert pathlib.Path(sql('show data_directory').strip()).resolve()==DATA.resolve();break
        except RuntimeError:time.sleep(.1)
    else:raise RuntimeError('Owned loopback cluster did not start')
    sql(baseline)
    sql('create schema storage;create sequence public.approval_sequence_probe_seq;alter table public.team_members add column id uuid;')
    fixture=(ROOT/'tests/fixtures/account-approval-boundary.sql').read_text()
    tables=re.findall(r'create table .*?;',fixture,re.S|re.I)
    sql('\n'.join(re.sub(r'^create table ', 'create table if not exists ',x,flags=re.I) for x in tables))
    sql('grant usage on schema public,auth,session_security to authenticated,service_role;alter role service_role bypassrls;')
    policy_sql=[]
    for p in policies:
        policy_sql.append(f'create policy {ident(p["policyname"])} on {ident(p["schemaname"])}.{ident(p["tablename"])} as {p["permissive"]} for {p["cmd"]} to authenticated'+(' using ('+p['qual']+')' if p['qual'] else '')+(' with check ('+p['with_check']+')' if p['with_check'] else '')+';')
    for table in sorted({p['tablename'] for p in policies}):
        policy_sql.extend([f'alter table public.{ident(table)} enable row level security;',f'grant select,insert,update,delete on public.{ident(table)} to authenticated,service_role;',f'create policy "synthetic active approval gate" on public.{ident(table)} as restrictive for all to authenticated using(public.security_closure_user_approved()) with check(public.security_closure_user_approved());'])
    sql('\n'.join(policy_sql))
    before=json.loads(sql("select json_agg(json_build_object('schema',schemaname,'table',tablename,'policy',policyname,'roles',roles,'cmd',cmd,'mode',permissive) order by schemaname,tablename,policyname) from pg_policies;"))
    if not args.baseline:
        sql(migration.read_text())
        # A second application preserves all policies, roles, grants and signatures.
        sql(migration.read_text())
    after=json.loads(sql("select json_agg(json_build_object('schema',schemaname,'table',tablename,'policy',policyname,'roles',roles,'cmd',cmd,'mode',permissive) order by schemaname,tablename,policyname) from pg_policies;"))
    observe('policy metadata preserved',after,before)
    funcs=[('case','security_closure_case_owner',4),('passport','security_closure_passport_owner',5),('team-uuid','security_closure_team_member',6),('team-text','security_closure_team_member',6),('agent','security_closure_ai_agent_owner',4),('evidence','security_closure_evidence_object_owner',4)]
    # The original 108 ownership observations plus 12 gate controls reproduce the 120-case report.
    for label,email in [('missing',None),('blank',''),('matching','alice@example.invalid'),('foreign','eve@example.invalid')]:
        query=[];expected=[]
        for surface,fn,count in funcs:
            for n in range(1,count+1):
                if n==5 and surface in ['team-uuid','team-text']:continue
                value=uid(n)+('/proof.bin' if surface=='evidence' else '')
                cast='text' if surface in ['team-text','evidence'] else 'uuid'
                query.append(f'public.{fn}({literal(value)}::{cast})')
                expected.append((surface,n,email=='alice@example.invalid' and n==3))
        values=json.loads(as_user('select json_build_array('+','.join(query)+');',claims(email)))
        for (surface,n,want),actual in zip(expected,values):observe('original matrix',actual is True,want,scenario=label,surface=surface,fixture=n)
    # Property grid exercises every direct email policy, not only helper RPCs.
    owner_columns={'api_keys':'user_email','audit_logs':'owner_email','autonomy_profiles':'created_by','data_rights_requests':'requester_email','decisions':'owner_email','enterprise_access_requests':'work_email','evidence_files':'owner_email','execution_passports':'created_by','feedback_reports':'submitted_by_email','help_questions':'created_by_email','intent_requests':'created_by','passport_state_checks':'created_by','passports':'owner_email','provenance_events':'created_by','signals':'owner_email','team_members':'member_email','trust_assistant_questions':'asked_by_email','trust_reports':'owner_email','verification_cases':'owner_email'}
    property_rows=[];property_inserts=[];owners=[None,'',' ','\t','alice@example.invalid','ALICE@example.invalid','bob@example.invalid',"' OR 1=1 --",' alice@example.invalid ']
    for idx,(table,column) in enumerate(owner_columns.items()):
        for n,owner in enumerate(owners):
            key=uid(10000+idx*100+n)
            cols=['id',column];vals=[literal(key),literal(owner)]
            if table=='team_members':cols+=['team_id','invitation_status'];vals +=[literal(key),"'active'"]
            property_inserts.append(f'insert into public.{ident(table)}('+','.join(ident(c) for c in cols)+') values('+','.join(vals)+');')
            property_rows.append((table,key,owner))
    sql('\n'.join(property_inserts))
    emails=[None,'',' ','\t','alice@example.invalid','ALICE@example.invalid','bob@example.invalid',"' OR 1=1 --",' alice@example.invalid ']
    for email in emails:
        pieces=[f'(select count(*)=1 from public.{ident(table)} where id={literal(key)})' for table,key,owner in property_rows]
        actual=json.loads(as_user('select json_agg(value order by position) from (values '+','.join(f'({i},{piece})' for i,piece in enumerate(pieces))+') item(position,value);',claims(email)))
        for (table,key,owner),value in zip(property_rows,actual):
            want=bool(email and email.strip() and owner is not None and owner.lower()==email.lower())
            observe('direct policy property grid',value,want,table=table,owner=owner,email=email)
    # Preserve legitimate email-less UID and actual tenant membership alternatives.
    tenant_a=uid(8001);tenant_b=uid(8002)
    sql(f"insert into public.trust_workspaces values('{tenant_a}','{ACTOR}'),('{tenant_b}','{FOREIGN}');insert into auth.sessions values('{FOREIGN_SESSION}','{FOREIGN}',null);insert into public.account_access_approvals values('{FOREIGN}','APPROVED',null,null);")
    agent_a=uid(8101);agent_b=uid(8102);agent_conflict=uid(8103)
    sql(f"insert into public.ai_agents values('{agent_a}','{ACTOR}',null,'{tenant_a}','{tenant_a}'),('{agent_b}','{FOREIGN}',null,'{tenant_b}','{tenant_b}'),('{agent_conflict}','{FOREIGN}','alice@example.invalid',null,null);")
    for actor,session,own,foreign in [(ACTOR,SESSION,agent_a,agent_b),(FOREIGN,FOREIGN_SESSION,agent_b,agent_a)]:
        actual=json.loads(as_user(f"select json_build_array(public.security_closure_ai_agent_owner('{own}'),public.security_closure_ai_agent_owner('{foreign}'),public.user_can_access_trust_workspace('{tenant_a}'),public.user_can_access_trust_workspace('{tenant_b}'));",claims(actor=actor,session=session)))
        observe('email-less UID/tenant alternatives',actual,[True,False,actor==ACTOR,actor==FOREIGN],actor=actor)
    observe('conflicting UID rejects matching email',as_user(f"select public.security_closure_ai_agent_owner('{agent_conflict}');",claims('alice@example.invalid'))=='t',False)
    api_key_a=uid(8201);api_key_b=uid(8202);api_key_tenant=uid(8203)
    sql(f"insert into public.api_keys(id,user_id) values('{api_key_a}','{ACTOR}'),('{api_key_b}','{FOREIGN}');insert into public.api_keys(id,tenant_id) values('{api_key_tenant}','{tenant_a}');")
    values=json.loads(as_user(f"select json_build_array((select count(*)=1 from public.api_keys where id='{api_key_a}'),(select count(*)=1 from public.api_keys where id='{api_key_b}'),(select count(*)=1 from public.api_keys where id='{api_key_tenant}'));",claims()))
    observe('email-less API-key row UID and tenant alternatives',values,[True,False,True])
    # No user/session binding may be fabricated from untrusted metadata or service/API role labels.
    for label,c in [('no-sub',{'email':'alice@example.invalid','session_id':SESSION}),('no-session',{'sub':ACTOR,'email':'alice@example.invalid'}),('foreign-session',claims('alice@example.invalid',ACTOR,FOREIGN_SESSION)),('forged-metadata',{'sub':uid(9999),'email':'alice@example.invalid','session_id':SESSION,'user_metadata':{'role':'admin','approved':True,'tenant':tenant_a}}),('api-client-no-session',{'sub':uid(9998),'role':'authenticated','principal_type':'api_client'}),('service-no-human-session',{'role':'service_role','email':'alice@example.invalid'})]:
        actual=json.loads(as_user(f"select json_build_array(public.security_closure_case_owner('{uid(3)}'),public.security_closure_passport_owner('{uid(3)}'),public.security_closure_ai_agent_owner('{agent_a}'));",c))
        observe('principal/session adversary',actual,[False,False,False],scenario=label)
    # Model real privileged database behavior explicitly: bypassRLS is NOT protected by these helpers.
    service_count=int(as_user('select count(*) from public.verification_cases;',{},'service_role'))
    observe('service_role bypassRLS remains server authorization boundary',service_count>0,True)
    # Independent connections with different GUC principals cannot leak email/tenant state.
    def concurrent_probe(i):
        own=i%2==0;c=claims('alice@example.invalid' if own else 'eve@example.invalid')
        result=as_user(f"select bool_and(public.security_closure_case_owner('{uid(3)}') is {'true' if own else 'false'}) from generate_series(1,50);",c)
        return result=='t'
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        observe('concurrent principal isolation',all(pool.map(concurrent_probe,range(24))),True)
    if not args.baseline:
        privileges=json.loads(sql("select json_build_array(has_function_privilege('anon','session_security.current_ownership_email()','EXECUTE'),has_function_privilege('authenticated','session_security.current_ownership_email()','EXECUTE'),has_function_privilege('service_role','session_security.current_ownership_email()','EXECUTE'));"))
        observe('ownership-email helper grants',privileges,[False,True,True])
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _:sql(migration.read_text()),range(2)))
        observe('concurrent migration serialization',True,True)
        guarded=next(p for p in policies if p['tablename']=='api_keys')
        sql('alter policy "api keys owner read" on public.api_keys using(true);')
        try:
            sql(migration.read_text());observe('policy drift rejected',False,True)
        except RuntimeError as error:observe('policy drift rejected','OWNERSHIP_POLICY_EXPRESSION_DRIFT' in str(error),True)
        sql('alter policy "api keys owner read" on public.api_keys using('+guarded['new_qual']+');')
        original=sql("select pg_get_functiondef('public.security_closure_case_owner(uuid)'::regprocedure);")
        sql("create or replace function public.security_closure_case_owner(p_case_id uuid) returns boolean language sql stable security definer set search_path='' as $$select true$$;")
        try:
            sql(migration.read_text());observe('function drift rejected',False,True)
        except RuntimeError as error:observe('function drift rejected','OWNERSHIP_FUNCTION_DRIFT' in str(error),True)
        sql(original)
        sql(migration.read_text())
        sql("create policy synthetic_unreviewed_email on public.api_keys for select to authenticated using(coalesce(auth.jwt()->>'email','')='');")
        try:
            sql(migration.read_text());observe('unreviewed alternate email policy rejected',False,True)
        except RuntimeError as error:observe('unreviewed alternate email policy rejected','UNREVIEWED_EMPTY_EMAIL_POLICY_REMAINS' in str(error),True)
        sql('drop policy synthetic_unreviewed_email on public.api_keys;')
    for gate,mutation in [('approval-revoked',"update public.account_access_approvals set status='REVOKED'"),('session-deleted',"update public.account_access_approvals set status='APPROVED';delete from auth.sessions")]:
        sql(mutation)
        for surface,fn,count in funcs:
            value=uid(2)+('/proof.bin' if surface=='evidence' else '');cast='text' if surface in ['team-text','evidence'] else 'uuid'
            observe('original gate control',as_user(f'select public.{fn}({literal(value)}::{cast});',claims())=='t',False,scenario=gate,surface=surface)
            value=uid(3)+('/proof.bin' if surface=='evidence' else '')
            observe('valid-email revocation gate',as_user(f'select public.{fn}({literal(value)}::{cast});',claims('alice@example.invalid'))=='t',False,scenario=gate,surface=surface)
    unexpected=[x for x in observations if x['unexpected']]
    report={'engine':'PostgreSQL17 fresh synthetic loopback cluster','baseline':args.baseline,'migration':migration.name,'migrationSha256':hashlib.sha256(migration.read_bytes()).hexdigest(),'cases':len(observations),'unexpected':len(unexpected),'observations':observations,'dataDirectory':str(DATA),'hostedSql':False,'limits':['Captured function/policy definitions and synthetic scaffold, not current hosted equivalence.','Simulated JWT request claims; managed JWT signature and Auth service are not under test.','Privileged service_role bypassRLS intentionally remains; application API/workload/dispatch boundaries require separate tests.']}
    (OUT/('baseline-extended.json' if args.baseline else 'repaired-regression.json')).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['baseline','cases','unexpected','migrationSha256']}))
    if not args.baseline:assert not unexpected,unexpected[:4]
finally:
    if started:
        command('pg_ctl',['-D',str(DATA),'-m','fast','-w','stop'])
        (OUT/('cluster-stopped-baseline-extended.json' if args.baseline else 'cluster-stopped-repaired.json')).write_text(json.dumps({'dataDirectory':str(DATA),'stopped':True})+'\n')
