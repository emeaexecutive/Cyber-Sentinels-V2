import assert from "node:assert/strict";
import test from "node:test";
import { composeOpenGraphRequest, governOpenGraphRequest, normalizeOpenGraphTarget, openGraphTargetInScope } from "../src/lib/opengraph/workflow.ts";
import { executeCanonicalTrustTransaction } from "../src/lib/trust-transaction/canonical.ts";
import { harness } from "./fixtures/opengraph-canonical.mjs";

const request = (overrides = {}) => ({ subjectId: "10000000-0000-4000-8000-000000000003", operationalEntityId: "10000000-0000-4000-8000-000000000004",
  purpose: "read_metadata", environment: "sandbox", targetUrl: "https://example.com/docs", tool: "opengraph.site", idempotencyKey: "opengraph-attempt-1", ...overrides });
const context = (overrides = {}) => ({ requestedAt: "2026-09-24T10:00:00.000Z", purposeLineage: { observedPurpose: "read_metadata", purposeEvidence: ["fixture:purpose"] },
  targetScope: { domains: ["example.com"], subdomains: [], urls: [], deniedDomains: [] }, ...overrides });

for (const url of ["http://example.com", "file:///etc/passwd", "ftp://example.com", "https://localhost", "https://127.0.0.1", "https://2130706433", "https://0x7f000001",
  "https://10.0.0.1", "https://172.16.0.1", "https://192.168.1.1", "https://169.254.169.254", "https://[::1]", "https://[::ffff:127.0.0.1]", "https://[fc00::1]",
  "https://metadata.google.internal", "https://metadata.goog", "https://service.internal", "https://user:secret@example.com", "https://example.com?key=secret", "https://example.com#secret",
  "https://example.com:8443", "https://example.com./", " https://example.com", "https://example.com\\@localhost", "not a URL", "https://example.com/%0a"]) {
  test(`reject unsafe or unsupported target: ${url}`, () => assert.throws(() => normalizeOpenGraphTarget(url), /UNSAFE/));
}

test("domain and subdomain boundaries are label-aware; explicit deny wins; exact URL paths stay exact", () => {
  const check = (url, changes = {}) => openGraphTargetInScope(normalizeOpenGraphTarget(url), { ...context().targetScope, ...changes });
  assert.equal(check("https://EXAMPLE.com/docs"), true);
  assert.equal(check("https://example.com.evil.com"), false);
  assert.equal(check("https://sub.example.com"), false);
  assert.equal(check("https://sub.example.com", { subdomains: ["example.com"] }), true);
  assert.equal(check("https://example.com", { deniedDomains: ["example.com"] }), false);
  assert.equal(check("https://sub.example.com", { subdomains: ["example.com"], deniedDomains: ["example.com"] }), false);
  assert.equal(check("https://example.com/docs", { domains: [], urls: ["https://example.com/docs"] }), true);
  assert.equal(check("https://example.com/docs/other", { domains: [], urls: ["https://example.com/docs"] }), false);
});

test("ALLOW produces canonical receipt/replay/memory but the unqualified executor is unreachable", async () => {
  const h = harness(composeOpenGraphRequest(request(), context()));
  h.deps.requestExternalExecution = () => { throw new Error("Must never call a provider"); };
  const receipt = await governOpenGraphRequest(request(), h.deps, async () => context());
  assert.equal(receipt.decision, "ALLOW");
  assert.equal(receipt.externalExecution.outcome, "NOT_CONFIGURED");
  assert.equal(receipt.externalExecution.requested, false);
  assert.equal(receipt.replayReference, "synthetic:replay");
  assert.equal(receipt.trustMemoryReference, "synthetic:memory");
  assert.equal(receipt.evidenceGraphReference, "synthetic:graph");
  assert.equal(receipt.action.type, "opengraph.site");
  assert.ok(JSON.stringify(h.records).includes("OPENGRAPH_TOOL_REQUEST"));
  assert.ok(!JSON.stringify(h.records).includes("app_id"));
});

