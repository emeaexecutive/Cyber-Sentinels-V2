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

test("primary navigation follows the six-destination standard", () => {
  const navigation = read("components/global-navigation.tsx");

  for (const label of [
    "Platform",
    "Hiring Security",
    "Trust Center",
    "Enterprise",
    "Pricing",
    "Access",
  ]) {
    assert.match(navigation, new RegExp(label));
  }
  assert.match(navigation, /onClick={onClose}/);
  assert.match(navigation, /onClick={onCloseDropdown}/);
  assert.doesNotMatch(navigation, /Consortium Intelligence|Funding \/ Build Plan/);
});

test("homepage stays focused and uses the operational vocabulary", () => {
  const homepage = read("app/page.tsx");

  assert.match(homepage, /Operational trust for intelligent systems\./);
  assert.match(homepage, /Understand identity, authenticity and trust across every workflow\./);
  assert.doesNotMatch(homepage, /Private Beta|Enterprise Pilot Ready|trust universe/i);

  for (const label of [
    "Trust Posture",
    "Replay Timeline",
    "Governance Review",
    "Evidence Chain",
    "Session Integrity",
    "Verification Receipt",
  ]) {
    assert.match(homepage, new RegExp(label));
  }
});

test("auth affordances and discreet administrative access remain visible", () => {
  const login = read("app/login/page.tsx");
  const layout = read("app/layout.tsx");

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
  assert.match(layout, /Administrative access/);
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
