import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type HelpPageProps = {
  searchParams?: Promise<{ submitted?: string }>;
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
  const { data: helpQuestion, error } = await supabase
    .from("help_questions")
    .insert({
      question,
      created_by: actor,
    })
    .select("id")
    .single();

  if (!error) {
    await createAuditLog(supabase, "help_question_created", actor, {
      help_question_id: helpQuestion?.id,
    });
    await createSignal(supabase, "Help question created");
  }

  redirect("/help?submitted=1");
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
