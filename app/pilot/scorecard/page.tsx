import Link from "next/link";
import { buildPilotMetricContract, buildPilotMetricsSnapshot } from "@/src/lib/pilot/metrics-service";

function formatPercent(value: number): string {
  return `${value}%`;
}

function formatDurationMs(value: number): string {
  if (value === 0) {
    return "n/a";
  }

  if (value >= 60000) {
    return `${Math.round(value / 60000)} min`;
  }

  return `${value} ms`;
}

const sampleWindow = {
  start: "2026-09-01T00:00:00.000Z",
  end: "2026-09-30T23:59:59.999Z",
};

const sampleInput = {
  window: sampleWindow,
  enterpriseId: "ent-1",
  decisions: [
    {
      id: "d1",
      enterpriseId: "ent-1",
      tenantId: "tenant-a",
      decision: "ALLOW" as const,
      createdAt: "2026-09-10T10:00:00.000Z",
      governed: true,
      outOfScope: false,
      unauthorized: false,
      authorityIntegrity: true,
      evidenceComplete: true,
      replayAvailable: true,
      recoveryAvailable: true,
      providerEvidenceState: "present" as const,
      latencyMs: 300000,
      authority: {
        actor: "agent-1",
        credential: "cred-1",
        delegator: "ops-1",
        resource: "repo-a",
        action: "deploy",
        validity: true,
        revocationState: "active",
        decision: "ALLOW",
      },
    },
    {
      id: "d2",
      enterpriseId: "ent-1",
      tenantId: "tenant-a",
      decision: "REVIEW" as const,
      createdAt: "2026-09-10T11:00:00.000Z",
      governed: true,
      outOfScope: true,
      unauthorized: true,
      authorityIntegrity: false,
      evidenceComplete: false,
      replayAvailable: false,
      recoveryAvailable: false,
      providerEvidenceState: "missing" as const,
      authority: {
        actor: "agent-2",
        credential: "cred-2",
        delegator: "ops-2",
        resource: "repo-b",
        action: "delete",
        validity: false,
        revocationState: "revoked",
        decision: "REVIEW",
      },
    },
    {
      id: "d3",
      enterpriseId: "ent-1",
      tenantId: "tenant-b",
      decision: "ALLOW" as const,
      createdAt: "2026-09-20T05:00:00.000Z",
      governed: false,
      outOfScope: false,
      unauthorized: false,
      authorityIntegrity: true,
      evidenceComplete: true,
      replayAvailable: true,
      recoveryAvailable: true,
      providerEvidenceState: "present" as const,
      authority: {
        actor: "agent-3",
        credential: "cred-3",
        delegator: "ops-3",
        resource: "repo-c",
        action: "read",
        validity: true,
        revocationState: "active",
        decision: "ALLOW",
      },
    },
  ],
  alerts: [
    { id: "a1", enterpriseId: "ent-1", tenantId: "tenant-a", status: "open", severity: "high", createdAt: "2026-09-10T10:01:00.000Z", resolvedAt: null },
    { id: "a2", enterpriseId: "ent-1", tenantId: "tenant-a", status: "resolved", severity: "medium", createdAt: "2026-09-10T11:00:00.000Z", resolvedAt: "2026-09-10T11:05:00.000Z" },
  ],
  reviews: [
    { id: "r1", enterpriseId: "ent-1", tenantId: "tenant-a", status: "resolved", createdAt: "2026-09-10T11:00:00.000Z", resolvedAt: "2026-09-10T11:10:00.000Z", decisionId: "d2" },
    { id: "r2", enterpriseId: "ent-1", tenantId: "tenant-a", status: "open", createdAt: "2026-09-11T00:00:00.000Z", resolvedAt: null, decisionId: "d1" },
  ],
  evidence: [
    { decisionId: "d1", enterpriseId: "ent-1", tenantId: "tenant-a", present: true },
    { decisionId: "d2", enterpriseId: "ent-1", tenantId: "tenant-a", present: false },
    { decisionId: "d3", enterpriseId: "ent-1", tenantId: "tenant-b", present: true },
  ],
  revocations: [
    { id: "rev-1", enterpriseId: "ent-1", tenantId: "tenant-a", decisionId: "d2", revokedAt: "2026-09-10T10:59:00.000Z", prevented: true },
  ],
  providerEvidence: [
    { decisionId: "d1", enterpriseId: "ent-1", tenantId: "tenant-a", state: "present" },
    { decisionId: "d2", enterpriseId: "ent-1", tenantId: "tenant-a", state: "missing" },
  ],
  credentialNegativeTests: [
    { id: "c1", enterpriseId: "ent-1", tenantId: "tenant-a", accepted: false, reason: "invalid_key" },
    { id: "c2", enterpriseId: "ent-1", tenantId: "tenant-a", accepted: true, reason: "revoked_key" },
  ],
};

