import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDesignPartnerReadinessDemo } from "../lib/core/trust-fabric.ts";
import { enterprisePolicyTemplates } from "../lib/policy-engine.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("guided enterprise onboarding reuses the protected pilot setup and retains all seven steps", async () => {
  const source = await read("app/enterprise/pilot-setup/page.tsx");
  assert.match(source, /\/login\?next=\/enterprise\/pilot-setup/);
  for (const step of ["Welcome", "Organization setup", "Identity Provider selection", "Provider configuration status", "Trust Policy selection", "Admin confirmation", "First verification walkthrough"]) {
    assert.match(source, new RegExp(step));
  }
  for (const state of ["Configured", "Optional", "Awaiting Credentials"]) assert.match(source, new RegExp(state));
  assert.match(source, /admin_confirmed/);
});

test("seven policy templates define thresholds, escalation, review and evidence requirements", () => {
  assert.deepEqual(enterprisePolicyTemplates.map((template) => template.name), [
    "AI Operations", "Financial Services", "Insurance", "Healthcare", "Critical Infrastructure", "General Enterprise", "Hiring",
  ]);
  for (const template of enterprisePolicyTemplates) {
    assert.equal(template.policy.humanApprovalRequired, true);
    assert.ok(template.escalationPath.length >= 2);
    assert.ok(template.reviewRequirements.length >= 4);
    assert.ok(template.evidenceRequirements.length >= 5);
    assert.ok(template.trustThresholds.escalationThreshold > 0);
  }
});

test("provider setup exposes the required maturity and connection evidence fields", async () => {
  const [source, readiness] = await Promise.all([
    read("app/admin/provider-status/page.tsx"),
    read("lib/providers/provider-readiness.ts"),
  ]);
  for (const label of ["Current status", "Health", "Credential state", "Last successful connection", "Supported signals", "Known limitations", "Documentation"]) {
    assert.match(source, new RegExp(label));
  }
  assert.doesNotMatch(source, /Test Connection/);
  assert.match(readiness, /purpose: string/);
  assert.match(readiness, /documentationHref: "\/docs\/PROVIDER_SETUP_GUIDE\.md"/);
  assert.match(source, /No successful real connection recorded/);
});

test("Trust Workspace and Enterprise Readiness consolidate the requested operational views", async () => {
  const [dashboard, readiness, model] = await Promise.all([
    read("app/dashboard/page.tsx"),
    read("app/enterprise/readiness/page.tsx"),
    read("lib/enterprise-readiness.ts"),
  ]);
  for (const label of ["Current Trust Posture", "Recent Decisions", "Evidence Summary", "Replay Activity", "Trust Memory", "Provider Status", "Open Reviews", "Pending Actions"]) assert.match(dashboard, new RegExp(label));
  assert.doesNotMatch(dashboard, /EnterpriseDecisionCard/);
  assert.match(readiness, /Enterprise settings/);
  for (const group of ["Identity", "Providers", "Security", "Policies", "Notifications", "Audit", "Integrations", "System"]) assert.match(model, new RegExp(`label: \\"${group}\\"`));
});

test("the seven-minute design-partner demo uses the exact flow and honest states", () => {
  const demo = buildDesignPartnerReadinessDemo();
  assert.equal(demo.release, "1.2.1");
  assert.equal(demo.durationMinutes, 7);
  assert.deepEqual(demo.steps.map((step) => step.label), ["Organization created", "Provider configured", "Trust policy selected", "Verification initiated", "Decision", "Replay", "Evidence Graph", "Trust Memory™", "Governance", "Enterprise Dashboard"]);
  assert.deepEqual(demo.statesShown, ["Live", "Configured", "Simulated", "Awaiting Credentials"]);
});

test("all Sprint 12.1 handoff documents are present and deployment coverage is explicit", async () => {
  const paths = ["docs/DESIGN_PARTNER_GUIDE.md", "docs/ENTERPRISE_ONBOARDING.md", "docs/DEPLOYMENT_CHECKLIST.md", "docs/PROVIDER_SETUP_GUIDE.md", "docs/SPRINT_12_1_ACCEPTANCE.md", "docs/demos/DESIGN_PARTNER_READINESS_DEMO.md"];
  const documents = await Promise.all(paths.map(read));
  for (const requirement of ["environment", "secrets", "Supabase", "Vercel", "Cloudflare", "provider", "webhook", "rate limit"]) assert.match(documents[2], new RegExp(requirement, "i"));
});
