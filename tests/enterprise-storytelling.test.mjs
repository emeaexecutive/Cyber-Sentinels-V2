import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage tells the release story through seven visual sections", async () => {
  const source = await read("app/page.tsx");
  assert.equal((source.match(/<section/g) ?? []).length, 7);
  for (const component of ["ComparisonCard", "LifecycleDiagram", "DecisionFlow", "ArchitectureBlock", "Timeline", "TrustFlow"]) {
    assert.match(source, new RegExp(`<${component}`));
  }
  for (const marker of ["Traditional Identity", "Enterprise Trust Fabric", "One Click Trust", "Operational Trust Graph", "Representative solutions"]) {
    assert.match(source, new RegExp(marker));
  }
});

test("visual storytelling primitives are reusable and SVG-free", async () => {
  const source = await read("components/enterprise-visuals.tsx");
  for (const component of ["LifecycleDiagram", "ComparisonCard", "Timeline", "TrustFlow", "DecisionFlow", "EvidenceCard", "ProviderCard", "ArchitectureBlock"]) {
    assert.match(source, new RegExp(`export function ${component}`));
  }
  assert.doesNotMatch(source, /<svg|<path|<circle/);
});

test("public pages preserve one purpose and one primary CTA", async () => {
  const pages = await Promise.all(["platform", "trust", "solutions", "enterprise"].map((page) => read(`app/${page}/page.tsx`)));
  for (const source of pages) {
    assert.equal((source.match(/primary=\{\{/g) ?? []).length, 1);
    assert.equal((source.match(/secondary=\{\{/g) ?? []).length, 0);
  }
  assert.doesNotMatch(pages[0], /Healthcare|Insurance|Hiring Security|Financial Services/);
  assert.doesNotMatch(pages[3], /Trust Memory|Decision Replay|Provider Transparency|Platform Architecture/);
});

test("Trust Center is the detailed home for proof and transparency", async () => {
  const source = await read("app/trust/page.tsx");
  for (const concept of ["Replay", "Trust Memory", "Evidence Graph", "Provider Transparency", "Validation", "AI & Data Sovereignty", "Operational Trust Graph"]) {
    assert.match(source, new RegExp(concept));
  }
  assert.match(source, /Calibration incomplete - insufficient reviewed ground truth\./);
});

test("Solutions contains the eight approved workflow outcomes", async () => {
  const source = await read("app/solutions/page.tsx");
  for (const workflow of ["AI Operations", "Financial Services", "Insurance", "Healthcare", "Critical Infrastructure", "Vendor Access", "Privileged Operations", "Hiring"]) {
    assert.match(source, new RegExp(workflow));
  }
  for (const removed of ["Machine Identity Trust", "Executive Protection", "Live Session Trust", "Identity and Onboarding"]) {
    assert.doesNotMatch(source, new RegExp(removed));
  }
  assert.match(source, /Hiring is one workflow\./);
});

test("Sprint 11.3 documentation and walkthrough are present", async () => {
  await Promise.all([
    "docs/VISUAL_LANGUAGE.md",
    "docs/PRODUCT_STORY.md",
    "docs/OPERATIONAL_TRUST_GRAPH.md",
    "docs/ENTERPRISE_BUYER_JOURNEY.md",
    "docs/SPRINT_11_3_ACCEPTANCE.md",
    "docs/demos/ENTERPRISE_STORYTELLING_WALKTHROUGH.md",
  ].map(read));
});
