import assert from "node:assert/strict";
import test from "node:test";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";
import {
  buildDesignPartnerDemonstration,
  buildExecutiveMode,
  buildInvestorDecisionDemonstration,
  createCanonicalTrustDecision,
  evaluateTrustDecisionHealth,
  formatTrustDecisionNarrative,
  prepareSpecialistModelRequest,
  validateSpecialistModelResponse,
} from "../src/lib/trust-decision-intelligence/index.ts";

const enterpriseId = "c482c57a-4f36-4bda-8c78-3940bb77a444";
const decidedAt = "2026-08-06T10:00:00.000Z";
const cited = (text, evidenceIds = ["evidence:identity-1"]) => ({ text, evidenceIds });
const reference = (system, id) => ({ system, id });
const snapshot = (system, id) => ({ system, id, version: "v1", capturedAt: decidedAt, contentHash: hashCanonical({ system, id, version: "v1" }) });

function decisionInput(overrides = {}) {
  const input = {
    enterpriseId,
    decisionType: "ALLOW",
    decisionTime: decidedAt,
    decisionOwner: { id: "workflow:screening-42", type: "WORKFLOW", displayName: "Candidate screening" },
    authoritySnapshot: snapshot("AUTHORITY_LINEAGE", "authority:snapshot-42"),
    policySnapshot: snapshot("TRUST_POLICY", "policy:screening-v4"),
    evidenceSnapshot: snapshot("EVIDENCE_GRAPH", "evidence:snapshot-42"),
    trustState: { before: "OBSERVED", atDecision: "VERIFIED", confidence: 0.86 },
    trustObjectReference: reference("TRUST_OBJECT", "trust-object:candidate-42"),
    decisionHistoryReference: reference("ENTERPRISE_DECISION_HISTORY", "decision-history:candidate-42"),
    journeyReference: reference("TRUST_JOURNEY", "journey:42"),
    replayReference: reference("REPLAY", "replay:42"),
    trustMemoryReference: reference("TRUST_MEMORY", "memory:42"),
    evidenceGraphReference: reference("EVIDENCE_GRAPH", "graph:42"),
    authorityLineageReference: reference("AUTHORITY_LINEAGE", "lineage:42"),
    businessContext: { process: "Candidate screening", objective: "Bound access to verified reviewers", impact: [cited("The screening workflow continued under the recorded scope.")] },
    operationalContext: { workflowId: "candidate:42", environment: "design-partner", correlationId: "corr-42", impact: [cited("The workflow retained its replay and review package.")] },
    aiParticipation: [{ participant: { id: "ai:explainer-1", type: "AI_AGENT" }, provider: "provider-neutral", actions: ["SUMMARIZE", "EXPLAIN"], outputReference: reference("TRUST_DECISION_INTELLIGENCE", "ai-output:42"), authoritative: false, limitations: ["AI output is explanatory only."] }],
    providerParticipation: [{ providerId: "identity-provider-1", providerName: "Identity provider", purpose: "Identity evidence", resultReference: reference("EVIDENCE_GRAPH", "provider-result:42"), status: "USED", authoritative: false, limitations: ["Provider output is evidence, not the decision."] }],
    humanReviewer: { reviewer: { id: "human:reviewer-7", type: "HUMAN" }, reviewedAt: "2026-08-06T10:02:00.000Z", disposition: "CONFIRMED", rationale: [cited("The reviewer confirmed the evidence and bounded authority.")], reviewReference: reference("TRUST_MEMORY", "review:42") },
    confidenceClassification: { score: 0.86, level: "HIGH", rationale: [cited("The identity observation and recorded policy result agree.", ["evidence:identity-1", "evidence:policy-1"])] },
    supportingEvidence: [
      { evidenceId: "evidence:identity-1", evidenceType: "PROVIDER_RESULT", source: "identity-provider-1", observedAt: decidedAt, summary: "Identity matched the assigned reviewer.", canonicalReference: reference("EVIDENCE_GRAPH", "node:identity-1") },
      { evidenceId: "evidence:policy-1", evidenceType: "POLICY_RESULT", source: "trust-policy", observedAt: decidedAt, summary: "Policy allowed the bounded action.", canonicalReference: reference("EVIDENCE_GRAPH", "node:policy-1") },
    ],
    knownUnknowns: [{ unknownId: "unknown:provider-freshness", description: "Provider freshness after the decision is not yet known.", impact: "LOW", resolutionState: "OPEN", evidenceIds: ["evidence:identity-1"] }],
    explanation: {
      why: [cited("Identity evidence and the recorded policy supported the bounded action.", ["evidence:identity-1", "evidence:policy-1"])],
      whichEvidence: ["evidence:identity-1", "evidence:policy-1"],
      whichAuthority: snapshot("AUTHORITY_LINEAGE", "authority:snapshot-42"),
      whichPolicy: snapshot("TRUST_POLICY", "policy:screening-v4"),
      whichProviders: ["identity-provider-1"],
      whichHuman: "human:reviewer-7",
      whichAI: ["ai:explainer-1"],
      uncertainty: ["Provider freshness after the decision is not yet known."],
      assumptions: [cited("The provider result was interpreted only within its recorded validity window.")],
      whatChangedAfterwards: [],
    },
    decisionNarrative: [
      cited("The assigned reviewer identity was observed by the identity provider."),
      cited("The bounded action satisfied the recorded policy.", ["evidence:policy-1"]),
    ],
    decisionOutcome: { state: "FINAL", effect: [cited("The bounded candidate-screening action was allowed.", ["evidence:policy-1"])], effectiveAt: decidedAt, finalEnterpriseOutcome: [cited("The workflow completed with its evidence package retained.")] },
    recoveryReference: null,
    supersededDecision: null,
  };
  return { ...input, ...overrides };
}

