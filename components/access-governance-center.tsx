import Link from "next/link";
import { DecisionSummary } from "@/components/executive-summary";
import type { AccessGovernanceOverview } from "@/lib/access-governance";

function label(value: unknown) {
  return String(value ?? "not recorded").replaceAll("_", " ");
}

function when(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function stateClass(value: string) {
  if (/review|required|elevated/.test(value)) return "border-amber-900 text-amber-200";
  if (/authorized/.test(value)) return "border-emerald-900 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

export function AccessGovernanceCenter({
  overview,
  enterprise = false,
}: {
  overview: AccessGovernanceOverview;
  enterprise?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-9 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            {enterprise ? "Enterprise TrustOps · Identity Governance" : "Access Governance"}
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-6xl">
            Operational identity and authorization continuity.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-200">
            Review Continuous Verification, Trust Posture, Authorization Lineage,
            Evidence Chain and replay-linked Governance Review before access is relied on.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Human identities, AI agents, service accounts and API actors share
            operational workflows. Their grants, delegated actions, posture
            shifts and revocations remain connected to evidence, workflow
            outcomes and the accountable authority behind them. This is
            operational trust governance, not standalone token management.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/governance" className="brand-primary-action brand-action-large text-sm">
              Open Governance Queue
            </Link>
            <Link href="/trust-replay" className="brand-secondary-action brand-action-large text-sm">
              Review Authorization Replay
            </Link>
            <Link href="/enterprise/control-plane" className="brand-secondary-action brand-action-large text-sm">
              Trust Control Plane
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: overview.posture.label },
            { label: "Current risks", value: `${overview.metrics.governanceEscalations} governance escalation(s)` },
            { label: "Recommended action", value: overview.metrics.governanceEscalations ? "Assign access review ownership" : "Review authorization freshness" },
            { label: "Evidence available", value: `${overview.metrics.authorizationEvents} authorization event(s); ${overview.metrics.replayLinked} replay-linked` },
            { label: "Confidence", value: "Access state is evidence-backed; empty records do not imply authorization" },
            { label: "Responsible owner", value: "Workflow owner and access governance reviewer" },
          ]} />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Workflow access states", overview.metrics.workflows],
            ["Governance escalations", overview.metrics.governanceEscalations],
            ["Authorization events", overview.metrics.authorizationEvents],
            ["Replay-linked", overview.metrics.replayLinked],
            ["Provider signals", overview.metrics.providerSignals],
            ["Session checks", overview.metrics.sessionIntegrityEvents],
          ].map(([name, value]) => (
            <article key={name} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-zinc-600">{name}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">Workflow access state</p>
              <h2 className="mt-2 text-2xl font-semibold">Conditional access remains reviewable.</h2>
            </div>
            <p className="text-sm text-zinc-500">{overview.posture.label}</p>
          </div>
          <div className="mt-5 grid gap-3">
            {overview.workflows.length ? overview.workflows.map((workflow) => (
              <article key={`${workflow.context}-${workflow.id}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{workflow.subject}</h3>
                    <p className="mt-1 text-xs capitalize text-zinc-600">
                      {workflow.context} · {when(workflow.updatedAt)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${stateClass(workflow.accessState)}`}>
                    {label(workflow.accessState)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">{workflow.explanation}</p>
                <div className="mt-4 grid gap-2 border-t border-zinc-900 pt-3 text-xs text-zinc-500 md:grid-cols-3">
                  <p>Trust posture: {workflow.level}</p>
                  <p>Reviewer: {workflow.latestApproval?.assigned_to ?? "Not assigned"}</p>
                  <p>Replay evidence: {workflow.replayLinked ? "Linked" : "Not recorded"}</p>
                </div>
              </article>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No authorized workflow records are visible. Access is not inferred from an empty record set.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Authorization lineage</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Recorded approvers, delegated actions and access-state changes—not reconstructed certainty.
            </p>
            <div className="mt-5 grid gap-3">
              {overview.authorizationEvents.length ? overview.authorizationEvents.slice(0, 8).map((event, index) => (
                <div key={String(event.id ?? index)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium capitalize text-zinc-200">{label(event.event_title ?? event.event_type)}</p>
                    <p className="text-xs text-zinc-600">{when(event.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{event.event_summary ?? "No explanation recorded."}</p>
                  <p className="mt-2 text-xs text-zinc-600">Actor: {event.actor_id ?? "Not recorded"}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No explicit authorization events are recorded. Governance approval must not be inferred.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance escalation continuity</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Reviewer ownership and resolution history stay connected to workflow evidence.
            </p>
            <div className="mt-5 grid gap-3">
              {overview.governance.length ? overview.governance.slice(0, 8).map((action, index) => (
                <div key={String(action.id ?? index)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium capitalize text-zinc-200">{label(action.action_status ?? action.action_type)}</p>
                    <p className="text-xs text-zinc-600">{when(action.resolved_at ?? action.created_at)}</p>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                    <p>Reviewer: {action.reviewer_name ?? action.reviewer_email ?? action.assigned_to ?? "Not recorded"}</p>
                    <p>Workflow: {action.subject_id ?? "Not recorded"}</p>
                    <p>Resolution: {action.resolution_notes ?? "Pending or not recorded"}</p>
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No governance actions are visible in the authorized evidence window.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Executive onboarding", "Elevated identity evidence and named approval before privileged onboarding."],
            ["Privileged workflow access", "Conditional access with policy thresholds, reviewer ownership and replay retention."],
            ["Sensitive AI-agent operations", "Delegated scope, accountable owner and governed execution evidence."],
            ["Service-account and API activity", "Non-human identity ownership, delegated authority and execution history remain reviewable."],
            ["Continuous workforce access", "Identity freshness, role changes and Session Integrity route to review before reliance."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-cyan-950/10 p-5">
          <p className="text-sm leading-7 text-zinc-300">
            Access posture is deterministic operational guidance based on retained
            rules, provider evidence and governance records. Human reviewers remain
            authoritative; no output is identity certainty, surveillance or an
            autonomous punitive decision.
          </p>
        </section>
      </div>
    </main>
  );
}
