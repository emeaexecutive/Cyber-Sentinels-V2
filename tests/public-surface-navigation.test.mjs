import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function publicHeaderLinks(source) {
  const block = source.match(/public: \[([\s\S]*?)\n  \]/)?.[1] ?? "";
  return [...block.matchAll(/\{ href: "([^"]+)", label: "([^"]+)", access: "public" \}/g)].map((match) => ({ href: match[1], label: match[2] }));
}

function footerLinks(source) {
  const block = source.match(/const footerSections = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  return [...block.matchAll(/\["([^"]+)", "([^"]+)"\]/g)].map((match) => ({ href: match[1], label: match[2] }));
}

test("public header contains exactly six direct actions and no dropdown discovery", async () => {
  const source = await read("lib/navigation/canonical-navigation.ts");
  const component = await read("components/global-navigation.tsx");
  assert.deepEqual(publicHeaderLinks(source), [
    { href: "/platform", label: "Platform" },
    { href: "/solutions", label: "Solutions" },
    { href: "/trust", label: "Trust" },
    { href: "/enterprise", label: "Enterprise" },
    { href: "/pricing", label: "Pricing" },
    { href: "/login", label: "Sign In" },
  ]);
  assert.doesNotMatch(component, /DropdownLinks|aria-haspopup="menu"|role="menuitem"/);
  assert.doesNotMatch(source.match(/public: \[([\s\S]*?)\n  \]/)?.[0] ?? "", /Resources|Developers|About|Help/);
  assert.doesNotMatch(source, /Founder Control|QA Console|Benchmarking|Test Lab/);
});

test("footer owns detailed discovery without exact header duplication", async () => {
  const [navigation, layout] = await Promise.all([read("lib/navigation/canonical-navigation.ts"), read("app/layout.tsx")]);
  const header = publicHeaderLinks(navigation);
  const footer = footerLinks(layout);
  const headerKeys = new Set(header.map((item) => `${item.href}|${item.label}`));
  assert.deepEqual(footer.filter((item) => headerKeys.has(`${item.href}|${item.label}`)), []);
  for (const removed of ["Platform Overview", "Solutions Overview", "Trust Center", "Enterprise Overview", "Pricing", "Sign In"]) assert.equal(footer.some((item) => item.label === removed), false, removed);
  assert.equal(footer.filter((item) => item.label === "Security").length, 1);
  for (const concept of ["Living Trust Profile", "Trust DNA™", "Trust Memory™", "Replay", "Evidence & Audit", "Governance", "AI Sovereignty", "Validation Transparency"]) assert.equal(footer.some((item) => item.label === concept), true, concept);
});

test("authenticated and admin navigation branches remain canonical and role-gated", async () => {
  const [source,contract] = await Promise.all([read("components/global-navigation.tsx"),read("lib/navigation/canonical-navigation.ts")]);
  for (const marker of ["Enterprise Workspace", "Notifications", "Administration"]) assert.match(contract, new RegExp(marker));
  for (const marker of ["Verify Admin", "LogoutButton"]) assert.match(source, new RegExp(marker));
  assert.match(source, /accessLevel === "user" \|\| accessLevel === "admin-unverified"/);
  assert.match(source, /accessLevel === "admin"/);
  assert.match(source,/canonicalNavigation\.authenticated\.map/);
  assert.match(source,/canonicalNavigation\.admin\.map/);
  assert.doesNotMatch(contract.match(/public: \[([\s\S]*?)\n  \]/)?.[1] ?? "",/\/admin/);
});

test("mobile and desktop public navigation render the same shared link set", async () => {
  const source = await read("components/global-navigation.tsx");
  assert.equal((source.match(/publicHeaderLinks\.map/g) ?? []).length, 1);
  assert.match(source, /aria-controls="primary-navigation"/);
  assert.match(source, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(source, /sm:hidden/);
  assert.match(source, /sm:flex/);
});

test("footer exposes the final seven detailed discovery groups accessibly", async () => {
  const source = await read("app/layout.tsx");
  for (const title of ["Platform", "Trust", "Solutions", "Enterprise", "Developers & Resources", "Company", "Legal & Support"]) assert.match(source, new RegExp(`title: "${title.replace("&", "&")}"`));
  for (const label of [
    "Trust Orchestrator", "Runtime Trust", "Authorization & Enforcement", "Enterprise Trust Fabric™",
    "Living Trust Profile", "Trust DNA™", "Trust Memory", "Replay", "Evidence & Audit", "Governance", "AI Sovereignty", "Validation Transparency",
    "AI Agent Operations", "Machine Identity", "Regulated Workflows", "Financial Services", "Insurance", "Critical Infrastructure", "Hiring Security",
    "Security", "Compliance", "Deployment", "Architecture", "Pilot Programme", "Enterprise Support",
    "Developer Overview", "API Documentation", "Authentication", "Webhooks", "Integrations", "Methodology", "Journal", "Regulatory Material",
    "About", "Mission", "Our People", "Careers", "Contact", "Media Centre",
    "Help", "Accessibility", "Privacy", "Terms", "Cookies", "Legal", "Modern Slavery", "Status",
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /aria-label=\{`\$\{section\.title\} footer navigation`\}/);
  assert.equal((source.match(/<nav key=\{section\.title\}/g) ?? []).length, 1);
  assert.match(source, /sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7/);
});

test("homepage preserves the canonical release promise and section ceiling", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /Enterprise Trust Infrastructure/);
  assert.match(source, /continuously verifies that the identity, authority, environment, evidence and operational scope/);
  assert.equal((source.match(/<section/g) ?? []).length, 3);
  assert.match(source, /Request Enterprise Demo/);
  assert.equal((source.match(/<Link/g) ?? []).length, 2);
});

test("true duplicate routes redirect without touching protected Trust operations", async () => {
  const config = await read("next.config.mjs");
  for (const source of [
    "/about-us",
    "/design-partners",
    "/modern-slavery-statement",
    "/trust-posture",
    "/reality-os",
    "/trust-os",
    "/trust-fabric",
  ]) {
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
  for (const route of ["/", "/pricing", "/enterprise", "/enterprise/buyer-documentation", "/enterprise/pilot-checklist", "/developers", "/trust"]) {
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
    "docs/PRE_EPIC_15_NAVIGATION_DEDUPLICATION.md",
    "docs/RELEASE_CANDIDATE_AUDIT.md",
  ].map(read));
});
