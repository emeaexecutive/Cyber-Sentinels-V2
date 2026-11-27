import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import test from "node:test";

const moduleUrl = new URL("../lib/public-api/v1/api-key-crypto.ts", import.meta.url).href;
function processCall(operation, env, input = {}) {
  const source = `import {createApiKeyMaterial,verifyApiKeyHash} from ${JSON.stringify(moduleUrl)};
    let text='';for await(const chunk of process.stdin)text+=chunk;
    const input=JSON.parse(text);
    try { const result=${operation === "create" ? "createApiKeyMaterial()" : "verifyApiKeyHash(input.rawKey,input.secretHash)"};
    process.stdout.write(JSON.stringify({result})); } catch(error) {process.stdout.write(JSON.stringify({error:error.message}));}`;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", source], {
    env: { ...process.env, API_KEY_PEPPER: "", PUBLIC_API_KEY_PEPPER: "", CYBER_SENTINELS_ENVIRONMENT: "staging", ...env },
    input: JSON.stringify(input), encoding: "utf8", windowsHide: true,
  });
  assert.equal(result.status, 0, "isolated verifier completed");
  return JSON.parse(result.stdout);
}

test("a persisted API key verifies across independent requests and fresh processes with stable configuration", () => {
  const pepper = randomBytes(32).toString("hex");
  const material = processCall("create", { API_KEY_PEPPER: pepper }).result;
  for (let request = 0; request < 3; request++) {
    assert.equal(processCall("verify", { API_KEY_PEPPER: pepper }, material).result, true);
  }
  assert.equal(processCall("verify", { PUBLIC_API_KEY_PEPPER: pepper }, material).result, true);
  assert.equal(processCall("verify", { API_KEY_PEPPER: pepper, PUBLIC_API_KEY_PEPPER: "unused-alias" }, material).result, true);
  assert.equal(processCall("verify", { API_KEY_PEPPER: randomBytes(32).toString("hex") }, material).result, false);
});

test("hosted key creation and verification fail closed when the stable pepper is missing or too short", () => {
  for (const env of [{}, { API_KEY_PEPPER: "short" }]) {
    assert.equal(processCall("create", env).error, "PUBLIC_API_KEY_PEPPER_REQUIRED");
    const material = processCall("create", { API_KEY_PEPPER: randomBytes(32).toString("hex") }).result;
    assert.equal(processCall("verify", env, material).error, "PUBLIC_API_KEY_PEPPER_REQUIRED");
  }
});
