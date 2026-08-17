import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("login presents a simple customer journey while retaining security controls", async () => {
  const [login, states, turnstile] = await Promise.all([
    read("app/login/page.tsx"),
    read("lib/auth/login-experience.ts"),
    read("components/turnstile-field.tsx"),
  ]);

  for (const copy of [
    "Access your Cyber Sentinels workspace.",
    "Remember me",
    "Forgot password?",
    "Use magic link",
    "Create your Cyber Sentinels account",
    "Check your email",
    "Resend email",
    "Continue to sign in",
  ]) assert.match(login, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const implementationDetail of [
    "Supabase session cookies",
    "Session continuity",
    "No active session found",
    "Protected operational area",
  ]) assert.doesNotMatch(login, new RegExp(implementationDetail));

  for (const state of [
    "SIGNED_OUT",
    "SIGNING_IN",
    "EMAIL_VERIFICATION_REQUIRED",
    "AUTHENTICATED",
    "AUTHENTICATION_FAILED",
    "SECURITY_VERIFICATION_FAILED",
    "RATE_LIMITED",
  ]) assert.match(states, new RegExp(state));

  assert.match(login, /resolveSafeInternalRedirect/);
  assert.match(login, /\/api\/auth\/turnstile/);
  assert.match(login, /supabase\.auth\.signInWithPassword/);
  assert.match(login, /supabase\.auth\.signUp/);
  assert.match(turnstile, /appearance: "interaction-only"/);
  assert.match(turnstile, /quiet/);
  assert.doesNotMatch(login, /result\.error \|\|/);
});

test("customer auth failures use stable safe messages", async () => {
  const states = await read("lib/auth/login-experience.ts");
  for (const message of [
    "Email or password is incorrect.",
    "Please verify your email to continue.",
    "Too many attempts. Please wait a moment and try again.",
  ]) assert.match(states, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