for (const [name, req, ctx, options, decision] of [
  ["wrong domain", request({ targetUrl: "https://other.com" }), context(), {}, "DENY"],
  ["missing delegation", request({ delegationReference: "delegation:1" }), context(), {}, "REVIEW"],
  ["revoked delegation", request({ delegationReference: "delegation:1" }), context({ delegation: { reference: "delegation:1", authorization: { decision: "DENY", reasonCodes: ["DELEGATION_REVOKED"] } } }), {}, "DENY"],
  ["unobserved purpose", request(), context({ purposeLineage: undefined }), {}, "REVIEW"],
  ["revoked authority", request(), context(), { authority: { revocationState: "revoked", revokedAt: "2026-09-24T09:00:00.000Z" } }, "DENY"],
  ["wrong canonical target", request(), context(), { authority: { authorityScope: { permittedTargets: ["https://other.com/"], permittedActions: ["opengraph.site"], environments: ["sandbox"] } } }, "DENY"],
  ["missing external effect", request(), context(), { authority: { requiredAuthority: ["opengraph.site"] } }, "DENY"],
]) {
  test(`${name}: ${decision} never executes`, async () => {
    const input = composeOpenGraphRequest(req, ctx);
    const h = harness(input, options);
    const receipt = await executeCanonicalTrustTransaction(input, h.deps);
    assert.equal(receipt.decision, decision);
    assert.equal(receipt.externalExecution.requested, false);
    assert.equal(h.calls.includes("requestExternalExecution"), false);
  });
}

test("canonical ALLOW is the only executor gate; executor failure cannot become successful evidence", async () => {
  const input = composeOpenGraphRequest(request(), context());
  const h = harness(input);
  h.deps.requestExternalExecution = async () => { throw new Error("FIXTURE_PROVIDER_FAILED"); };
  await assert.rejects(executeCanonicalTrustTransaction(input, h.deps), /FIXTURE_PROVIDER_FAILED/);
  assert.equal(h.records.length, 1);
  assert.equal(h.records[0].decision, "ALLOW"); // Authorization is distinct from execution success.
});

test("a new attempt reloads revoked authority; a duplicate never re-executes", async () => {
  const h = harness(composeOpenGraphRequest(request(), context()));
  const first = await governOpenGraphRequest(request(), h.deps, async () => context());
  const again = harness(composeOpenGraphRequest(request(), context()), { previousReceipt: first });
  const replay = await governOpenGraphRequest(request(), again.deps, async () => context());
  assert.equal(replay.idempotentReplay, true);
  assert.equal(again.records.length, 0);
  const fresh = request({ idempotencyKey: "opengraph-attempt-2" });
  const revoked = harness(composeOpenGraphRequest(fresh, context()), { authority: { revocationState: "revoked" } });
  assert.equal((await governOpenGraphRequest(fresh, revoked.deps, async () => context())).decision, "DENY");
});

test("unsupported tools and mismatched delegation fail closed", () => {
  assert.throws(() => composeOpenGraphRequest(request({ tool: "scrape" }), context()), /UNSUPPORTED/);
  assert.throws(() => composeOpenGraphRequest(request(), context({ delegation: { reference: "other" } })), /MISMATCH/);
});

test("the governed entry point requires tool permission independently of action permission", async () => {
  const input = composeOpenGraphRequest(request(), context());
  const h = harness(input);
  const load = h.deps.loadAuthority;
  h.deps.loadAuthority = async () => {
    const authority = await load();
    return { ...authority, authorityScope: { ...authority.authorityScope, permittedTools: [] } };
  };
  const result = await governOpenGraphRequest(request(), h.deps, async () => context());
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("OPENGRAPH_TOOL_OUT_OF_SCOPE"));
});

test("context resolution follows authentication and carries the server tenant; failures return no receipt", async () => {
  const h = harness(composeOpenGraphRequest(request(), context()));
  let resolved = false;
  await governOpenGraphRequest(request(), h.deps, async (_, session) => {
    assert.equal(h.calls[0], "authenticateActor");
    assert.equal(session.tenant.id, "10000000-0000-4000-8000-000000000001");
    resolved = true;
    return context();
  });
  assert.equal(resolved, true);
  h.deps.authenticateActor = async () => { throw new Error("AUTHENTICATION_REQUIRED"); };
  await assert.rejects(governOpenGraphRequest(request(), h.deps, async () => { throw new Error("Must not resolve"); }), /AUTHENTICATION_REQUIRED/);
});

test("cross-tenant authority cannot authorize execution", async () => {
  const h = harness(composeOpenGraphRequest(request(), context()), { authority: { enterpriseId: "20000000-0000-4000-8000-000000000001" } });
  await assert.rejects(governOpenGraphRequest(request(), h.deps, async () => context()), /AUTHORITY_TENANT_MISMATCH/);
  assert.equal(h.records.length, 0);
});
