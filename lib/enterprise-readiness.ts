import type {
  ReadinessGateCheck,
  ReadinessGateSnapshot,
  ReadinessGateState,
} from "@/lib/readiness-gate/snapshot";
import type { CanonicalPlatformHealth, PlatformHealthSection } from "@/lib/core/platform-health";
import { getSlowestRuntimeOperations } from "@/lib/performance/runtime-profiler";
import {
  buildProviderReadinessChecklist,
  classifyProviderReadiness,
  type ProviderReadinessCheck,
  type ProviderReadinessClassification,
} from "@/lib/providers/provider-readiness";
import {
  providerRuntimeState,
  type ProviderRuntimeState,
  type VerificationProviderDefinition,
} from "@/lib/providers";

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
    runtimeState: ProviderRuntimeState;
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
  operational: EnterpriseOperationalReadiness;
  settingsGroups: Array<{ label: string; href: string; description: string }>;
};

export type EnterpriseOperationalStatus =
  | "Healthy"
  | "Degraded"
  | "Awaiting Configuration"
  | "Unavailable"
  | "Unknown";

export type EnterpriseOperationalComponent = {
  id: string;
  label: string;
  status: EnterpriseOperationalStatus;
  evidence: string;
  boundary: string;
  nextAction: string;
  lastObservedAt: string;
};

