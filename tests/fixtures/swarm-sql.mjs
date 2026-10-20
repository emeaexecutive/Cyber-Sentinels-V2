import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {swarmRpcPersistence} from '../../lib/swarm/rpc-persistence.ts';
import {installSwarmPrerequisites} from './swarm-schema.mjs';
export async function swarmSql(t){
  let db;
  const port=process.env.TENENTE_LOCAL_PG_PORT;
  if(port){
    if(!/^\d{4,5}$/.test(port))throw Error('Local test port invalid');
    const settings={host:'127.0.0.1',port:Number(port),user:'postgres',database:'postgres'};
    const admin=new pg.Client(settings);await admin.connect();
    const database='swarm_test_'+randomUUID().replaceAll('-','');
    await admin.query('CREATE DATABASE '+database);
    const client=new pg.Client({...settings,database});await client.connect();
    const pool=new pg.Pool({...settings,database,max:12,options:'-c role=service_role'});
    let service=false;
    db={query:(sql,args)=>service?pool.query(sql,args):client.query(sql,args),exec:async sql=>{
      if(sql==='set role service_role'){service=true;return;}
      if(sql==='reset role'){service=false;return;}
      if(sql==='create role anon; create role authenticated; create role service_role;'){
        for(const role of ['anon','authenticated','service_role'])await client.query(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);return;
      }
      return client.query(sql);
    }};
    t.after(async()=>{await pool.end();await client.end();await admin.query('DROP DATABASE '+database);await admin.end();});
    t.diagnostic('REAL_POSTGRES '+(await client.query('show server_version')).rows[0].server_version);
  }else{db=new PGlite();t.after(()=>db.close());}
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await installSwarmPrerequisites(db);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261020091324_tenente_swarm_authority_control.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261020100706_tenente_swarm_projection_recovery.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const rpc=async(name,args)=>{
    try{
      const load=name==='load_swarm_state_v1';
      const values=load?[args.p_tenant_id]:[args.p_tenant_id,args.p_version,JSON.stringify(args.p_state)];
      const query=load?'select public.load_swarm_state_v1($1) as data':'select public.cas_swarm_state_v1($1,$2,$3::jsonb) as data';
      return {data:(await db.query(query,values)).rows[0].data,error:null};
    }catch(error){return {data:null,error};}
  };
  return {db,persistence:swarmRpcPersistence(rpc),async inspect(){
    await db.exec('reset role');
    const states=(await db.query('select tenant_id,version,document from swarm_private.state')).rows;
    const records=(await db.query('select count(*)::int as count from swarm_private.events')).rows[0].count;
    await db.exec('set role service_role');
    return {states,records};
  }};
}
