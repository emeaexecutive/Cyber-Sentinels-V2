import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
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

const faqs = [
  ["What is a Trust Passport?", "A Trust Passport is a live record that connects a subject to identity, evidence, decisions, signals and audit history."],
  ["What is evidence?", "Evidence is supporting material such as uploaded files, URLs or records used to verify a claim."],
  ["What does verification mean?", "Verification means a claim has been reviewed against evidence and operational context."],
  ["What is a decision?", "A decision records approval, rejection, escalation or review outcome for a trust event."],
  ["What are signals?", "Signals are activity events that help show how trust changes over time."],
  ["What is an audit trail?", "An audit trail is the record of who did what, when, and why it mattered."],
  ["What is the Trust Graph?", "The Trust Graph shows how passports, evidence, decisions, signals and audit history connect."],
  ["What is Workforce Trust?", "Workforce Trust applies evidence-backed verification to candidates, contractors and teams."],
  ["What is Intent Verification?", "Intent Verification records why an action is being requested before it moves forward."],
  ["What is Autonomy Governance?", "Autonomy Governance defines what agents and workflows may observe, advise, approve or execute."],
];

const workflowSteps = [
  ["1", "Create Passport", "/passport"],
  ["2", "Upload Evidence", "/evidence-upload"],
  ["3", "Review Evidence", "/back-office#evidence-review"],
  ["4", "Approve or Reject", "/back-office#verification-queue"],
  ["5", "View Trust Passport", "/passports"],
  ["6", "Open Trust Graph", "/trust-graph-engine"],
];

async function submitHelpQuestion(formData: FormData) {
  "use server";

  const question = String(formData.get("question") ?? "").trim();

  if (!question) {
    redirect("/help");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/help");
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

  redirect("/help?submitted=1");
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminAllowlisted(user?.email);
  const { data: helpQuestions } = user
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
  const { data: knowledgeArticles } = await supabase
    .from("knowledge_articles")
    .select("id,title,category,summary,body")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(12)
    .returns<KnowledgeArticle[]>();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Help Center
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Cyber Sentinels Help Center
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Understand passports, evidence, decisions, trust scores and graph
            relationships.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Quick Questions
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-base font-semibold text-zinc-100">
                  {question}
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Knowledge Base FAQs
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {knowledgeArticles?.length ? (
              knowledgeArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/knowledge-base?article_id=${encodeURIComponent(article.id)}`}
                  className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    {article.category ?? "Knowledge"}
                  </p>
                  <h2 className="mt-3 text-base font-semibold text-zinc-100">
                    {article.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">
                    {article.summary ?? article.body}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
                Approved knowledge articles will appear here.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Guided Workflow
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {workflowSteps.map(([step, label, href]) => (
              <Link
                key={step}
                href={href}
                className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  Step {step}
                </p>
                <h2 className="mt-4 font-semibold text-zinc-100">{label}</h2>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Your Questions
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Track submitted questions and admin answers.
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
                      {item.question ?? "Help question"}
                    </h3>
                    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
                      {item.status ?? "answered"}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                    {item.status === "answered" && item.answer
                      ? item.answer
                      : "Awaiting admin answer."}
                  </p>
                  <p className="mt-4 text-xs text-zinc-600">
                    {item.status === "answered" && item.admin_answered_by
                      ? `Answered by ${item.admin_answered_by}`
                      : "Not answered yet"}
                    {item.status === "answered" && item.answered_at ? ` / ${new Date(item.answered_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500 md:col-span-2">
                {user
                  ? "No submitted questions yet. Ask a question below to start a traceable help thread."
                  : "Sign in to view your submitted questions and admin answers."}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Ask a Question
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Store a question for admin review.
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            AI answers will be added in a later release.
          </p>
          {params?.submitted === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Help question submitted.
            </p>
          ) : null}
          {user ? (
            <form action={submitHelpQuestion} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-zinc-400">
                Question
                <textarea
                  name="question"
                  required
                  rows={5}
                  placeholder="Ask about passports, evidence, decisions, scores or graph relationships"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 md:w-fit"
              >
                Submit Question
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                Sign in to submit a help question for admin review.
              </p>
              <Link
                href="/login?next=/help"
                className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
