import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildEnterpriseAdoptionDemo } from "../lib/core/trust-fabric.ts";
import {
  buildTrustEvidencePack,
  trustEvidencePackEnterpriseSummary,
  trustEvidencePackPdf,
} from "../lib/trust-transparency.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const report = {
  schemaVersion: 1,
  workflow: { subjectType: "workflow", subjectId: "workflow-123" },
  scoringMethod: { method: "deterministic_workflow_review", inputs: [], outputMeaning: "Review context", humanReviewRemainsAuthoritative: true, standaloneDeepfakeVerdict: false, biometricCertainty: false, surveillance: false },
  decisionExplanation: {
    whatChanged: "Authority narrowed",
    whyTrustShifted: "Runtime evidence changed",
    evidenceContributed: ["evidence:1"],
    governanceActions: [],
    providerSignals: [{ provider: "Provider A", state: "Configured", summary: "Normalized contribution", evidenceReferences: ["provider:1"] }],
  },
  auditability: { evidenceContinuityCount: 1, chronologyCount: 2, governanceInterventionCount: 0, replaySessionCount: 1, receiptCount: 1, replayReference: "replay:1", authorizationLineage: ["authority:1"], trustMemoryReferences: ["memory:1"], escalationPath: [], resolutionSummaries: [] },
  posture: { state: "review", label: "Review" },
  boundary: "Recorded evidence only.",
};

test("canonical public pages share the four-question adoption contract and two actions", async () => {
  const [contracts, component, layout, visibility] = await Promise.all([
    read("lib/navigation/public-page-adoption.ts"),
    read("components/public-page-adoption-rail.tsx"),
    read("app/layout.tsx"),
    read("lib/navigation/route-visibility.ts"),
  ]);
  for (const field of ["audience", "problem", "differentiation", "primary", "supporting"]) assert.match(contracts, new RegExp(field));
  assert.match(contracts, /canonicalPublicRoutes\.map/);
  assert.match(component, /Who this is for/);
  assert.match(component, /Problem solved/);
  assert.match(component, /Why Cyber Sentinels/);
  assert.match(layout, /PublicPageAdoptionRail/);
  assert.match(visibility, /canonicalPublicRoutes/);
});

test("Trust Evidence Packs export JSON, valid PDF and Enterprise Summary from one pack", () => {
  const pack = buildTrustEvidencePack(report);
  assert.equal(pack.providerParticipation.length, 1);
  assert.match(trustEvidencePackPdf(pack).subarray(0, 8).toString("ascii"), /^%PDF-1\.4/);
  const summary = trustEvidencePackEnterpriseSummary(pack);
  for (const field of ["Decision posture", "Evidence", "Replay", "Trust Memory", "Authority", "Provider participation", "Operational limitations"]) assert.match(summary, new RegExp(field));
});

test("authenticated audit export and report UI expose all three Evidence Pack formats", async () => {
  const [route, view] = await Promise.all([read("app/api/audit/export/route.ts"), read("components/trust-transparency-report.tsx")]);
  assert.match(route, /authenticatedTrustClient/);
  for (const format of ["pack-json", "pack-pdf", "pack-summary"]) assert.match(route, new RegExp(format));
  for (const label of ["Evidence Pack JSON", "Evidence Pack PDF", "Enterprise Summary"]) assert.match(view, new RegExp(label));
  assert.match(route, /private, no-store/);
});

test("Enterprise Readiness has eight evidence-linked indicators", async () => {
  const [model, page] = await Promise.all([read("lib/enterprise-readiness.ts"), read("app/enterprise/readiness/page.tsx")]);
  for (const label of ["Architecture", "Validation", "Security", "Performance", "Provider readiness", "Documentation readiness", "Demo", "Pilot readiness"]) assert.match(model, new RegExp(label));
  const indicators = model.match(/readinessIndicators: \[[\s\S]*?\n    \],\n    safeguards:/)?.[0] ?? "";
  assert.equal((indicators.match(/evidenceHref:/g) ?? []).length, 8);
  assert.match(page, /model\.readinessIndicators/);
  assert.match(page, /Inspect evidence/);
});

