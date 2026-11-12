import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import {createRequire} from 'node:module';
import {resolve,dirname,extname} from 'node:path';
import {existsSync} from 'node:fs';
import {socOperationsFixture} from './fixtures/soc-operations.mjs';

test('SOC console desktop/mobile drives real signed ingestion, investigation failure and feedback',async()=>{
 const bundle=await build({absWorkingDir:process.cwd(),tsconfigRaw:{compilerOptions:{jsx:'react-jsx'}},stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import Console from "./app/tenente/swarm/swarm-console";createRoot(document.getElementById("root")).render(<Console/>);',resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'explicit-workspace-files',setup(builder){
  builder.onResolve({filter:/.*/},args=>{
   const base=args.importer&&args.importer!=='<stdin>'?dirname(args.importer):process.cwd();
   if(args.path.startsWith('.')){const path=resolve(base,args.path);const file=[path,`${path}.tsx`,`${path}.ts`,`${path}.js`].find(existsSync);if(!file)throw Error(`Missing fixture import ${args.path}`);return{path:file,namespace:'workspace'};}
   return{path:createRequire(resolve(base,'resolver.cjs')).resolve(args.path),namespace:'workspace'};
  });
  builder.onLoad({filter:/.*/,namespace:'workspace'},async args=>({contents:await readFile(args.path,'utf8'),loader:extname(args.path)==='.tsx'?'tsx':extname(args.path)==='.ts'?'ts':'js'}));
 }}]});
 const css=await postcss([tailwindcss({content:['./app/tenente/swarm/swarm-console.tsx'],theme:{},plugins:[]})]).process(await readFile('app/globals.css','utf8'),{from:'app/globals.css'});
 const browser=await chromium.launch({headless:true});const results=[];
 const priorKey=process.env.OPENAI_API_KEY,priorModel=process.env.OPENAI_SOC_MODEL;
 delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_SOC_MODEL;
 await mkdir('artifacts/soc',{recursive:true});
 try{for(const width of [1440,390]){
  const f=await socOperationsFixture();await f.register();const requests=[],errors=[];
  const server=createServer((req,res)=>{void(async()=>{
   const url=new URL(req.url,'http://127.0.0.1');const send=(type,body,status=200)=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(body);};
   if(url.pathname==='/console.js')return send('application/javascript',bundle.outputFiles[0].text);
   if(url.pathname==='/style.css')return send('text/css',css.css);
   if(url.pathname==='/api/tenente/swarm'){
    if(req.headers['x-enterprise-id']!==f.tenant)return send('application/json',JSON.stringify({error:'ENTERPRISE_ACCESS_DENIED'}),403);
    if(req.method==='GET')return send('application/json',JSON.stringify({snapshot:await f.ops.snapshot()}));
    let text='';for await(const chunk of req)text+=chunk;
    try{const body=JSON.parse(text);requests.push(body);const receipt=await f.ops.command(body);return send('application/json',JSON.stringify({receipt:{digest:receipt.digest,kind:receipt.kind,cancellationStatus:null}}));}
    catch(error){return send('application/json',JSON.stringify({error:error instanceof TypeError?'SWARM_INPUT_INVALID':'SWARM_OPERATIONS_UNAVAILABLE'}),error instanceof TypeError?400:503);}
   }
   return send('text/html','<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="background:#04070c;color:white;padding:16px"><main id="root"></main><script src="/console.js"></script></body></html>');
  })().catch(error=>{errors.push(error.message);res.statusCode=500;res.end('Fixture failure');});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  const load=async()=>{await page.getByRole('button',{name:'Load current state',exact:true}).click();await page.getByRole('heading',{name:'SOC incident timeline',exact:true}).waitFor();};
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/tenente/swarm`);await page.getByLabel('Workspace identifier').fill(f.tenant);await load();
   assert.match(await page.getByLabel('SOC incident evidence').innerText(),/0 authenticated synthetic alerts/);
   await page.getByLabel('Responsible owner identifier').fill('security-owner');await page.getByRole('button',{name:'Register enrolled SOC agent',exact:true}).click();await page.getByRole('status').filter({hasText:'SOC_AGENT_REGISTERED'}).waitFor();
   await page.getByLabel('Signed synthetic warning envelope').fill(JSON.stringify(f.envelope()));await page.getByRole('button',{name:'Verify and ingest warning',exact:true}).click();await page.getByRole('status').filter({hasText:'WATCHTOWER_WARNING'}).waitFor();
   const alert=(await f.ops.snapshot()).soc.timeline.find(e=>e.kind==='SOC_ALERT');assert.ok(alert);await page.getByLabel('Alert evidence digest').fill(alert.digest);
   await page.getByRole('button',{name:'Investigate alert evidence',exact:true}).click();await page.getByRole('status').filter({hasText:'SOC_ASSESSMENT'}).waitFor();
   const section=page.getByLabel('SOC incident evidence');assert.match(await section.innerText(),/SOC_FAILURE/);await section.getByText('Verifiable record',{exact:true}).last().click();
   await page.getByLabel('Analyst assessment: false positive').check();await page.getByRole('button',{name:'Record analyst feedback',exact:true}).click();await page.getByRole('status').filter({hasText:'SOC_FEEDBACK'}).waitFor();
   assert.equal((await f.ops.snapshot()).soc.responseDispatchEnabled,false);assert.equal(requests.some(r=>r.action==='soc-respond'),false);assert.equal(f.h.effects(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
   await page.screenshot({path:`artifacts/soc/console-${width}.png`,fullPage:true});
   await page.getByLabel('Signed synthetic warning envelope').fill('{"origin":{}}');await page.getByRole('button',{name:'Verify and ingest warning',exact:true}).click();await page.getByRole('status').filter({hasText:'SWARM_INPUT_INVALID'}).waitFor();assert.equal(await page.getByRole('heading',{name:'SOC incident timeline',exact:true}).count(),0);
   assert.deepEqual(errors,[]);results.push({width,requests:requests.map(r=>r.action),alerts:1,destinationEffects:0,pageErrors:errors,passed:true});
  }finally{await page.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
 }}finally{await browser.close();if(priorKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=priorKey;if(priorModel===undefined)delete process.env.OPENAI_SOC_MODEL;else process.env.OPENAI_SOC_MODEL=priorModel;}
 await writeFile('artifacts/soc/console-browser.json',JSON.stringify({environment:'LOCAL SYNTHETIC BROWSER FIXTURE',realComponents:true,realOperations:true,realCryptography:true,hosted:false,supabase:false,nextRoute:false,results},null,2)+'\n');
});
