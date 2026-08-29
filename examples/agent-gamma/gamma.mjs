import { createHash, webcrypto } from "node:crypto";
import {
  ConflictError,
  CyberSentinels,
  signChallenge,
  signManifest,
} from "@cyber-sentinels/sdk";

const apiKey = process.env.CYBER_SENTINELS_API_KEY;
const baseUrl = process.env.CYBER_SENTINELS_BASE_URL;
const stagingProjectRef = process.env.CYBER_SENTINELS_STAGING_PROJECT_REF;
const stagingConfirmation = process.env.CYBER_SENTINELS_CONFIRM_STAGING;
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (!apiKey || !baseUrl || !stagingProjectRef || !stagingConfirmation) {
  throw new Error("Base URL, API key, staging project reference, and explicit staging confirmation are required.");
}
if (!/^cs_test_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/.test(apiKey)) throw new Error("Only a structurally valid test API key is accepted; the key was not logged.");
if (stagingProjectRef !== "agpyhygpfmppjkxwcpac" || stagingConfirmation !== "I_CONFIRM_STAGING") throw new Error("The explicit Staging identity confirmation is invalid.");
const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.protocol !== "https:" || parsedBaseUrl.username || parsedBaseUrl.password || parsedBaseUrl.pathname !== "/" || parsedBaseUrl.search || parsedBaseUrl.hash) throw new Error("The base URL must be a credential-free HTTPS origin.");
if (/cybersentinels\.com$/i.test(parsedBaseUrl.hostname) || parsedBaseUrl.hostname.includes("kecgtsfibkypjuaxqbjx")) throw new Error("Production targets are refused.");
const normalizedBaseUrl = parsedBaseUrl.origin;

const qualificationFetch = vercelAutomationBypassSecret
  ? (input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("x-vercel-protection-bypass", vercelAutomationBypassSecret);
      return fetch(input, { ...init, headers });
    }
  : fetch;
const readyResponse = await qualificationFetch(`${normalizedBaseUrl}/api/ready`, { headers: { accept: "application/json" }, redirect: "manual" });
let readiness = null;
try { readiness = await readyResponse.json(); } catch { /* fail below without printing an untrusted body */ }
if (!readyResponse.ok || readiness?.status !== "READY") throw new Error("/api/ready is not READY; no mutating staging request was sent.");

const cs = new CyberSentinels({ apiKey, baseUrl: normalizedBaseUrl, timeoutMs: 60_000, fetch: qualificationFetch });
const mark = (label, value) => process.stdout.write(`${label}: ${JSON.stringify(value)}\n`);
mark("READY", { status: readiness.status, project_ref: stagingProjectRef, api_key: "[REDACTED]" });
const timings = [];
const timed = async (stage, operation) => {
  const startedAt = performance.now();
  const result = await operation();
  timings.push({ stage, latency_ms: Math.round((performance.now() - startedAt) * 10) / 10 });
  return result;
};
const expectDecision = (result, expected) => {
  if (result.decision !== expected) {
    throw new Error(`Expected ${expected}, received ${JSON.stringify({ decision: result.decision, reason_codes: result.reason_codes, blocking_reason_codes: result.blocking_reason_codes })}.`);
  }
};

// The Ed25519 private key is created and retained only inside this customer
// process. Cyber Sentinels receives the exported public JWK and signatures.
const keyPair = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const publicJwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
const kid = `gamma-${webcrypto.randomUUID()}`;
publicJwk.kid = kid;
publicJwk.alg = "EdDSA";
publicJwk.use = "sig";
publicJwk.key_ops = ["verify"];

const agent = await timed("registration", () => cs.agents.register({
  display_name: "Agent Gamma",
  entity_type: "AI_AGENT",
  owner_reference: "owner:gamma-customer",
  runtime: { environment: "staging", framework: "custom" },
  model: { provider: "declared-provider", identifier: "declared-model" },
}));
mark("REGISTERED", { agent_id: agent.agent_id, status: agent.status });

const credential = await cs.agents.registerCredential(agent.agent_id, {
  public_jwk: publicJwk,
  kid,
  algorithm: "Ed25519",
  expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
});
mark("CREDENTIAL", { credential_id: credential.credential_id, fingerprint: credential.fingerprint, private_key_stored: credential.private_key_stored });

const buildDigest = createHash("sha256").update("agent-gamma-v0.1.0").digest("hex");
const manifestClaims = {
  manifest_version: "1.0",
  operational_entity_id: agent.operational_entity_id,
  entity_type: "AI_AGENT",
  owner_reference: agent.manifest_context.accountable_owner_id,
  model: { provider: "declared-provider", identifier: "declared-model", version: "gamma-0.1.0" },
  runtime: {
    framework: "custom",
    runtime_type: "node",
    region: "external",
    version: process.version,
    workload_identifier: "agent-gamma-process",
    deployment_identifier: "gamma-live-proof",
    build_digest: buildDigest,
  },
  environment: "staging",
  declared_capabilities: ["read_repository"],
  credential_id: credential.credential_id,
  issued_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  nonce: Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("base64url"),
};
const signedManifest = await signManifest(manifestClaims, keyPair.privateKey);
const manifest = await cs.agents.registerManifest(agent.agent_id, signedManifest);
mark("MANIFEST", { manifest_id: manifest.manifest_id, manifest_digest: manifest.manifest_digest });

