import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertEnterpriseAuditRecord,
  buildEnterpriseOperationsSnapshot,
  designPartnerOperationalFlow,
  enterpriseControlCatalog,
  enterpriseLifecycleCatalog,
  securityReviewCatalog,
  validatePolicyGovernanceAction,
} from "../lib/enterprise-operations.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const at = "2026-08-06T12:00:00.000Z";

function health(overrides = {}) {
  return {
    applicationStatus: "healthy",
    platformHealth: { evidence: ["Authenticated runtime health was observed."] },
    queues: { status: "healthy", governancePending: 1, replayPending: 2, failedJobs: 0, retryQueued: 0 },
    providers: [{ state: "configured", latency: { status: "awaiting_data" } }],
    build: { version: "rc2-test", environment: "test" },
    generatedAt: at,
    ...overrides,
  };
}

function audit(overrides = {}) {
  return {
    actor: "user:operator-1",
    occurredAt: at,
    reason: "Approve the reviewed policy for the controlled pilot.",
    evidenceReferences: ["evidence:policy-review-1"],
    authorityReference: "authority:security-owner",
    replayReference: "replay:policy-change-1",
    correlationId: "correlation:rc2-1",
    ...overrides,
  };
}

test("enterprise administration and lifecycle ownership cover every RC2 capability", () => {
  assert.deepEqual(enterpriseControlCatalog.map((item) => item.label), [
    "Enterprise Settings", "Enterprise Policies", "Enterprise Roles", "Enterprise Teams",
    "Enterprise Integrations", "Enterprise API Keys", "Enterprise Webhooks",
    "Enterprise Notifications", "Enterprise Exports", "Enterprise Reports",
  ]);
  assert.equal(enterpriseControlCatalog.every((item) => item.tenantScoped), true);
  for (const expected of [
    "Enterprise configuration", "Multi-tenant administration", "Role management",
    "Enterprise onboarding", "Policy management", "Environment management", "Audit management",
    "Evidence retention", "Data lifecycle", "Provider lifecycle", "Trust Object lifecycle",
    "Decision lifecycle", "Incident lifecycle", "Journey lifecycle", "Recovery lifecycle",
  ]) assert.ok(enterpriseLifecycleCatalog.some((item) => item.label === expected), expected);
});

test("material audit evidence fails closed unless Who, When, Why, Evidence, Authority and Replay exist", () => {
  assert.equal(assertEnterpriseAuditRecord(audit()).actor, "user:operator-1");
  assert.throws(() => assertEnterpriseAuditRecord(audit({ actor: "" })), /Who is required/);
  assert.throws(() => assertEnterpriseAuditRecord(audit({ occurredAt: "not-a-date" })), /When/);
  assert.throws(() => assertEnterpriseAuditRecord(audit({ reason: "" })), /Why/);
  assert.throws(() => assertEnterpriseAuditRecord(audit({ evidenceReferences: [] })), /Evidence/);
  assert.throws(() => assertEnterpriseAuditRecord(audit({ authorityReference: "" })), /Authority/);
  assert.throws(() => assertEnterpriseAuditRecord(audit({ replayReference: "" })), /Replay/);
});

test("policy governance enforces approval attribution and rollback lineage", () => {
  const base = {
    ...audit(), enterpriseId: "tenant:1", policyId: "policy:screening", policyVersion: "2.0.0",
    previousState: "PENDING_APPROVAL", nextState: "APPROVED", reviewerId: "user:reviewer-1",
    rollbackPolicyVersion: null,
  };
  assert.equal(validatePolicyGovernanceAction(base).nextState, "APPROVED");
  assert.throws(() => validatePolicyGovernanceAction({ ...base, reviewerId: null }), /Reviewer attribution/);
  assert.throws(() => validatePolicyGovernanceAction({ ...base, previousState: "DRAFT" }), /not allowed/);
  assert.throws(() => validatePolicyGovernanceAction({ ...base, previousState: "ACTIVE", nextState: "ROLLED_BACK", rollbackPolicyVersion: null }), /Rollback policy version/);
});

test("operational status preserves unknown durable queues and reports explicit maintenance", () => {
  const unknown = buildEnterpriseOperationsSnapshot({ platformHealth: health(), correlationId: "corr-1" });
  assert.equal(unknown.overallState, "UNKNOWN");
  assert.equal(unknown.controls.find((item) => item.id === "dead-letter-queue").value, null);
  assert.equal(unknown.controls.find((item) => item.id === "background-jobs").state, "UNKNOWN");
  const maintenance = buildEnterpriseOperationsSnapshot({
    platformHealth: health(), correlationId: "corr-2", maintenanceMode: true,
    backgroundJobs: { running: 0, failed: 0 }, deadLetterCount: 0, recoveryJobs: { running: 0, failed: 0 },
  });
  assert.equal(maintenance.overallState, "MAINTENANCE");
  assert.equal(maintenance.releaseVersion, "rc2-test");
});

test("security review and controlled pilot cover the required enterprise demonstration", () => {
  assert.deepEqual(securityReviewCatalog.map((item) => item.control), [
    "Authentication", "Authorization", "Session handling", "CSRF", "CSP", "Turnstile",
    "Secrets", "Rate limiting", "Headers", "Security events",
  ]);
  assert.deepEqual(designPartnerOperationalFlow.map((item) => item.stage), [
    "Tenant creation", "User onboarding", "Policy configuration", "Verification", "Operational Trust",
    "Replay", "Trust Memory", "Decision Intelligence", "Executive reporting",
  ]);
});

test("protected operations API, UI, health metadata and governance migration are wired", async () => {
  const [page, api, healthRoute, middleware, migration, repository] = await Promise.all([
    read("app/enterprise/operations/page.tsx"),
    read("app/api/admin/enterprise-operations/route.ts"),
    read("app/api/health/route.ts"),
    read("middleware.ts"),
    read("supabase/migrations/202608060001_rc2_enterprise_operational_readiness.sql"),
    read("src/lib/trust-architecture/repository.ts"),
  ]);
  assert.match(page, /requireAdminPageAccess/);
  assert.match(api, /requireAdminApiAccess/);
  assert.match(api, /private, no-store/);
  assert.match(healthRoute, /release_version/);
  assert.match(healthRoute, /liveness/);
  assert.match(middleware, /enterprise\/operations/);
  assert.match(migration, /enterprise_policy_governance_events/);
  assert.match(migration, /user_has_trust_workspace_role/);
  assert.match(migration, /append-only/i);
  for (const field of ["'who'", "'when'", "'why'", "'evidence'", "'authority'", "'replay'"]) assert.match(migration, new RegExp(field));
  assert.match(repository, /record_enterprise_policy_governance_event_v1/);
});

test("all mandatory RC2 documents are present and mark Production as untouched", async () => {
  const documents = [
    "docs/rc2/ENTERPRISE_OPERATIONAL_READINESS.md",
    "docs/rc2/ENTERPRISE_DEPLOYMENT_GUIDE.md",
    "docs/rc2/DESIGN_PARTNER_GUIDE.md",
    "docs/rc2/ENTERPRISE_OPERATIONS.md",
    "docs/rc2/RC2_RELEASE_NOTES.md",
  ];
  const contents = await Promise.all(documents.map(read));
  assert.equal(contents.every((content) => /Production untouched/i.test(content)), true);
});
