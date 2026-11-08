import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { getPublicRequestLocale } from "@/lib/i18n/request-locale";
import { localizedPublicHref, publicPageAlternates } from "@/lib/i18n/public-locales";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const title = locale === "es" ? "Ayuda | Cyber Sentinels" : "Help | Cyber Sentinels";
  const description = locale === "es"
    ? "Ayuda, soporte y orientación operativa de Cyber Sentinels."
    : "Cyber Sentinels help, support and operational guidance.";
  return {
    ...publicSocialMetadata(title, description, locale === "es" ? "/es/help" : "/help", locale),
    title,
    description,
    alternates: publicPageAlternates("/help", locale),
  };
}
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type HelpPageProps = {
  searchParams?: Promise<{ submitted?: string }>;
};

type HelpQuestion = {
  id: string;
  question: string | null;
  answer: string | null;
  status: string | null;
  created_by_email: string | null;
  admin_answered_by: string | null;
  answered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type KnowledgeArticle = {
  id: string;
  title: string | null;
  category: string | null;
  summary: string | null;
  body: string | null;
};

const faqs = {
  en: [
    ["What is a Trust Passport?", "A Trust Passport is a live record that connects a subject to identity, evidence, decisions, flags and audit history."],
    ["What is evidence?", "Evidence is supporting material such as uploaded files, URLs or records used to verify a claim."],
    ["What does verification mean?", "Verification means a claim has been reviewed against evidence and operational context."],
    ["What is a decision?", "A decision records approval, rejection, escalation or review outcome for a trust event."],
    ["What are flags?", "Flags highlight activity or risk that may need review as trust changes over time."],
    ["What is an audit trail?", "An audit trail is the record of who did what, when, and why it mattered."],
    ["What is the Trust Graph?", "The Trust Graph shows how passports, evidence, decisions, flags and audit history connect."],
    ["What is Workforce Trust?", "Workforce Trust applies evidence-backed verification to candidates, contractors and teams."],
    ["What is Intent Verification?", "Intent Verification records why an action is being requested before it moves forward."],
    ["What is Autonomy Governance?", "Autonomy Governance defines what agents and workflows may observe, advise, approve or execute."],
  ],
  es: [
    ["¿Qué es un Trust Passport?", "Es un registro activo que relaciona a una entidad con su identidad, pruebas, decisiones, alertas e historial de auditoría."],
    ["¿Qué son las pruebas?", "Son materiales de apoyo, como archivos, URL o registros, que se usan para comprobar una afirmación."],
    ["¿Qué significa verificar?", "Significa revisar una afirmación con pruebas y teniendo en cuenta el contexto operativo."],
    ["¿Qué es una decisión?", "Es el registro de un resultado de aprobación, rechazo, escalado o revisión de un evento de confianza."],
    ["¿Qué son las alertas?", "Destacan actividad o riesgos que pueden requerir una revisión a medida que cambia la confianza."],
    ["¿Qué es un historial de auditoría?", "Es el registro de quién hizo qué, cuándo y por qué fue relevante."],
    ["¿Qué es el Trust Graph?", "Muestra cómo se relacionan los pasaportes, las pruebas, las decisiones, las alertas y el historial de auditoría."],
    ["¿Qué es Workforce Trust?", "Aplica verificaciones respaldadas por pruebas a candidatos, contratistas y equipos."],
    ["¿Qué es Intent Verification?", "Registra por qué se solicita una acción antes de que avance."],
    ["¿Qué es la gobernanza de autonomía?", "Define qué pueden observar, recomendar, aprobar o ejecutar los agentes y los flujos de trabajo."],
  ],
} as const;

const workflowSteps = {
  en: [["1", "View Demo", "/demo"], ["2", "Candidate Verification", "/verify/candidate"], ["3", "Session Integrity", "/verify/session"], ["4", "Governance Review", "/dashboard/governance"], ["5", "Replay Timeline", "/trust-replay"], ["6", "Verification Receipts", "/verification-receipts"]],
  es: [["1", "Ver demostración", "/demo"], ["2", "Verificación de candidatos", "/verify/candidate"], ["3", "Integridad de sesión", "/verify/session"], ["4", "Revisión de gobernanza", "/dashboard/governance"], ["5", "Cronología de Replay", "/trust-replay"], ["6", "Recibos de verificación", "/verification-receipts"]],
} as const;

async function submitHelpQuestion(formData: FormData) {
  "use server";

  const question = String(formData.get("question") ?? "").trim();
  const locale = formData.get("locale") === "es" ? "es" : "en";

  if (!question) {
    redirect(locale === "es" ? "/es/help" : "/help");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(locale === "es" ? "/login?next=/es/help" : "/login?next=/help");
  }

  const actor = user.email ?? user.id;
  const userMetadata = user.user_metadata ?? {};
  const createdByName =
    typeof userMetadata.name === "string"
      ? userMetadata.name
      : typeof userMetadata.full_name === "string"
        ? userMetadata.full_name
        : null;
  const { data: helpQuestion, error } = await supabase
    .from("help_questions")
    .insert({
      question,
      status: "open",
      reply_channel: "in_app",
      created_by: actor,
      created_by_user_id: user.id,
      created_by_email: user.email ?? null,
      created_by_name: createdByName,
    })
    .select("id")
    .single();

  if (!error) {
    const graphMetadata = {
      help_question_id: helpQuestion?.id,
      actor,
    };

    await createAuditLog(supabase, "help_question_created", actor, graphMetadata);
    await createSignal(supabase, "Help question created", graphMetadata);
  }

  redirect(locale === "es" ? "/es/help?submitted=1" : "/help?submitted=1");
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const locale = await getPublicRequestLocale();
  const isSpanish = locale === "es";
  const params = await searchParams;
  // Static public guidance remains readable in an unconfigured marketing preview.
  // Authenticated reads and the submission action retain their normal Auth boundary.
  const supabase = hasPublicSupabaseEnv() ? await createClient() : null;
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAdmin = user?.email ? isAdminAllowlisted(user.email) : false;
  const { data: helpQuestions } = user && supabase
    ? isAdmin
      ? await supabase
          .from("help_questions")
          .select(
            "id,question,answer,status,created_by_email,admin_answered_by,answered_at,created_at,updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<HelpQuestion[]>()
      : await supabase
          .from("help_questions")
          .select(
            "id,question,answer,status,created_by_email,admin_answered_by,answered_at,created_at,updated_at"
          )
          .eq("created_by_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<HelpQuestion[]>()
    : { data: [] as HelpQuestion[] };
  const { data: knowledgeArticles } = supabase ? await supabase
    .from("knowledge_articles")
    .select("id,title,category,summary,body")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(12)
    .returns<KnowledgeArticle[]>() : { data: [] as KnowledgeArticle[] };

  return (
    <main lang={locale} className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="py-4 md:py-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            {isSpanish ? "Centro de ayuda" : "Help Center"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            {isSpanish ? "¿Cómo podemos ayudarte?" : "How can we help?"}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            {isSpanish
              ? "Consulta información sobre pasaportes, pruebas, decisiones, puntuaciones de confianza y relaciones del grafo."
              : "Understand passports, evidence, decisions, trust scores and graph relationships."}
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-4">
          <Link href={localizedPublicHref("/demo", locale)} className="brand-primary-action">{isSpanish ? "Explorar la demostración guiada" : "Explore the guided demo"}</Link>
          <Link href={localizedPublicHref("/developers/docs", locale)} className="inline-flex min-h-11 items-center text-cyan-200 underline">{isSpanish ? "Documentación para desarrolladores" : "Developer documentation"}</Link>
        </section>

        <section className="mt-8">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
            {isSpanish ? "Preguntas frecuentes" : "Quick Questions"}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {faqs[locale].map(([question, answer]) => (
              <details key={question} className="rounded-lg border border-zinc-800 p-4">
                <summary className="cursor-pointer text-base font-semibold text-zinc-100">
                  {question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
            {isSpanish ? "Artículos de la base de conocimiento" : "Knowledge Base FAQs"}
          </p>
          {isSpanish ? <p className="mt-2 text-xs text-zinc-500">Los artículos aprobados se muestran en el idioma original en que se publicaron.</p> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {knowledgeArticles?.length ? (
              knowledgeArticles.map((article) => (
                <Link
                  key={article.id}
                  href={localizedPublicHref(`/knowledge-base?article_id=${encodeURIComponent(article.id)}`, locale)}
                  className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                    {article.category ?? (isSpanish ? "Conocimiento" : "Knowledge")}
                  </p>
                  <h2 className="mt-3 text-base font-semibold text-zinc-100">
                    {article.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {article.summary ?? article.body}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400 md:col-span-2 xl:col-span-3">
                {supabase
                  ? isSpanish ? "Los artículos de conocimiento aprobados aparecerán aquí." : "Approved knowledge articles will appear here."
                  : isSpanish
                    ? "Los artículos de conocimiento y el soporte de cuenta no están disponibles en esta vista previa local sin configurar. La orientación pública anterior sí está disponible."
                    : "Knowledge articles and account support are unavailable in this unconfigured local preview. Public guidance above remains available."}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
            {isSpanish ? "Flujo guiado" : "Guided Workflow"}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {workflowSteps[locale].map(([step, label, href]) => (
              <Link
                key={step}
                href={localizedPublicHref(href, locale)}
                className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  {isSpanish ? `Paso ${step}` : `Step ${step}`}
                </p>
                <h2 className="mt-4 font-semibold text-zinc-100">{label}</h2>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
            {isSpanish ? "Tus preguntas" : "Your Questions"}
          </p>
          {isSpanish ? <p className="mt-2 text-xs text-zinc-500">Tus preguntas y respuestas se conservan en el idioma original en que se enviaron o revisaron.</p> : null}
          <h2 className="mt-2 text-2xl font-semibold">
            {isSpanish ? "Consulta las preguntas enviadas y las respuestas revisadas por personas." : "Track submitted questions and human-reviewed answers."}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {helpQuestions?.length ? (
              helpQuestions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-black p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="max-w-xl text-base font-semibold text-zinc-100">
                      {item.question ?? (isSpanish ? "Pregunta de ayuda" : "Help question")}
                    </h3>
                    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                      {isSpanish && item.status === "answered" ? "respondida" : isSpanish && item.status === "open" ? "abierta" : item.status ?? (isSpanish ? "respondida" : "answered")}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                    {item.status === "answered" && item.answer
                      ? item.answer
                      : isSpanish ? "Pendiente de una respuesta revisada." : "Awaiting a reviewed answer."}
                  </p>
                  <p className="mt-4 text-xs text-zinc-400">
                    {item.status === "answered" && item.admin_answered_by
                      ? isSpanish ? `Respondida por ${item.admin_answered_by}` : `Answered by ${item.admin_answered_by}`
                      : isSpanish ? "Aún sin respuesta" : "Not answered yet"}
                    {item.status === "answered" && item.answered_at ? ` / ${new Date(item.answered_at).toLocaleString(isSpanish ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400 md:col-span-2">
                {user
                  ? isSpanish ? "Aún no has enviado preguntas. Envía una pregunta para iniciar un hilo de ayuda con seguimiento." : "No submitted questions yet. Ask a question below to start a traceable help thread."
                  : isSpanish ? "Inicia sesión para ver tus preguntas enviadas y las respuestas revisadas." : "Sign in to view your submitted questions and reviewed answers."}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
            {isSpanish ? "Hacer una pregunta" : "Ask a Question"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {isSpanish ? "Envía una pregunta para que la revise una persona." : "Store a question for human review."}
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            {isSpanish ? "Las respuestas de IA se incorporarán en una versión futura." : "AI answers will be added in a later release."}
          </p>
          {params?.submitted === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              {isSpanish ? "Pregunta de ayuda enviada." : "Help question submitted."}
            </p>
          ) : null}
          {user ? (
            <form action={submitHelpQuestion} className="mt-5 grid gap-4">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm text-zinc-400">
                {isSpanish ? "Pregunta" : "Question"}
                <textarea
                  name="question"
                  required
                  rows={5}
                  placeholder={isSpanish ? "Pregunta sobre pasaportes, pruebas, decisiones, puntuaciones o relaciones del grafo" : "Ask about passports, evidence, decisions, scores or graph relationships"}
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-400"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 md:w-fit"
              >
                {isSpanish ? "Enviar pregunta" : "Submit Question"}
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                {isSpanish ? "Inicia sesión para enviar una pregunta de ayuda y solicitar una revisión." : "Sign in to submit a help question for review."}
              </p>
              <Link
                href={localizedPublicHref("/login?next=/help", locale)}
                className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                {isSpanish ? "Iniciar sesión · contenido en inglés" : "Sign in"}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
