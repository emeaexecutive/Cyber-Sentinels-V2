import type { CanonicalPlatformHealth } from "@/lib/core/platform-health";

export const enterpriseControlCatalog = [
  { id: "settings", label: "Enterprise Settings", href: "/enterprise/operations", owner: "Enterprise Operations", tenantScoped: true, boundary: "Indexes existing configuration owners; it does not store configuration." },
  { id: "policies", label: "Enterprise Policies", href: "/admin/trust-architecture/policies", owner: "Trust Architecture", tenantScoped: true, boundary: "Policy versions remain append-only and tenant scoped." },
  { id: "roles", label: "Enterprise Roles", href: "/team-access", owner: "Workspace Access", tenantScoped: true, boundary: "Roles constrain access; they never imply business authority." },
  { id: "teams", label: "Enterprise Teams", href: "/team-workspace", owner: "Trust Workspace", tenantScoped: true, boundary: "Membership and workspace ownership remain the tenant boundary." },
  { id: "integrations", label: "Enterprise Integrations", href: "/admin/integrations", owner: "Provider Registry", tenantScoped: true, boundary: "Configured is distinct from healthy and production ready." },
  { id: "api-keys", label: "Enterprise API Keys", href: "/developers/api-keys", owner: "Developer Platform", tenantScoped: true, boundary: "Key material is shown once; only prefixes and audit metadata may be retained." },
  { id: "webhooks", label: "Enterprise Webhooks", href: "/admin/integrations", owner: "Webhook Event Ledger", tenantScoped: true, boundary: "Inbound events retain hashes and processing state, never raw secret-bearing payloads." },
  { id: "notifications", label: "Enterprise Notifications", href: "/notifications", owner: "Operational Coordination", tenantScoped: true, boundary: "Notifications coordinate action and are not the authoritative decision record." },
  { id: "exports", label: "Enterprise Exports", href: "/compliance-export", owner: "Compliance Export", tenantScoped: true, boundary: "Exports are point-in-time evidence packages with explicit scope and retention." },
  { id: "reports", label: "Enterprise Reports", href: "/trust-center", owner: "Enterprise Trust Centre", tenantScoped: true, boundary: "Reports summarize canonical evidence and do not create new facts." },
] as const;

export const enterpriseLifecycleCatalog = [
  { label: "Enterprise configuration", href: "/enterprise/operations", owner: "Enterprise Operations" },
  { label: "Multi-tenant administration", href: "/workspace", owner: "Trust Workspace" },
  { label: "Role management", href: "/team-access", owner: "Workspace Access" },
  { label: "Enterprise onboarding", href: "/enterprise/pilot-setup", owner: "Pilot Setup" },
  { label: "Policy management", href: "/admin/trust-architecture/policies", owner: "Trust Architecture" },
  { label: "Environment management", href: "/admin/deployment-readiness", owner: "Deployment Readiness" },
  { label: "Audit management", href: "/enterprise/auditability", owner: "Auditability" },
  { label: "Evidence retention", href: "/enterprise/compliance", owner: "Governance Policy" },
  { label: "Data lifecycle", href: "/privacy", owner: "Privacy and Data Rights" },
  { label: "Provider lifecycle", href: "/admin/provider-status", owner: "Provider Registry" },
  { label: "Trust Object lifecycle", href: "/enterprise/trust-platform", owner: "Trust Fabric" },
  { label: "Decision lifecycle", href: "/enterprise/trust-platform", owner: "Trust Decision Intelligence" },
  { label: "Incident lifecycle", href: "/dashboard/serious-incidents", owner: "Serious Incident Workflow" },
  { label: "Journey lifecycle", href: "/demo/trust-execution-flow", owner: "Trust Journey" },
  { label: "Recovery lifecycle", href: "/trust-recovery", owner: "Trust Recovery" },
] as const;

export const designPartnerOperationalFlow = [
  { stage: "Tenant creation", href: "/workspace", evidence: "A tenant-owned Trust Workspace and creator are recorded." },
  { stage: "User onboarding", href: "/enterprise/pilot-setup", evidence: "Named users, roles and responsibilities are assigned." },
  { stage: "Policy configuration", href: "/admin/trust-architecture/policies", evidence: "A versioned policy is reviewed with change and rollback references." },
  { stage: "Verification", href: "/verification-queue", evidence: "Provider evidence and limitations are retained for review." },
  { stage: "Operational Trust", href: "/trustops", evidence: "Runtime posture is evaluated without replacing source evidence." },
  { stage: "Replay", href: "/trust-replay", evidence: "The decision chronology can be reconstructed from retained references." },
  { stage: "Trust Memory", href: "/admin/trust-memory", evidence: "Material changes and reviewed outcomes remain attributable." },
  { stage: "Decision Intelligence", href: "/enterprise/trust-platform", evidence: "Executive explanations cite canonical decision evidence." },
  { stage: "Executive reporting", href: "/trust-center", evidence: "A bounded report exposes facts, unknowns, risks and next actions." },
] as const;

