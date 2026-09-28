import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the production adapter method and native mapper without initializing
// server-only clients. The database double enforces its UUID column boundary.
const source = ts.createSourceFile("server.ts", readFileSync(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
let method;
let nativeMapper;
let uuidDeclaration;
const artifactMethods = new Map();
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(source) === "loadConfiguredEvidence") method = node.getText(source);
  if (ts.isMethodDeclaration(node) && ["extendEvidenceGraph", "appendReplay", "emitTrustMemory"].includes(node.name.getText(source))) artifactMethods.set(node.name.getText(source), node.getText(source));
  if (ts.isFunctionDeclaration(node) && node.name?.text === "safeNativeEvidence") nativeMapper = node.getText(source);
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "uuidPattern") uuidDeclaration = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(method && nativeMapper && uuidDeclaration);
const executable = ts.transpileModule(`const ${uuidDeclaration}; ${nativeMapper}; ({${method}})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
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

function collector(failureTable) {
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
        const data = table === "native_entity_identity_evidence" ? [{ evidence_id: "native-proof", challenge_id: "challenge", verification_id: "verification", verified_at: "2026-09-09T08:00:00Z", evidence_digest: "digest" }] : [];
        return Promise.resolve({ data, error: table === failureTable ? { code: "XX000" } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const adapter = vm.runInNewContext(executable, {
    db,
    fail(operation, error) { throw new Error(`${operation}: ${error.code}`); },
    safeCanonicalEvidenceObject(row) { return row; },
    safeIdentitySignalEvidence(row) { return row; },
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
