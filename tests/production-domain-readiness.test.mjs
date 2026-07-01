import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("canonical production origin and auth callback are explicit", () => {
  const env = read(".env.example");
  const layout = read("app/layout.tsx");
  const docs = read("docs/ENVIRONMENT_SETUP.md");
  const sourceText = ["app", "lib"]
    .flatMap((root) =>
      fs
        .readdirSync(root, { recursive: true })
        .map((entry) => `${root}/${entry}`)
        .filter((path) => fs.statSync(path).isFile())
    )
    .map(read)
    .join("\n");

  assert.match(env, /NEXT_PUBLIC_SITE_URL=https:\/\/www\.cybersentinels\.com/);
  assert.match(env, /NEXT_PUBLIC_APP_URL=https:\/\/www\.cybersentinels\.com/);
  assert.match(layout, /metadataBase: new URL\("https:\/\/www\.cybersentinels\.com"\)/);
  assert.match(docs, /https:\/\/www\.cybersentinels\.com\/auth\/callback/);
  assert.equal(
    sourceText.includes("vercel.app"),
    false
  );
});

test("security headers cover the application and Cloudflare Turnstile", () => {
  const config = read("next.config.mjs");

  for (const header of [
    "Content-Security-Policy",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.match(config, new RegExp(header));
  }
  assert.match(config, /script-src[^"]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(config, /frame-src[^"]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(config, /connect-src[^"]*https:\/\/challenges\.cloudflare\.com/);
});

test("auth actions verify Turnstile server-side when configured", () => {
  const login = read("app/login/page.tsx");
  const route = read("app/api/auth/turnstile/route.ts");

  assert.match(login, /fetch\("\/api\/auth\/turnstile"/);
  assert.equal(
    (login.match(/await verifyTurnstileForAuth\(\)/g) ?? []).length,
    5
  );
  assert.match(route, /verifyTurnstileToken/);
  assert.match(route, /checkRequestRateLimit/);
  assert.match(route, /token\.length > 2048/);
  assert.doesNotMatch(route, /TURNSTILE_SECRET_KEY/);
});

test("core trust records receive owner-scoped RLS", () => {
  const migration = read(
    "supabase/migrations/202607010001_production_owner_scoped_rls.sql"
  );

  for (const table of [
    "passports",
    "trust_reports",
    "verification_cases",
    "audit_logs",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`)
    );
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from anon, authenticated`)
    );
  }
  assert.match(migration, /auth\.jwt\(\) ->> 'email'/);
  assert.doesNotMatch(migration, /auth\.jwt\(\) -> 'user_metadata'/);
  assert.doesNotMatch(migration, /using \(true\)|with check \(true\)/);
});

test("security, trust, methodology, status and security.txt routes exist", () => {
  for (const path of [
    "app/security/page.tsx",
    "app/trust/page.tsx",
    "app/methodology/page.tsx",
    "app/status/page.tsx",
    "public/.well-known/security.txt",
  ]) {
    assert.equal(fs.existsSync(path), true, `${path} should exist`);
  }
  assert.match(
    read("public/.well-known/security.txt"),
    /Canonical: https:\/\/www\.cybersentinels\.com\/\.well-known\/security\.txt/
  );
  assert.match(
    read("middleware.ts"),
    /if \(pathname === "\/trust"\)\s*{\s*return false/
  );
});

test("admin and sensitive governance operations retain server protection", () => {
  const middleware = read("middleware.ts");
  const admin = read("lib/auth/isAdmin.ts");
  const governanceApi = read("app/api/governance/routing/route.ts");
  const governancePage = read("app/governance/page.tsx");

  assert.match(middleware, /"\/admin"/);
  assert.match(middleware, /"\/back-office"/);
  assert.match(admin, /getAdminAccessFailureReason/);
  assert.match(admin, /hasAdminVerifiedCookie/);
  assert.match(governanceApi, /requireAdminApiAccess/);
  assert.match(governancePage, /Public overview, protected operations/);
});

test("service-role secrets remain server-only", () => {
  const clientFiles = [
    "app/login/page.tsx",
    "components/global-navigation.tsx",
    "components/waitlist-form.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(clientFiles, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(read("lib/supabase/service-role.ts"), /import "server-only"/);
});
