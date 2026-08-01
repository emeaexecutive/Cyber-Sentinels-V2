import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const experimentalRoutes = [
  "/reality-os",
  "/reality-chain",
  "/trust-os",
  "/trust-fabric",
  "/trust-ledger",
  "/trust-feed",
  "/global-trust",
  "/origin-dna",
  "/synthetic-counterpart",
  "/human-presence-genome",
];

test("experimental routes remain implemented but are not promoted", () => {
  const promotedSurfaces = [
    read("components/global-navigation.tsx"),
    read("app/page.tsx"),
    read("lib/trust-engine/missionControl.ts"),
    read("lib/trust-engine/trustFabric.ts"),
    read("app/profile/[id]/page.tsx"),
  ].join("\n");

  for (const route of experimentalRoutes) {
    assert.equal(
      fs.existsSync(`app/${route.slice(1)}/page.tsx`),
      true,
      `${route} should remain implemented`
    );
    assert.doesNotMatch(promotedSurfaces, new RegExp(route.replace("/", "\\/")));
  }
});

test("primary navigation follows the canonical six-destination standard", () => {
  const navigation = read("lib/navigation/canonical-navigation.ts");
  const component = read("components/global-navigation.tsx");

  for (const label of [
    "Platform",
    "Solutions",
    "Trust",
    "Enterprise",
    "Pricing",
    "Sign In",
  ]) {
    assert.match(navigation, new RegExp(label));
  }
  assert.match(component, /canonicalNavigation\.authenticated/);
  assert.match(component, /canonicalNavigation\.admin/);
  assert.doesNotMatch(navigation, /Consortium Intelligence|Funding \/ Build Plan/);
});

test("homepage stays focused and uses the canonical Enterprise Trust vocabulary", () => {
  const homepage = read("app/page.tsx");

  assert.match(homepage, /Enterprise Trust Infrastructure/);
  assert.match(homepage, /continuously verifies that the identity, authority, environment, evidence and operational scope/);
  assert.doesNotMatch(homepage, /Private Beta|Enterprise Pilot Ready|trust universe/i);

  for (const label of [
    "Enterprise Trust Fabric",
    "Authority Lineage",
    "Environment Attestation",
    "Scope Continuity",
    "Evidence Graph",
    "Continuous Trust",
    "Replay",
    "Trust Memory",
  ]) {
    assert.match(homepage, new RegExp(label));
  }
});

test("auth affordances remain visible and administrative navigation is role-gated", () => {
  const login = read("app/login/page.tsx");
  const navigation = read("components/global-navigation.tsx");
  const contract = read("lib/navigation/canonical-navigation.ts");

  for (const label of [
    "Sign in",
    "Create account",
    "Confirm Password",
    "Use magic link",
    "Forgot password",
    "Check your email to verify your account before continuing",
  ]) {
    assert.match(login, new RegExp(label, "i"));
  }
  assert.match(contract, /href: "\/admin\/access"[^\n]+access: "admin"/);
  assert.match(navigation, /accessLevel === "admin"/);
  assert.doesNotMatch(contract.match(/public: \[([\s\S]*?)\n  \]/)?.[1] ?? "", /\/admin/);
});

test("production security baseline remains preserved", () => {
  assert.match(read("next.config.mjs"), /Strict-Transport-Security/);
  assert.match(read("app/login/page.tsx"), /\/api\/auth\/turnstile/);
  assert.equal(fs.existsSync("app/trust/page.tsx"), true);
  assert.equal(fs.existsSync("app/methodology/page.tsx"), true);
  assert.equal(
    fs.existsSync(
      "supabase/migrations/202607010001_production_owner_scoped_rls.sql"
    ),
    true
  );
});

test("staging references are absent from public-facing source", () => {
  const publicSource = [
    read("app/page.tsx"),
    read("components/global-navigation.tsx"),
    read("app/layout.tsx"),
    read(".env.example"),
  ].join("\n");

  assert.doesNotMatch(publicSource, /vercel\.app|cyber-sentinels-v2|http:\/\//i);
  assert.match(publicSource, /https:\/\/www\.cybersentinels\.com/);
});
