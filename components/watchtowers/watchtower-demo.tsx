"use client";
import {useState} from "react";
import {watchtowerCopy,torchCases,riverCases,resultLabels,type WatchtowerLocale} from "@/lib/watchtowers/content";
import {WatchtowerNetwork} from "./watchtower-network";
import {recordedEvidence} from "@/lib/watchtowers/recorded-evidence";

/** A fixture viewer, never an authorisation or execution engine. No network calls. */
export function WatchtowerDemo({locale,kind}:{locale:WatchtowerLocale;kind:"torch"|"river"}){
  const copy=watchtowerCopy[locale],cases=kind==="torch"?torchCases:riverCases;
  const [selected,setSelected]=useState("A"),[step,setStep]=useState(0),[started,setStarted]=useState(false),[approved,setApproved]=useState(false),[reconciled,setReconciled]=useState(false);
  const scenario=cases.find(item=>item.id===selected)??cases[0],needsApproval=kind==="river"&&(selected==="B"||selected==="E");
  const outcome=approved&&needsApproval?"ALLOW":scenario.result;
  const stages=kind==="torch"?[copy.stages[0],copy.stages[1],copy.stages[2],copy.stages[6]]:copy.stages;
  function reset(){setStep(0);setStarted(false);setApproved(false);setReconciled(false);}
  const effects=kind==="river"?(approved&&needsApproval?1:riverCases.find(item=>item.id===selected)!.effects):0;
  const record=kind==="torch"?recordedEvidence.torch.manifest.results.find(item=>item.scenario===selected):recordedEvidence.river.manifest.tests.find(item=>item.scenario===selected);
  return <section className="watchtower-demo" aria-label={kind==="torch"?copy.torch:copy.river}>
    <p className="watchtower-notice">{copy.badge} · {copy.local}</p>
    <div className="watchtower-toolbar">
      <div className="watchtower-scenario"><label htmlFor={`watchtower-${kind}-scenario`}>{copy.scenario}</label><select id={`watchtower-${kind}-scenario`} value={selected} onChange={event=>{setSelected(event.target.value);reset();}}>{cases.map(item=><option key={item.id} value={item.id}>{item.id}. {item[locale]}</option>)}</select></div>
      <button type="button" className="brand-primary-action" onClick={()=>{reset();setStarted(true);}}>{copy.run}</button>
      <button type="button" onClick={()=>{setStarted(true);setStep(current=>Math.min(stages.length-1,current+1));}} disabled={step===stages.length-1}>{copy.next}</button>
      <button type="button" onClick={reset}>{copy.reset}</button>
    </div>
    <WatchtowerNetwork locale={locale} active={Math.min(step,2)} onSelect={index=>{setStarted(true);setStep(index);}}/>
    {kind==="torch"?<p className="watchtower-caption">{copy.fictional}</p>:null}
    <div className="watchtower-results" role="status" aria-live="polite" aria-atomic="true">
      <p>{copy.step} {step+1} {copy.of} {stages.length}: <strong>{stages[step]}</strong></p>
      {started?<><h2>{copy.status}</h2><p data-testid="recorded-outcome">{resultLabels[outcome][locale]}</p>
        <dl><div><dt>{copy.effects}</dt><dd data-testid="destination-effects">{effects}</dd></div>
          {kind==="torch"?<><div><dt>{copy.investigation}</dt><dd>{torchCases.find(item=>item.id===selected)!.investigations}</dd></div><div><dt>{copy.authority}</dt><dd>{copy.none}</dd></div></>:null}
        </dl></>:null}
    </div>
    {started&&needsApproval&&!approved?<div className="watchtower-approval"><p>{copy.pending}</p><button type="button" onClick={()=>{setApproved(true);setStep(stages.length-1);}}>{copy.approved}</button></div>:null}
    {started&&kind==="river"&&selected==="F"?<p>{locale==="es"?"12 solicitudes · 1 aprobación · 1 consumo duradero · 1 efecto local observado.":"12 requests · 1 approval · 1 durable claim · 1 independently observed local effect."}</p>:null}
    {started&&kind==="river"&&selected==="G"?<div><button type="button" onClick={()=>setReconciled(true)}>{copy.reconcile}</button>{reconciled?<p>{copy.reconciling}</p>:null}</div>:null}
    <section aria-label={copy.timeline}><h2>{copy.timeline}</h2><ol className="watchtower-timeline">{stages.map((stage,index)=><li key={stage} aria-current={step===index?"step":undefined}><button type="button" onClick={()=>{setStarted(true);setStep(index);}}>{String(index+1).padStart(2,"0")} · {stage}</button></li>)}</ol>
      <p className="watchtower-caption">{copy.evidence}: <code>{kind==="torch"?"torch-local.json":"river-local.json"} / {selected}</code>. {copy.conclusion}</p>
      <details className="watchtower-technical"><summary>{locale==="es"?"Examinar el registro final de la prueba local":"Inspect the final local fixture record"}</summary><p>{locale==="es"?"En los casos de aprobación, el registro final incluye la fase aprobada; la fase pendiente tiene cero efectos. La firma de la prueba utiliza una clave local efímera, no una identidad de producción.":"For approval cases, the final record includes the approved stage; the pending stage has zero effects. The fixture signature uses an ephemeral local key, not a Production identity."}</p><p>SHA: <code>{kind==="torch"?recordedEvidence.torchSha:recordedEvidence.riverSha}</code></p><pre tabIndex={0} aria-label={copy.evidence}>{JSON.stringify(record,null,2)}</pre></details>
      {kind==="river"?<details className="watchtower-technical"><summary>{locale==="es"?"Examinar la prueba local de extremo a extremo":"Inspect the end-to-end local proof"}</summary><p>{locale==="es"?"La prueba H vincula el aviso firmado, la revisión consultiva y el consumo SQL. Con autoridad delegada, la consulta de exportación cambia de 200 a 423; fuera del alcance, hay cero efectos de contención. Usa identidades sintéticas, sin Auth alojado ni un modelo real de IA.":"Proof H links the signed warning, advisory review and SQL dispatch claim. With delegated scope, the export probe changes from 200 to 423; outside scope, there are zero containment effects. It uses synthetic identities, without hosted Auth or a real AI model."}</p><pre tabIndex={0} data-testid="composed-proof" aria-label={locale==="es"?"Prueba local firmada":"Signed local proof"}>{JSON.stringify(recordedEvidence.river.manifest.tests.filter(item=>item.scenario.startsWith("H-")),null,2)}</pre></details>:null}
    </section>
  </section>;
}
