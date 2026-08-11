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

test("Gamma proves ALLOW, DENY, transaction, Replay, receipt and fail-closed attacks", () => {
  for (const marker of ["REGISTERED", "CREDENTIAL", "MANIFEST", "IDENTITY", "AUTHORITY", "ALLOW", "DENY", "TRANSACTION", "REPLAY", "RECEIPT", "OUTCOME", "GAMMA_RESULT"]) assert.match(gamma, new RegExp(`"${marker}"`));
  assert.match(gamma, /submitOutcome\(allowed\.transaction_id/);
  assert.match(gamma, /evidence_independence !== "AGENT_ASSERTED"/);
  assert.match(gamma, /challenge_replay: "REJECTED"/);
  assert.match(gamma, /wrong_private_key: "REJECTED"/);
  assert.match(gamma, /execution_authorization !== null/);
});
