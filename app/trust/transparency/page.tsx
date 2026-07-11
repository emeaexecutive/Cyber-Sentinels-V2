import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionIntelligenceTimeline } from "@/components/decision-intelligence-timeline";
import { EnterpriseDecisionCard } from "@/components/enterprise-decision-card";
import { TrustExplanationCard } from "@/components/trust-explanation-card";
import { TrustExplanationTimeline } from "@/components/trust-explanation-timeline";
import { TrustTransparencyReportView } from "@/components/trust-transparency-report";
import { buildDecisionIntelligence } from "@/lib/core/decision-intelligence";
import { replayEngine } from "@/lib/core/replay-engine";
import { buildEvidenceGraph, buildEvidenceGraphDemo } from "@/lib/evidence-graph/evidence-graph";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
import {
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { createClient } from "@/lib/supabase/server";
import {
  buildDemoTrustExplanation,
  buildTrustExplanation,
} from "@/lib/trust-explanation/explanation";
import {
  TRUST_SCORING_TRANSPARENCY,
} from "@/lib/trust-transparency";
import type { ReplaySession } from "@/lib/trust-replay/replay";
import { loadValidationCases, runValidationBenchmark } from "@/lib/validation/benchmark-harness";
import { buildProviderReadinessChecklist } from "@/lib/providers/provider-readiness";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    workflow_id?: string;
    subject_type?: string;
    demo?: string;
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
  const showDemo = query.demo === "1";
  const trust =
    !showDemo && workflowId && validReference(workflowId)
      ? await loadWorkflowTrust(supabase, workflowId, subjectType).catch(() => null)
      : null;
  const report = trust ? replayEngine.buildReplayTransparencyReport(trust).report : null;
  const cases = await loadValidationCases().catch(() => []);
  const benchmark = await runValidationBenchmark({ cases }).catch(() => null);
  const reviewedOutcomes = benchmark?.reviewedOutcomes ?? [];
  const trustMemoryEvents = reviewedOutcomesToTrustMemoryEvents(reviewedOutcomes);
  const explanation = report && trust
    ? buildTrustExplanation({
        workflow: report.workflow,
        decision: String(trust.governanceLineage.at(-1)?.action_status ?? "").toLowerCase().includes("block")
          ? "BLOCK"
          : trust.posture.state === "governance_review"
            ? "ESCALATE"
            : trust.governanceLineage.length
              ? "REVIEW"
              : "ALLOW",
        reason: report.decisionExplanation.whyTrustShifted,
        confidence: 0.7,
        evidence: report.decisionExplanation.evidenceContributed,
        providers: report.decisionExplanation.providerSignals,
        runtimeSignals: trust.chronology.map((row: any) => String(row.event_summary ?? row.event_type ?? "Runtime signal recorded")).slice(0, 12),
        governancePolicy: {
          policyId: "workflow-governance-policy",
          policyName: "Workflow governance policy",
          outcome: String(trust.governanceLineage.at(-1)?.action_status ?? "not recorded"),
          rationale: String(trust.governanceLineage.at(-1)?.resolution_notes ?? trust.explanation.governanceImpact),
        },
        reviewedOutcomes,
        trustMemoryEvents,
        evidenceGraph: buildEvidenceGraph({
          workflows: [{ id: trust.workflow.subjectId, workflow_type: trust.workflow.subjectType }],
          evidence: trust.evidenceContinuity,
          replaySessions: trust.replay.sessions.map((session: any): ReplaySession => ({
            id: String(session.id),
            subject_type: session.subject_type ?? null,
            subject_id: session.subject_id ?? null,
            replay_summary: session.replay_summary ?? null,
            generated_by: session.generated_by ?? null,
            created_at: session.created_at ?? null,
          })),
          governanceReviews: trust.governanceLineage,
          trustMemoryEvents,
          providerSignals: trust.providerEvidence.providers.map((provider: any) => ({
            providerId: provider.providerId,
            providerName: provider.providerName,
            sourceType: "workflow_context",
            identityConfidence: 70,
            sessionIntegrity: 70,
            providerVerificationState: provider.verificationState,
            riskFlags: [],
            governanceRecommendation: "Use provider evidence as review context.",
            evidenceReferences: provider.evidenceReferences,
            summary: provider.summary,
          })),
        }),
        replayReference: report.auditability.replayReference,
        transparencyReport: report,
      })
    : buildDemoTrustExplanation(buildEvidenceGraphDemo());
  const decisionIntelligence = buildDecisionIntelligence({
    explanation,
    providerReadiness: buildProviderReadinessChecklist(),
    reviewedOutcomes,
    trustMemoryEvents,
  });

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
            <Link href="/trust/transparency?demo=1" className="brand-secondary-action brand-action-large text-sm">
              Demo Explanation
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
          {report || showDemo ? (
            <div className="grid gap-6">
              <EnterpriseDecisionCard intelligence={decisionIntelligence} />
              <DecisionIntelligenceTimeline intelligence={decisionIntelligence} />
              <TrustExplanationCard explanation={explanation} />
              <TrustExplanationTimeline explanation={explanation} />
              {report ? <TrustTransparencyReportView report={report} /> : null}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold">No workflow selected</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Enter an accessible workflow reference to reconstruct its evidence continuity, provider signals, governance history and trust-state explanation. No sample decision is fabricated when records are absent.
              </p>
              <Link href="/trust/transparency?demo=1" className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
                Open demo explanation
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
