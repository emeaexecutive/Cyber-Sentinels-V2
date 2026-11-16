import Link from "next/link";
import type { PublicLocale } from "@/lib/i18n/public-locales";

const content = {
  en: {
    status: "In development",
    title: "Know the agent. Understand its authority.",
    body: "Know Your Agent (KYA) is being developed to connect an AI agent to its responsible operator, identity evidence and delegated scope — within Cyber Sentinels’ existing identity and authority controls.",
    boundary: "An agent’s identity does not, by itself, grant permission to act. Current authority, policy and evidence still matter for each requested action.",
    availability: "KYA is a developing capability, not a Production certification or a guarantee of autonomous execution.",
    demo: "Discuss KYA with us",
    explore: "Explore agent authority",
    caption: "Conceptual model · not a live agent record",
    operator: "Responsible operator",
    operatorDetail: "Who is accountable for this agent?",
    agent: "Agent context",
    agentDetail: "Identity evidence · delegated scope · validity",
    controls: "Existing authority controls",
    controlsDetail: "Evaluate the requested action under current policy.",
    note: "Identity context informs a decision. Evidence and Replay explain it.",
  },
  es: {
    status: "En desarrollo",
    title: "Conoce al agente. Comprende su autoridad.",
    body: "Know Your Agent (KYA) se está desarrollando para vincular un agente de IA con su operador responsable, las pruebas de identidad y el alcance delegado, dentro de los controles de identidad y autoridad existentes de Cyber Sentinels.",
    boundary: "La identidad de un agente no le concede, por sí sola, permiso para actuar. La autoridad vigente, la política y las pruebas siguen siendo necesarias para cada acción solicitada.",
    availability: "KYA es una capacidad en desarrollo, no una certificación para producción ni una garantía de ejecución autónoma.",
    demo: "Hablemos de KYA",
    explore: "Explorar la autoridad de los agentes",
    caption: "Modelo conceptual · no es un registro real de agente",
    operator: "Operador responsable",
    operatorDetail: "¿Quién responde por este agente?",
    agent: "Contexto del agente",
    agentDetail: "Pruebas de identidad · alcance delegado · vigencia",
    controls: "Controles de autoridad existentes",
    controlsDetail: "Evaluar la acción solicitada según la política vigente.",
    note: "El contexto de identidad informa la decisión. Las pruebas y Replay la explican.",
  },
} as const;

export function KyaHomepageSection({ locale }: { locale: PublicLocale }) {
  const copy = content[locale];
  const prefix = locale === "es" ? "/es" : "";
  return (
    <section id="know-your-agent" aria-labelledby="kya-heading" className="scroll-mt-28 border-y border-zinc-800 bg-[#070b12]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cyan-300">KYA · Know Your Agent</p>
            <span className="rounded-full border border-amber-400/30 px-3 py-1 text-xs font-medium text-amber-200">{copy.status}</span>
          </div>
          <h2 id="kya-heading" className="mt-5 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">{copy.title}</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">{copy.body}</p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">{copy.boundary}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`${prefix}/enterprise-access?intent=demo`} className="brand-primary-action">{copy.demo}</Link>
            <Link href={`${prefix}/platform#agent-authority`} className="brand-secondary-action">{copy.explore}</Link>
          </div>
          <p className="mt-5 max-w-2xl text-xs leading-6 text-zinc-400">{copy.availability}</p>
        </div>
        <figure className="min-w-0 rounded-2xl border border-cyan-900/60 bg-[#04070c] p-5 sm:p-7">
          <figcaption className="text-xs leading-6 text-zinc-400">{copy.caption}</figcaption>
          <ol className="mt-6 space-y-0">
            {[
              [copy.operator, copy.operatorDetail],
              [copy.agent, copy.agentDetail],
              [copy.controls, copy.controlsDetail],
            ].map(([title, detail], index) => (
              <li key={title} className="relative border-l border-cyan-800 pb-7 pl-6 last:pb-0">
                <span aria-hidden="true" className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-cyan-300" />
                <p className="text-[0.65rem] tracking-widest text-cyan-300">0{index + 1}</p>
                <p className="mt-1 text-base font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
              </li>
            ))}
          </ol>
          <p className="mt-7 border-t border-zinc-800 pt-5 text-xs leading-6 text-zinc-400">{copy.note}</p>
        </figure>
      </div>
    </section>
  );
}
