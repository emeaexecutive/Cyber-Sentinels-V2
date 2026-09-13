// Production-safe V2 Epic 1 qualification. Controlled client assertions are never execution proof.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { CyberSentinels } from "../../packages/cyber-sentinels-sdk/src/index.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

const origin = "https://www.cybersentinels.com";
const stagingProject = "agpyhygpfmppjkxwcpac";
const transactionId = process.env.V2_ROOT_TRANSACTION_ID;
const key = process.env.CYBER_SENTINELS_API_KEY;
const output = process.env.V2_EVIDENCE_DIRECTORY ?? "docs/v2/production-qualification";

if (process.env.I_CONFIRM_PRODUCTION !== "kecgtsfibkypjuaxqbjx") throw new Error("Explicit Production target confirmation required");
if (origin !== "https://www.cybersentinels.com" || /localhost|127\.0\.0\.1|agpyhygpfmppjkxwcpac/i.test(origin)) throw new Error("Production URL guard failed");
if (process.env.V2_STAGING_PROJECT === stagingProject) throw new Error("Staging project is forbidden");
if (process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Database credentials are forbidden in the external client");
if (!/^cs_live_/.test(key ?? "")) throw new Error("A fresh cs_live_ qualification key is required");
if (process.cwd().toLowerCase().replaceAll("\\", "/") !== "c:/users/emeae/desktop/cyber-sentinels-v2-release") throw new Error("WRONG WORKTREE");
if (!/^[a-f0-9-]{36}$/.test(transactionId ?? "")) throw new Error("V2_ROOT_TRANSACTION_ID is required; no fallback");
if (!process.env.V2_EXPECTED_CLIENT_ID || !process.env.V2_EXPECTED_TENANT_ID || !process.env.V1_EVIDENCE_DIRECTORY) throw new Error("Same-client V1 provenance required");
const v1 = JSON.parse(await readFile(`${process.env.V1_EVIDENCE_DIRECTORY}/customer-zero.json`, "utf8"));
assert.equal(v1.result, "EXTERNAL_AUTHORIZATION_AND_REVOCATION_PASS");
assert.equal(v1.stages.firstDecision.transaction_id, transactionId);
assert.equal(v1.stages.firstDecision.decision, "ALLOW");
assert.equal(v1.stages.agent.manifest_context.enterprise_id, process.env.V2_EXPECTED_TENANT_ID);

const requiredScopes = new Set(["agents:write", "agents:verify", "authority:read", "authority:write", "trust:request", "trust:read", "outcomes:write", "review:read", "review:write", "incidents:read", "incidents:write", "evidence:write", "evidence:export"]);
const configuredScopes = new Set((process.env.V2_QUALIFICATION_SCOPES ?? "").split(",").map((scope) => scope.trim()).filter(Boolean));
if (configuredScopes.size !== requiredScopes.size || [...requiredScopes].some((scope) => !configuredScopes.has(scope))) throw new Error("Qualification key scopes must exactly match the required V2 scope set");
const evidence = { origin, transactionId, qualification: "CONTROLLED_PRODUCTION_QUALIFICATION", startedAt: new Date().toISOString(), stages: {}, negatives: [] };
const redact = (name, value) => /^(api_key|private_key|signature|token|access_token|refresh_token|execution_authorization)$/.test(name) && value !== null ? "[OMITTED]" : value;
const save = () => writeFile(`${output}/customer-zero.json`, JSON.stringify(evidence, redact, 2));
const record = async (stage, value) => { evidence.stages[stage] = value; await save(); console.log(JSON.stringify({ stage, status: "RECORDED", decision: value?.decision, code: value?.code })); return value; };
const negative = async (name, operation, expectedStatus) => {
  try { await operation(); throw new Error(`${name} unexpectedly succeeded`); }
  catch (error) {
    if (error.status !== expectedStatus) throw error;
    evidence.negatives.push({ name, status: error.status, code: error.code });
    await save();
  }
};
const cs = new CyberSentinels({ apiKey: key, baseUrl: origin, timeoutMs: 60000 });
const now = () => new Date().toISOString();
const qualificationEvidence = async (agentId, type, facts, occurredAt) => cs.evidence.submit({
  provider: { key: "self", class: "APPLICATION_SIGNAL", event_id: crypto.randomUUID(), finding: "CONTROLLED_PRODUCTION_QUALIFICATION" },
  type,
  subject: { type: "AI_AGENT", id: agentId },
  evidence: { ...facts, qualification_provenance: "CONTROLLED_PRODUCTION_QUALIFICATION", downstream_execution: "NOT_OBSERVED", independent_attestation: false },
  occurred_at: occurredAt,
});

await mkdir(output, { recursive: true });
try {
  const root = await record("rootTransaction", await cs.trust.getTransaction(transactionId));
  assert.equal(root.decision, "ALLOW");
  const receipt = await record("rootReceipt", await cs.trust.getReceipt(transactionId));
  const replay = await record("rootReplay", await cs.trust.getReplay(transactionId));
  assert.equal(receipt.trust_memory_reference, `trust-memory:${transactionId}`);
  assert.ok(replay.events.some(event => event.event_type === "TRUST_MEMORY_WRITTEN"));
  assert.ok(replay.events.some(event => event.event_type === "DECISION_PERSISTED" && event.actor === `principal:${process.env.V2_EXPECTED_CLIENT_ID}`));
  assert.equal(root.agent_id, v1.stages.agent.agent_id);
  const ownAgent = await record("rootAgent", await cs.agents.get(root.agent_id));
  await record("rootOwnership", { status: "PASS", client_id: process.env.V2_EXPECTED_CLIENT_ID, tenant_id: process.env.V2_EXPECTED_TENANT_ID, evidence: "200 through unchanged tenant+actor scoped transactionRows; DECISION_PERSISTED actor matches key client; registered agent tenant matches", agent_id: ownAgent.agent_id });
  if (root.tenant_id && root.tenant_id !== process.env.V2_EXPECTED_TENANT_ID) throw new Error("Root transaction tenant does not match the qualification key tenant");
  evidence.requiredScopes = [...requiredScopes];
  evidence.result = "ROOT_USABLE";
  await save();

  const agentId = root.agent_id ?? root.subject_id;
  if (!agentId) throw new Error("Root transaction did not expose an agent subject");
  const observations = [];
  for (const [type, facts] of [
    ["EXECUTION_OBSERVATION", { observation: "Qualification observation only; no downstream operation was executed." }],
    ["OUTCOME", { outcome_layer: "provider", outcome_status: "UNKNOWN", outcome: "NOT_OBSERVED" }],
    ["DETECTION", { observation: "Qualification lifecycle recorded for controlled review." }],
    ["INTERVENTION", { intervention: "Qualification review intervention; no customer action taken." }],
    ["CONTAINMENT", { containment: "Controlled qualification only; no downstream containment action occurred." }],
    ["REMEDIATION", { remediation: "Qualification record completed; no production remediation claimed." }],
  ]) {
    const at = now();
    const context = { session: "CONTROLLED_PRODUCTION_QUALIFICATION", api_tool: "public-api-client", infrastructure: "controlled-qualification" };
    const stored = await qualificationEvidence(agentId, type, { ...facts, context }, at);
    assert.equal(stored.independent_evidence, false);
    assert.equal(stored.server_verified, false);
    assert.equal(stored.classification, "AGENT_ASSERTED");
    assert.ok(stored.reason_codes.includes("CLIENT_EVIDENCE_IS_AGENT_ASSERTED"));
    await record(`evidence_${type}`, stored);
    const observation = { transaction_id: transactionId, kind: type, summary: `Controlled Production qualification ${type.toLowerCase()}; no real downstream execution claimed.`, observed_at: at, evidence_object_id: stored.evidence_id, evidence_digest: stored.evidence_digest, context };
    if (type === "OUTCOME") Object.assign(observation, { outcome_layer: "provider", outcome_status: "UNKNOWN" });
    observations.push(observation);
  }
  await record("observations", observations);
  const incident = await record("incident", await cs.incidents.open({ transaction_id: transactionId, summary: "CONTROLLED_PRODUCTION_QUALIFICATION incident; not a customer incident.", observed_at: now() }));
  const incomplete = await record("incomplete", await cs.incidents.get(incident.incident_id));
  assert.equal(incomplete.states.export, "DRAFT");
  const incompleteExport = await record("incompleteExport", await cs.incidents.export(incident.incident_id));
  assert.equal(incompleteExport.package.states.export, "DRAFT");
  assert.notEqual(incompleteExport.package.states.evidence_completeness, "INCIDENT_EVIDENCE_COMPLETE");
  await negative("invalid digest", () => cs.incidents.append(incident.incident_id, { ...observations[0], evidence_digest: "0".repeat(64) }), 400);
  await negative("caller-forged derived state", () => cs.incidents.append(incident.incident_id, { ...observations[0], states: { export: "REGULATORY_EXPORT_READY" } }), 400);
  await negative("caller-forged verification", () => cs.incidents.append(incident.incident_id, { ...observations[0], verified: true }), 400);
  const afterNegatives = await record("afterNegatives", await cs.incidents.get(incident.incident_id));
  assert.equal(afterNegatives.states.export, "DRAFT");
  assert.equal(afterNegatives.timeline.length, incomplete.timeline.length);
  for (const item of observations) await record(`link_${item.kind}`, await cs.incidents.append(incident.incident_id, item));
  const pack = await record("export", await cs.incidents.export(incident.incident_id));
  assert.equal(pack.package.states.export, "REGULATORY_EXPORT_READY");
  assert.equal(pack.package.states.evidence_completeness, "INCIDENT_EVIDENCE_COMPLETE");
  assert.ok(pack.package.timeline.every(row => row.integrity === "VERIFIED" && row.source.independently_verified === false));
  assert.ok(pack.package.outcomes.every(row => row.outcome_layer === "provider" && row.outcome_status === "UNKNOWN"));
  assert.equal(pack.package.existing_outcome_records.length, 0);
  await record("outcomeTruth", { provider_outcome: "UNKNOWN", runtime_outcome: null, destination_outcome: null, adjudicated_outcome: null, downstream_execution: "NOT_OBSERVED", note: "Only provider UNKNOWN observation submitted; no destination execution or adjudication asserted." });
  const { integrity_digest: digest, ...body } = pack.package;
  assert.equal(digest, hashCanonical(body));
  await record("replay", await cs.incidents.replay(incident.incident_id));
  const after = await record("rootAfterIncident", await cs.trust.getTransaction(transactionId));
  assert.equal(after.decision, "ALLOW");
  assert.deepEqual(after.digests, root.digests);
  const finalReceipt = await record("receiptAfterIncident", await cs.trust.getReceipt(transactionId));
  assert.equal(finalReceipt.trust_memory_reference, receipt.trust_memory_reference);
  await record("trustMemory", await cs.agents.getTrustState(agentId));
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "BLOCKED";
  evidence.error = { name: error.name, message: error.message, code: error.code, status: error.status };
  process.exitCode = 1;
} finally {
  evidence.completedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ result: evidence.result, error: evidence.error }));
}
