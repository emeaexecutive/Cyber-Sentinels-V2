import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gamma = await readFile(new URL("../examples/agent-gamma/gamma.mjs", import.meta.url), "utf8");
const pkg = JSON.parse(await readFile(new URL("../examples/agent-gamma/package.json", import.meta.url), "utf8"));

test("Agent Gamma is a separate SDK-only process with its own Ed25519 private key", () => {
  assert.deepEqual(Object.keys(pkg.dependencies), ["@cyber-sentinels/sdk"]);
  assert.match(gamma, /subtle\.generateKey\(\{ name: "Ed25519"/);
  assert.match(gamma, /@cyber-sentinels\/sdk/);
  assert.doesNotMatch(gamma, /@\/|lib\/|src\/|supabase|service.role|postgres|database/i);
  assert.match(gamma, /private_key_stored/);
  assert.match(gamma, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(gamma, /x-vercel-protection-bypass/);
  assert.doesNotMatch(gamma, /VERCEL_PROTECTION_BYPASS/);
});

test("Gamma proves authority, REVIEW, ALLOW, DENY, revocation, Replay, and receipt lifecycles", () => {
  for (const marker of ["READY", "REGISTERED", "CREDENTIAL", "MANIFEST", "IDENTITY", "AUTHORITY", "ALLOW", "REVIEW", "POST_REVIEW_ALLOW", "DENY", "TRANSACTION", "REPLAY", "RECEIPT", "OUTCOME", "REVOCATION", "POST_REVOCATION_DENY", "GAMMA_RESULT"]) assert.match(gamma, new RegExp(`"${marker}"`));
  assert.match(gamma, /cs\.authority\.grant/);
  assert.match(gamma, /cs\.authority\.revoke/);
  assert.match(gamma, /cs\.reviews\.resolve/);
  assert.match(gamma, /original_decision !== "REVIEW"/);
  assert.match(gamma, /submitOutcome\(allowed\.transaction_id/);
  assert.match(gamma, /evidence_independence !== "AGENT_ASSERTED"/);
  assert.match(gamma, /challenge_replay: "REJECTED"/);
  assert.match(gamma, /wrong_private_key: "REJECTED"/);
  assert.match(gamma, /execution_authorization !== null/);
});

test("Gamma stops before mutation unless the isolated Staging identity and readiness gate pass", () => {
  assert.match(gamma, /CYBER_SENTINELS_STAGING_PROJECT_REF/);
  assert.match(gamma, /agpyhygpfmppjkxwcpac/);
  assert.match(gamma, /process\.env\.I_CONFIRM_STAGING/);
  assert.match(gamma, /I_CONFIRM_STAGING/);
  assert.match(gamma, /kecgtsfibkypjuaxqbjx/);
  assert.match(gamma, /\/api\/ready/);
  assert.match(gamma, /readiness\?\.status !== "READY"/);
  assert.doesNotMatch(gamma, /console\.(log|error).*apiKey/);
});