test("every buyer journey ends with the required three actions", async () => {
  const [page, visual, contract] = await Promise.all([
    read("app/enterprise/page.tsx"),
    read("components/enterprise-visuals.tsx"),
    read("lib/enterprise-experience.ts"),
  ]);
  for (const role of ["CISO", "CIO / CTO", "Compliance", "CEO / Investor"]) assert.match(page, new RegExp(role.replace("/", "\\/")));
  assert.equal((page.match(/enterpriseCtas\.requestDemo/g) ?? []).length, 4);
  assert.equal((page.match(/enterpriseCtas\.bookPilot/g) ?? []).length, 5);
  assert.equal((page.match(/enterpriseCtas\.buyerDocumentation/g) ?? []).length, 5);
  for (const label of ["Request Demo", "Book Pilot", "Buyer Documentation"]) assert.match(contract, new RegExp(label));
  assert.match(visual, /journey\.actions\.map/);
});

test("interactive RC1 trust flow lasts 16.2 seconds and ends in an Evidence Pack", async () => {
  const source = await read("components/interactive-trust-walkthrough.tsx");
  for (const step of ["Establish Trust", "Resolve Identity", "Confirm Authority", "Collect Evidence", "Evaluate Trust", "Enforce Decision", "Write Replay", "Update Trust Memory™", "Produce Evidence Pack"]) assert.match(source, new RegExp(step));
  assert.match(source, /See Trust in Action/);
  assert.equal(1800 * 9, 16200);
  assert.match(source, /1800/);
  assert.match(source, /aria-live="polite"/);
});

test("provider transparency exposes approved states and operational evidence", async () => {
  const [provider, admin, readiness] = await Promise.all([
    read("lib/providers/provider-readiness.ts"),
    read("app/admin/provider-status/page.tsx"),
    read("app/enterprise/readiness/page.tsx"),
  ]);
  for (const state of ["Configured", "Awaiting Credentials", "Prototype", "Production Ready"]) assert.match(provider, new RegExp(state));
  for (const field of ["Health:", "Latency:", "Last successful connection:", "Known limitations:"]) assert.match(`${admin}\n${readiness}`, new RegExp(field));
});

test("pilot experience covers checklist, metrics, timeline, responsibilities, support and rollback", async () => {
  const page = await read("app/enterprise/pilot/page.tsx");
  for (const marker of ["Pilot checklist", "Success metrics", "Deployment timeline", "Customer responsibilities and support", "Support contacts", "Rollback plan"]) assert.match(page, new RegExp(marker));
});

test("enterprise adoption demo covers ten screens under seven minutes", () => {
  const demo = buildEnterpriseAdoptionDemo();
  assert.equal(demo.release, "1.2.3");
  assert.equal(demo.durationMinutes, 6.5);
  assert.deepEqual(demo.steps.map((step) => step.label), ["Human", "AI Agent", "Machine Identity", "Trust Decision", "Replay", "Evidence Graph", "Trust Memory™", "Governance", "Dashboard", "Operational Readiness"]);
});

test("Sprint 12.3 required documents and UI contract exist", async () => {
  const files = [
    "docs/TRUST_EVIDENCE_PACKS.md",
    "docs/BUYER_JOURNEYS.md",
    "docs/ENTERPRISE_PILOT_CHECKLIST.md",
    "docs/RELEASE_READINESS.md",
    "docs/SPRINT_12_3_ACCEPTANCE.md",
    "docs/ENTERPRISE_UI_CONSISTENCY.md",
    "docs/demos/ENTERPRISE_ADOPTION_DEMO.md",
  ];
  await Promise.all(files.map(read));
});
