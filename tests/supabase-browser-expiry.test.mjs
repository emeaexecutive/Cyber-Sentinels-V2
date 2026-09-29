import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the entire application module. Only the external Supabase client,
// environment lookup and browser/timer boundaries are replaced with fixtures.
const executable = ts.transpileModule(
  readFileSync(new URL("../lib/supabase/client.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function harness(pathname = "/dashboard") {
  const cookieJar = new Map([
    ["cyber_admin_verified", "fixture-admin"],
    ["sb-fixture-auth-token.0", "fixture-chunk-0"],
    ["sb-fixture-auth-token.1", "fixture-chunk-1"],
    ["cyber_password_recovery", "fixture-recovery"],
    ["cs_consent", "fixture-preference"],
  ]);
  const storage = new Map([
    ["cyber_sentinels_session_started_at", "fixture-start"],
    ["remembered_device_preference", "fixture-preference"],
  ]);
  const calls = [];
  const navigations = [];
  const cookieWrites = [];
  const storageRemovals = [];
  const timerStarts = [];
  const timerClears = [];
  const errors = [];
  const factoryCalls = [];
  let behavior = async () => ({ data: { user: { id: "fixture-user" } }, error: null });
  const auth = Object.fromEntries(["getUser", "getSession", "refreshSession"].map((method) => [
    method,
    async function (...args) {
      assert.equal(this, auth, "the underlying auth method must retain its receiver");
      calls.push({ method, args });
      return behavior(method, args);
    },
  ]));
  const client = { auth };
  const document = {
    get cookie() {
      return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(value) {
      cookieWrites.push(value);
      const [pair, ...attributes] = value.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (attributes.some((attribute) => attribute.trim().toLowerCase() === "max-age=0")) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, pair.slice(separator + 1));
      }
    },
  };
  const window = {
    localStorage: {
      removeItem(name) {
        storageRemovals.push(name);
        storage.delete(name);
      },
    },
    location: {
      pathname,
      // Keep pathname unchanged so a second accidental navigation is observable.
      replace(destination) { navigations.push(destination); },
    },
  };
  const modules = {
    "@supabase/ssr": {
      createBrowserClient(...args) { factoryCalls.push(args); return client; },
    },
    "@/lib/env": {
      getPublicSupabaseEnv: () => ({ supabaseUrl: "https://fixture.supabase.co", supabaseAnonKey: "fixture-public-key" }),
    },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "window", "document", "console", "setTimeout", "clearTimeout", executable)(
    (name) => {
      assert.ok(Object.hasOwn(modules, name), `unexpected module import: ${name}`);
      return modules[name];
    },
    loaded,
    loaded.exports,
    window,
    document,
    { error: (...args) => errors.push(args) },
    (callback, delay) => { timerStarts.push({ callback, delay }); return timerStarts.length; },
    (timer) => timerClears.push(timer),
  );
  return {
    ...loaded.exports,
    client, calls, navigations, cookieJar, cookieWrites, storage, storageRemovals,
    timerStarts, timerClears, errors, factoryCalls,
    setBehavior(next) { behavior = next; },
  };
}

function assertExpiredCleanup(h) {
  assert.deepEqual(h.storageRemovals, ["cyber_sentinels_session_started_at"]);
  assert.equal(h.storage.has("cyber_sentinels_session_started_at"), false);
  assert.equal(h.storage.get("remembered_device_preference"), "fixture-preference");
  assert.deepEqual([...h.cookieJar], [
    ["cyber_password_recovery", "fixture-recovery"],
    ["cs_consent", "fixture-preference"],
  ]);
  assert.equal(h.cookieWrites.length, 3, "each visible auth cookie is cleared once");
  assert.equal(h.errors.length, 1, "one failed auth call is handled once");
  assert.deepEqual(h.timerClears, [1]);
}

test("repeated createClient calls keep one wrapper per singleton auth method", async () => {
  const h = harness();
  const first = h.createClient();
  const methods = { ...first.auth };
  for (let index = 0; index < 5; index += 1) {
    assert.equal(h.createClient(), first);
    for (const method of Object.keys(methods)) assert.equal(first.auth[method], methods[method]);
  }
  const response = { data: { session: { user: { id: "fixture-user" } } }, error: null };
  h.setBehavior(async () => response);
  for (const method of Object.keys(methods)) {
    const argument = { fixture: method };
    assert.equal(await first.auth[method](argument), response);
    assert.deepEqual(h.calls.at(-1), { method, args: [argument] });
  }
  assert.equal(h.factoryCalls.length, 6);
  assert.equal(h.calls.length, 3);
  assert.equal(h.timerStarts.length, 3, "nested wrappers must not create extra timers");
  assert.deepEqual(h.timerClears, [1, 2, 3]);
  assert.deepEqual(h.navigations, []);
  assert.deepEqual(h.cookieWrites, []);
});

for (const method of ["getUser", "getSession", "refreshSession"]) {
  for (const delivery of ["returned", "thrown"]) {
    test(`${method}: ${delivery} invalid refresh expires a protected session once`, async () => {
      const h = harness("/dashboard/replay");
      const error = { name: "AuthApiError", code: "refresh_token_not_found", message: "Fixture session expired" };
      h.setBehavior(async () => {
        if (delivery === "thrown") throw error;
        return { data: null, error };
      });
      h.createClient();
      h.createClient();
      await assert.rejects(h.createClient().auth[method](), (actual) => actual === error);
      assert.equal(h.calls.length, 1);
      assert.equal(h.timerStarts.length, 1);
      assert.deepEqual(h.navigations, ["/login?expired=1"]);
      assertExpiredCleanup(h);
    });
  }
}

for (const pathname of ["/login", "/account/reset-password", "/auth/callback"]) {
  test(`${pathname}: invalid refresh preserves the auth screen while clearing stale session state`, async () => {
    const h = harness(pathname);
    const error = { message: "Invalid refresh token: fixture" };
    h.setBehavior(async () => ({ data: null, error }));
    await assert.rejects(h.createClient().auth.getUser(), (actual) => actual === error);
    assert.deepEqual(h.navigations, []);
    assertExpiredCleanup(h);
  });
}

test("ordinary auth errors do not erase a valid session or cause expiry navigation", async () => {
  const h = harness();
  const response = { data: null, error: { code: "invalid_credentials", message: "Fixture rejection" } };
  h.setBehavior(async () => response);
  assert.equal(await h.createClient().auth.getUser(), response);
  const failure = new Error("Fixture service unavailable");
  h.setBehavior(async () => { throw failure; });
  await assert.rejects(h.createClient().auth.refreshSession(), (actual) => actual === failure);
  assert.deepEqual(h.navigations, []);
  assert.deepEqual(h.storageRemovals, []);
  assert.deepEqual(h.cookieWrites, []);
  assert.deepEqual(h.timerClears, [1, 2]);
});