export const securityReviewCatalog = [
  { control: "Authentication", owner: "Supabase session verification", evidence: "Server middleware calls getUser before protected access." },
  { control: "Authorization", owner: "Tenant membership and admin allowlist", evidence: "Protected pages and APIs enforce explicit user or admin checks." },
  { control: "Session handling", owner: "HTTP-only admin verification cookie", evidence: "The admin cookie is secure in production, same-site strict and time bounded." },
  { control: "CSRF", owner: "Mutation origin and content-type guards", evidence: "Canonical protected mutations reject untrusted origins and unsafe request shapes." },
  { control: "CSP", owner: "Next.js response headers", evidence: "A restrictive CSP, frame denial, HSTS and content-type protections are configured." },
  { control: "Turnstile", owner: "Authentication abuse control", evidence: "The Turnstile verification route is separated from authorization." },
  { control: "Secrets", owner: "Server-only environment access", evidence: "Service-role and provider credentials are never exposed in readiness payloads." },
  { control: "Rate limiting", owner: "Route and edge controls", evidence: "Repository controls are inspectable; external durable enforcement remains deployment evidence." },
  { control: "Headers", owner: "Next.js security headers", evidence: "CSP, HSTS, Referrer-Policy, Permissions-Policy and anti-sniffing headers are configured." },
  { control: "Security events", owner: "Audit and Trust Event ledgers", evidence: "Admin access and material workflow actions emit attributable security evidence." },
] as const;

export type EnterpriseAuditRecord = {
  actor: string;
  occurredAt: string;
  reason: string;
  evidenceReferences: string[];
  authorityReference: string;
  replayReference: string;
  correlationId: string;
};

