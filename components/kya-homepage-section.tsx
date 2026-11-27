import Image from "next/image";
import Link from "next/link";
import type { PublicLocale } from "@/lib/i18n/public-locales";

const content = {
  en: {
    subtitle: "Know Your AI Agent",
    headline: "Knowing who an AI agent is doesn't mean knowing what it's authorised to do.",
    context: "AI agents are increasingly acting on behalf of people and organisations — accessing business systems, interacting with services and initiating consequential transactions.",
    boundary: "But identity alone is not enough.",
    description: "The KYA framework considers which AI agent is acting, who is accountable, what authority has been delegated and whether a requested action is permitted under current policy.",
    vision: "TENENTE™ connects policy decisions with controlled execution within the organisation's authorised scope.",
    capabilitiesLabel: "THE KYA FRAMEWORK",
    capabilities: [
      ["IDENTIFY", "Know which AI agent is requesting an action."],
      ["VERIFY", "Establish ownership and delegated authority."],
      ["AUTHORISE", "Determine whether the requested action is permitted."],
      ["ENFORCE", "Apply ALLOW, REVIEW or DENY before controlled execution."],
      ["PROVE", "Preserve evidence of the decision and outcome."],
    ],
    statement: ["KYC verifies the customer.", "KYA verifies the agent.", "Cyber Sentinels verifies the authority to act."],
    closing: "Authority can be delegated. It cannot be invented.™",
    primary: "Explore KYA",
    pilot: "Request a KYA Pilot",
    secondary: "Explore Agent Authority",
    visualQuestion: "Your AI Agent Has an Identity. But Does It Have Authority?",
    visualCapabilities: "IDENTIFY · VERIFY · AUTHORISE · ENFORCE · PROVE",
    flow: ["AI Agent Requests Action", "KYA Identity — Who is acting?", "Delegated Authority — Who authorised it?", "TENENTE™ Authority Decision — Is this action permitted now?", "ALLOW / REVIEW / DENY", "Evidence & Replay"],
    availability: "Public content describes the KYA framework. Hosted enforcement availability depends on the qualified integration and deployment environment.",
  },
  es: {
    subtitle: "Conoce a tu agente de IA",
    headline: "Saber quién es un agente de IA no significa saber qué está autorizado a hacer.",
    context: "Los agentes de IA actúan cada vez más en nombre de personas y organizaciones: acceden a sistemas empresariales, interactúan con servicios e inician transacciones con consecuencias importantes.",
    boundary: "Pero la identidad por sí sola no basta.",
    description: "El marco KYA considera qué agente de IA actúa, quién es responsable, qué autoridad se ha delegado y si la política vigente permite una acción solicitada.",
    vision: "TENENTE™ conecta las decisiones de política con una ejecución controlada dentro del alcance autorizado por la organización.",
    capabilitiesLabel: "EL MARCO KYA",
    capabilities: [
      ["IDENTIFICAR", "Saber qué agente de IA está solicitando una acción."],
      ["VERIFICAR", "Establecer la titularidad y la autoridad delegada."],
      ["AUTORIZAR", "Determinar si la acción solicitada está permitida."],
      ["APLICAR CONTROLES", "Aplicar ALLOW, REVIEW o DENY antes de la ejecución controlada."],
      ["DEMOSTRAR", "Conservar las pruebas de la decisión y del resultado."],
    ],
    statement: ["KYC verifica al cliente.", "KYA verifica al agente.", "Cyber Sentinels verifica la autoridad para actuar."],
    closing: "La autoridad puede delegarse. No puede inventarse.™",
    primary: "Explorar KYA",
    pilot: "Solicitar un piloto de KYA",
    secondary: "Explorar la autoridad de los agentes",
    visualQuestion: "Tu agente de IA tiene una identidad. Pero ¿tiene autoridad?",
    visualCapabilities: "IDENTIFICAR · VERIFICAR · AUTORIZAR · APLICAR CONTROLES · DEMOSTRAR",
    flow: ["El agente de IA solicita una acción", "Identidad KYA — ¿Quién está actuando?", "Autoridad delegada — ¿Quién lo autorizó?", "Decisión de autoridad de TENENTE™ — ¿Está permitida esta acción ahora?", "ALLOW / REVIEW / DENY", "Pruebas y Replay"],
    availability: "El contenido público describe el marco KYA. La disponibilidad de controles alojados depende de la integración y del entorno de despliegue cualificados.",
  },
} as const;

