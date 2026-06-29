import type {
  ReadinessGateCheck,
  ReadinessGateSnapshot,
  ReadinessGateState,
} from "@/lib/readiness-gate/snapshot";
import type { VerificationProviderDefinition } from "@/lib/providers";

export type EnterpriseReadinessItem = {
  label: string;
  state: ReadinessGateState;
  evidence: string;
  limitation: string;
};

export type EnterpriseReadinessModel = {
  status: ReadinessGateSnapshot["status"];
  summary: string;
  readinessPercent: number;
  safeguards: EnterpriseReadinessItem[];
  providerStatus: Array<{
    name: string;
    implementationState: string;
    configured: boolean;
    replayIntegration: string;
    receiptIntegration: string;
    evidence: string;
  }>;
  transparencyClasses: Array<{
    label: string;
    items: string[];
    boundary: string;
  }>;
  blockers: ReadinessGateCheck[];
  cautions: ReadinessGateCheck[];
  complianceBoundary: string;
};

function checkByLabel(snapshot: ReadinessGateSnapshot, pattern: RegExp) {
  return snapshot.sections
    .flatMap((section) => section.checks)
    .find((check) => pattern.test(check.label));
}

function safeguard(
  snapshot: ReadinessGateSnapshot,
  label: string,
  pattern: RegExp,
  limitation: string
): EnterpriseReadinessItem {
  const check = checkByLabel(snapshot, pattern);
  return {
    label,
    state: check?.state ?? "caution",
    evidence: check?.message ?? "No current readiness evidence is available.",
    limitation,
  };
}

export function buildEnterpriseReadinessModel(
  snapshot: ReadinessGateSnapshot,
  providers: VerificationProviderDefinition[]
): EnterpriseReadinessModel {
  const checks = snapshot.sections.flatMap((section) => section.checks);
  const ready = checks.filter((check) => check.state === "ready").length;

  return {
    status: snapshot.status,
    summary: snapshot.summary,
    readinessPercent: checks.length
      ? Math.round((ready / checks.length) * 100)
      : 0,
    safeguards: [
      safeguard(
        snapshot,
        "Authentication separation",
        /login works|email callback works/i,
        "Route presence does not replace live identity-provider and redirect-allowlist testing."
      ),
      safeguard(
        snapshot,
        "Administrative protection",
        /admin routes protected/i,
        "Protection depends on verified sessions, the allowlist and deployment configuration."
      ),
      safeguard(
        snapshot,
        "Row-level security",
        /rls enabled/i,
        "Migration evidence must be verified against the deployed database."
      ),
      safeguard(
        snapshot,
        "Evidence preservation",
        /evidence storage private|evidence upload/i,
        "Storage policy and retention requirements remain deployment-specific."
      ),
      safeguard(
        snapshot,
        "Replay continuity",
        /replay route works|trust timeline events table/i,
        "Replay can reconstruct only evidence and chronology that were actually retained."
      ),
      safeguard(
        snapshot,
        "Governance escalation logging",
        /governance actions table|audit logs table/i,
        "Named reviewer attribution depends on the source workflow recording an owner."
      ),
    ],
    providerStatus: providers.map((provider) => ({
      name: provider.name,
      implementationState: provider.implementationState,
      configured: provider.status === "configured",
      replayIntegration: provider.replayIntegration,
      receiptIntegration: provider.receiptIntegration,
      evidence: provider.notes,
    })),
    transparencyClasses: [
      {
        label: "Working software",
        items: [
          "Authenticated workflow surfaces",
          "Governance queues and audit events",
          "Replay and verification receipts",
          "Trust transparency and audit exports",
        ],
        boundary: "Route and data-path readiness; not external certification.",
      },
      {
        label: "Provider-backed",
        items: providers
          .filter((provider) => provider.implementationState === "active")
          .map((provider) => provider.name),
        boundary:
          "Active means supported code and configuration state, not provider accuracy or uptime.",
      },
      {
        label: "Rule-based",
        items: [
          "Explainable trust scoring",
          "Policy thresholds and escalation routing",
          "Trust decay and workflow posture",
          "Validation and benchmarking summaries",
        ],
        boundary: "Deterministic workflow review support, not AI certainty.",
      },
      {
        label: "Simulated",
        items: [
          "Synthetic candidate attempts",
          "Injected sessions",
          "Provider instability",
          "Replay divergence",
          "Governance escalation chains",
        ],
        boundary: "Controlled product-behavior fixtures, not production outcomes.",
      },
      {
        label: "Requires validation",
        items: [
          "Deepfake and biometric accuracy",
          "False-positive and false-negative rates",
          "Adversarial robustness",
          "Enterprise-scale performance",
        ],
        boundary: "No claim is made until representative benchmarks exist.",
      },
      {
        label: "Governance-reviewed",
        items: [
          "Escalated trust workflows",
          "Provider evidence exceptions",
          "Session integrity failures",
          "High-assurance approvals",
        ],
        boundary: "Human review remains authoritative and replayable.",
      },
    ],
    blockers: snapshot.blockers,
    cautions: snapshot.cautions,
    complianceBoundary:
      "Cyber Sentinels supports compliance-oriented evidence, governance and reporting workflows. This readiness view is not a certification, legal opinion or guarantee of regulatory compliance.",
  };
}
