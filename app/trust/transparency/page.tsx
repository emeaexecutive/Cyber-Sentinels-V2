import Link from "next/link";
import { redirect } from "next/navigation";
import { TrustTransparencyReportView } from "@/components/trust-transparency-report";
import {
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { createClient } from "@/lib/supabase/server";
import {
  buildTrustTransparencyReport,
  TRUST_SCORING_TRANSPARENCY,
} from "@/lib/trust-transparency";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    workflow_id?: string;
    subject_type?: string;
  }>;
};

export default async function TrustTransparencyPage({
  searchParams,
}: PageProps) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trust/transparency");

  const workflowId = String(query.workflow_id ?? "").trim();
  const subjectType = String(query.subject_type ?? "workflow").trim();
  const trust =
    workflowId && validReference(workflowId)
      ? await loadWorkflowTrust(supabase, workflowId, subjectType).catch(() => null)
      : null;
  const report = trust ? buildTrustTransparencyReport(trust) : null;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Trust Transparency Center
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-5xl">
            Understand and defend operational trust decisions.
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-200">
            Review how trust scoring works, which evidence and provider signals contributed, who intervened, how posture changed and where replay preserves the chronology.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">
              Open Trust Replay
            </Link>
            <Link href="/dashboard/governance" className="brand-secondary-action brand-action-large text-sm">
              Governance Queue
            </Link>
            <Link href="/verification-receipts" className="brand-secondary-action brand-action-large text-sm">
              Verification Receipts
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">How trust scoring works</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            The current engine is deterministic and evidence-aware. It coordinates workflow signals and governance state; it is not a black-box truth model.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_SCORING_TRANSPARENCY.inputs.map((input) => (
              <div key={input} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm font-semibold capitalize text-zinc-100">
                {input}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-cyan-100">
            {TRUST_SCORING_TRANSPARENCY.outputMeaning}
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5 print:hidden">
          <form className="grid gap-4 md:grid-cols-[1fr_2fr_auto]" action="/trust/transparency">
            <label className="grid gap-2 text-sm text-zinc-400">
              Subject type
              <select
                name="subject_type"
                defaultValue={subjectType}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              >
                <option value="workflow">Workflow</option>
                <option value="passport">Passport</option>
                <option value="agent">Intelligent system</option>
                <option value="interview_session">Interview session</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Workflow or subject reference
              <input
                name="workflow_id"
                defaultValue={workflowId}
                placeholder="Enter an accessible record reference"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
            <button className="self-end rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              Explain
            </button>
          </form>
        </section>

        <section className="mt-8">
          {report ? (
            <TrustTransparencyReportView report={report} />
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold">No workflow selected</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Enter an accessible workflow reference to reconstruct its evidence continuity, provider signals, governance history and trust-state explanation. No sample decision is fabricated when records are absent.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