export function KyaHomepageSection({ locale, landing = false }: { locale: PublicLocale; landing?: boolean }) {
  const copy = content[locale];
  const prefix = locale === "es" ? "/es" : "";
  const Heading = landing ? "h1" : "h2";
  return (
    <section id="know-your-agent" aria-labelledby="kya-heading" className="scroll-mt-28 border-y border-zinc-800 bg-[#070b12]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <p translate="no" className="text-sm font-semibold tracking-wide text-cyan-300">Cyber Sentinels KYA™</p>
            <p className="mt-3 text-sm font-medium text-zinc-300">{copy.subtitle}</p>
            <Heading id="kya-heading" className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">{landing ? copy.visualQuestion : copy.headline}</Heading>
            {landing ? <p className="mt-5 text-lg font-medium leading-8 text-white">{copy.headline}</p> : null}
            <p className="mt-5 text-base leading-8 text-zinc-300">{copy.context}</p>
            <p className="mt-4 text-base font-semibold leading-7 text-white">{copy.boundary}</p>
            <p className="mt-4 text-base leading-8 text-zinc-300">{copy.description}</p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">{copy.vision}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={landing ? `${prefix}/enterprise-access?intent=pilot` : `${prefix}/platform/kya`} className="brand-primary-action">{landing ? copy.pilot : copy.primary}</Link>
              <a href={`${prefix}/platform#agent-authority`} className="brand-secondary-action">{copy.secondary}</a>
            </div>
          </div>
          <figure className="min-w-0 rounded-2xl border border-cyan-900/60 bg-[#04070c] p-5 sm:p-7">
            <figcaption>
              <span translate="no" className="block text-xs font-semibold tracking-widest text-cyan-300">CYBER SENTINELS KYA™</span>
              <span className="mt-4 block text-xl font-semibold leading-8 text-white">{copy.visualQuestion}</span>
            </figcaption>
            <p className="mt-5 text-xs font-semibold leading-6 tracking-wide text-cyan-300">{copy.visualCapabilities}</p>
            <ol className="mt-6 space-y-3">
              {copy.flow.map((step, index) => (
                <li key={step} className="text-center">
                  <p className="text-sm font-semibold leading-7 text-white">{step}</p>
                  {index < copy.flow.length - 1 ? <span aria-hidden="true" className="mt-2 block text-xl text-cyan-300">↓</span> : null}
                </li>
              ))}
            </ol>
            <p className="mt-7 border-t border-zinc-800 pt-5 text-xs leading-6 text-zinc-400">{copy.availability}</p>
          </figure>
        </div>
        <figure className="mx-auto mt-10 max-w-5xl">
          <a
            href="/kya-ai-agent-trust-flow.png"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={locale === "es" ? "Abrir el diagrama de autoridad KYA a tamaño completo" : "Open the KYA authority flow diagram at full size"}
            className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            <Image
              src="/kya-ai-agent-trust-flow.png"
              width={1254}
              height={1254}
              sizes="(max-width: 1024px) 100vw, 1024px"
              alt={locale === "es"
                ? "Diagrama KYA: un agente solicita una acción; la identidad y la autoridad delegada informan la decisión de TENENTE: ALLOW, REVIEW o DENY, seguida de pruebas y Replay."
                : "KYA authority flow: an agent requests an action; identity and delegated authority inform the TENENTE decision: ALLOW, REVIEW or DENY, followed by evidence and Replay."}
              className="h-auto w-full object-contain"
            />
          </a>
        </figure>
        <div id="kya-capabilities" className="mt-12 scroll-mt-28 border-t border-zinc-800 pt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-cyan-300">{copy.capabilitiesLabel}</p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {copy.capabilities.map(([title, detail]) => (
              <div key={title} className="border-l border-cyan-900 pl-4">
                <dt className="text-sm font-semibold text-white">{title}</dt>
                <dd className="mt-3 text-sm leading-7 text-zinc-400">{detail}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 border-t border-zinc-800 pt-8">
            {copy.statement.map((line) => <p key={line} className="text-base leading-8 text-zinc-300">{line}</p>)}
            <p className="mt-5 text-lg font-semibold leading-8 text-white">{copy.closing}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
