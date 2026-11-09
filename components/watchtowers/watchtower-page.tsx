import Link from "next/link";
import {watchtowerCopy,type WatchtowerLocale} from "@/lib/watchtowers/content";
import {WatchtowerNetwork} from "./watchtower-network";
import {WatchtowerDemo} from "./watchtower-demo";

export function WatchtowerPage({locale,kind}:{locale:WatchtowerLocale;kind?:"torch"|"river"}){
  const copy=watchtowerCopy[locale],base=locale==="es"?"/es/tenente-swarm":"/tenente-swarm";
  return <main className="watchtower-page"><div className="watchtower-container">
    <header className="watchtower-hero"><p className="watchtower-eyebrow">{copy.eyebrow}</p><p className="watchtower-badge">{copy.badge}</p>
      <h1>{kind?kind==="torch"?copy.torch:copy.river:copy.title}</h1><p className="watchtower-lede">{kind?kind==="torch"?copy.torchIntro:copy.riverIntro:copy.distinction}</p>
      {kind?<Link href={base}>{copy.home}</Link>:null}
    </header>
    {kind?<><WatchtowerDemo locale={locale} kind={kind}/><p className="watchtower-principle">{copy.principle}</p><p>{copy.limits}</p><Link href={`${base}/${kind==="torch"?"river-crossing":"torch-code"}`}>{copy.other}</Link></>:<>
      <section className="watchtower-origin"><div><h2>{copy.originTitle}</h2><p>{copy.origin}</p></div><WatchtowerNetwork locale={locale}/></section>
      <p className="watchtower-caption">{copy.historical}</p>
      <p className="watchtower-caption"><a href="https://www.turismodearagon.com/ficha/viacamp/" rel="noopener noreferrer">{locale==="es"?"Contexto patrimonial: Viacamp y el Centro de Interpretación de las Torres Vigía (Turismo de Aragón)":"Heritage context: Viacamp and its watchtower interpretation centre (Aragón Tourism)"}</a></p>
      <section className="watchtower-roles" aria-label={locale==="es"?"Tres agentes, funciones limitadas":"Three agents, bounded roles"}>{copy.roles.map(([name,role,description])=><article key={name}><p className="watchtower-eyebrow">{name}</p><h2>{role}</h2><p>{description}</p></article>)}</section>
      <section className="watchtower-cards" aria-label={locale==="es"?"Dos demostraciones":"Two demonstrations"}>{(["torch","river"] as const).map(demo=><article key={demo}><p className="watchtower-badge">{copy.badge}</p><h2>{demo==="torch"?copy.torch:copy.river}</h2><p>{demo==="torch"?copy.torchIntro:copy.riverIntro}</p><Link className="brand-primary-action" href={`${base}/${demo==="torch"?"torch-code":"river-crossing"}`}>{copy.explore}: {demo==="torch"?copy.torch:copy.river}</Link></article>)}</section>
      <p className="watchtower-principle">{copy.principle}</p><p>{copy.boundary}</p>
      <details className="watchtower-technical"><summary>{copy.technical}</summary><p>{copy.limits}</p><p>{copy.readiness}</p><p>{copy.image}</p><p>{locale==="es"?"Dependencias: identidad de carga de trabajo, Agent Registry, Authority Graph, política, aprobación humana, gateway de ejecución, Evidence Vault, Replay y Trust Memory existentes. La cualificación conjunta en Staging todavía está bloqueada.":"Dependencies: existing workload identity, Agent Registry, Authority Graph, policy, human approval, execution gateway, Evidence Vault, Replay and Trust Memory. Combined hosted Staging qualification remains blocked."}</p></details>
    </>}
    <footer className="watchtower-footnote"><p>{copy.readiness}</p><p>{copy.conclusion}</p></footer>
  </div></main>;
}
