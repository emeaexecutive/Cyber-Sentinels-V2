import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublicRequestLocale } from "@/lib/i18n/request-locale";
import { publicPageAlternates } from "@/lib/i18n/public-locales";

const flowSteps = {
  en: [
  { title: "01 IDENTITY", detail: "Who or what is acting?" },
  { title: "02 AUTHORITY", detail: "What authority has actually been granted?" },
  { title: "03 ACTION", detail: "What is being requested now?" },
  { title: "04 DECISION", detail: "ALLOW / REVIEW / DENY" },
  { title: "05 EVIDENCE", detail: "Keep the proof and Replay trail." },
  ],
  es: [
    { title: "01 IDENTIDAD", detail: "¿Quién o qué está actuando?" },
    { title: "02 AUTORIDAD", detail: "¿Qué autoridad se ha concedido realmente?" },
    { title: "03 ACCIÓN", detail: "¿Qué se solicita ahora?" },
    { title: "04 DECISIÓN", detail: "ALLOW / REVIEW / DENY" },
    { title: "05 EVIDENCIA", detail: "Conserva las pruebas y el historial de Replay." },
  ],
} as const;

const trustedContexts = {
  en: [
  {
    title: "AI agent",
    example: "Can this agent approve this €20,000 payment?",
  },
  {
    title: "Data",
    example: "Can this agent export these customer records?",
  },
  {
    title: "Infrastructure",
    example: "Can this agent change this Production configuration?",
  },
  {
    title: "Human",
    example: "Can this person approve this action for this organisation?",
  },
  ],
  es: [
    { title: "Agente de IA", example: "¿Puede este agente aprobar un pago de 20.000 €?" },
    { title: "Datos", example: "¿Puede este agente exportar estos registros de clientes?" },
    { title: "Infraestructura", example: "¿Puede este agente cambiar esta configuración de producción?" },
    { title: "Persona", example: "¿Puede esta persona aprobar esta acción para la organización?" },
  ],
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const title = locale === "es" ? "Inteligencia de confianza operativa | Cyber Sentinels" : "Operational Trust Intelligence™ | Cyber Sentinels";
  const description = locale === "es"
    ? "Cyber Sentinels ayuda a los equipos a comprobar si un agente de IA tiene autoridad para actuar y conserva las pruebas que explican la decisión."
    : "Cyber Sentinels helps teams decide whether an AI agent or human has authority to act, preserve the evidence behind the decision, and replay what happened later.";
  const path = locale === "es" ? "/es" : "/";
  return {
    ...publicSocialMetadata(title, description, path, locale),
    title,
    description,
    alternates: publicPageAlternates("/", locale),
  };
}

