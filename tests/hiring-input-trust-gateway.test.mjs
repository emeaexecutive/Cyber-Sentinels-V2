import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDocumentIntegrity, parseDocumentIntegrityContext } from "../src/lib/protected-workflows/document-integrity.ts";

const digest = "a".repeat(64);
function context(overrides = {}) {
  return parseDocumentIntegrityContext({
    documentDigest: digest,
    documentType: "resume_pdf",
    sourceReference: "candidate-document:123",
    visibleContentDigest: digest,
    machineExtractedContentDigest: digest,
    contentDiscrepancy: false,
    hiddenContentDetected: false,
    instructionLikeContentDetected: false,
    confidence: 0.98,
    provenance: "candidate_upload",
    receivingAgent: "agent:recruiting",
    workflowStage: "candidate_evaluation",
    policyReference: "hiring-input:1",
    ...overrides,
  });
}

test("normal candidate document passes through", () => {
  assert.equal(evaluateDocumentIntegrity(context()).decision, "ALLOW");
});

test("visible and machine-extracted content mismatch routes REVIEW", () => {
  const result = evaluateDocumentIntegrity(context({ machineExtractedContentDigest: "b".repeat(64), contentDiscrepancy: true }));
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("DOCUMENT_CONTENT_MISMATCH"));
});

test("hidden benign metadata does not automatically become fraud", () => {
  const result = evaluateDocumentIntegrity(context({ hiddenContentDetected: true, instructionClassification: "BENIGN_METADATA" }));
  assert.equal(result.decision, "REVIEW");
  assert.equal(result.reasonCodes.includes("INPUT_AUTHORITY_EXCEEDED"), false);
});

test("instruction-like content aimed at the recruiting agent routes REVIEW", () => {
  const result = evaluateDocumentIntegrity(context({ hiddenContentDetected: true, instructionLikeContentDetected: true, instructionClassification: "RECRUITING_INSTRUCTION" }));
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("UNTRUSTED_INSTRUCTION_DETECTED"));
});

test("scoring override and secret request are DENY", () => {
  for (const instructionClassification of ["POLICY_OVERRIDE", "SECRET_REQUEST"]) {
    const result = evaluateDocumentIntegrity(context({ instructionLikeContentDetected: true, instructionClassification }));
    assert.equal(result.decision, "DENY");
    assert.ok(result.reasonCodes.includes("INPUT_AUTHORITY_EXCEEDED"));
  }
});

test("caller-forged integrity state and invalid tenant-like references are rejected", () => {
  assert.throws(() => parseDocumentIntegrityContext({ ...context(), integrityState: "VERIFIED" }), /CALLER_FORGED_INTEGRITY_STATE/);
  assert.throws(() => parseDocumentIntegrityContext({ ...context(), sourceReference: "Bearer forged-secret" }), /DOCUMENT_REFERENCE_INVALID/);
});
