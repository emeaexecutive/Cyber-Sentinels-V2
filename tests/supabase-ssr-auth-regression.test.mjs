import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function jwt(subject, expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    aud: "authenticated",
    exp: expiresAt,
    role: "authenticated",
    sub: subject,
  })}.test-signature`;
}

function authPayload(accessToken, refreshToken) {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "alpha@example.test",
    email_confirmed_at: "2026-08-09T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-08-09T00:00:00.000Z",
  };
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createAuthHarness() {
  const cookieJar = new Map();
  const cookieWrites = [];
  const responseHeaderWrites = [];
  const requests = [];
  let refreshCount = 0;

  const fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ method: init.method ?? "GET", url });

    if (url.includes("/token?grant_type=password")) {
      return json(
        authPayload(
          jwt("11111111-1111-4111-8111-111111111111"),
          "refresh-token-1",
        ),
      );
    }
    if (url.includes("/token?grant_type=refresh_token")) {
      refreshCount += 1;
      return json(
        authPayload(
          jwt("11111111-1111-4111-8111-111111111111"),
          `refresh-token-${refreshCount + 1}`,
        ),
      );
    }
    if (url.includes("/logout")) return json({});
    if (url.endsWith("/user")) {
      return json(authPayload(jwt("11111111-1111-4111-8111-111111111111"), "unused").user);
    }

    throw new Error(`Unexpected Supabase Auth request: ${init.method ?? "GET"} ${url}`);
  };

  const cookies = {
    getAll() {
      return [...cookieJar.entries()].map(([name, entry]) => ({
        name,
        value: entry.value,
      }));
    },
    setAll(items, headers) {
      cookieWrites.push(...items);
      responseHeaderWrites.push(headers);
      for (const item of items) {
        if (item.options.maxAge === 0 || item.value === "") cookieJar.delete(item.name);
        else cookieJar.set(item.name, item);
      }
    },
  };

  const client = () =>
    createServerClient("https://example.supabase.co", "test-anon-key", {
      cookies,
      global: { fetch },
    });

  return {
    client,
    cookieJar,
    cookieWrites,
    requests,
    responseHeaderWrites,
  };
}

test("the SSR and Supabase client graph is intentionally pinned and peer compatible", async () => {
  const manifest = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));

  assert.equal(manifest.dependencies["@supabase/ssr"], "0.12.4");
  assert.equal(manifest.dependencies["@supabase/supabase-js"], "2.112.2");
  assert.equal(lock.packages["node_modules/@supabase/ssr"].version, "0.12.4");
  assert.equal(lock.packages["node_modules/@supabase/supabase-js"].version, "2.112.2");
  assert.equal(lock.packages["node_modules/@supabase/auth-js"].version, "2.112.2");
  assert.equal(lock.packages["node_modules/cookie"].version, "1.1.1");
});

test("password login persists cookies, refresh rotates them, and logout deletes them", async () => {
  const harness = createAuthHarness();
  const firstClient = harness.client();
  const login = await firstClient.auth.signInWithPassword({
    email: "alpha@example.test",
    password: "not-a-real-secret",
  });

  assert.equal(login.error, null);
  assert.equal(login.data.user?.email, "alpha@example.test");
  assert.ok(harness.cookieJar.size > 0);
  assert.ok(
    harness.cookieWrites.some(
      ({ options }) =>
        options.path === "/" &&
        options.sameSite === "lax" &&
        options.httpOnly === false &&
        Number(options.maxAge) > 0,
    ),
  );
  assert.deepEqual(harness.responseHeaderWrites.at(-1), {
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  });

  const persistedClient = harness.client();
  const persisted = await persistedClient.auth.getSession();
  assert.equal(persisted.error, null);
  assert.equal(persisted.data.session?.refresh_token, "refresh-token-1");

  const refreshed = await persistedClient.auth.refreshSession();
  assert.equal(refreshed.error, null);
  assert.equal(refreshed.data.session?.refresh_token, "refresh-token-2");
  assert.ok(harness.requests.some(({ url }) => url.includes("grant_type=refresh_token")));

  const logout = await persistedClient.auth.signOut();
  assert.equal(logout.error, null);
  assert.equal(harness.cookieJar.size, 0);
  assert.ok(harness.cookieWrites.some(({ value, options }) => value === "" && options.maxAge === 0));
});

test("PKCE is the default server flow and persists a verifier cookie", async () => {
  const harness = createAuthHarness();
  const result = await harness.client().auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: "https://app.example.test/auth/callback" },
  });

  assert.equal(result.error, null);
  assert.match(result.data.url, /code_challenge=/);
  assert.match(result.data.url, /code_challenge_method=s256/i);
  assert.ok(
    harness.cookieWrites.some(({ name }) => name.includes("code-verifier")),
    "PKCE verifier was not persisted to a cookie",
  );
});

test("the application propagates auth-cookie cache headers across every server boundary", async () => {
  const [middleware, server, callback, callbackHandler, logout] = await Promise.all([
    read("middleware.ts"),
    read("lib/supabase/server.ts"),
    read("app/auth/callback/route.ts"),
    read("lib/auth/callback-handler.ts"),
    read("app/api/auth/logout/route.ts"),
  ]);

  assert.match(middleware, /setAll\(cookiesToSet: CookieToSet\[\], headers: Record<string, string>\)/);
  assert.match(middleware, /response\.headers\.set\(name, value\)/);
  assert.match(server, /createClient\(responseHeaders\?: Headers\)/);
  assert.match(server, /responseHeaders\?\.set\(name, value\)/);
  assert.match(callback, /handleAuthCallback\(req, \{ createClient, captureOperationalIssue \}\)/);
  assert.match(callbackHandler, /createClient\(authHeaders\)/);
  assert.match(callbackHandler, /private, no-cache, no-store, must-revalidate, max-age=0/);
  assert.match(logout, /createClient\(authHeaders\)/);
  assert.match(logout, /response\.cookies\.set\(cookie\.name, ""/);
  assert.match(logout, /adminVerifiedCookieName, ""/);
});

test("login, callback, protected-route, enterprise, and admin contracts remain wired", async () => {
  const [login, callback, callbackHandler, middleware, browserClient] = await Promise.all([
    read("app/login/page.tsx"),
    read("app/auth/callback/route.ts"),
    read("lib/auth/callback-handler.ts"),
    read("middleware.ts"),
    read("lib/supabase/client.ts"),
  ]);

  assert.match(login, /auth\.signInWithPassword/);
  assert.match(login, /router\.push\(nextPath\)/);
  assert.match(callback, /handleAuthCallback/);
  assert.match(callbackHandler, /auth\.exchangeCodeForSession\(code\)/);
  assert.match(browserClient, /auth\.getSession/);
  assert.match(browserClient, /auth\.refreshSession/);
  for (const route of [
    "/dashboard",
    "/workspace",
    "/enterprise/pilot-setup",
    "/enterprise/operations",
    "/admin",
    "/api/admin/",
  ]) {
    assert.ok(middleware.includes(`"${route}"`), `${route} is not protected`);
  }
});
