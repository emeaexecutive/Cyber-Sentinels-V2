import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getPublicSupabaseEnv } from "../lib/env.ts";
import { publicApiEnvironmentMetadata } from "../lib/public-api/v1/environment.ts";

test("browser configuration rejects modern and legacy privileged credentials without logging their values", () => {
  const original = { ...process.env };
  const errors = [], logs = [];
  const savedError = console.error;
  console.error = (...args) => logs.push(args);
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://agpyhygpfmppjkxwcpac.supabase.co";
    const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    for (const key of ["sb_secret_synthetic_boundary_canary", "  sb_secret_synthetic_boundary_canary  ", jwt("service_role")]) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
      assert.throws(() => getPublicSupabaseEnv("browser"), error => {
        errors.push(error.message);
        return error.message === "Privileged Supabase credential forbidden in browser configuration." && !error.message.includes(key);
      });
    }
    for (const key of ["sb_publishable_synthetic", jwt("anon")]) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
      assert.equal(getPublicSupabaseEnv("browser").supabaseAnonKey, key);
    }
    assert.deepEqual(logs, []);
    assert.equal(errors.length, 3);
  } finally {
    console.error = savedError;
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});

test("server credential accessor stays out of the shared public environment module", async () => {
  const shared = await readFile(new URL("../lib/env.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../lib/env.server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(shared, /export function getServiceRoleEnv|serviceRoleKey:\s*process\.env/);
  assert.match(server, /import "server-only"/);
  assert.doesNotMatch(server, /console\.|JSON\.stringify/);
  for (const path of ["lib/supabase/service-role.ts", "lib/supabase/admin.ts", "lib/supabase/protected-auth.ts", "lib/demo/demoWorkspace.ts", "app/api/demo/seed/route.ts"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /getServiceRoleEnv.*from "@\/lib\/env\.server"/);
  }
});

test("the proposed release branch cannot start automatic Git Preview and existing schedules stay explicit", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.git.deploymentEnabled["release/execution14-preview-safe"], false);
  assert.equal(config.git.deploymentEnabled.main, false);
  assert.equal(config.crons[0].path, "/api/trust/jobs/process");
});

test("acceptance API origin needs explicit qualification, exact project and Staging backend", () => {
  const env = { VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_nLXKcloPF9ZUBsiGAkyVWOJe1OOk", CYBER_SENTINELS_ENVIRONMENT: "staging", CONTROL_PLANE_STAGING_QUALIFICATION: "true", NEXT_PUBLIC_SUPABASE_URL: "https://agpyhygpfmppjkxwcpac.supabase.co", CYBER_SENTINELS_PUBLIC_ORIGIN: "https://cyber-sentinels-pr58-acceptance.vercel.app" };
  assert.equal(publicApiEnvironmentMetadata(env).qualificationOnly, true);
  for (const patch of [{ CONTROL_PLANE_STAGING_QUALIFICATION: "false" }, { VERCEL_PROJECT_ID: "other" }, { VERCEL_ENV: "production" }, { NEXT_PUBLIC_SUPABASE_URL: "https://kecgtsfibkypjuaxqbjx.supabase.co" }, { NEXT_PUBLIC_SUPABASE_URL: "https://pfjxykeemcyqgmrzbjmc.supabase.co" }, { CYBER_SENTINELS_PUBLIC_ORIGIN: "https://other.vercel.app" }]) {
    assert.equal(publicApiEnvironmentMetadata({ ...env, ...patch }).valid, false);
  }
  assert.equal(publicApiEnvironmentMetadata({ CYBER_SENTINELS_ENVIRONMENT: "production", CYBER_SENTINELS_PUBLIC_ORIGIN: "https://www.cybersentinels.com" }).valid, true);
});
