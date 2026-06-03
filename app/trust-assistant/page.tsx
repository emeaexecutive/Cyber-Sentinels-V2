import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type TrustAssistantPageProps = {
  searchParams?: Promise<{
    asked?: string;
    passport_id?: string;
    verification_case_id?: string;
    evidence_id?: string;
    decision_id?: string;
  }>;
};

type ConversationRow = {
  id: string;
  question: string | null;
  answer: string | null;
  status: string | null;
  answer_source?: string | null;
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

const suggestedQuestions = [
  "What is a Trust Passport?",
  "Why was this verification rejected?",
  "What evidence is required?",
  "What creates a trust score?",
  "What is the Trust Graph?",
  "What are signals?",
  "What is Workforce Trust?",
  "What is Intent Verification?",
  "What is Autonomy Governance?",
];

const knowledgeSources = [
  "Passports",
  "Evidence",
  "Decisions",
  "Signals",
  "Audit Logs",
  "Trust Graph",
  "Help Answers",
];

function formatDate(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function metadataValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value || null;
}

async function askTrustAssistant(formData: FormData) {
  "use server";

  const question = String(formData.get("question") ?? "").trim();

  if (!question) {
    redirect("/trust-assistant");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trust-assistant");
  }

  const actor = user.email ?? user.id;
  const metadata = {
    passport_id: metadataValue(formData, "passport_id"),
    verification_case_id: metadataValue(formData, "verification_case_id"),
    evidence_id: metadataValue(formData, "evidence_id"),
    decision_id: metadataValue(formData, "decision_id"),
    actor,
  };
  const { data: assistantQuestion, error } = await supabase
    .from("trust_assistant_questions")
    .insert({
      question,
      status: "pending_review",
      asked_by_user_id: user.id,
      asked_by_email: user.email ?? null,
      metadata,
    })
    .select("id")
    .single();

  if (!error) {
    const graphMetadata = {
      trust_assistant_question_id: assistantQuestion?.id,
      ...metadata,
    };

    await createAuditLog(
      supabase,
      "trust_assistant_question_created",
      actor,
      graphMetadata
    );
    await createSignal(
      supabase,
      "Trust assistant question created",
      graphMetadata
    );
  }

  redirect("/trust-assistant?asked=1");
}

export default async function TrustAssistantPage({
  searchParams,
}: TrustAssistantPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { count: passportCount },
    { count: evidenceCount },
    { count: decisionCount },
    { count: signalCount },
    { count: auditCount },
    { count: graphNodeCount },
    { count: helpAnswerCount },
    { data: knowledgeArticles },
  ] = await Promise.all([
    supabase.from("passports").select("id", { count: "exact", head: true }),
    supabase.from("evidence_files").select("id", { count: "exact", head: true }),
    supabase.from("decisions").select("id", { count: "exact", head: true }),
    supabase.from("signals").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("trust_graph_nodes")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("help_questions")
      .select("id", { count: "exact", head: true })
      .not("answer", "is", null),
    supabase
      .from("knowledge_articles")
      .select("id,title,category,summary,body")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(6)
      .returns<KnowledgeArticle[]>(),
  ]);
  const sourceCounts = new Map([
    ["Passports", passportCount ?? 0],
    ["Evidence", evidenceCount ?? 0],
    ["Decisions", decisionCount ?? 0],
    ["Signals", signalCount ?? 0],
    ["Audit Logs", auditCount ?? 0],
    ["Trust Graph", graphNodeCount ?? 0],
    ["Help Answers", helpAnswerCount ?? 0],
  ]);
  const { data: assistantRows } = user
    ? await supabase
        .from("trust_assistant_questions")
        .select("id,question,answer,status,answer_source,created_at,updated_at")
        .eq("asked_by_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<ConversationRow[]>()
    : { data: [] as ConversationRow[] };
  const { data: helpRows } = user
    ? await supabase
        .from("help_questions")
        .select("id,question,answer,status,created_at,updated_at")
        .eq("created_by_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<ConversationRow[]>()
    : { data: [] as ConversationRow[] };
  const conversationRows = [...(assistantRows ?? []), ...(helpRows ?? [])]
    .sort(
      (left, right) =>
        new Date(right.created_at ?? "").getTime() -
        new Date(left.created_at ?? "").getTime()
    )
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Assistant
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Assistant&trade;
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Understand trust workflows, evidence chains, decisions and graph
            relationships.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Assistant Input
          </p>
          {params?.asked === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Trust Assistant question submitted for review.
            </p>
          ) : null}
          {user ? (
            <form action={askTrustAssistant} className="mt-5 grid gap-4">
              <input type="hidden" name="passport_id" value={params?.passport_id ?? ""} />
              <input
                type="hidden"
                name="verification_case_id"
                value={params?.verification_case_id ?? ""}
              />
              <input type="hidden" name="evidence_id" value={params?.evidence_id ?? ""} />
              <input type="hidden" name="decision_id" value={params?.decision_id ?? ""} />
              <label className="grid gap-2 text-sm text-zinc-400">
                Question
                <textarea
                  name="question"
                  required
                  rows={5}
                  placeholder="Ask about passports, evidence, trust scores or verification workflows..."
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 md:w-fit"
              >
                Ask Trust Assistant
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                Sign in to ask Trust Assistant and track answers in app.
              </p>
              <Link
                href="/login?next=/trust-assistant"
                className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Suggested Questions
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {suggestedQuestions.map((question) => (
              <div key={question} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="font-medium text-zinc-100">{question}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Source Material
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Approved knowledge articles for human review.
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {knowledgeArticles?.length ? (
              knowledgeArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/knowledge-base?article_id=${encodeURIComponent(article.id)}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    {article.category ?? "Knowledge"}
                  </p>
                  <h3 className="mt-3 font-semibold text-zinc-100">
                    {article.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">
                    {article.summary ?? article.body}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500 md:col-span-3">
                No approved knowledge articles available yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Knowledge Sources
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {knowledgeSources.map((source) => (
              <div key={source} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {source}
                </p>
                <p className="mt-3 text-2xl font-semibold text-zinc-100">
                  {sourceCounts.get(source) ?? 0}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Conversation History
          </p>
          <div className="mt-5 grid gap-4">
            {conversationRows.length ? (
              conversationRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-4xl font-medium text-zinc-100">
                      {row.question ?? "Question"}
                    </p>
                    <span className="rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                      {row.status ?? "pending_review"}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                    {row.status === "answered" && row.answer
                      ? row.answer
                      : "Awaiting admin review."}
                  </p>
                  <p className="mt-3 text-xs text-zinc-600">
                    {row.answer_source ? `${row.answer_source} / ` : ""}
                    {formatDate(row.updated_at ?? row.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No help questions yet. Ask a question above to start a traceable
                Trust Assistant thread.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <p className="text-sm leading-6 text-zinc-400">
            Future releases will introduce AI-assisted trust analysis with human
            governance.
          </p>
        </section>
      </div>
    </main>
  );
}
