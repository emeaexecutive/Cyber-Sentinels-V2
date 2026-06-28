import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPortableTrustEvidence,
  verifyReceiptContinuity,
} from "../lib/trust-receipts/verification.ts";

const subject = {
  subject_type: "interview_session",
  subject_id: "11111111-1111-4111-8111-111111111111",
};

test("verifies a receipt with linked replay, evidence and attributed governance", () => {
  const result = verifyReceiptContinuity({
    receipt: {
      id: "22222222-2222-4222-8222-222222222222",
      ...subject,
      issued_at: "2026-06-28T10:00:00.000Z",
      verification_status: "reviewed",
    },
    timeline: [{ ...subject }],
    evidenceChains: [{ ...subject }],
    replaySessions: [{ ...subject }],
    governanceActions: [{ ...subject, resolved_by: "reviewer@example.com" }],
  });

  assert.equal(result.state, "verified");
  assert.equal(result.checks.every((check) => check.state === "verified"), true);
});

test("requires review when continuity records are missing", () => {
  const result = verifyReceiptContinuity({
    receipt: { id: "receipt-without-links", ...subject },
    timeline: [],
    evidenceChains: [],
    replaySessions: [],
    governanceActions: [],
  });

  assert.equal(result.state, "review_required");
  assert.equal(result.checks.find((check) => check.id === "replay_linkage")?.state, "review_required");
});

test("builds a stable versioned portable trust evidence summary", () => {
  const portable = buildPortableTrustEvidence({
    receiptId: "receipt-1",
    subjectType: subject.subject_type,
    subjectId: subject.subject_id,
    providerSignalCount: 2,
    trustPosture: "governance review",
    governanceOutcome: "approved",
    authorizationRelationshipCount: 3,
    issuedAt: "2026-06-28T10:00:00.000Z",
    replayReference: "/api/replay/replay-1",
  });

  assert.equal(portable.schemaVersion, 1);
  assert.equal(portable.replayReference, "/api/replay/replay-1");
  assert.equal(portable.providerEvidenceSummary, "2 normalized provider signal(s)");
});