const challenge = await timed("challenge", () => cs.agents.issueChallenge(agent.agent_id));
const proof = await signChallenge(challenge, agent.manifest_context.enterprise_id, credential.credential_id, keyPair.privateKey);
const identity = await timed("signature_verification", () => cs.agents.submitProof(agent.agent_id, proof));
mark("IDENTITY", identity);

const authority = await cs.agents.getAuthority(agent.agent_id);
mark("AUTHORITY", authority);
const registeredAgent = await cs.agents.get(agent.agent_id);
mark("AGENT", { agent_id: registeredAgent.agent_id, authority_reference: registeredAgent.authority_reference });

const allowed = await timed("allow_decision", () => cs.trust.authorize({
  operational_entity_id: agent.operational_entity_id,
  action: {
    type: "read_repository",
    target: "repository:a",
    purpose: "deployment_evidence_review",
    environment: "staging",
  },
  idempotency_key: `gamma-allow-${webcrypto.randomUUID()}`,
}));
expectDecision(allowed, "ALLOW");
mark("ALLOW", { decision_id: allowed.decision_id, transaction_id: allowed.transaction_id, receipt_id: allowed.receipt_id, replay_id: allowed.replay_id, correlation_id: allowed.correlation_id, decision: allowed.decision, reason_codes: allowed.reason_codes });

const denied = await timed("deny_decision", () => cs.trust.authorize({
  operational_entity_id: agent.operational_entity_id,
  action: {
    type: "write_repository",
    target: "repository:a",
    purpose: "deployment_evidence_mutation",
    environment: "staging",
  },
  idempotency_key: `gamma-deny-${webcrypto.randomUUID()}`,
}));
expectDecision(denied, "DENY");
if (denied.execution_authorization !== null) throw new Error("DENY returned an execution authorization.");
mark("DENY", { decision_id: denied.decision_id, transaction_id: denied.transaction_id, receipt_id: denied.receipt_id, replay_id: denied.replay_id, correlation_id: denied.correlation_id, decision: denied.decision, reason_codes: denied.reason_codes });

const [transaction, replay, receipt, deniedReplay, deniedReceipt] = await Promise.all([
  timed("transaction_read", () => cs.trust.getTransaction(allowed.transaction_id)),
  timed("replay_read", () => cs.trust.getReplay(allowed.replay_id)),
  timed("receipt_read", () => cs.trust.getReceipt(allowed.receipt_id)),
  timed("deny_replay_read", () => cs.trust.getReplay(denied.replay_id)),
  timed("deny_receipt_read", () => cs.trust.getReceipt(denied.receipt_id)),
]);
mark("TRANSACTION", { decision_id: transaction.decision_id, transaction_id: transaction.transaction_id, decision: transaction.decision, correlation_id: transaction.correlation_id });
mark("REPLAY", { replay_id: replay.replay_id, event_count: replay.events?.length ?? 0 });
mark("RECEIPT", { receipt_id: receipt.receipt_id, receipt_version: receipt.receipt_version, decision_digest: receipt.decision_digest });
mark("DENY_REPLAY", { replay_id: deniedReplay.replay_id, event_count: deniedReplay.events?.length ?? 0 });
mark("DENY_RECEIPT", { receipt_id: deniedReceipt.receipt_id, receipt_version: deniedReceipt.receipt_version, decision_digest: deniedReceipt.decision_digest });

const outcome = await timed("outcome_submit", () => cs.trust.submitOutcome(allowed.transaction_id, {
  source_id: "self",
  destination: "repository:a",
  action_reference: "read_repository",
  target: "repository:a",
  result: "SUCCEEDED",
  observed_at: new Date().toISOString(),
  evidence_reference: `gamma-assertion:${webcrypto.randomUUID()}`,
}));
if (outcome.evidence_independence !== "AGENT_ASSERTED" || outcome.independent_destination_evidence !== false) {
  throw new Error("Outcome evidence independence was overstated.");
}
mark("OUTCOME", { status: outcome.status, evidence_independence: outcome.evidence_independence, independent_destination_evidence: outcome.independent_destination_evidence });

if (process.env.GAMMA_RUN_ATTACKS === "1") {
  let replayRejected = false;
  try {
    await cs.agents.submitProof(agent.agent_id, proof);
  } catch (error) {
    replayRejected = error instanceof ConflictError || error instanceof Error;
  }
  if (!replayRejected) throw new Error("Replayed challenge was not rejected.");

  const wrongKeyPair = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const wrongChallenge = await cs.agents.issueChallenge(agent.agent_id);
  const wrongProof = await signChallenge(wrongChallenge, agent.manifest_context.enterprise_id, credential.credential_id, wrongKeyPair.privateKey);
  let wrongKeyRejected = false;
  try {
    await cs.agents.submitProof(agent.agent_id, wrongProof);
  } catch {
    wrongKeyRejected = true;
  }
  if (!wrongKeyRejected) throw new Error("Wrong private key was not rejected.");
  mark("ATTACKS", { challenge_replay: "REJECTED", wrong_private_key: "REJECTED" });
}

mark("PERFORMANCE", { samples: timings.length, methodology: "one observed Preview round trip per stage; no percentile claim", observations: timings });
mark("GAMMA_RESULT", "PUBLIC_API_ONLY_END_TO_END_COMPLETE");