function requiredText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required`);
}

export function assertEnterpriseAuditRecord(record: EnterpriseAuditRecord) {
  requiredText(record.actor, "Who");
  requiredText(record.reason, "Why");
  requiredText(record.authorityReference, "Authority");
  requiredText(record.replayReference, "Replay");
  requiredText(record.correlationId, "Correlation ID");
  if (!record.evidenceReferences.length || record.evidenceReferences.some((item) => !item.trim())) {
    throw new Error("Evidence is required");
  }
  if (Number.isNaN(Date.parse(record.occurredAt))) throw new Error("When must be an ISO timestamp");
  return record;
}

export const policyGovernanceStates = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "SUPERSEDED", "REJECTED", "ROLLED_BACK"] as const;
export type PolicyGovernanceState = (typeof policyGovernanceStates)[number];

const policyTransitions: Record<PolicyGovernanceState, readonly PolicyGovernanceState[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE"],
  ACTIVE: ["SUPERSEDED", "ROLLED_BACK"],
  SUPERSEDED: [],
  REJECTED: ["DRAFT"],
  ROLLED_BACK: [],
};

export type PolicyGovernanceAction = EnterpriseAuditRecord & {
  enterpriseId: string;
  policyId: string;
  policyVersion: string;
  previousState: PolicyGovernanceState;
  nextState: PolicyGovernanceState;
  reviewerId: string | null;
  rollbackPolicyVersion: string | null;
};

export function validatePolicyGovernanceAction(action: PolicyGovernanceAction) {
  assertEnterpriseAuditRecord(action);
  requiredText(action.enterpriseId, "Enterprise");
  requiredText(action.policyId, "Policy");
  requiredText(action.policyVersion, "Policy version");
  if (!policyTransitions[action.previousState].includes(action.nextState)) {
    throw new Error(`Policy transition ${action.previousState} -> ${action.nextState} is not allowed`);
  }
  if (["APPROVED", "ACTIVE", "REJECTED", "ROLLED_BACK"].includes(action.nextState) && !action.reviewerId?.trim()) {
    throw new Error("Reviewer attribution is required");
  }
  if (action.nextState === "ROLLED_BACK" && !action.rollbackPolicyVersion?.trim()) {
    throw new Error("Rollback policy version is required");
  }
  return action;
}

export type OperationalState = "HEALTHY" | "DEGRADED" | "BLOCKED" | "UNKNOWN" | "MAINTENANCE";

export type EnterpriseOperationsSnapshot = {
  schemaVersion: "enterprise-operations-v1";
  overallState: OperationalState;
  releaseVersion: string | null;
  environment: string | null;
  correlationId: string;
  observedAt: string;
  controls: Array<{
    id: "health" | "queues" | "providers" | "background-jobs" | "retry-queue" | "dead-letter-queue" | "recovery-jobs" | "maintenance-mode";
    label: string;
    state: OperationalState;
    value: number | boolean | string | null;
    evidence: string;
    source: "runtime" | "deployment" | "not_observed";
  }>;
  boundary: string;
};

type OptionalJobStatus = { running: number; failed: number } | null;

function jobState(value: OptionalJobStatus): OperationalState {
  if (!value) return "UNKNOWN";
  return value.failed > 0 ? "DEGRADED" : "HEALTHY";
}

export function buildEnterpriseOperationsSnapshot(input: {
  platformHealth: CanonicalPlatformHealth;
  correlationId: string;
  observedAt?: string;
  releaseVersion?: string | null;
  environment?: string | null;
  backgroundJobs?: OptionalJobStatus;
  deadLetterCount?: number | null;
  recoveryJobs?: OptionalJobStatus;
  maintenanceMode?: boolean | null;
}): EnterpriseOperationsSnapshot {
  requiredText(input.correlationId, "Correlation ID");
  const queue = input.platformHealth.queues;
  const providers = input.platformHealth.providers;
  const providerFailures = providers.filter((provider) => provider.state === "offline").length;
  const providerObserved = providers.some((provider) => provider.latency.status === "measured");
  const deadLetterState: OperationalState = input.deadLetterCount === null || input.deadLetterCount === undefined
    ? "UNKNOWN"
    : input.deadLetterCount > 0 ? "DEGRADED" : "HEALTHY";
  const maintenanceState: OperationalState = input.maintenanceMode === null || input.maintenanceMode === undefined
    ? "UNKNOWN"
    : input.maintenanceMode ? "MAINTENANCE" : "HEALTHY";
  const controls: EnterpriseOperationsSnapshot["controls"] = [
    { id: "health", label: "Health status", state: input.platformHealth.applicationStatus === "healthy" ? "HEALTHY" : input.platformHealth.applicationStatus === "blocked" ? "BLOCKED" : input.platformHealth.applicationStatus === "degraded" ? "DEGRADED" : "UNKNOWN", value: input.platformHealth.applicationStatus, evidence: input.platformHealth.platformHealth.evidence[0] ?? "No application health evidence is available.", source: "runtime" },
    { id: "queues", label: "Queue status", state: queue.status === "healthy" ? "HEALTHY" : queue.status === "degraded" ? "DEGRADED" : queue.status === "blocked" ? "BLOCKED" : "UNKNOWN", value: queue.governancePending + queue.replayPending, evidence: `${queue.governancePending} governance and ${queue.replayPending} replay item(s) are visible.`, source: "runtime" },
    { id: "providers", label: "Provider status", state: providerFailures ? "DEGRADED" : providerObserved ? "HEALTHY" : "UNKNOWN", value: providers.length, evidence: `${providers.length} provider path(s); ${providerFailures} offline; ${providers.filter((provider) => provider.state === "awaiting_credentials").length} awaiting credentials.`, source: providerObserved ? "runtime" : "not_observed" },
    { id: "background-jobs", label: "Background jobs", state: jobState(input.backgroundJobs ?? null), value: input.backgroundJobs?.running ?? null, evidence: input.backgroundJobs ? `${input.backgroundJobs.running} running and ${input.backgroundJobs.failed} failed job(s).` : "No durable background-job telemetry was supplied.", source: input.backgroundJobs ? "runtime" : "not_observed" },
    { id: "retry-queue", label: "Retry queue", state: queue.retryQueued > 0 ? "DEGRADED" : "HEALTHY", value: queue.retryQueued, evidence: `${queue.retryQueued} replay retry item(s) are visible in this process.`, source: "runtime" },
    { id: "dead-letter-queue", label: "Dead-letter queue", state: deadLetterState, value: input.deadLetterCount ?? null, evidence: input.deadLetterCount === null || input.deadLetterCount === undefined ? "No durable dead-letter queue telemetry was supplied." : `${input.deadLetterCount} dead-letter item(s) are visible.`, source: input.deadLetterCount === null || input.deadLetterCount === undefined ? "not_observed" : "runtime" },
    { id: "recovery-jobs", label: "Recovery jobs", state: jobState(input.recoveryJobs ?? null), value: input.recoveryJobs?.running ?? null, evidence: input.recoveryJobs ? `${input.recoveryJobs.running} running and ${input.recoveryJobs.failed} failed recovery job(s).` : "No durable recovery-job telemetry was supplied.", source: input.recoveryJobs ? "runtime" : "not_observed" },
    { id: "maintenance-mode", label: "Maintenance mode", state: maintenanceState, value: input.maintenanceMode ?? null, evidence: input.maintenanceMode === null || input.maintenanceMode === undefined ? "Maintenance mode is not explicitly configured." : input.maintenanceMode ? "The deployment is explicitly in maintenance mode." : "Maintenance mode is explicitly disabled.", source: input.maintenanceMode === null || input.maintenanceMode === undefined ? "not_observed" : "deployment" },
  ];
  const states = controls.map((control) => control.state);
  const overallState: OperationalState = states.includes("BLOCKED")
    ? "BLOCKED"
    : states.includes("MAINTENANCE")
      ? "MAINTENANCE"
      : states.includes("DEGRADED")
        ? "DEGRADED"
        : states.includes("UNKNOWN")
          ? "UNKNOWN"
          : "HEALTHY";

  return {
    schemaVersion: "enterprise-operations-v1",
    overallState,
    releaseVersion: input.releaseVersion ?? input.platformHealth.build.version,
    environment: input.environment ?? input.platformHealth.build.environment,
    correlationId: input.correlationId,
    observedAt: input.observedAt ?? input.platformHealth.generatedAt,
    controls,
    boundary: "Runtime values are evidence only for this process or connected deployment. Missing durable telemetry remains UNKNOWN and is never converted to zero or healthy.",
  };
}
