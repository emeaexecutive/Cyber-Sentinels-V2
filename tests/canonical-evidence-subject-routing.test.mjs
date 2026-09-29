import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { collectConfiguredEvidence } from "../src/lib/trust-transaction/canonical.ts";

// Execute the production adapter method and evidence mappers without initializing
// server-only clients. The database double enforces its UUID column boundary.
const source = ts.createSourceFile("server.ts", readFileSync(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
let method;
let nativeMapper;
let identityMapper;
let uuidDeclaration;
const artifactMethods = new Map();
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(source) === "loadConfiguredEvidence") method = node.getText(source);
  if (ts.isMethodDeclaration(node) && ["extendEvidenceGraph", "appendReplay", "emitTrustMemory"].includes(node.name.getText(source))) artifactMethods.set(node.name.getText(source), node.getText(source));
  if (ts.isFunctionDeclaration(node) && node.name?.text === "safeNativeEvidence") nativeMapper = node.getText(source);
  if (ts.isFunctionDeclaration(node) && node.name?.text === "safeIdentitySignalEvidence") identityMapper = node.getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "uuidPattern") uuidDeclaration = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(method && nativeMapper && identityMapper && uuidDeclaration);
const executable = ts.transpileModule(`const ${uuidDeclaration}; ${nativeMapper}; ${identityMapper}; ({${method}})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const enterpriseId = "10000000-0000-4000-8000-000000000001";
const subjectUuid = "20000000-0000-4000-8000-000000000002";

for (const [methodName, referenceField, rpcName] of [
  ["extendEvidenceGraph", "evidenceGraphReference", "extend_canonical_trust_transaction_graph_v1"],
  ["appendReplay", "replayReference", "append_canonical_trust_transaction_replay_v1"],
  ["emitTrustMemory", "trustMemoryReference", "emit_canonical_trust_transaction_memory_v1"],
]) {
  test(`${methodName} rejects malformed RPC references without string coercion`, async () => {
    assert.ok(artifactMethods.has(methodName));
    const methodCode = ts.transpileModule(`({${artifactMethods.get(methodName)}})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const record = { enterpriseId, transactionId: subjectUuid, actorId: "actor", correlationId: "correlation" };
    let reply;
    const adapter = vm.runInNewContext(methodCode, {
      db: {},
      async rpc(_db, _operation, name, args) {
        assert.equal(name, rpcName);
        assert.equal(args.p_enterprise_id, enterpriseId);
        assert.equal(args.p_transaction_id, subjectUuid);
        return reply;
      },
    });
    for (const value of [undefined, null, 42, true, [], {}, { toString() { throw new Error("must not coerce a provider object"); } }]) {
      reply = value === undefined ? {} : { [referenceField]: value };
      assert.equal(await adapter[methodName](record), "");
    }
    reply = { [referenceField]: subjectUuid };
    assert.equal(await adapter[methodName](record), subjectUuid);
  });
}

