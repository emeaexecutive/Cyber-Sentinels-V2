import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock as EnglishArchitectureBlock, DecisionFlow as EnglishDecisionFlow, VisualFrame as EnglishVisualFrame } from "@/components/enterprise-visuals";
import { ArchitectureBlock as SpanishArchitectureBlock, DecisionFlow as SpanishDecisionFlow, VisualFrame as SpanishVisualFrame } from "@/components/i18n/es/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";
import { StructuredData } from "@/components/search/structured-data";
import { softwareGraph, publicSocialMetadata } from "@/lib/search/metadata";
import { getPublicRequestLocale } from "@/lib/i18n/request-locale";
import { localizedPublicHref, publicPageAlternates } from "@/lib/i18n/public-locales";

const platformCopy = {
  en: {
    title: "AI Agent Authority | Cyber Sentinels",
    description: "Cyber Sentinels helps organisations determine whether AI agents are authorised to act under current policy and preserve evidence of the decision.",
    capabilities: [
      ["trust-engine", "Trust Engine", "Considers identity, evidence, posture and policy boundaries."],
      ["decision-intelligence", "Decision Intelligence", "Explains allow, review, deny and next-step outcomes."],
      ["runtime-engine", "Runtime", "Accounts for material context changes while work is in progress."],
      ["authorization-gateway", "Authorization", "Considers purpose, scope and delegated authority before action."],
      ["enforcement", "Operational controls", "Connects a governed decision to a qualified control boundary."],
      ["provider-orchestrator", "Provider evidence", "Keeps evidence sources distinct when information is brought together."],
      ["validation-engine", "Validation", "Makes review, evidence limits and qualification status explicit."],
      ["enterprise-apis", "Integrations", "Provides documented ways to connect existing workflows."],
    ],
    requestFlow: ["Entity", "Workflow", "Action", "Signals", "Policy", "Authority", "Decision"],
  },
  es: {
    title: "Autoridad para agentes de IA | Cyber Sentinels",
    description: "Cyber Sentinels ayuda a las organizaciones a comprobar si los agentes de IA están autorizados según la política vigente y conserva las pruebas de la decisión.",
    capabilities: [
      ["trust-engine", "Motor de confianza", "Considera la identidad, las pruebas, el estado y los límites de la política."],
      ["decision-intelligence", "Inteligencia de decisiones", "Explica los resultados de permitir, revisar, denegar y los pasos siguientes."],
      ["runtime-engine", "Ejecución", "Tiene en cuenta cambios relevantes de contexto mientras el trabajo está en curso."],
      ["authorization-gateway", "Autorización", "Considera el propósito, el alcance y la autoridad delegada antes de actuar."],
      ["enforcement", "Controles operativos", "Conecta una decisión gobernada con un límite de control cualificado."],
      ["provider-orchestrator", "Pruebas de proveedores", "Mantiene diferenciadas las fuentes de evidencia cuando se reúnen datos."],
      ["validation-engine", "Validación", "Explicita la revisión, los límites de las pruebas y el estado de cualificación."],
      ["enterprise-apis", "Integraciones", "Ofrece formas documentadas de conectar flujos de trabajo existentes."],
    ],
    requestFlow: ["Entidad", "Flujo de trabajo", "Acción", "Señales", "Política", "Autoridad", "Decisión"],
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const copy = platformCopy[locale];
  return {
    ...publicSocialMetadata(copy.title, copy.description, locale === "es" ? "/es/platform" : "/platform", locale),
    title: copy.title,
    description: copy.description,
    alternates: publicPageAlternates("/platform", locale),
  };
}

export default async function PlatformPage() {
  const locale = await getPublicRequestLocale();
  const isSpanish = locale === "es";
  const ArchitectureBlock = isSpanish ? SpanishArchitectureBlock : EnglishArchitectureBlock;
  const DecisionFlow = isSpanish ? SpanishDecisionFlow : EnglishDecisionFlow;
  const VisualFrame = isSpanish ? SpanishVisualFrame : EnglishVisualFrame;
  const copy = platformCopy[locale];
  const requestFlow = copy.requestFlow.map((label) => ({ label }));

  return (
    <main lang={locale} className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <StructuredData value={isSpanish ? {
          ...softwareGraph,
          description: copy.description,
          inLanguage: "es",
        } : softwareGraph} />
        <ExecutiveSummary
          locale={locale}
          eyebrow={isSpanish ? "Plataforma" : "Platform"}
          title={isSpanish ? "Autoridad para agentes de IA, comprobada con la política vigente." : "Authority for AI agents, checked against current policy."}
          bullets={isSpanish
            ? ["Determina si un agente de IA está autorizado para actuar.", "Aplica ALLOW, REVIEW o DENY en un límite de control conectado.", "Conserva las pruebas de la decisión para revisarlas, incluso con Replay y Trust Memory™."]
            : ["Determine whether an AI agent is authorised to act.", "Apply ALLOW, REVIEW or DENY at a connected control boundary.", "Preserve decision evidence for review, including Replay and Trust Memory™."]}
          primary={{ href: localizedPublicHref("/enterprise-access?intent=demo", locale), label: isSpanish ? "Solicitar una demostración empresarial" : "Request Enterprise Demo" }}
        />

        <section id="agent-authority" className="mt-8 scroll-mt-28 operational-panel p-6">
          <h2 className="text-2xl font-semibold">{isSpanish ? "Autoridad antes de que actúe un agente de IA" : "Authority before an AI agent acts"}</h2>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">{copy.description}</p>
          <p className="mt-4 text-xl font-semibold leading-8 text-cyan-100">ALLOW · REVIEW · DENY</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">{isSpanish
            ? "La decisión compara la acción solicitada, el propósito, el objetivo, el alcance y la autoridad delegada con la política vigente. La identidad indica quién o qué realiza la solicitud; la identidad ni un ALLOW anterior conceden autoridad permanente."
            : "A decision considers the requested action, purpose, target, scope and delegated authority against current policy. Identity identifies who or what is making a request; identity or a previous ALLOW does not create permanent authority."}</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">{isSpanish
            ? "En un límite de control conectado y cualificado, ALLOW puede permitir la acción controlada, REVIEW la retiene para la revisión necesaria y DENY la bloquea. Una decisión por sí sola no demuestra que un sistema posterior ejecutara o impidiera una acción."
            : "At a connected, qualified control boundary, ALLOW may permit the controlled action, REVIEW holds it for the required review, and DENY blocks it. A decision alone is not proof that a downstream system carried out or prevented an action."}</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">{isSpanish
            ? "Las pruebas de decisión permiten un análisis posterior. Replay ayuda a revisar decisiones registradas y Trust Memory™ conecta pruebas pertinentes a lo largo del tiempo. La disponibilidad y cualificación varían según la función. Las pruebas locales de algunas rutas de API y Swarm no demuestran preparación para alojamiento o Production. La cancelación de TENENTE Swarm y la contención de emergencia siguen en cualificación y no están cualificadas para Production."
            : "Decision evidence supports later examination. Replay helps review recorded decisions, while Trust Memory™ connects relevant evidence over time. Availability and qualification vary by feature; some API and Swarm paths have local test coverage, which does not establish hosted or Production readiness. TENENTE Swarm cancellation and emergency containment remain under qualification and are not Production-qualified."}</p>
          <p className="mt-4 leading-8 text-zinc-400">
            {isSpanish ? "Lee la explicación de " : "Read the "}
            <Link href={localizedPublicHref("/resources/agent-security/agent-authorization", locale)} className="text-cyan-200 underline">{isSpanish ? "autorización de agentes" : "agent authorization explanation"}</Link>
            {isSpanish ? ", el " : ", the "}
            <Link href={localizedPublicHref("/resources/agent-security/mcp-tool-authorization", locale)} className="text-cyan-200 underline">{isSpanish ? "modelo de autoridad de herramientas y objetivos" : "tool and target authority model"}</Link>
            , <Link href={localizedPublicHref("/verification-replay", locale)} className="text-cyan-200 underline">Replay</Link>
            {isSpanish ? " y " : " and "}
            <Link href={localizedPublicHref("/trust#trust-memory", locale)} className="text-cyan-200 underline">Trust Memory™</Link>.
          </p>
        </section>

        <section id="trust-fabric" className="mt-8 scroll-mt-28">
          <div id="execution-trust" className="scroll-mt-28">
            <VisualFrame eyebrow={isSpanish ? "Contexto de decisión" : "Decision context"} title={isSpanish ? "Conecta las comprobaciones de autoridad con los resultados operativos." : "Connect authority checks to operational outcomes."}>
              <ArchitectureBlock
                inputs={isSpanish ? ["Política vigente", "Autoridad delegada", "Acción solicitada", "Pruebas"] : ["Current Policy", "Delegated Authority", "Requested Action", "Evidence"]}
                core="ALLOW · REVIEW · DENY"
                outputs={isSpanish ? ["Controles operativos", "Pruebas de decisión", "Replay", "Trust Memory™"] : ["Operational Controls", "Decision Evidence", "Replay", "Trust Memory™"]}
              />
            </VisualFrame>
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">{isSpanish ? "Modelo de plataforma" : "Platform model"}</p>
          <h2 className="mt-3 text-2xl font-semibold">{isSpanish ? "Cada capacidad se cualifica por separado." : "Capabilities are qualified individually."}</h2>
          <p className="mt-3 max-w-4xl leading-7 text-zinc-400">{isSpanish
            ? "Estas áreas describen el modelo de la plataforma; no afirman que todas las rutas, proveedores o integraciones de ejecución estén disponibles en cada entorno alojado."
            : "The following areas describe the platform model, not a claim that every route, provider or runtime integration is available in every hosted environment."}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {copy.capabilities.map(([id, title, description], index) => (
              <article id={id} key={id} className="scroll-mt-28 operational-card p-5">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <VisualFrame eyebrow={isSpanish ? "Modelo de integración" : "Integration model"} title={isSpanish ? "Incorpora políticas y autoridad a los flujos existentes." : "Bring policy and authority into existing workflows."}>
            <DecisionFlow steps={requestFlow} />
          </VisualFrame>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={localizedPublicHref("/developers", locale)} className="brand-secondary-action">{isSpanish ? "Desarrollo" : "Developers"}</Link>
            <Link href={localizedPublicHref("/documents/operational-trust-whitepaper", locale)} className="brand-secondary-action">{isSpanish ? "Documento técnico" : "Technical whitepaper"}</Link>
            <Link href={localizedPublicHref("/enterprise/pilot", locale)} className="brand-primary-action">{isSpanish ? "Iniciar un piloto" : "Start Pilot"}</Link>
            <Link href={localizedPublicHref("/tenente-swarm", locale)} className="brand-secondary-action">{isSpanish ? "Explorar TENENTE SWARM" : "Explore TENENTE SWARM"}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
