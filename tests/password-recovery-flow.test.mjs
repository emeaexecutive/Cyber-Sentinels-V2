import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

const require = createRequire(import.meta.url);
const root = process.cwd();
const origin = "http://localhost:3000";

// Execute the actual routes, middleware and components; replace only framework
// request context and the external Auth/Turnstile service boundaries.
export function harness() {
  const jar = new Map();
  const calls = [];
  let revoked = false;
  let method = "recovery";
  let recoveryTime = Math.floor(Date.now() / 1000);
  const user = { id: "11111111-1111-4111-8111-111111111111", email: "fixture@example.test",
    aud: "authenticated", role: "authenticated", email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z" };
  const token = () => {
    const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id,
      aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600,
      session_id: "fixture-session", amr: [{ method, timestamp: recoveryTime }] })}.fixture`;
  };
  const payload = () => ({ access_token: token(), refresh_token: "fixture-refresh",
    expires_in: 3600, token_type: "bearer", user });
  const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path: url.pathname, query: url.search, method: init.method, body });
    if (url.pathname.endsWith("/recover")) return json({});
    if (url.pathname.endsWith("/logout")) { revoked = true; return json({}); }
    if (url.pathname.endsWith("/token")) {
      if (url.search.includes("password")) { revoked = false; method = "password"; }
      if (revoked) return json({ code: "refresh_token_not_found", msg: "Session revoked" }, 400);
      return json(payload());
    }
    if (url.pathname.endsWith("/user")) return json(user);
    throw new Error(`Unexpected fixture Auth path: ${url.pathname}`);
  };
  const cookieStore = {
    get: (name) => jar.has(name) ? { name, value: jar.get(name) } : undefined,
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name, value, options = {}) => {
      if (!value || options.maxAge === 0) jar.delete(name); else jar.set(name, value);
    },
  };
  const client = (headers) => createServerClient("https://fixture.supabase.co", "fixture-anon", {
    global: { fetch }, cookies: { getAll: cookieStore.getAll,
      setAll(items, values) {
        items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        Object.entries(values).forEach(([k, v]) => headers?.set(k, v));
      } },
  });
  const mocks = {
    "./globals.css": {},
    "@/components/global-navigation": { GlobalNavigation: ({ accessLevel }) => React.createElement("nav", { "data-access": accessLevel }) },
    "@/components/trust-os/enterprise-shell": { EnterpriseTrustOSShell: ({ children }) => React.createElement("section", { "data-enterprise-shell": true }, children) },
    "@/lib/admin-auth": { isAdminAllowlisted: () => true, hasAdminVerifiedCookie: async () => true },
    "@/lib/core/platform-health": { buildPlatformHealth: () => { throw new Error("Recovery must not read admin health"); } },
    "@/components/report-issue": { ReportIssue: () => null },
    "@/components/public-page-adoption-rail": { PublicPageAdoptionRail: () => null },
    "@/src/components/consent/ConsentManager": { ConsentManager: () => null },
    "@/src/components/consent/ConsentPreferencesLink": { ConsentPreferencesLink: () => null },
    "next/headers": { cookies: async () => cookieStore },
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/lib/supabase/server": { createClient: async (headers) => client(headers), createNavigationClient: async () => client(), isInvalidRefreshTokenError: () => false },
    "@/lib/operational-monitoring": { captureOperationalIssue() {} },
    "@/lib/bot-protection": { checkRequestRateLimit: () => false, getClientIp: () => "127.0.0.1",
      getExpectedTurnstileHostname: (v) => v, getTurnstileTokenFromJson: (v) => v.turnstileToken,
      verifyTurnstileToken: async (value) => ({ ok: value === "fixture-turnstile", reason: "invalid_token" }) },
    "@/lib/env": { hasPublicSupabaseEnv: () => true, getPublicSupabaseEnv: () => ({ supabaseUrl: "https://fixture.supabase.co", supabaseAnonKey: "fixture-anon" }), getAdminEmailsEnv: () => "" },
    "@supabase/ssr": { createServerClient: (url, key, options) => createServerClient(url, key, { ...options, global: { fetch } }) },
  };
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (!existsSync(filename)) filename += existsSync(`${filename}.ts`) ? ".ts" : ".tsx";
    if (cache.has(filename)) return cache.get(filename);
    const loaded = { exports: {} };
    cache.set(filename, loaded.exports);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => mocks[name] ?? (name.startsWith("@/") ? load(name.slice(2))
      : name.startsWith(".") ? load(path.resolve(path.dirname(filename), name)) : require(name));
    new Function("require", "module", "exports", output)(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  const apply = (response) => response.cookies.getAll().forEach(({ name, value, ...options }) => cookieStore.set(name, value, options));
  const request = (pathname, body) => new Request(origin + pathname, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const guard = (pathname, headers = {}, method = "GET") => load("middleware.ts").middleware(new NextRequest(origin + pathname, {
    method,
    headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...headers },
  }));
  return { jar, calls, client, load, apply, request, guard, token,
    expire: () => { recoveryTime -= 3600; },
    async begin() {
      const response = await load("app/api/auth/password-reset/request/route.ts").POST(request("/api/auth/password-reset/request", {
        email: user.email, turnstileToken: "fixture-turnstile",
      }));
      assert.equal(response.status, 200);
      const callback = await load("lib/auth/callback-handler.ts").handleAuthCallback(
        new Request(origin + "/auth/callback?code=fixture-code&next=/operational-entities"),
        { createClient: async (headers) => client(headers), captureOperationalIssue() {} },
      );
      apply(callback);
      assert.equal(new URL(callback.headers.get("location")).pathname, "/account/reset-password");
    },
  };
}

test("connected recovery: email → PKCE callback → visible form → quarantine → update → sign out → login → no replay", async () => {
  const h = harness();
  await h.begin();
  const email = h.calls.find((c) => c.path.endsWith("/recover"));
  assert.equal(new URLSearchParams(email.query).get("redirect_to"), origin + "/auth/callback");
  assert.equal(email.body.code_challenge_method, "s256");
  const page = h.load("app/account/reset-password/page.tsx").default;
  const html = renderToStaticMarkup(await page());
  for (const text of ["New password", "Confirm new password", "Update password"]) assert.ok(html.includes(text));
  const layout = await h.load("app/layout.tsx").default({ children: await page() });
  const layoutHtml = renderToStaticMarkup(layout);
  assert.match(layoutHtml, /data-access="public"/);
  assert.doesNotMatch(layoutHtml, /data-enterprise-shell/);
  for (const pathname of ["/operational-entities", "/dashboard", "/developers", "/enterprise/operations", "/admin/consent", "/admin/consensus"]) {
    assert.equal(new URL((await h.guard(pathname)).headers.get("location")).pathname, "/account/reset-password");
  }
  for (const pathname of ["/api/operational-entities", "/api/admin/consent/settings", "/api/providers"]) {
    assert.equal((await h.guard(pathname)).status, 403);
  }
  assert.equal((await h.guard("/login", { "next-action": "fixture-action" }, "POST")).status, 307);
  const marker = h.jar.get("cyber_password_recovery");
  h.jar.delete("cyber_password_recovery");
  assert.equal((await h.guard("/api/operational-entities")).status, 403, "removing the marker cannot bypass signed recovery claims");
  h.jar.set("cyber_password_recovery", marker);
  const saved = new Map(h.jar);
  h.jar.clear();
  assert.equal((await h.guard("/api/operational-entities", { authorization: `Bearer ${h.token()}` })).status, 403);
  saved.forEach((v, k) => h.jar.set(k, v));
  const complete = h.load("app/api/auth/password-reset/complete/route.ts").POST;
  const submit = (confirmPassword = "fixture-new-password") => complete(h.request("/api/auth/password-reset/complete", { password: "fixture-new-password", confirmPassword }));
  assert.equal((await submit("different-password")).status, 400);
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);
  const completed = await submit();
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).next, "/login?password_updated=1");
  assert.equal(h.calls.filter((c) => c.method === "PUT")[0].body.password, "fixture-new-password");
  assert.ok(h.calls.some((c) => c.path.endsWith("/logout") && c.query.includes("global")));
  h.apply(completed);
  assert.equal(h.jar.has("cyber_password_recovery"), false);
  assert.equal((await h.client().auth.getSession()).data.session, null);
  assert.equal((await submit()).status, 401);
  saved.forEach((v, k) => h.jar.set(k, v));
  assert.equal((await submit()).status, 401, "replaying saved cookies must fail after revocation");
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 1);
  h.jar.clear();
  const login = await h.client().auth.signInWithPassword({ email: "fixture@example.test", password: "fixture-new-password" });
  assert.equal(login.error, null);
  h.jar.set("cyber_password_recovery", "abandoned-recovery");
  assert.equal((await h.guard("/operational-entities")).status, 200);
});

test("normal session plus forged recovery marker and expired recovery fail before password update", async () => {
  for (const expired of [false, true]) {
    const h = harness();
    if (expired) { await h.begin(); h.expire(); await h.client().auth.refreshSession(); }
    else {
      await h.client().auth.signInWithPassword({ email: "fixture@example.test", password: "fixture-old-password" });
      h.jar.set("cyber_password_recovery", "forged-marker");
    }
    const response = await h.load("app/api/auth/password-reset/complete/route.ts").POST(h.request("/api/auth/password-reset/complete", {
      password: "fixture-new-password", confirmPassword: "fixture-new-password",
    }));
    assert.equal(response.status, 401);
    assert.equal(h.calls.some((c) => c.method === "PUT"), false);
    assert.match(renderToStaticMarkup(await h.load("app/account/reset-password/page.tsx").default()), /Reset link expired or invalid/);
  }
});

test("Turnstile rejection prevents recovery email dispatch", async () => {
  const h = harness();
  const response = await h.load("app/api/auth/password-reset/request/route.ts").POST(h.request("/api/auth/password-reset/request", {
    email: "fixture@example.test", turnstileToken: "invalid",
  }));
  assert.equal(response.status, 400);
  assert.equal(h.calls.length, 0);
});
