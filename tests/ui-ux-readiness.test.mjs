import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public authentication surfaces use safe messages and accessible status updates", async () => {
  const [login, loginExperience, verifyEmail] = await Promise.all([
    read("app/login/page.tsx"),
    read("lib/auth/login-experience.ts"),
    read("app/verify-email/page.tsx"),
  ]);

  assert.match(login, /classifyAuthFailure/);
  assert.match(loginExperience, /Email or password is incorrect\./);
  assert.match(login, /role="status" aria-live="polite"/);
  assert.match(login, /Use magic link/);
  assert.doesNotMatch(login, /No active session found|Supabase session cookies|Session continuity/);
  assert.doesNotMatch(login, /setMessage\(error\.message/);
  assert.doesNotMatch(login, /Check Vercel Production environment variables/);

  assert.match(verifyEmail, /htmlFor="verification-email"/);
  assert.match(verifyEmail, /id="verification-email"/);
  assert.match(verifyEmail, /role="status" aria-live="polite"/);
  assert.doesNotMatch(verifyEmail, /setMessage\(error instanceof Error \? error\.message/);
});

test("footer cookie preferences remains a keyboard and touch-friendly dialog trigger", async () => {
  const [layout, trigger, tailwind] = await Promise.all([
    read("app/layout.tsx"),
    read("src/components/consent/ConsentPreferencesLink.tsx"),
    read("tailwind.config.ts"),
  ]);

  assert.match(layout, /<ConsentPreferencesLink \/>/);
  assert.match(trigger, /type="button"/);
  assert.match(trigger, /min-h-11/);
  assert.match(trigger, /cs:open-consent-preferences/);
  assert.match(tailwind, /\.\/src\/\*\*\/\*\.\{ts,tsx\}/);
});

test("authenticated navigation and Account consume the product shell theme contract", async () => {
  const [navigation, shell, account, styles] = await Promise.all([
    read("lib/navigation/canonical-navigation.ts"),
    read("components/trust-os/enterprise-shell.tsx"),
    read("app/account/page.tsx"),
    read("app/globals.css"),
  ]);

  for (const label of ["Overview", "Operational Entities", "Decisions", "Evidence", "Replay", "Developers", "Account"]) {
    assert.match(navigation, new RegExp(`label: "${label}"`));
  }
  assert.match(shell, /canonicalNavigation\.authenticated/);
  assert.doesNotMatch(shell, /const baseAreas = \[/);
  assert.match(account, /className="account-page/);
  assert.match(account, /className="account-card/);
  assert.doesNotMatch(account, /bg-white|text-slate-950/);
  assert.match(styles, /\.account-card[^{]*\{[^}]*background: var\(--brand-surface\)/s);
  assert.match(styles, /\.trust-os-content[^{]*\{[^}]*background: #f8fafc/s);
  assert.match(styles, /\.account-page[^{]*\{[^}]*background: var\(--brand-canvas\)/s);
  assert.match(styles, /\.account-link[^{]*\{[^}]*min-height: 2\.75rem/s);
});