function collector(failureTable, identityRows = []) {
  const calls = [];
  const db = { from(table) {
    const call = { table, filters: [] };
    calls.push(call);
    const query = {
      select() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
      eq(key, value) { call.filters.push([key, value]); return this; },
      is(key, value) { call.filters.push([key, value]); return this; },
      then(resolve, reject) {
        if (table === "identity_signal_evidence" && call.filters.some(([key, value]) => key === "subject_id" && value !== subjectUuid)) return Promise.reject(new Error("22P02: invalid UUID input")).then(resolve, reject);
        const data = table === "native_entity_identity_evidence" ? [{ evidence_id: "native-proof", challenge_id: "challenge", verification_id: "verification", verified_at: "2026-09-09T08:00:00Z", evidence_digest: "digest" }] : table === "identity_signal_evidence" ? identityRows : [];
        return Promise.resolve({ data, error: table === failureTable ? { code: "XX000" } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const adapter = vm.runInNewContext(executable, {
    db,
    fail(operation, error) { throw new Error(`${operation}: ${error.code}`); },
    safeCanonicalEvidenceObject(row) { return row; },
  });
  return { load: adapter.loadConfiguredEvidence, calls };
}

test("native agent identifiers retain verified native evidence without entering UUID ledgers", async () => {
  const { load, calls } = collector();
  const subjectId = `agent:${subjectUuid}`;
  const evidence = await load({ enterpriseId, subjectId });
  assert.equal(evidence[0].reference, "native-proof");
  assert.equal(evidence[0].serverVerified, true);
  assert.deepEqual(calls.map(({ table }) => table), ["evidence_objects", "native_entity_identity_evidence"]);
  for (const call of calls) assert.ok(call.filters.some(([key, value]) => key === "enterprise_id" && value === enterpriseId));
  assert.ok(calls[1].filters.some(([key, value]) => key === "operational_entity_id" && value === subjectId));
  assert.ok(calls[1].filters.some(([key, value]) => key === "revoked_at" && value === null));
});

test("UUID subjects still load tenant-bound identity signals", async () => {
  const { load, calls } = collector();
  await load({ enterpriseId, subjectId: subjectUuid });
  const identity = calls.find(({ table }) => table === "identity_signal_evidence");
  assert.deepEqual(identity.filters, [["enterprise_id", enterpriseId], ["subject_id", subjectUuid]]);
});

test("identity and native database failures remain fail-closed", async () => {
  await assert.rejects(collector("identity_signal_evidence").load({ enterpriseId, subjectId: subjectUuid }), /Identity evidence collection: XX000/);
  await assert.rejects(collector("native_entity_identity_evidence").load({ enterpriseId, subjectId: `agent:${subjectUuid}` }), /Native evidence collection: XX000/);
});

function identityRow(providerId, environment, overrides = {}) {
  return {
    id: "identity-proof", verification_request_id: "30000000-0000-4000-8000-000000000003",
    signal_type: providerId === "world_id" ? "PROOF_OF_PERSONHOOD" : "IDENTITY_ASSERTION",
    provider_id: providerId, provider_event_id: "provider-event", provider_reference: "provider-session",
    signal_status: "PASS", outcome: "VERIFIED", confidence: 90,
    server_verified: true, signature_verified: true, source_digest: "a".repeat(64),
    normalized_value: { environment }, observed_at: "2026-09-29T08:00:00Z",
    ...overrides,
  };
}

async function configuredIdentityEvidence(rows, actionEnvironment) {
  const { load } = collector(undefined, rows);
  return collectConfiguredEvidence(
    { loadConfiguredEvidence: load }, { id: enterpriseId }, { subjectId: subjectUuid },
    { action: { environment: actionEnvironment } },
  );
}

test("canonical collection passes the exact action environment to the stored evidence loader", async () => {
  for (const environment of ["production", "staging", "sandbox", "preview", "Production"]) {
    let received;
    await collectConfiguredEvidence({ async loadConfiguredEvidence(input) { received = input; return []; } },
      { id: enterpriseId }, { subjectId: subjectUuid },
      { action: { environment }, operationalEntityId: "agent:subject", providerExecutionId: "execution-reference" });
    assert.deepEqual(received, { enterpriseId, subjectId: subjectUuid, actionEnvironment: environment,
      operationalEntityId: "agent:subject", providerExecutionId: "execution-reference" });
  }
});

for (const providerId of ["stripe_identity", "world_id", "other_identity_provider"]) {
  test(`${providerId} evidence requires an exact known environment match in both directions`, async () => {
    for (const evidenceEnvironment of ["production", "staging", "sandbox"]) {
      for (const actionEnvironment of ["production", "staging", "sandbox"]) {
        const result = await configuredIdentityEvidence([identityRow(providerId, evidenceEnvironment)], actionEnvironment);
        assert.equal(result.length, evidenceEnvironment === actionEnvironment ? 1 : 0,
          `${evidenceEnvironment} evidence for ${actionEnvironment} action`);
        if (result.length) {
          assert.equal(result[0].reference, "identity-proof");
          assert.equal(result[0].outcome, "PASSED");
          assert.equal(result[0].serverVerified, true);
          assert.equal(result[0].sourceClassification, "identity_provider_asserted");
          assert.equal(result[0].normalizedEvidence.environment, evidenceEnvironment);
        }
      }
    }
  });

  test(`${providerId} evidence with an unknown or malformed environment cannot become eligible`, async () => {
    for (const environment of [undefined, null, "", "unknown", "preview", "test", "live", "Production", "production ", {}, [], true]) {
      for (const actionEnvironment of ["production", "staging", "sandbox"]) {
        assert.equal((await configuredIdentityEvidence([identityRow(providerId, environment)], actionEnvironment)).length, 0);
      }
      assert.equal((await configuredIdentityEvidence([identityRow(providerId, environment)], environment)).length, 0);
      assert.equal((await configuredIdentityEvidence([identityRow(providerId, "production")], environment)).length, 0);
    }
    for (const normalizedValue of [null, undefined, [], "production"]) {
      assert.equal((await configuredIdentityEvidence([identityRow(providerId, "production", { normalized_value: normalizedValue })], "production")).length, 0);
    }
  });

  test(`${providerId} mismatched recent evidence cannot shadow an older matching observation`, async () => {
    const rows = [
      identityRow(providerId, "sandbox", { id: "newest-sandbox" }),
      identityRow(providerId, "unknown", { id: "recent-unknown" }),
      identityRow(providerId, "production", { id: "current-production" }),
      identityRow(providerId, "production", { id: "older-production" }),
    ];
    const result = await configuredIdentityEvidence(rows, "production");
    assert.equal(result.length, 1);
    assert.equal(result[0].reference, "current-production");
    assert.equal(rows.length, 4, "selection must preserve stored history");
    assert.equal(rows[0].normalized_value.environment, "sandbox");
  });
}

test("matching environment does not bypass provider signature and server verification requirements", async () => {
  for (const overrides of [{ signature_verified: false }, { server_verified: false }, { signal_status: "INCONCLUSIVE" }, { outcome: "PENDING" }]) {
    const result = await configuredIdentityEvidence([identityRow("stripe_identity", "production", overrides)], "production");
    assert.equal(result.length, 1);
    assert.equal(result[0].outcome, "INCONCLUSIVE");
    assert.equal(result[0].serverVerified, false);
    assert.equal(result[0].sourceClassification, "unconfirmed");
  }
});
