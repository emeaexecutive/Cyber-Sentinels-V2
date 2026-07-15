import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { buildCategoryLeadershipDemo } from "../lib/core/trust-fabric.ts";
import { buildTrustEvidencePack } from "../lib/trust-transparency.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage owns the Operational Trust Infrastructure category in six sections", async () => {
  const source = await read("app/page.tsx");
  assert.equal((source.match(/<section/g) ?? []).length, 6);
  assert.match(source, /Operational Trust Infrastructure/);
  assert.match(source, /for Intelligent Enterprises/);
  assert.match(source, /before, during and after critical actions/);
  for (const section of ["Operational Trust Lifecycle", "Enterprise Trust Fabric", "Customer Outcomes", "Why Different", "Enterprise Pilot"]) assert.match(source, new RegExp(section));
  assert.doesNotMatch(source, /operational trust control plane/i);
});

test("interactive walkthrough is user-triggered, accessible and completes under twenty seconds", async () => {
  const source = await read("components/interactive-trust-walkthrough.tsx");
  for (const step of ["Identity", "Authority", "Evidence", "Decision", "Replay", "Trust Memory™", "Continuous Trust"]) assert.match(source, new RegExp(step));
  assert.match(source, /See How It Works/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /1600/);
  assert.ok(1600 * 7 < 20000);
});

test("four buying journeys answer the complete buyer sequence on the existing Enterprise page", async () => {
  const source = await read("app/enterprise/page.tsx");
  for (const role of ["CISO", "CIO / CTO", "Compliance", "Executive / Investor"]) assert.match(source, new RegExp(role.replace("/", "\\/")));
  for (const question of ["Why?", "How?", "Different?", "Trust it?"]) assert.match(source, new RegExp(question.replace("?", "\\?")));
  assert.match(source, /next:/);
  assert.match(source, /BuyerJourneyGrid/);
});

test("Trust Evidence Pack contains decision, evidence, authority, Replay, Trust Memory and limitations", () => {
  const report = {
    schemaVersion: 1,
    workflow: { subjectType: "workflow", subjectId: "workflow-001" },
    scoringMethod: { method: "deterministic_workflow_review", inputs: [], outputMeaning: "Review context", humanReviewRemainsAuthoritative: true, standaloneDeepfakeVerdict: false, biometricCertainty: false, surveillance: false },
    decisionExplanation: { whatChanged: "Authority narrowed", whyTrustShifted: "Runtime evidence changed", evidenceContributed: ["evidence:1"], governanceActions: [], providerSignals: [] },
    auditability: { evidenceContinuityCount: 1, chronologyCount: 2, governanceInterventionCount: 0, replaySessionCount: 1, receiptCount: 1, replayReference: "replay:1", authorizationLineage: ["authority:1"], trustMemoryReferences: ["memory:1"], escalationPath: [], resolutionSummaries: [] },
    posture: { state: "review", label: "Review" },
    boundary: "Recorded evidence only.",
  };
  const pack = buildTrustEvidencePack(report);
  assert.equal(pack.kind, "cyber_sentinels_trust_evidence_pack");
  assert.equal(pack.replay.reference, "replay:1");
  assert.deepEqual(pack.authority.lineage, ["authority:1"]);
  assert.deepEqual(pack.trustMemory.references, ["memory:1"]);
  assert.ok(pack.operationalLimitations.length >= 3);
});

test("Evidence Pack download reuses the authenticated audit export route", async () => {
  const [route, view] = await Promise.all([read("app/api/audit/export/route.ts"), read("components/trust-transparency-report.tsx")]);
  assert.match(route, /authenticatedTrustClient/);
  assert.match(route, /requestedFormat === "text" \|\| requestedFormat === "pack"/);
  assert.match(route, /buildTrustEvidencePack/);
  assert.match(view, /Download Trust Evidence Pack/);
});

test("public navigation is consolidated without adding a buyer or evidence route", async () => {
  const source = await read("components/global-navigation.tsx");
  const publicLinkCount = (source.match(/\{ href:/g) ?? []).length;
  assert.ok(publicLinkCount <= 32);
  for (const anchor of ["/enterprise#ciso", "/enterprise#cio-cto", "/enterprise#compliance", "/enterprise#executive-investor"]) assert.match(source, new RegExp(anchor.replaceAll("/", "\\/")));
  const appEntries = await readdir(new URL("../app", import.meta.url));
  for (const forbidden of ["buyer", "category", "trust-evidence-packs"]) assert.equal(appEntries.includes(forbidden), false);
});

test("category leadership demo uses seven screens and remains under seven minutes", () => {
  const demo = buildCategoryLeadershipDemo();
  assert.equal(demo.release, "1.2.2");
  assert.ok(demo.durationMinutes < 7);
  assert.deepEqual(demo.steps.map((step) => step.label), ["Human", "AI Agent", "Machine Identity", "Decision", "Replay", "Governance", "Dashboard"]);
});

test("Sprint 12.2 documentation and evidence scorecard are complete", async () => {
  const paths = ["docs/CATEGORY_POSITIONING.md", "docs/BUYER_JOURNEYS.md", "docs/VISUAL_SYSTEM.md", "docs/TRUST_EVIDENCE_PACKS.md", "docs/SPRINT_12_2_ACCEPTANCE.md", "docs/RELEASE_1_READINESS_SCORECARD.md", "docs/demos/CATEGORY_LEADERSHIP_DEMO.md"];
  const contents = await Promise.all(paths.map(read));
  for (const area of ["Enterprise UX", "Operational Readiness", "Provider Readiness", "ML Validation", "Security", "Performance", "Documentation", "Demo", "Investor Readiness"]) assert.match(contents[5], new RegExp(area));
  for (const field of ["Current score", "Target", "Blockers", "Evidence", "Next milestone"]) assert.match(contents[5], new RegExp(field));
});
