import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validateEmploymentDisclosure,
  validateEmploymentFinding,
  validateHumanEmploymentDetermination,
  validateIndependentEmploymentReview,
  validateSupportedEmploymentOverride,
  employmentReviewerAuthorityIsCurrent,
} from "../lib/employment/decision-governance.ts";

const policy = { policyId: "employment-policy", policyVersion: "4", humanReviewRequired: true, disclosureRequired: true };
const finding = () => validateEmploymentFinding({
  system: "screening-assistant",
  model: { provider: "provider-neutral", name: "screen-v3", version: "3.2", provenanceReference: "model-artifact:sha256:abc" },
  finding: "The system found a mismatch between declared and observed role history.",
  criteria: ["criterion:employment-history"],
  operatingRules: ["policy-rule:review-discrepancies"],
  evidenceReferences: ["evidence:application-17"],
});

test("employment finding requires provider-neutral model provenance and original evidence", () => {
  assert.equal(finding().provider, "provider-neutral");
  assert.throws(() => validateEmploymentFinding({ system: "screening-assistant", finding: "AI says reject" }), /model.provider/);
});

test("meaningful review requires current authority, independence, rationale, actions and reviewed evidence", () => {
  const input = {
    authorityReference: "trust-contract:reviewer-1",
    rationale: "I compared the source document with the stated criterion and checked the cited discrepancy against the original evidence.",
    actions: ["EVIDENCE_INSPECTED", "CRITERIA_APPLIED"],
    reviewedEvidenceReferences: ["evidence:application-17"],
  };
  assert.equal(validateIndependentEmploymentReview(input, {
    reviewerId: "reviewer-2", caseCreatorId: "recruiter-1", authorityCurrent: true, policy,
  }).reviewerId, "reviewer-2");
  assert.throws(() => validateIndependentEmploymentReview(input, {
    reviewerId: "recruiter-1", caseCreatorId: "recruiter-1", authorityCurrent: true, policy,
  }), /cannot approve their own/);
  assert.throws(() => validateIndependentEmploymentReview(input, {
    reviewerId: "reviewer-2", caseCreatorId: "recruiter-1", authorityCurrent: false, policy,
  }), /current, unexpired/);
  assert.throws(() => validateIndependentEmploymentReview({ ...input, rationale: "Approved." }, {
    reviewerId: "reviewer-2", caseCreatorId: "recruiter-1", authorityCurrent: true, policy,
  }), /rubber-stamp/);
  assert.throws(() => validateIndependentEmploymentReview({ ...input, actions: ["APPROVE", "RUBBER_STAMP"] }, {
    reviewerId: "reviewer-2", caseCreatorId: "recruiter-1", authorityCurrent: true, policy,
  }), /meaningful evidence/);
});

test("unsupported overrides and determinations without independent review are rejected", () => {
  assert.throws(() => validateSupportedEmploymentOverride({
    rationale: "The original decision is incorrect based on the provided context and this is a substantive review.",
    evidenceReferences: ["evidence:application-17"],
  }, ["evidence:application-17"]), /beyond the original/);
  assert.throws(() => validateHumanEmploymentDetermination({ outcome: "HIRED", rationale: "Evidence reviewed.", evidenceReferences: ["evidence:1"] }, {
    actorId: "reviewer-2", caseCreatorId: "recruiter-1", review: null, policy,
  }), /independent human review/);
});

test("determination is human-owned and disclosure requires content and delivery evidence", () => {
  const review = { reviewerId: "reviewer-2", authorityReference: "trust-contract:reviewer-2", rationale: "Independent rationale.", actions: ["EVIDENCE_INSPECTED", "CRITERIA_APPLIED"], reviewedEvidenceReferences: ["evidence:1"] };
  assert.equal(validateHumanEmploymentDetermination({ outcome: "HOLD", rationale: "More evidence is required before a human determination can be made.", evidenceReferences: ["evidence:1"] }, {
    actorId: "decision-maker-3", caseCreatorId: "recruiter-1", review, policy,
  }).determinedByHuman, true);
  assert.throws(() => validateHumanEmploymentDetermination({ outcome: "HIRED", rationale: "The reviewed evidence supports this human decision after independent consideration.", evidenceReferences: ["evidence:1"] }, {
    actorId: "recruiter-1", caseCreatorId: "recruiter-1", review, policy,
  }), /cannot self-approve/);
  assert.throws(() => validateEmploymentDisclosure({ contentVersion: "notice-v1", contentHash: "sha256:" + "a".repeat(64), recipientReference: "candidate:17", transmittedAt: new Date().toISOString() }, policy), /deliveryEvidenceReference/);
  assert.throws(() => validateEmploymentDisclosure({ contentVersion: "notice-v1", contentHash: "sha256:" + "a".repeat(64), recipientReference: "person@example.test", transmittedAt: new Date().toISOString(), deliveryEvidenceReference: "11111111-1111-4111-8111-111111111111" }, policy), /opaque candidate reference/);
  assert.equal(validateEmploymentDisclosure({ contentVersion: "notice-v1", contentHash: "sha256:" + "a".repeat(64), recipientReference: "candidate:17", transmittedAt: new Date().toISOString(), deliveryEvidenceReference: "11111111-1111-4111-8111-111111111111" }, policy).contentVersion, "notice-v1");
});

test("reviewer authority must belong to the reviewer and remain active and unexpired", () => {
  const authority = { contract_id: "authority:1", subject_type: "human", subject_id: "reviewer:1", revocation_state: "active", issued_at: "2026-01-01T00:00:00.000Z", expires_at: "2027-01-01T00:00:00.000Z", contract: { requiredAuthority: ["employment_decision_reviewer"] } };
  const now = Date.parse("2026-10-10T00:00:00.000Z");
  assert.equal(employmentReviewerAuthorityIsCurrent(authority, "reviewer:1", now, "authority:1"), true);
  assert.equal(employmentReviewerAuthorityIsCurrent({ ...authority, revocation_state: "revoked" }, "reviewer:1", now), false);
  assert.equal(employmentReviewerAuthorityIsCurrent({ ...authority, expires_at: "2026-10-09T00:00:00.000Z" }, "reviewer:1", now), false);
  assert.equal(employmentReviewerAuthorityIsCurrent(authority, "reviewer:2", now), false);
});

test("employment API binds cases to assigned reviewers and existing canonical trust evidence", async () => {
  const service = await readFile(new URL("../src/lib/employment/decision-service.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/employment/decisions/route.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261010110000_employment_access_governance_hardening.sql", import.meta.url), "utf8");
  assert.match(route, /architectureContext\(request, \["owner", "admin", "reviewer"\]\)/);
  assert.match(service, /\[\.\.\.events\]\.reverse\(\)\.find\(\(event\) => event\.event_type === "governance\.employment_decision\.reviewer_assigned"\)/);
  assert.match(service, /append_trust_event_v1/);
  assert.match(service, /canonical_trust_transactions/);
  assert.match(service, /employmentReviewerAuthorityIsCurrent/);
  assert.match(service, /PENDING_NOT_EFFECTIVE/);
  assert.match(migration, /project_employment_decision_to_trust_memory_v1/);
  assert.match(migration, /account_access_approval_events_append_only/);
});