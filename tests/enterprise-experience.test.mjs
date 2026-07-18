import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

async function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = path.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? filesUnder(relative) : [relative];
  }));
  return files.flat();
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function hasNativeDestination(target) {
  const pathname = target.split(/[?#]/, 1)[0];
  const relative = pathname === "/" ? "" : pathname.slice(1);
  if (await exists(path.join("app", relative, "page.tsx"))) return true;
  if (await exists(path.join("app", relative, "route.ts"))) return true;
  if (pathname.startsWith("/docs/") && await exists(path.join("app", "docs", "[slug]", "route.ts"))) return true;
  return false;
}

test("buyer documentation and pilot checklist are native, accessible Enterprise routes", async () => {
  const [buyerPage, checklistPage, layout, navigation, breadcrumbs, ctaGroup, visuals] = await Promise.all([
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("app/enterprise/layout.tsx"),
    read("components/enterprise-navigation.tsx"),
    read("components/enterprise-breadcrumbs.tsx"),
    read("components/enterprise-cta-group.tsx"),
    read("components/enterprise-visuals.tsx"),
  ]);

  for (const marker of ["CISO", "CIO / CTO", "Compliance", "CEO / Investor", "Trust evidence", "Current evidence boundary", "BuyerJourneyGrid"]) {
    assert.match(buyerPage, new RegExp(marker.replace("/", "\\/")));
  }
  for (const marker of ["Before kickoff", "Success metrics", "Deployment timeline", "Responsibilities and support", "Rollback"]) {
    assert.match(checklistPage, new RegExp(marker));
  }
  assert.match(layout, /EnterpriseNavigation/);
  assert.match(navigation, /enterpriseNavigation\.map/);
  assert.match(navigation, /usePathname/);
  assert.match(navigation, /aria-current=\{active \? "page"/);
  assert.match(navigation, /min-h-11.*w-full.*sm:ml-auto.*sm:w-auto/);
  assert.match(buyerPage, /EnterpriseBreadcrumbs/);
  assert.match(checklistPage, /parent=\{enterpriseCtas\.buyerDocumentation\}/);
  assert.match(breadcrumbs, /aria-label="Breadcrumb"/);
  assert.match(breadcrumbs, /aria-current="page"/);
  assert.match(breadcrumbs, /parent\.href/);
  assert.match(ctaGroup, /<nav aria-label=\{label\}>/);
  assert.match(ctaGroup, /<ul/);
  assert.match(ctaGroup, /min-h-11.*w-full.*sm:w-auto/);
  assert.match(visuals, /<article id=\{journey\.id\}/);
  assert.match(visuals, /<h3/);
  for (const semantic of ["<dl", "<dt", "<dd"]) assert.match(visuals, new RegExp(semantic));
  assert.doesNotMatch(`${buyerPage}\n${checklistPage}\n${breadcrumbs}\n${ctaGroup}\n${navigation}`, /target="_blank"|window\.open|window\.location/);
});

test("Enterprise CTAs use one internal contract", async () => {
  const [contract, overview, pilot, buyerPage, checklistPage, ctaGroup] = await Promise.all([
    read("lib/enterprise-experience.ts"),
    read("app/enterprise/page.tsx"),
    read("app/enterprise/pilot/page.tsx"),
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("components/enterprise-cta-group.tsx"),
  ]);

  for (const action of ["requestDemo", "bookPilot", "contactEnterprise", "requestControlledPilot", "buyerDocumentation", "pilotChecklist"]) {
    assert.match(contract, new RegExp(`${action}:`));
  }
  for (const source of [overview, pilot, buyerPage, checklistPage]) assert.match(source, /enterpriseCtas\./);
  for (const action of ["requestDemo", "bookPilot", "contactEnterprise"]) assert.match(ctaGroup, new RegExp(`enterpriseCtas\\.${action}`));
  assert.match(buyerPage, /enterpriseCtas\.pilotChecklist/);
  assert.match(checklistPage, /enterpriseCtas\.buyerDocumentation/);
  assert.match(buyerPage, /EnterpriseCTAGroup/);
  assert.match(checklistPage, /EnterpriseCTAGroup/);
  assert.doesNotMatch(`${overview}\n${pilot}`, /\/docs\/(BUYER_JOURNEYS|ENTERPRISE_PILOT_CHECKLIST)\.md/);
});

test("Enterprise buyer routes publish canonical metadata and retire raw Markdown URLs", async () => {
  const [buyerPage, checklistPage, visibility, config, docsRoute] = await Promise.all([
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("lib/navigation/route-visibility.ts"),
    read("next.config.mjs"),
    read("app/docs/[slug]/route.ts"),
  ]);

  for (const [page, route] of [
    [buyerPage, "/enterprise/buyer-documentation"],
    [checklistPage, "/enterprise/pilot-checklist"],
  ]) {
    assert.match(page, /openGraph:/);
    assert.match(page, new RegExp(route.replaceAll("/", "\\/")));
    assert.match(visibility, new RegExp(`"${route.replaceAll("/", "\\/")}"`));
  }
  assert.match(config, /\/docs\/BUYER_JOURNEYS\.md/);
  assert.match(config, /\/docs\/ENTERPRISE_PILOT_CHECKLIST\.md/);
  assert.doesNotMatch(docsRoute, /BUYER_JOURNEYS|ENTERPRISE_PILOT_CHECKLIST/);
  assert.match(buyerPage, /See how Cyber Sentinels supports CISOs, CIOs, CTOs, compliance leaders, CEOs and investors through operational trust evidence and controlled deployment\./);
  assert.match(checklistPage, /Plan a controlled Cyber Sentinels enterprise pilot with clear ownership, success criteria, evidence requirements, rollback controls and production-readiness gates\./);
});

test("responsive and semantic contracts preserve readable mobile layouts", async () => {
  const [buyerPage, checklistPage, visuals, breadcrumbs, ctaGroup] = await Promise.all([
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("components/enterprise-visuals.tsx"),
    read("components/enterprise-breadcrumbs.tsx"),
    read("components/enterprise-cta-group.tsx"),
  ]);

  for (const page of [buyerPage, checklistPage]) assert.match(page, /px-4.*sm:px-6.*md:px-8/);
  assert.match(visuals, /grid gap-4 lg:grid-cols-2/);
  assert.match(visuals, /grid gap-2 sm:flex sm:flex-wrap/);
  assert.match(breadcrumbs, /flex flex-wrap/);
  assert.match(ctaGroup, /grid gap-3 sm:flex sm:flex-wrap/);
  assert.match(checklistPage, /<ol aria-label="Pilot deployment timeline"[^>]*md:grid-cols-4/);
  assert.match(checklistPage, /<ol className="mt-5 grid gap-3 text-sm leading-6 text-zinc-300">/);
  assert.doesNotMatch(checklistPage, /type="checkbox"|<input/);
});

test("public Enterprise resources expose no protected data or unsafe rendering path", async () => {
  const sources = await Promise.all([
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("components/enterprise-breadcrumbs.tsx"),
    read("components/enterprise-cta-group.tsx"),
    read("components/enterprise-navigation.tsx"),
    read("components/enterprise-visuals.tsx"),
  ]);
  const joined = sources.join("\n");

  assert.doesNotMatch(joined, /dangerouslySetInnerHTML|SUPABASE_|SERVICE_ROLE|AUTH_TOKEN|searchParams|process\.env/);
  assert.doesNotMatch(joined, /https?:\/\/|\.mdx?\b|\.pdf\b|href=["']#["']/);
  assert.doesNotMatch(joined, /customer[_ -]?name|personal[_ -]?email|pilot[_ -]?data/i);
});

test("purpose-built Enterprise routes avoid the hydration-shifting public adoption rail", async () => {
  const rail = await read("components/public-page-adoption-rail.tsx");
  assert.match(rail, /purposeBuiltAdoptionRoutes/);
  assert.match(rail, /"\/enterprise\/buyer-documentation"/);
  assert.match(rail, /"\/enterprise\/pilot-checklist"/);
  assert.match(rail, /purposeBuiltAdoptionRoutes\.has\(pathname\)/);
});

test("public navigation avoids protected Enterprise routes and footer discovery includes both resources", async () => {
  const [navigationContract, rootLayout] = await Promise.all([
    read("lib/enterprise-experience.ts"),
    read("app/layout.tsx"),
  ]);

  assert.doesNotMatch(navigationContract.match(/enterpriseNavigation = \[([\s\S]*?)\n\]/)?.[1] ?? "", /\/enterprise\/(auditability|compliance)/);
  assert.match(navigationContract, /\/enterprise#compliance/);
  assert.match(rootLayout, /\/enterprise\/buyer-documentation/);
  assert.match(rootLayout, /\/enterprise\/pilot-checklist/);
});

test("analytics remains dormant until an approved provider and consent controller exist", async () => {
  const [packageSource, cookiesPage, analyticsReview] = await Promise.all([
    read("package.json"),
    read("app/cookies/page.tsx"),
    read("docs/epic-16/SPRINT_16_1B_1_ANALYTICS.md"),
  ]);

  assert.doesNotMatch(packageSource, /@vercel\/analytics|posthog|plausible|segment|google-analytics/i);
  assert.match(cookiesPage, /Analytics Placeholder/);
  assert.match(cookiesPage, /not described as active/);
  assert.match(analyticsReview, /not emitted in this release/i);
  for (const prohibited of ["identity data", "email addresses", "authentication/session values", "sensitive evidence", "free text"]) {
    assert.match(analyticsReview, new RegExp(prohibited.replace("/", "\\/"), "i"));
  }
});

test("required Part 3 evidence documents are present", async () => {
  const documents = [
    "SPRINT_16_1B_1_UX_REVIEW.md",
    "SPRINT_16_1B_1_ANALYTICS.md",
    "SPRINT_16_1B_1_ACCESSIBILITY.md",
    "SPRINT_16_1B_1_RESPONSIVE_QA.md",
    "SPRINT_16_1B_1_LIGHTHOUSE.md",
    "SPRINT_16_1B_1_PRIVACY_REVIEW.md",
    "SPRINT_16_1B_1_SECURITY_REVIEW.md",
    "SPRINT_16_1B_1_TEST_RESULTS.md",
  ];

  await Promise.all(documents.map((document) => read(path.join("docs", "epic-16", document))));
});

test("all literal Enterprise links stay inside a native application route", async () => {
  const enterpriseFiles = (await filesUnder("app/enterprise")).filter((file) => file.endsWith(".tsx"));
  const sources = await Promise.all([
    ...enterpriseFiles.map(read),
    read("lib/enterprise-experience.ts"),
    read("lib/enterprise-readiness.ts"),
  ]);
  const targets = sources.flatMap((source) => [...source.matchAll(/(?:\bhref|evidenceHref)(?:=|:)\s*["']([^"']+)["']/g)].map((match) => match[1]));

  assert.ok(targets.length > 20, "expected the Enterprise audit to cover the current navigation surface");
  for (const target of new Set(targets)) {
    assert.match(target, /^\//, `Enterprise link must be application-relative: ${target}`);
    assert.equal(await hasNativeDestination(target), true, `Enterprise link has no native destination: ${target}`);
  }
});
