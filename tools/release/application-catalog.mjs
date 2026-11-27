// Reconstruct an application catalog in disposable PostgreSQL only. No network IO.
export const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
const ident = (schema, name) => `${quote(schema)}.${quote(name)}`;
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
export function applicationCatalogSql(catalog) {
  const scopes = new Set(['public', 'auth', 'storage', 'private', 'supabase_migrations']);
  const tables = catalog.tables.filter(t => scopes.has(t.schema) && ['r', 'p'].includes(t.kind));
  const sql = [`set check_function_bodies=off;`, `create schema if not exists extensions;`, `create extension if not exists pgcrypto with schema extensions;`, `set search_path=public,extensions;`];
  for (const schema of scopes) sql.push(`create schema if not exists ${quote(schema)};`);
  for (const role of ['anon', 'authenticated', 'service_role', 'supabase_auth_admin', 'supabase_storage_admin', 'supabase_admin', 'dashboard_user']) sql.push(`do $$ begin if not exists(select 1 from pg_roles where rolname=${literal(role)}) then create role ${quote(role)} ${role==='service_role'?'bypassrls':''}; end if; end $$;`);
  for (const t of catalog.types.filter(t=>scopes.has(t.schema)&&t.kind==='e')) sql.push(`create type ${ident(t.schema,t.name)} as enum (${t.enum.map(literal).join(',')});`);
  for (const t of catalog.tables.filter(t=>scopes.has(t.schema)&&t.kind==='S')) sql.push(`create sequence ${ident(t.schema,t.name)};`);
  for (const f of catalog.functions.filter(f=>f.schema==='auth'&&['uid','jwt','role','email'].includes(f.name))) sql.push(f.definition+';');
  for (const t of tables) {
    const cols=catalog.columns.filter(x=>x.schema===t.schema&&x.table===t.name).sort((a,b)=>a.position-b.position);
    sql.push(`create table ${ident(t.schema,t.name)} (${cols.map(c=>`${quote(c.name)} ${c.type}${c.generated?' generated always as ('+c.default+') stored':c.identity?' generated '+(c.identity==='a'?'always':'by default')+' as identity':c.default?' default '+c.default:''}${c.notnull?' not null':''}`).join(',\n')});`);
  }
  const functions = catalog.functions.filter(f=>f.schema==='public'&&!f.extension||f.schema==='private'||f.schema==='auth'&&['uid','jwt','role','email'].includes(f.name));
  for (const f of functions) sql.push(f.definition+';');
  const constraints=catalog.constraints.filter(k=>scopes.has(k.schema)&&tables.some(t=>t.schema===k.schema&&t.name===k.table)&&k.type!=='n');
  for(const kind of ['p','u','c','x']) for(const k of constraints.filter(k=>k.type===kind))sql.push(`alter table ${ident(k.schema,k.table)} add constraint ${quote(k.name)} ${k.definition};`);
  for(const ix of catalog.indexes.filter(ix=>scopes.has(ix.schema)&&!constraints.some(k=>k.schema===ix.schema&&k.name===ix.name)))sql.push(ix.definition+';');
  for(const k of constraints.filter(k=>k.type==='f'))sql.push(`alter table ${ident(k.schema,k.table)} add constraint ${quote(k.name)} ${k.definition};`);
  for(const t of catalog.tables.filter(t=>t.schema==='public'&&t.kind==='v'))sql.push(`create view ${ident(t.schema,t.name)}${t.options?.length?' with ('+t.options.join(',')+')':''} as ${t.view};`);
  for(const t of tables){if(t.rls)sql.push(`alter table ${ident(t.schema,t.name)} enable row level security;`);if(t.forced)sql.push(`alter table ${ident(t.schema,t.name)} force row level security;`);}
  for(const p of catalog.policies.filter(p=>scopes.has(p.schemaname)))sql.push(`create policy ${quote(p.policyname)} on ${ident(p.schemaname,p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(r=>r==='public'?'public':quote(r)).join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
  for(const t of catalog.triggers.filter(t=>t.schema==='public'||t.schema==='auth'&&t.name==='create_account_access_request'))sql.push(t.definition+';');
  const privileges={a:'INSERT',r:'SELECT',w:'UPDATE',d:'DELETE',D:'TRUNCATE',x:'REFERENCES',t:'TRIGGER',m:'MAINTAIN',X:'EXECUTE',U:'USAGE',C:'CREATE'};
  function acl(acl,object,defaults){sql.push(`revoke all on ${object} from public,anon,authenticated,service_role;`);if(acl===null){if(defaults)sql.push(defaults);return;}
    for(const match of acl.matchAll(/(?:\{|,)([^=,]*)=([^/,]*)\/[^,}]+/g)){const grantee=match[1]?quote(match[1]):'public';for(const p of match[2].matchAll(/([arwdDxtmXUC])(\*)?/g))sql.push(`grant ${privileges[p[1]]} on ${object} to ${grantee}${p[2]?' with grant option':''};`);}}
  for(const t of catalog.tables.filter(t=>scopes.has(t.schema)&&['r','p','v','S'].includes(t.kind)))acl(t.acl,`${t.kind==='S'?'sequence':'table'} ${ident(t.schema,t.name)}`);
  for(const f of functions)acl(f.acl,`function ${ident(f.schema,f.name)}(${f.args})`,`grant execute on function ${ident(f.schema,f.name)}(${f.args}) to public;`);
  for(const n of catalog.schemas.filter(n=>scopes.has(n.name)))acl(n.acl,`schema ${quote(n.name)}`);
  for(const c of catalog.columns.filter(c=>scopes.has(c.schema)&&c.acl)) {
    for(const match of c.acl.matchAll(/(?:\{|,)([^=,]*)=([^/,]*)\/[^,}]+/g)) {
      const grantee=match[1]?quote(match[1]):'public';
      for(const p of match[2].matchAll(/([arwx])(\*)?/g))sql.push(`grant ${privileges[p[1]]} (${quote(c.name)}) on ${ident(c.schema,c.table)} to ${grantee}${p[2]?' with grant option':''};`);
    }
  }
  for(const d of catalog.default_acls.filter(d=>!d.schema||scopes.has(d.schema))) {
    const kind={r:'tables',S:'sequences',f:'functions',T:'types',n:'schemas'}[d.type];
    if(!kind)throw new Error('Unsupported default ACL kind: '+d.type);
    const prefix=`alter default privileges for role ${quote(d.owner)}${d.schema?' in schema '+quote(d.schema):''}`;
    sql.push(`${prefix} revoke all on ${kind} from public,anon,authenticated,service_role;`);
    for(const match of d.acl.matchAll(/(?:\{|,)([^=,]*)=([^/,]*)\/[^,}]+/g)) {
      const grantee=match[1]?quote(match[1]):'public';
      for(const p of match[2].matchAll(/([arwdDxtmXUC])(\*)?/g))sql.push(`${prefix} grant ${privileges[p[1]]} on ${kind} to ${grantee}${p[2]?' with grant option':''};`);
    }
  }
  // Bucket configuration is application-owned metadata, not object bytes.
  for(const b of catalog.buckets??[])sql.push(`insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(${literal(b.id)},${literal(b.name)},${b.public?'true':'false'},${b.file_size_limit??'null'},${b.allowed_mime_types?'array['+b.allowed_mime_types.map(literal).join(',')+']::text[]':'null'}) on conflict(id) do nothing;`);
  // Managed schemas are dependency scaffolding, not a simulation of Supabase services.
  return sql.join('\n');
}
