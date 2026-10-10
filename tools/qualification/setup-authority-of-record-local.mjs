// Reconstruct schema only into a NEW disposable local database. No remote calls or credential loading.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {applicationCatalogSql,quote} from '../release/application-catalog.mjs';
import {schemaContract} from '../release/schema-equivalence.mjs';

const baseline=process.argv[2]??'tmp/recovery-closure/staging-catalog.json';
const database=process.env.AOR_LOCAL_DATABASE??'aor_qualification_final';
if(!/^aor_qualification_[a-z0-9]+$/.test(database))throw new Error('A new aor_qualification_* database name is required.');
const config={host:'127.0.0.1',port:55439,user:'supabase_admin'};
const source=fs.readFileSync(baseline),catalog=JSON.parse(source);
if(!Array.isArray(catalog.tables)||!Array.isArray(catalog.ledger))throw new Error('Expected a recorded application catalog, not a data dump.');
for(const key of Object.keys(catalog))if(catalog[key]===null)catalog[key]=[];
const admin=new pg.Client({...config,database:'postgres'});await admin.connect();
try {
 if((await admin.query('select 1 from pg_database where datname=$1',[database])).rowCount)throw new Error('Target database already exists; use a fresh name. Nothing was reset.');
 await admin.query(`create database "${database}" owner postgres`);
} finally {await admin.end();}
const db=new pg.Client({...config,database});await db.connect();
const applied=[];
try{
 await db.query(applicationCatalogSql(catalog));
 // Native Supabase bootstrap uses supabase_admin; restore recorded ownership
 // before testing migrations through the image's administrative migration role.
 const schemas=new Set(['public','auth','storage','private','supabase_migrations']);
 for(const table of catalog.tables.filter(t=>schemas.has(t.schema)&&['r','p','v','m'].includes(t.kind))) {
  const kind=table.kind==='v'?'view':table.kind==='m'?'materialized view':'table';
  await db.query(`alter ${kind} ${quote(table.schema)}.${quote(table.name)} owner to ${quote(table.owner)}`);
 }
 for(const fn of catalog.functions.filter(f=>(f.schema==='public'&&!f.extension)||f.schema==='private'||f.schema==='auth'&&['uid','jwt','role','email'].includes(f.name)))
  await db.query(`alter function ${quote(fn.schema)}.${quote(fn.name)}(${fn.args}) owner to ${quote(fn.owner)}`);
 for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')&&!catalog.ledger.some(m=>m.version===n.split('_')[0])).sort()){
  await db.query(fs.readFileSync('supabase/migrations/'+name,'utf8'));applied.push(name);
 }
 const effective=(await db.query(fs.readFileSync('tools/release/effective-application-schema.sql','utf8'))).rows[0].catalog;
 const result={result:'PASS',database,host:'127.0.0.1',port:55439,sourceSchemaSha256:createHash('sha256').update(source).digest('hex'),applied,
  engine:(await db.query('select version() as version')).rows[0].version,migrationRole:'supabase_admin',classification:'LOCAL_SCHEMA_RECONSTRUCTION_NOT_PRODUCTION_RESTORE',contract:schemaContract(effective)};
 fs.mkdirSync('docs/authority-of-record',{recursive:true});fs.writeFileSync('docs/authority-of-record/LOCAL_SCHEMA_QUALIFICATION.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({result:result.result,database,applied:applied.length,classification:result.classification}));
}finally{await db.end();}
