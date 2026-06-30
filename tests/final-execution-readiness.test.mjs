import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("public auth keeps every required account-access path visible", () => {
  const login = read("app/login/page.tsx");
  const verification = read("app/verify-email/page.tsx");
  const middleware = read("middleware.ts");

  for (const marker of [
    "signInWithPassword",
    "createAccountWithPassword",
    "Confirm Password",
    "Passwords do not match.",
    "Use magic link",
    "Forgot password?",
    "Check your email to verify your account before continuing.",
    "resendVerificationEmail",
  ]) {
    assert.equal(login.includes(marker), true, `Missing auth marker: ${marker}`);
  }
  assert.equal(verification.includes('type: "signup"'), true);
  assert.equal(existsSync("app/reset-password/page.tsx"), true);
  assert.equal(middleware.includes("email_confirmed_at"), true);
});

test("homepage copy is focused and primary CTA routes exist", () => {
  const homepage = read("app/page.tsx");
  assert.equal(homepage.includes("Operational trust for intelligent systems."), true);
  assert.equal(
    homepage.includes("Understand identity, authenticity and trust across every workflow."),
    true
  );
  assert.equal(homepage.includes("Private Beta"), false);
  assert.equal(homepage.includes("Enterprise Pilot Ready"), false);

  for (const route of [
    "app/demo/page.tsx",
    "app/enterprise-access/page.tsx",
    "app/enterprise/hiring-security/page.tsx",
    "app/pricing/page.tsx",
  ]) {
    assert.equal(existsSync(route), true, `Missing CTA route: ${route}`);
  }
});

test("dropdown behavior and discreet protected admin entry remain wired", () => {
  const navigation = read("components/global-navigation.tsx");
  const layout = read("app/layout.tsx");
  const adminAccess = read("app/admin/access/page.tsx");

  assert.equal(navigation.includes('aria-haspopup="menu"'), true);
  assert.equal(navigation.includes('aria-expanded={open}'), true);
  assert.equal(navigation.includes('event.key === "Escape"'), true);
  assert.equal(navigation.includes('document.addEventListener("pointerdown"'), true);
  assert.equal(layout.includes('["/admin/access", "Administrative access"]'), true);
  assert.equal(adminAccess.includes('redirect("/back-office")'), true);
});

test("literal navigation and footer routes resolve to application pages", () => {
  const source = `${read("components/global-navigation.tsx")}\n${read("app/layout.tsx")}`;
  const routes = [
    ...source.matchAll(/\["(\/[^"]+)",\s*"[^"]+"\]/g),
  ].map((match) => match[1].split("#")[0]);

  assert.ok(routes.length > 20, "Expected navigation route inventory");
  for (const route of new Set(routes)) {
    const page = route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
    assert.equal(existsSync(page), true, `Broken navigation route: ${route}`);
  }
});

test("operational trust and admin demo surfaces remain present and protected", () => {
  for (const route of [
    "app/trust-algorithm/page.tsx",
    "app/trust-replay/page.tsx",
    "app/dashboard/governance/page.tsx",
    "app/verification-receipts/page.tsx",
    "app/admin/test-lab/page.tsx",
    "app/admin/support/page.tsx",
    "app/admin/fake-actors/page.tsx",
    "app/admin/integrations/page.tsx",
  ]) {
    assert.equal(existsSync(route), true, `Missing operational surface: ${route}`);
  }

  const middleware = read("middleware.ts");
  assert.equal(middleware.includes('"/admin"'), true);
  assert.equal(middleware.includes('"/trust-replay"'), true);
});

test("provider response exposes status metadata without secret values", () => {
  const route = read("app/api/providers/route.ts");
  assert.equal(route.includes("runtimeState"), true);
  assert.equal(route.includes("credentialState"), true);
  assert.equal(route.includes("missingEnvironmentNames"), true);
  assert.equal(route.includes("process.env"), false);
  assert.equal(route.includes("CLIENT_SECRET"), false);
  assert.equal(route.includes("SECRET_KEY"), false);
});
