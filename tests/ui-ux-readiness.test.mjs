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
