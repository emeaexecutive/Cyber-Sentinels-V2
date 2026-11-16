import Link from "next/link";
import type { PublicLocale } from "@/lib/i18n/public-locales";

const content = {
  en: {
    status: "In development",
    subtitle: "Know Your AI Agent",
    headline: "Knowing who an AI agent is doesn't mean knowing what it's authorised to do.",
    context: "AI agents are increasingly acting on behalf of people and organisations — accessing business systems, interacting with services and initiating consequential transactions.",
    boundary: "But identity alone is not enough.",
    development: "Cyber Sentinels is developing KYA to help organisations understand which AI agent is acting, who is responsible for it, what authority it has been given and whether a requested action is permitted under current policy.",
    vision: "Through TENENTE™, our vision extends beyond agent identity towards accountable, policy-governed execution.",
    capabilitiesLabel: "Capability direction · in development",
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
    secondary: "Explore Agent Authority",
    caption: "Conceptual flow · in development",
    flow: ["AI Agent Requests Action", "KYA Identity + Delegated Authority", "TENENTE™ Authority Decision", "ALLOW / REVIEW / DENY", "Evidence & Replay"],
    availability: "This describes the developing KYA capability and our intended direction, not Production certification or a guarantee of execution.",
  },
  es: {
    status: "En desarrollo",
    subtitle: "Conoce a tu agente de IA",
    headline: "Saber quién es un agente de IA no significa saber qué está autorizado a hacer.",
    context: "Los agentes de IA actúan cada vez más en nombre de personas y organizaciones: acceden a sistemas empresariales, interactúan con servicios e inician transacciones con consecuencias importantes.",
    boundary: "Pero la identidad por sí sola no basta.",
    development: "Cyber Sentinels está desarrollando KYA para ayudar a las organizaciones a comprender qué agente de IA está actuando, quién es responsable de él, qué autoridad se le ha concedido y si una acción solicitada está permitida según la política vigente.",
    vision: "A través de TENENTE™, nuestra visión va más allá de la identidad del agente y avanza hacia una ejecución sujeta a políticas y con rendición de cuentas.",
    capabilitiesLabel: "Orientación de las capacidades · en desarrollo",
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
    secondary: "Explorar la autoridad de los agentes",
    caption: "Flujo conceptual · en desarrollo",
    flow: ["El agente de IA solicita una acción", "Identidad KYA + autoridad delegada", "Decisión de autoridad de TENENTE™", "ALLOW / REVIEW / DENY", "Pruebas y Replay"],
    availability: "Esta descripción presenta la capacidad KYA en desarrollo y nuestra orientación prevista, no una certificación para producción ni una garantía de ejecución.",
  },
} as const;

export function KyaHomepageSection({ locale }: { locale: PublicLocale }) {
  const copy = content[locale];
  const home = locale === "es" ? "/es" : "/";
  const prefix = locale === "es" ? "/es" : "";
  return (
    <section id="know-your-agent" aria-labelledby="kya-heading" className="scroll-mt-28 border-y border-zinc-800 bg-[#070b12]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold tracking-wide text-cyan-300">Cyber Sentinels KYA™</p>
              <span className="rounded-full border border-amber-400/30 px-3 py-1 text-xs font-medium text-amber-200">{copy.status}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-300">{copy.subtitle}</p>
            <h2 id="kya-heading" className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">{copy.headline}</h2>
            <p className="mt-5 text-base leading-8 text-zinc-300">{copy.context}</p>
            <p className="mt-4 text-base font-semibold leading-7 text-white">{copy.boundary}</p>
            <p className="mt-4 text-base leading-8 text-zinc-300">{copy.development}</p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">{copy.vision}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`${home}#kya-capabilities`} className="brand-primary-action">{copy.primary}</Link>
              <Link href={`${prefix}/platform#agent-authority`} className="brand-secondary-action">{copy.secondary}</Link>
            </div>
          </div>
          <figure className="min-w-0 rounded-2xl border border-cyan-900/60 bg-[#04070c] p-5 sm:p-7">
            <figcaption className="text-xs leading-6 text-zinc-400">{copy.caption}</figcaption>
            <ol className="mt-6 space-y-0">
              {copy.flow.map((step, index) => (
                <li key={step} className="relative border-l border-cyan-800 pb-7 pl-6 last:pb-0">
                  <span aria-hidden="true" className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-cyan-300" />
                  <p className="text-[0.65rem] tracking-widest text-cyan-300">0{index + 1}</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-white">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-7 border-t border-zinc-800 pt-5 text-xs leading-6 text-zinc-400">{copy.availability}</p>
          </figure>
        </div>
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
