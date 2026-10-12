import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { configuredProjectBinding, verifyRuntimeProjectBinding } from "../lib/readiness/project-binding.ts";
import { publicApiEnvironmentMetadata } from "../lib/public-api/v1/environment.ts";
import { apiKeyPepperConfigured } from "../lib/public-api/v1/api-key-crypto.ts";
const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync("app/api/ready/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const staging = "agpyhygpfmppjkxwcpac";
const key = role => `e30.${Buffer.from(JSON.stringify({ ref: staging, role })).toString("base64url")}.fixture`;

test("actual readiness route rejects a Production data plane before creating a database client", async () => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  let databaseClients = 0;
  Object.assign(process.env, {
    CYBER_SENTINELS_ENVIRONMENT: "staging", CYBER_SENTINELS_PUBLIC_ORIGIN: "https://staging.cybersentinels.com",
    NEXT_PUBLIC_SUPABASE_URL: "https://kecgtsfibkypjuaxqbjx.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key("anon"), SUPABASE_SERVICE_ROLE_KEY: key("service_role"),
    API_KEY_PEPPER: "fixture-stable-pepper-at-least-32-characters",
      ["API_KEY_ROTATION_SECRET"]: "synthetic-test-only-rotation-value-32",
  });
  delete process.env.SUPABASE_URL;
  globalThis.fetch = async () => { networkCalls++; return new Response(null, { status: 200 }); };
  const loadedModule = { exports: {} };
  const load = id => {
    if (id === "@/lib/env") return { getMissingEnv: names => names.filter(name => !process.env[name]?.trim()) };
    if (id === "@/lib/public-api/v1/environment") return { publicApiEnvironmentMetadata };
    if (id === "@/lib/public-api/v1/api-key-crypto") return { apiKeyPepperConfigured };
    if (id === "@/lib/readiness/project-binding") return { configuredProjectBinding, verifyRuntimeProjectBinding };
    if (id === "@/lib/supabase/service-role") return { createServiceRoleClient() { databaseClients++; throw new Error("must not connect"); } };
    if (id === "@/lib/readiness/enterprise-trust-registry") return {};
    return require(id);
  };
  try {
    new Function("require", "module", "exports", source)(load, loadedModule, loadedModule.exports);
    const response = await loadedModule.exports.GET();
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.reasonCode, "PROJECT_BINDING_INVALID");
    assert.equal(body.projectBinding.statuses.NEXT_PUBLIC_SUPABASE_URL, "WRONG ENVIRONMENT");
    assert.equal(networkCalls, 0);
    assert.equal(databaseClients, 0);
    assert.equal(JSON.stringify(body).includes(process.env.SUPABASE_SERVICE_ROLE_KEY), false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${staging}.supabase.co`;
    delete process.env.API_KEY_PEPPER;
    delete process.env.PUBLIC_API_KEY_PEPPER;
    const missingPepper = await loadedModule.exports.GET();
    assert.equal(missingPepper.status, 503);
    assert.equal((await missingPepper.json()).reasonCode, "CONFIGURATION_INVALID");
    assert.equal(databaseClients, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of Object.keys(process.env)) if (!(name in previous)) delete process.env[name];
    Object.assign(process.env, previous);
  }
});