export default async function Home() {
  const locale = await getPublicRequestLocale();
  const isSpanish = locale === "es";
  return (
    <main lang={locale} className="min-h-screen bg-[#04070c] text-zinc-100">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">Cyber Sentinels</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              {isSpanish ? "Antes de que actúe un agente de IA, comprueba que tiene autoridad para hacerlo." : "Before an AI agent acts, prove it has the authority to do so."}
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300 sm:text-xl">
              {isSpanish ? "Cyber Sentinels comprueba si los agentes de IA tienen autorización para actuar y conserva las pruebas de la decisión." : "Cyber Sentinels evaluates whether AI agents are authorised to act — and preserves evidence of the decision."}
            </p>
            <p className="mt-4 text-base leading-8 text-zinc-400">
              ALLOW · REVIEW · DENY
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={isSpanish ? "/es/enterprise-access?intent=demo" : "/enterprise-access?intent=demo"} className="brand-primary-action brand-action-large">
                {isSpanish ? "Solicitar una demostración" : "Request a demo"}
              </Link>
              <Link href={isSpanish ? "/es/unavailable?path=%2Fdevelopers%2Fdocs" : "/developers/docs"} className="brand-secondary-action brand-action-large">
                {isSpanish ? "Explorar la API (contenido en inglés)" : "Explore the API"}
              </Link>
            </div>
          </div>

          <aside aria-label={isSpanish ? "Ejemplo ilustrativo de decisión de autoridad" : "Illustrative authority decision"} className="min-w-0 rounded-2xl border border-zinc-800 bg-[#070b12] p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{isSpanish ? "Ejemplo ilustrativo · agente de IA" : "Illustrative example · AI agent"}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Finance Copilot</h2>
            <div className="mt-6 divide-y divide-zinc-800 text-sm">
              <dl className="pb-4">
                <dt className="text-zinc-400">{isSpanish ? "Acción solicitada" : "Requested action"}</dt>
                <dd className="mt-1 text-xl font-semibold text-white">{isSpanish ? "Aprobar un pago de 20.000 €" : "Approve €20,000 payment"}</dd>
              </dl>
              <div className="grid grid-cols-2 gap-4 py-4">
                <dl><dt className="text-zinc-400">{isSpanish ? "Identidad" : "Identity"}</dt><dd className="mt-1 font-semibold text-cyan-300">{isSpanish ? "VERIFICADA" : "VERIFIED"}</dd></dl>
                <dl><dt className="text-zinc-400">{isSpanish ? "Autoridad" : "Authority"}</dt><dd className="mt-1 font-semibold text-white">{isSpanish ? "Máximo: 10.000 €" : "Maximum €10,000"}</dd></dl>
              </div>
              <div className="flex items-start justify-between gap-4 py-4">
                <dl><dt className="text-zinc-400">{isSpanish ? "Decisión de política" : "Policy decision"}</dt><dd className="mt-1 max-w-64 leading-6 text-zinc-200">{isSpanish ? "Se supera el límite de la política y la autoridad delegada." : "Policy limit exceeded. Amount exceeds delegated authority."}</dd></dl>
                <span className="shrink-0 whitespace-nowrap rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1.5 font-semibold text-red-300">DENY</span>
              </div>
            </div>
            <p className="border-t border-zinc-800 pt-4 text-sm font-semibold text-white">{isSpanish ? "La identidad no equivale a autoridad." : "Identity is not authority."}</p>
            <p className="mt-2 text-xs leading-6 text-zinc-400">{isSpanish ? "Pruebas conservadas" : "Evidence stored"} <span aria-hidden="true">·</span> {isSpanish ? "Recibo creado" : "Receipt created"} <span aria-hidden="true">·</span> Replay {isSpanish ? "disponible" : "available"}</p>
          </aside>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">{isSpanish ? "V1 · Flujo principal" : "V1 · Core flow"}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{isSpanish ? "Comprueba la autoridad. Conserva la decisión." : "Check authority. Preserve the decision."}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{isSpanish ? "Antes de actuar: verifica la identidad, confirma la autoridad y evalúa la política. ALLOW / REVIEW / DENY registra la decisión." : "Before the action: verify identity, confirm authority and evaluate policy. ALLOW / REVIEW / DENY records the decision."}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {flowSteps[locale].map((step, index) => (
              <article key={`${step.title}-${index}`} className="rounded-xl border border-zinc-800 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cyan-300">{isSpanish ? "Base de V2 · cualificada en Staging" : "V2 foundation · Staging qualified"}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{isSpanish ? "La decisión es solo el principio." : "The decision is only the beginning."}</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-400">{isSpanish ? "ALLOW registra un permiso, no demuestra que la acción se ejecutara. V2 conecta la decisión original con las pruebas posteriores sin modificarla." : "An ALLOW records permission, not proof of execution. V2 connects the original decision to evidence of what happened next, while keeping that decision intact."}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{isSpanish ? "Después de la acción: conserva las pruebas de ejecución, los resultados, las intervenciones y el historial de incidentes. Demuéstralo con pruebas, un recibo y Replay. Añade contexto con Trust Memory." : "After the action: preserve execution evidence, outcomes, interventions and incident history. Prove it with evidence, a receipt and Replay. Remember it with Trust Memory."}</p>
          <ol aria-label={isSpanish ? "Flujo de evidencias operativas" : "Operational evidence flow"} className="mt-8 grid gap-0 border-y border-zinc-800 sm:grid-cols-5">
            {(isSpanish ? ["Decisión", "Evidencia de ejecución", "Resultado", "Incidente", "Replay"] : ["Decision", "Execution evidence", "Outcome", "Incident", "Replay"]).map((step, index) => (
              <li key={step} className="flex items-baseline gap-3 px-2 py-4 text-sm font-medium text-zinc-200">
                <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>{step}
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
            <article>
              <h3 className="text-xl font-semibold text-white">{isSpanish ? "Si algo falla, reconstruye lo que ocurrió realmente." : "When something goes wrong, reconstruct what actually happened."}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-200">{isSpanish ? "Autoridad original → agente → acciones → controles → resultado → intervención → corrección." : "Original authority → agent → actions → controls → outcome → intervention → remediation."}</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{isSpanish ? "Reúne observaciones, resultados, intervenciones y correcciones en una cronología del incidente. Exporta las pruebas vinculadas con su resumen de integridad, contradicciones y lagunas visibles." : "Bring observations, outcomes, interventions and remediation into one incident chronology. Export the linked evidence with its integrity digest, contradictions and gaps visible."}</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{isSpanish ? "Los resultados del proveedor, del entorno de ejecución y del destino se mantienen diferenciados. El contexto compartido relaciona datos sin convertir correlación en atribución. Lo que falta sigue siendo desconocido." : "Provider, runtime and destination outcomes remain distinct. Shared context connects providers without turning correlation into attribution. Missing context stays unknown."}</p>
            </article>
            <article>
              <h3 className="text-xl font-semibold text-white">{isSpanish ? "La confianza no se reinicia en cada llamada a la API." : "Trust doesn&apos;t reset with each API call."}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{isSpanish ? "Trust Memory conserva pruebas sobre identidades, autoridad, acciones y resultados para entender decisiones posteriores en su contexto." : "Trust Memory retains evidence around identities, authority, actions and outcomes so later decisions can be understood in context."}</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{isSpanish ? "Sigue la transacción original hasta la revisión del resultado, las pruebas del incidente y Replay. Un fallo posterior o un resultado contradictorio se añade al registro; no reescribe el ALLOW original." : "Follow the original transaction into outcome review, incident evidence and Replay. A later failure or contradictory outcome adds to the record; it does not rewrite the original ALLOW."}</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{isSpanish ? "Esta base está cualificada en Staging. La promoción a Production está pendiente. La interpretación del propósito es parcial; la inteligencia más amplia es trabajo futuro." : "This foundation is qualified in Staging. Production promotion is pending. Purpose interpretation remains partial; broader intelligence is future work."}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">{isSpanish ? "¿Confianza para hacer qué?" : "Trusted to do what?"}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            {isSpanish ? "La confianza depende de la acción." : "Trust is contextual to the action."}
          </h2>
          <p className="mt-4 text-base leading-8 text-zinc-400">
            {isSpanish ? "Cyber Sentinels comprueba si quien actúa tiene autoridad para realizar la acción solicitada conforme a la política vigente; no determina si es digno de confianza en todos los contextos." : "Cyber Sentinels asks whether the actor has the authority to perform the requested action under the current policy, not whether it is universally trustworthy."}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {trustedContexts[locale].map((item) => (
            <article key={item.title} className="rounded-xl border border-zinc-800 bg-[#070b12] p-5">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{item.example}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-[#070b12]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">{isSpanish ? "Claridad del producto" : "Product clarity"}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{isSpanish ? "Decisión, pruebas y Replay." : "Decision, proof and Replay."}</h2>
              <p className="mt-4 text-base leading-8 text-zinc-400">
                {isSpanish ? "Detén las acciones no autorizadas de la IA. Solicita revisión humana cuando la autoridad no esté clara. Conserva las pruebas de cada decisión y reconstruye después lo ocurrido." : "Stop unauthorized AI actions. Require human review when authority is uncertain. Keep the evidence behind every decision and reconstruct what happened later."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">{isSpanish ? "DECIDE" : "DECIDE"}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{isSpanish ? "Determina si la acción solicitada debe recibir ALLOW, REVIEW o DENY." : "Determine whether the requested action should be ALLOW, REVIEW or DENY."}</p>
              </article>
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">{isSpanish ? "DEMUESTRA" : "PROVE"}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{isSpanish ? "Conserva la autoridad, la política y las pruebas que sustentan la decisión." : "Preserve the authority, policy and evidence behind the decision."}</p>
              </article>
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">REPLAY</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{isSpanish ? "Reconstruye qué ocurrió, por qué y quién tenía autoridad." : "Reconstruct what happened, why it happened and who had authority."}</p>
              </article>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-zinc-800 bg-black/70 p-5">
            <p className="text-sm leading-8 text-zinc-400">
              <span className="font-semibold text-white">Operational Trust Infrastructure</span> {isSpanish ? "es la categoría. " : "is the category. "}<span className="font-semibold text-white">Operational Trust Intelligence</span> {isSpanish ? "sigue siendo la capa de inteligencia a largo plazo." : "remains the long-term intelligence layer."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
