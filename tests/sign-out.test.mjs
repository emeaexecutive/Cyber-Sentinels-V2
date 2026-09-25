import assert from "node:assert/strict";
import test from "node:test";
import { harness } from "./fixtures/sign-out-session.mjs";
import { clearSignedOutSessionState, revalidateRestoredSession } from "../lib/auth/sign-out.ts";

test("actual logout route closes the current session, clears cookies and denies protected routes; login works again", async () => {
  const h = harness();
  const login = () => h.client().auth.signInWithPassword({ email: "fixture@example.test", password: "fixture-password" });
  assert.equal((await login()).error, null);
  assert.equal((await h.guard("/dashboard")).status, 200);
  h.jar.set("cyber_admin_verified", "fixture-admin");
  h.jar.set("remember_browser", "fixture-device");
  const response = await h.load("app/api/auth/logout/route.ts").POST(h.request("/api/auth/logout", {}));
  h.apply(response);
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get("location")).pathname, "/login");
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.ok(h.calls.some((call) => call.path.endsWith("/logout") && call.query === "?scope=local"));
  assert.equal((await h.client().auth.getSession()).data.session, null);
  assert.equal(h.jar.has("cyber_admin_verified"), false);
  assert.equal(h.jar.get("remember_browser"), "fixture-device");
  for (const route of ["/dashboard", "/workspace", "/replay", "/trust-centre"]) {
    assert.equal(new URL((await h.guard(route)).headers.get("location")).pathname, "/login");
  }
  assert.equal((await login()).error, null);
  assert.equal((await h.guard("/dashboard")).status, 200);
});

test("local session cleanup preserves device preferences; Back restore requires server revalidation", () => {
  const state = new Map([["cyber_sentinels_session_started_at", "123"], ["cyber_sentinels_remember_session", "true"]]);
  clearSignedOutSessionState({ removeItem: (key) => state.delete(key) });
  assert.equal(state.has("cyber_sentinels_session_started_at"), false);
  assert.equal(state.get("cyber_sentinels_remember_session"), "true");
  let reloads = 0;
  revalidateRestoredSession({ persisted: false }, () => reloads++);
  revalidateRestoredSession({ persisted: true }, () => reloads++);
  assert.equal(reloads, 1);
});