test("Epic 38 creates one integrity-bound, explainable canonical Trust Decision", () => {
  const decision = createCanonicalTrustDecision(decisionInput());
  assert.match(decision.decisionId, /^[0-9a-f-]{36}$/);
  assert.equal(decision.schemaVersion, "1.0");
  assert.equal(decision.canonicalization, "JCS");
  assert.equal(decision.trustObjectReference.system, "TRUST_OBJECT");
  assert.equal(decision.decisionHistoryReference.system, "ENTERPRISE_DECISION_HISTORY");
  assert.equal(decision.evolution[0].stage, "ORIGINAL_DECISION");
  assert.equal(evaluateTrustDecisionHealth(decision, "2026-08-06T11:00:00.000Z").state, "STABLE");
  assert.ok(formatTrustDecisionNarrative(decision).every((line) => /\[evidence:/.test(line)));
});

test("every narrative sentence and executive recommendation must cite canonical evidence", () => {
  assert.throws(() => createCanonicalTrustDecision(decisionInput({ decisionNarrative: [{ text: "Uncited claim.", evidenceIds: [] }] })), /must cite evidence/);
  const decision = createCanonicalTrustDecision(decisionInput());
  assert.throws(() => buildExecutiveMode({ decision, recommendedNextActions: [{ text: "Do something", evidenceIds: ["missing"] }] }), /grounded/);
  const reports = buildExecutiveMode({ decision, recommendedNextActions: [cited("Monitor provider freshness before the next action.")] });
  assert.deepEqual(Object.keys(reports), ["BOARD", "CEO", "CISO", "AUDIT", "LEGAL", "RISK", "OPERATIONS", "FINANCE"]);
  assert.equal(reports.AUDIT.generatedFromEvidenceOnly, true);
});

test("Decision Health deterministically reports changed, contradicted, recovered, pending, expired, superseded and incomplete", () => {
  const evolution = (stage, extra = {}) => [{ evolutionId: `evolution:${stage}`, stage, occurredAt: "2026-08-06T10:03:00.000Z", summary: cited(`${stage} was recorded.`), ...extra }];
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ evolution: evolution("SUBSEQUENT_EVIDENCE") }))).state, "CHANGED");
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ evolution: evolution("CORRECTION", { resultingDecisionType: "DENY", contradictsOriginal: true }) }))).state, "CONTRADICTED");
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ recoveryReference: reference("TRUST_MEMORY", "recovery:42"), evolution: evolution("RECOVERY") }))).state, "RECOVERED");
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ decisionOutcome: { state: "PENDING", effect: [cited("Review remains open.")], effectiveAt: decidedAt } }))).state, "PENDING");
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ decisionOutcome: { state: "EFFECTIVE", effect: [cited("Temporary access was allowed.")], effectiveAt: decidedAt, expiresAt: "2026-08-06T10:30:00.000Z" } })), "2026-08-06T11:00:00.000Z").state, "EXPIRED");
  assert.equal(evaluateTrustDecisionHealth(createCanonicalTrustDecision(decisionInput({ supersededDecision: reference("TRUST_FABRIC", "decision:new") }))).state, "SUPERSEDED");
  const incomplete = { ...createCanonicalTrustDecision(decisionInput()), contentHash: "0".repeat(64) };
  assert.equal(evaluateTrustDecisionHealth(incomplete).state, "INCOMPLETE");
});

test("design-partner, investor and future-model modes reuse references and stay non-authoritative", () => {
  const decision = createCanonicalTrustDecision(decisionInput());
  const executive = buildExecutiveMode({ decision, recommendedNextActions: [cited("Re-check provider freshness before reuse.")] }).BOARD;
  const journey = buildDesignPartnerDemonstration(decision, executive);
  assert.deepEqual(journey.map((item) => item.stage), ["CANDIDATE", "IDENTITY", "AUTHORITY", "EVIDENCE", "DECISION", "REPLAY", "TRUST_MEMORY", "TRUST_JOURNEY", "RECOVERY", "EXECUTIVE_SUMMARY"]);
  assert.equal(journey.find((item) => item.stage === "RECOVERY").status, "NOT_RECORDED");
  const investor = buildInvestorDecisionDemonstration([decision]);
  assert.equal(investor.retainedDecisions, 1);
  assert.match(investor.modelIndependence, /foundation models are free/i);
  const request = prepareSpecialistModelRequest({ requestId: "model-request-1", capability: "DECISION_SIMILARITY", decision });
  assert.deepEqual(request.permittedEvidenceIds, ["evidence:identity-1", "evidence:policy-1"]);
  assert.throws(() => validateSpecialistModelResponse({ requestId: "model-request-1", capability: "DECISION_SIMILARITY", recommendations: [cited("Similar decision found.")], uncertainty: [], authoritative: true, mutatesTrust: false, mutatesPolicy: false, mutatesAuthority: false, createsEvidence: false }, decision), /advisory/);
});
