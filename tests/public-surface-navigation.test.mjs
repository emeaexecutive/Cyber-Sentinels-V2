import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("primary navigation contains only the approved public destinations", async () => {
  const source = await read("components/global-navigation.tsx");
  for (const label of ["Platform", "Solutions", "Trust", "Enterprise", "Developers", "Pricing", "Resources", "Login"]) {
    assert.match(source, new RegExp(`(?:label=|>|")${label}`));
  }
  assert.doesNotMatch(source, /label="About"/);
  assert.doesNotMatch(source, /label="Help"/);
  assert.doesNotMatch(source, /Founder Control|QA Console|Benchmarking|Test Lab/);
});

test("Trust concepts have one public navigation home", async () => {
  const source = await read("components/global-navigation.tsx");
  const platformBlock = source.match(/const platformDropdownLinks[\s\S]*?const solutionsDropdownLinks/)?.[0] ?? "";
  const trustBlock = source.match(/const trustDropdownLinks[\s\S]*?const enterpriseDropdownLinks/)?.[0] ?? "";
  for (const concept of ["Replay", "Evidence Graph", "Trust Memory", "Governance"]) {
    assert.doesNotMatch(platformBlock, new RegExp(concept));
    assert.match(trustBlock, new RegExp(concept));
  }
});

test("homepage preserves the release promise and section ceiling", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /The operational trust control plane for humans, AI agents, machine identities and regulated workflows\./);
  assert.match(source, /Continuously verify who or what acted, under whose authority, what changed, and why each action was allowed, reviewed or blocked\./);
  assert.equal((source.match(/<section/g) ?? []).length, 7);
  assert.match(source, /Request Demo/);
});

test("true duplicate routes redirect without touching protected Trust operations", async () => {
  const config = await read("next.config.mjs");
  for (const source of ["/about-us", "/design-partners", "/modern-slavery-statement", "/trust-posture"]) {
    assert.match(config, new RegExp(source.replace("/", "\\/")));
  }
  assert.doesNotMatch(config, /source: "\/trust-center"/);
  assert.doesNotMatch(config, /source: "\/trust-replay"/);
  assert.doesNotMatch(config, /source: "\/trust\/posture"/);
});

test("sitemap and robots share central route visibility", async () => {
  const [sitemap, robots, visibility] = await Promise.all([
    read("app/sitemap.ts"),
    read("app/robots.ts"),
    read("lib/navigation/route-visibility.ts"),
  ]);
  assert.match(sitemap, /canonicalPublicRoutes/);
  assert.match(robots, /archivedRoutePrefixes/);
  for (const route of ["/", "/pricing", "/enterprise", "/developers", "/trust"]) {
    assert.match(visibility, new RegExp(`"${route.replaceAll("/", "\\/")}"`));
  }
  assert.doesNotMatch(visibility.match(/canonicalPublicRoutes = \[([\s\S]*?)\]/)?.[1] ?? "", /\/admin|\/trust-center|\/trust-replay/);
});

test("required Sprint 9.4 documentation exists in the tracked source tree", async () => {
  await Promise.all([
    "docs/PUBLIC_SURFACE_ROUTE_INVENTORY.md",
    "docs/CANONICAL_CONTENT_OWNERSHIP.md",
    "docs/ARCHIVED_ROUTE_REGISTER.md",
    "docs/HOMEPAGE_CONTENT_MODEL.md",
    "docs/demos/PUBLIC_WEBSITE_WALKTHROUGH.md",
    "docs/SPRINT_9_4_ACCEPTANCE_CRITERIA.md",
    "docs/releases/RELEASE_0_9_4_FOCUSED_ENTERPRISE_EXPERIENCE.md",
  ].map(read));
});
