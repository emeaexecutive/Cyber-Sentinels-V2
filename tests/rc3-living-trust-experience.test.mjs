import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateAuthorityGraph } from "../lib/core/authority-graph.ts";
import { normalizeEntityIdentity } from "../lib/core/entity-identity.ts";
import { buildRc2LivingTrustDemo, deriveLivingTrustProfile } from "../lib/trust/living-trust-profile.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const demo = buildRc2LivingTrustDemo();

test("primary and mobile navigation expose the six release-candidate destinations", async () => {
  const source = await read("components/global-navigation.tsx");
  for (const label of ["Platform", "Solutions", "Trust", "Enterprise", "Pricing", "Sign In"]) assert.match(source, new RegExp(`label: "${label}"`));
  assert.doesNotMatch(source.match(/export const publicHeaderLinks = \[([\s\S]*?)\] as const;/)?.[0] ?? "", /Developers|Resources|About|Help/);
  assert.doesNotMatch(source, /DropdownLinks|aria-haspopup="menu"/);
  assert.match(source, /aria-controls="primary-navigation"/);
  assert.match(source, /sm:hidden/);
  assert.equal((source.match(/publicHeaderLinks\.map/g) ?? []).length, 1);
});

test("footer is the secondary discovery index and preserves company and support access", async () => {
  const source = await read("app/layout.tsx");
  for (const section of ["Platform", "Trust", "Solutions", "Enterprise", "Developers & Resources", "Company", "Legal & Support"]) assert.match(source, new RegExp(`title: "${section.replace("&", "&")}"`));
  for (const label of ["About", "Help", "Living Trust Profile", "Trust DNA™", "Trust Memory", "Evidence & Audit", "Pilot Programme", "API Documentation", "Accessibility", "Privacy", "Terms", "Cookies", "Security", "Status"]) assert.match(source, new RegExp(label));
  assert.match(source, /\/trust#living-trust-profile/);
  assert.match(source, /\/enterprise#support/);
});

test("homepage contains three blocks and exactly one canonical operational-trust graph", async () => {
  const source = await read("app/page.tsx");
  assert.ok((source.match(/<section/g) ?? []).length <= 7);
  assert.equal((source.match(/data-testid="primary-operational-trust-flow"/g) ?? []).length, 1);
  assert.equal((source.match(/<LifecycleDiagram/g) ?? []).length, 1);
  assert.doesNotMatch(source, /<InteractiveTrustWalkthrough|<DecisionFlow|<ArchitectureBlock/);
  for (const step of ["Identity", "Authority", "Context", "Evidence", "Trust Decision", "Enforcement", "Replay", "Trust Memory™", "Current Trust Posture"]) assert.match(source, new RegExp(step));
  assert.match(source, /One evidence chain connects identity, authority, policy, decision, enforced outcome, Replay and current posture\./);
  assert.equal((source.match(/<Link/g) ?? []).length, 1);
});

test("canonical public routes remain indexable while protected and archived routes remain isolated", async () => {
  const [visibility, robots, middleware, redirects] = await Promise.all([read("lib/navigation/route-visibility.ts"), read("app/robots.ts"), read("middleware.ts"), read("next.config.mjs")]);
  const publicBlock = visibility.match(/canonicalPublicRoutes = \[([\s\S]*?)\]/)?.[1] ?? "";
  for (const route of ["/", "/platform", "/trust", "/enterprise", "/developers", "/pricing"]) assert.match(publicBlock, new RegExp(`"${route.replaceAll("/", "\\/")}"`));
  for (const route of ["/trust-center", "/trust-timeline", "/trust-graph", "/trust-graph-engine", "/trust-graph-explorer", "/architecture"]) {
    assert.doesNotMatch(publicBlock, new RegExp(`"${route.replaceAll("/", "\\/")}"`));
    assert.match(`${visibility}\n${middleware}`, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(middleware, /X-Robots-Tag.*noindex, nofollow, noarchive/);
  assert.match(robots, /archivedRoutePrefixes/);
  for (const route of ["/about-us", "/reality-os", "/trust-os", "/trust-fabric"]) assert.match(redirects, new RegExp(route.replaceAll("/", "\\/")));
  assert.doesNotMatch(redirects, /source: "\/trust-center"|source: "\/trust-graph-engine"/);
});

test("CISO and CIO buyer journeys preserve canonical proof and readiness surfaces", async () => {
  const [home, demoPage, platform] = await Promise.all([read("app/page.tsx"), read("app/demo/trust-execution-flow/page.tsx"), read("app/platform/page.tsx")]);
  assert.match(home, /href="\/enterprise-access\?intent=demo"/);
  for (const href of ["/verification-replay", "/enterprise/readiness"]) assert.match(demoPage, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.equal((home.match(/<Link/g) ?? []).length, 1);
  assert.match(platform, /href="\/developers"/);
  assert.match(platform, /href="\/enterprise\/pilot"/);
});

test("Trust DNA public and authenticated surfaces preserve the exact context boundary", async () => {
  const [trust, component] = await Promise.all([read("app/trust/page.tsx"), read("components/living-trust-profile.tsx")]);
  for (const marker of ["id=\"living-trust-profile\"", "id=\"trust-dna\"", "Trust DNA™ shows how operational trust has evolved within a defined organization, workflow, purpose and assessment period.", "Valid for this organization, workflow, purpose and assessment time."]) assert.match(trust, new RegExp(marker));
  assert.match(component, /aria-describedby=\{summaryId\}/);
  assert.match(component, /className="sr-only"/);
  assert.match(component, /role="img"/);
  assert.match(component, /assurance dimensions have observed evidence/);
  assert.match(component, /Last updated:/);
  assert.match(component, /sm:grid-cols-2|md:grid-cols-2/);
  assert.doesNotMatch(component, /fraud label|global score/i);
});

test("Living Trust Profile remains workflow-specific and exposes continuous authority context", () => {
  const authority = demo.profile.activeAuthority;
  for (const field of ["state", "delegatorId", "delegateId", "resourceScope", "permittedActions", "prohibitedActions", "maximumDelegationDepth", "expiresAt", "policyVersion", "lastRuntimeReassessment"]) assert.ok(field in authority, field);
  assert.equal(authority.delegatorId, "human:finance-owner");
  assert.equal(authority.delegateId, "agent:treasury-review");
  assert.ok(authority.permittedActions.includes("approve_payment"));
  assert.ok(authority.prohibitedActions.includes("change_beneficiary"));

  const secondWorkflowAuthority = evaluateAuthorityGraph({ tenantId: demo.profile.tenantId, subjectId: demo.profile.entityId, workflowId: "workflow:unrelated", action: "approve_payment", purpose: demo.profile.purpose, grants: demo.grants, evaluatedAt: demo.profile.workflowContext.assessedAt });
  const second = deriveLivingTrustProfile({
    key: { ...demo.profile.profileKey, workflowId: "workflow:unrelated" },
    entity: normalizeEntityIdentity({ id: demo.profile.entityId, type: demo.profile.entityType, tenant_id: demo.profile.tenantId, verification_status: "verified", evidence_refs: ["evidence:agent-registry"] }),
    authority: secondWorkflowAuthority,
    minimumEvidence: 1,
  });
  assert.equal(second.currentPosture, "block");
  assert.notEqual(second.currentPosture, demo.profile.currentPosture);
});

test("Trust Memory transitions retain complete attribution without unexplained score movement", () => {
  assert.ok(demo.profile.recentTrustChanges.length > 0);
  for (const change of demo.profile.recentTrustChanges) {
    for (const field of ["previousPosture", "newPosture", "why", "evidenceChanged", "authorityChanged", "policyApplied", "actorOrReviewer", "replayReference", "changedAt"]) assert.ok(field in change, `${change.id}:${field}`);
    assert.ok(change.previousPosture && change.newPosture && change.why && change.actorOrReviewer && change.changedAt);
  }
  assert.equal("score" in demo.profile, false);
});

test("RC3 audit, UX, ownership, archive, demo, acceptance and release evidence exists", async () => {
  const files = [
    "docs/RC3_NAVIGATION_AND_CONTENT_AUDIT.md",
    "docs/RC3_HOMEPAGE_VISUAL_INVENTORY.md",
    "docs/RC3_CANONICAL_CONTENT_OWNERSHIP.md",
    "docs/LIVING_TRUST_PROFILE_UX.md",
    "docs/TRUST_DNA_VISUAL_SYSTEM.md",
    "docs/PUBLIC_ROUTE_ARCHIVE_REGISTER.md",
    "docs/demos/RC3_LIVING_TRUST_EXPERIENCE.md",
    "docs/SPRINT_13_3_ACCEPTANCE.md",
    "docs/releases/RELEASE_1_0_RC3.md",
  ];
  const contents = await Promise.all(files.map(read));
  assert.equal(contents.length, files.length);
  assert.match(contents[6], /five-minute|5-minute/i);
  assert.match(contents[7], /no new trust engine/i);
});
