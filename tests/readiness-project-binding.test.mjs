import assert from "node:assert/strict";
import test from "node:test";
import { publicApiEnvironmentMetadata } from "../lib/public-api/v1/environment.ts";
import { configuredProjectBinding, verifyRuntimeProjectBinding } from "../lib/readiness/project-binding.ts";

const staging = "agpyhygpfmppjkxwcpac";
const production = "kecgtsfibkypjuaxqbjx";
const jwt = (ref, role) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ ref, role })).toString("base64url")}.not-a-real-signature`;
const env = {
  CYBER_SENTINELS_ENVIRONMENT: "staging", CYBER_SENTINELS_PUBLIC_ORIGIN: "https://staging.cybersentinels.com",
  NEXT_PUBLIC_SUPABASE_URL: `https://${staging}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(staging, "anon"), SUPABASE_SERVICE_ROLE_KEY: jwt(staging, "service_role"),
};

test("origins distinguish exact hosted environments from loopback development", () => {
  assert.equal(publicApiEnvironmentMetadata(env).valid, true);
  for (const origin of ["https://preview.vercel.app", "https://unknown.test", "https://www.cybersentinels.com", "https://cybersentinels.com", "http://localhost:3000", "https://staging.cybersentinels.com:444", "https://staging.cybersentinels.com.evil.test", "https://staging.cybersentinels.com/path", "https://user:secret@staging.cybersentinels.com"]) {
    assert.equal(publicApiEnvironmentMetadata({ ...env, CYBER_SENTINELS_PUBLIC_ORIGIN: origin }).valid, false, origin);
  }
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
    assert.equal(publicApiEnvironmentMetadata({ ...env, CYBER_SENTINELS_ENVIRONMENT: "local", CYBER_SENTINELS_PUBLIC_ORIGIN: origin }).valid, true);
    assert.equal(publicApiEnvironmentMetadata({ ...env, CYBER_SENTINELS_ENVIRONMENT: "production", CYBER_SENTINELS_PUBLIC_ORIGIN: origin }).valid, false);
  }
  assert.equal(publicApiEnvironmentMetadata({ ...env, CYBER_SENTINELS_ENVIRONMENT: "production", CYBER_SENTINELS_PUBLIC_ORIGIN: "https://www.cybersentinels.com" }).valid, true);
  assert.equal(publicApiEnvironmentMetadata({ ...env, CYBER_SENTINELS_ENVIRONMENT: "production" }).valid, false);
});

test("wrong project, alias, key roles and malformed URLs fail before any network call", async () => {
  for (const patch of [
    { CYBER_SENTINELS_ENVIRONMENT: "production" },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${production}.supabase.co` },
    { SUPABASE_URL: `https://${production}.supabase.co` },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${staging}.supabase.co.evil.test` },
    { NEXT_PUBLIC_SUPABASE_URL: `https://${staging}.supabase.co/path` },
    { SUPABASE_SERVICE_ROLE_KEY: jwt(production, "service_role") },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(staging, "service_role") },
    { SUPABASE_SERVICE_ROLE_KEY: jwt(staging, "anon") },
    { SUPABASE_SERVICE_ROLE_KEY: "" },
  ]) {
    let calls = 0;
    const result = await verifyRuntimeProjectBinding({ ...env, ...patch }, () => { calls++; throw new Error("must not send credentials"); });
    assert.equal(result.valid, false);
    assert.equal(calls, 0);
    assert.equal(result.productionProjectActive, "NOT_CHECKED");
  }
});

test("JWT claims alone never prove credential binding", async () => {
  assert.equal(configuredProjectBinding(env).valid, true);
  const result = await verifyRuntimeProjectBinding(env, async () => new Response(null, { status: 401 }));
  assert.equal(result.valid, false);
  assert.equal(result.projectIdentity, "INVALID");
});

test("runtime probes verify both public and privileged access to only the expected project", async () => {
  const calls = [];
  const result = await verifyRuntimeProjectBinding(env, async (url, init) => {
    calls.push(url);
    assert.equal(new URL(url).origin, `https://${staging}.supabase.co`);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal);
    return new Response(null, { status: 200 });
  });
  assert.equal(calls.length, 2);
  assert.equal(result.valid, true);
  assert.equal(result.productionProjectActive, "NOT_ACTIVE");
  assert.equal(result.projectIdentity, "VALID");
  assert.equal(JSON.stringify(result).includes(env.SUPABASE_SERVICE_ROLE_KEY), false);
});

test("either rejected credential or a network failure prevents readiness without exposing errors", async () => {
  for (const failBrowser of [true, false]) {
    const result = await verifyRuntimeProjectBinding(env, async url => new Response(null, { status: url.includes("settings") === failBrowser ? 403 : 200 }));
    assert.equal(result.valid, false);
  }
  const result = await verifyRuntimeProjectBinding(env, async () => { throw new Error(env.SUPABASE_SERVICE_ROLE_KEY); });
  assert.equal(result.valid, false);
  assert.equal(JSON.stringify(result).includes(env.SUPABASE_SERVICE_ROLE_KEY), false);
});

test("opaque credentials still require successful runtime acceptance", async () => {
  const opaque = { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_fixture", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture" };
  const result = await verifyRuntimeProjectBinding(opaque, async (_url, init) => {
    assert.equal(init.headers.authorization, undefined);
    return new Response(null, { status: 200 });
  });
  assert.equal(result.valid, true);
  assert.equal((await verifyRuntimeProjectBinding(opaque, async () => new Response(null, { status: 401 }))).valid, false);
});