export type EnterpriseOperationalReadiness = {
  overallStatus: EnterpriseOperationalStatus;
  components: EnterpriseOperationalComponent[];
  statusCounts: Record<EnterpriseOperationalStatus, number>;
  metrics: CanonicalPlatformHealth["observability"];
  providerClassifications: Array<{
    id: string;
    name: string;
    classification: ProviderReadinessClassification;
    health: ProviderReadinessCheck["health"];
    runtimeState: ProviderReadinessCheck["runtimeState"];
    evidence: string;
    nextAction: string;
  }>;
  performance: {
    coverage: Array<{ label: string; value: number | null; status: "measured" | "awaiting_data" }>;
    bottlenecks: ReturnType<typeof getSlowestRuntimeOperations>;
    boundary: string;
  };
  boundary: string;
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

function sectionStatus(value: PlatformHealthSection): EnterpriseOperationalStatus {
  if (value.status === "healthy") return "Healthy";
  if (value.status === "degraded") return "Degraded";
  if (value.status === "blocked") return "Unavailable";
  return "Unknown";
}

function component(
  id: string,
  label: string,
  status: EnterpriseOperationalStatus,
  health: PlatformHealthSection,
  generatedAt: string,
  boundary: string
): EnterpriseOperationalComponent {
  return {
    id,
    label,
    status,
    evidence: health.evidence[0] ?? "No current runtime evidence is available.",
    boundary,
    nextAction: health.nextActions[0] ?? health.blockers[0] ?? "Continue controlled monitoring.",
    lastObservedAt: generatedAt,
  };
}

export function buildEnterpriseOperationalReadiness(
  health: CanonicalPlatformHealth,
  providerChecks: ProviderReadinessCheck[] = buildProviderReadinessChecklist()
): EnterpriseOperationalReadiness {
  const classifications = providerChecks.map((check) => ({
    id: check.id,
    name: check.name,
    classification: classifyProviderReadiness(check),
    health: check.health,
    runtimeState: check.runtimeState,
    evidence: check.evidence,
    nextAction: check.nextAction,
  }));
  const providerStatus: EnterpriseOperationalStatus = health.providerHealth.status === "degraded"
    ? "Degraded"
    : health.providerHealth.status === "healthy"
      ? "Healthy"
      : classifications.some((item) => item.classification === "Configured")
        ? "Unknown"
        : classifications.some((item) => item.classification === "Awaiting Credentials")
          ? "Awaiting Configuration"
          : "Unavailable";
  const buildSection: PlatformHealthSection = {
    status: health.build.version ? "healthy" : "unknown",
    confidence: null,
    evidence: health.build.version ? [`Build ${health.build.version} is reported by deployment metadata.`] : [],
    blockers: [],
    nextActions: health.build.version ? [] : ["Expose a deployment build identifier before pilot handoff."],
  };
  const environmentSection: PlatformHealthSection = {
    status: health.build.environment ? "healthy" : "unknown",
    confidence: null,
    evidence: health.build.environment ? [`Deployment environment is ${health.build.environment}.`] : [],
    blockers: [],
    nextActions: health.build.environment ? [] : ["Expose a deployment environment label before pilot handoff."],
  };
  const components = [
    component("authentication", "Authentication", sectionStatus(health.authHealth), health.authHealth, health.generatedAt, "Healthy reflects this authenticated admin request, not identity-provider uptime."),
    component("provider-connectivity", "Provider Connectivity", providerStatus, health.providerHealth, health.generatedAt, "Configured credentials are not a successful provider health check."),
    component("decision-engine", "Decision Engine", sectionStatus(health.trustEngineHealth), health.trustEngineHealth, health.generatedAt, "This is the operational label for the existing Trust Engine; health requires a retained Trust Decision runtime sample."),
    component("replay", "Replay", sectionStatus(health.replayHealth), health.replayHealth, health.generatedAt, health.queues.limitation),
    component("evidence-graph", "Evidence Graph", sectionStatus(health.evidenceGraphHealth), health.evidenceGraphHealth, health.generatedAt, "Health reflects retained in-process write samples, not durable fleet availability."),
    component("trust-memory", "Trust Memory™", sectionStatus(health.trustMemoryHealth), health.trustMemoryHealth, health.generatedAt, "Health reflects retained in-process write samples and never implies autonomous learning."),
    component("queues", "Queues", sectionStatus(health.governanceHealth), health.governanceHealth, health.generatedAt, health.queues.limitation),
    component("database", "Database", sectionStatus(health.databaseHealth), health.databaseHealth, health.generatedAt, "Database health reflects the protected readiness check and does not prove regional availability."),
    component("build-version", "Build Version", health.build.version ? "Healthy" : "Unknown", buildSection, health.generatedAt, "Build metadata describes the deployment and is not runtime health evidence."),
    component("environment", "Environment", health.build.environment ? "Healthy" : "Unknown", environmentSection, health.generatedAt, "Only the environment label is exposed; secret values remain hidden."),
  ];
  const statuses: EnterpriseOperationalStatus[] = ["Healthy", "Degraded", "Awaiting Configuration", "Unavailable", "Unknown"];
  const statusCounts = Object.fromEntries(
    statuses.map((status) => [status, components.filter((item) => item.status === status).length])
  ) as Record<EnterpriseOperationalStatus, number>;
  const overallStatus: EnterpriseOperationalStatus = statusCounts.Unavailable
    ? "Unavailable"
    : statusCounts.Degraded
      ? "Degraded"
      : statusCounts.Unknown || statusCounts["Awaiting Configuration"]
        ? "Unknown"
        : "Healthy";

  return {
    overallStatus,
    components,
    statusCounts,
    metrics: health.observability,
    providerClassifications: classifications,
    performance: {
      coverage: [
        ["Trust Orchestrator", health.latency.trustOrchestrator],
        ["Replay", health.latency.replayWrite],
        ["Evidence Graph", health.latency.evidenceWrite],
        ["Trust Memory™", health.latency.trustMemoryWrite],
        ["Provider execution", health.latency.provider],
        ["Parallel orchestration", health.latency.parallelOrchestration],
        ["Database queries", health.latency.largestDatabaseQuery],
        ["Cache usage", health.latency.cacheUsage],
        ["Queue performance", health.latency.queuePerformance],
      ].map(([label, measurement]) => ({
        label: label as string,
        value: (measurement as CanonicalPlatformHealth["latency"]["provider"]).value,
        status: (measurement as CanonicalPlatformHealth["latency"]["provider"]).status,
      })),
      bottlenecks: getSlowestRuntimeOperations(8),
      boundary: "Profiling is in-process and bounded to retained samples. No production-scale bottleneck is inferred from missing data.",
    },
    boundary: "This protected workspace separates measured runtime evidence, process-local diagnostics and deployment metadata. It is not certification, fleet observability or an SLA.",
  };
}

export function buildEnterpriseReadinessModel(
  snapshot: ReadinessGateSnapshot,
  providers: VerificationProviderDefinition[],
  platformHealth: CanonicalPlatformHealth,
  providerChecks: ProviderReadinessCheck[] = buildProviderReadinessChecklist()
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
      runtimeState: providerRuntimeState(provider),
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
    operational: buildEnterpriseOperationalReadiness(platformHealth, providerChecks),
    settingsGroups: [
      { label: "Identity", href: "/enterprise/identity-governance", description: "Identity providers, ownership and lifecycle controls." },
      { label: "Providers", href: "/admin/provider-status", description: "Credentials, health, signals and connection evidence." },
      { label: "Security", href: "/dashboard/session-security", description: "Session security, access boundaries and protection state." },
      { label: "Policies", href: "/policy-engine", description: "Trust thresholds, review rules and escalation paths." },
      { label: "Notifications", href: "/notifications", description: "Operator alerts and accountable next actions." },
      { label: "Audit", href: "/enterprise/auditability", description: "Audit events, replay evidence and export boundaries." },
      { label: "Integrations", href: "/admin/integrations", description: "Adapter registry and workflow integration controls." },
      { label: "System", href: "/admin/deployment-readiness", description: "Deployment, environment and build readiness." },
    ],
  };
}