const snapshot = buildPilotMetricsSnapshot(sampleInput);
const contract = buildPilotMetricContract(sampleInput);
const isLiveDataAvailable = false;

const saferOperationsMetrics = [
  { label: "Unauthorized ALLOW", value: snapshot.unauthorizedAllow },
  { label: "Out-of-scope rejection rate", value: formatPercent(snapshot.outOfScopeRejectionRate) },
  { label: "Revocation effectiveness", value: formatPercent(snapshot.revocationEffectiveness) },
  { label: "Governed action coverage", value: formatPercent(snapshot.governedActionCoverage) },
];

const auditMetrics = [
  { label: "Evidence coverage", value: formatPercent(snapshot.evidenceCoverage) },
  { label: "Replay coverage", value: formatPercent(snapshot.replayCoverage) },
  { label: "Recovery coverage", value: formatPercent(snapshot.recoveryCoverage) },
  { label: "P95 decision latency", value: formatDurationMs(snapshot.p95DecisionLatencyMs) },
];

const governanceMetrics = [
  { label: "Authority integrity rate", value: formatPercent(snapshot.authorityIntegrityRate) },
  { label: "Review resolution rate", value: formatPercent(snapshot.reviewResolutionRate) },
  { label: "Median review resolution", value: formatDurationMs(snapshot.medianReviewResolutionMs) },
  { label: "Decision count", value: snapshot.actionsGoverned },
];

export default function PilotScorecardPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Controlled Pilot Snapshot
            </span>
            <span className="rounded-full border border-amber-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              {isLiveDataAvailable ? "Live data mode" : "Demo data mode"}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {isLiveDataAvailable ? "Live tenant data available" : "NO LIVE PILOT MEASUREMENT YET"}
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
            Pilot evidence scorecard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            This page renders the same pilot metrics read model used by the evidence contract. It is currently a demo-only snapshot for a sample workflow and should not be interpreted as live pilot performance or customer impact.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pilot/welcome" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              Back to pilot onboarding
            </Link>
            <Link href="/pilot/getting-started" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-400">
              Review pilot workflow
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Measurement contract</h2>
              <p className="mt-1 text-sm text-zinc-400">Each metric is surfaced with its tenant, window, source, sample size, and measurement state so the view stays evidence-bound.</p>
            </div>
            <div className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-[0.16em] text-zinc-300">
              {isLiveDataAvailable ? "Live contract" : "Demo contract"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contract.map((entry) => (
              <div key={entry.metric} className="rounded-lg border border-zinc-800 bg-black px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{entry.metric}</p>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                    {isLiveDataAvailable ? entry.measurementState : `DEMO / ${entry.measurementState}`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Tenant: {entry.tenant}</p>
                <p className="mt-1 text-xs text-zinc-500">Source: {entry.source}</p>
                <p className="mt-1 text-xs text-zinc-500">Sample: {entry.sampleSize} | numerator: {entry.numerator} | denominator: {entry.denominator}</p>
                <p className="mt-2 text-lg font-semibold text-cyan-200">{entry.value}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {[{ title: "Safer operations", metrics: saferOperationsMetrics }, { title: "Faster audit / investigation", metrics: auditMetrics }, { title: "Easier governance", metrics: governanceMetrics }].map((group) => (
            <article key={group.title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{group.title}</h2>
              <div className="mt-4 space-y-3">
                {group.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                    <p className="text-sm text-zinc-400">{metric.label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
