import { hashCanonical } from "../trust-core/hash.ts";
import {
  evaluatePolicyAssistance,
  evaluateWorkforceContinuity,
  parsePolicyEvidence,
  type WorkforceContinuityEvidence,
} from "./policy-continuity.ts";

const workspace = "20000000-0000-4000-8000-000000000001";
const workflow = "20000000-0000-4000-8000-000000000002";
const entity = "human:candidate-alice";
const policyReference = "candidate-ai-assistance:3.2";

export function candidateAliceInvestorDemo() {
  const policy = parsePolicyEvidence({
    policyId: "candidate-ai-assistance",
    policyVersion: "3.2",
    policyEffectiveAt: "2026-08-01T00:00:00.000Z",
    policySource: "employer_policy_portal",
    policyDigest: "a".repeat(64),
    policyScope: ["candidate_interview"],
    permittedAiAssistance: [],
    prohibitedAiAssistance: ["realtime_answer_assistance_unless_disclosed"],
    requiredDisclosure: true,
    requiredConsent: true,
    requiredIdentityControls: ["identity_verification", "interview_identity_continuity"],
    candidateAcknowledgement: "ACKNOWLEDGED",
    acknowledgementTimestamp: "2026-08-10T08:05:00.000Z",
    acknowledgementMethod: "candidate_portal_checkbox",
    sessionId: "session:alice-interview",
    interviewId: "interview:alice-001",
    evidenceReferences: ["evidence:policy-display", "evidence:acknowledgement"],
  }, { workspace, workflow, policyReference });
  const candidateEvaluation = evaluatePolicyAssistance({
    policy,
    assistanceObserved: true,
    assistanceDeclared: false,
    disclosurePresent: false,
    corroborated: true,
  });
  const continuity: WorkforceContinuityEvidence[] = [
    ["APPLICATION_IDENTITY", "CONTINUITY_VERIFIED", null, "identity_verification_provider", "2026-08-10T08:00:00.000Z"],
    ["VERIFICATION_IDENTITY", "CONTINUITY_VERIFIED", null, "identity_verification_provider", "2026-08-10T08:02:00.000Z"],
    ["INTERVIEW_IDENTITY", "CONTINUITY_VERIFIED", null, "interview_platform", "2026-08-10T09:00:00.000Z"],
    ["OFFER_IDENTITY", "CONTINUITY_VERIFIED", null, "hr_system_reference", "2026-08-12T12:00:00.000Z"],
    ["ONBOARDING_IDENTITY", "CONTINUITY_VERIFIED", null, "identity_verification_provider", "2026-08-18T08:00:00.000Z"],
    ["ISSUED_DEVICE", "CONTINUITY_VERIFIED", null, "device_shipment_provenance", "2026-08-18T09:00:00.000Z"],
    ["CORPORATE_ACCOUNT", "CONTINUITY_VERIFIED", null, "corporate_identity_provider", "2026-08-18T09:15:00.000Z"],
    ["FIRST_ACCESS", "CONTINUITY_VERIFIED", null, "corporate_identity_provider", "2026-08-18T09:20:00.000Z"],
    ["PRIVILEGED_ACCESS", "CONTINUITY_UNPROVEN", "LOGIN_DEVICE_CHANGED", "endpoint_identity_provider", "2026-08-21T08:00:00.000Z"],
    ["CONTINUING_WORKFORCE_IDENTITY", "CONTINUITY_UNPROVEN", "REMOTE_ACCESS_PATH_OBSERVED", "remote_access_provider", "2026-08-21T08:01:00.000Z"],
  ].map(([stage, state, finding, source, observedAt]) => ({
    evidenceType: "WORKFORCE_CONTINUITY",
    workspace,
    workflow,
    operationalEntityId: entity,
    stage: stage as WorkforceContinuityEvidence["stage"],
    state: state as WorkforceContinuityEvidence["state"],
    finding: finding as WorkforceContinuityEvidence["finding"],
    source: String(source),
    observedAt: String(observedAt),
    evidenceReferences: [`evidence:${String(stage).toLowerCase()}`],
  }));
  const workforceEvaluation = evaluateWorkforceContinuity(continuity);
  const evidence = [
    { evidence_id: "demo-policy", evidence_type: "TRACK_BLOCK_POLICY_EVIDENCE", source_key: policy.policySource, occurred_at: policy.policyEffectiveAt, normalized_facts: { category: "policy", evidenceType: "POLICY_EVIDENCE", classification: "policy_in_force", severity: "informational", metadata: policy } },
    { evidence_id: "demo-ai-observation", evidence_type: "TRACK_BLOCK_AI_ASSISTANCE_OBSERVED", source_key: "application_signal", occurred_at: "2026-08-10T09:15:00.000Z", normalized_facts: { category: "ai_assistance", evidenceType: "ai_assistance_observed", classification: "observed", severity: "medium", metadata: { providerClass: "AI_ASSISTANCE_PROVIDER", corroborated: true, independentEvidenceReference: "evidence:interview-observation" } } },
    ...continuity.map((item, index) => ({ evidence_id: `demo-continuity-${index}`, evidence_type: "TRACK_BLOCK_WORKFORCE_CONTINUITY", source_key: item.source, occurred_at: item.observedAt, normalized_facts: { category: ["ISSUED_DEVICE", "FIRST_ACCESS", "PRIVILEGED_ACCESS"].includes(item.stage) ? "device" : item.stage === "CONTINUING_WORKFORCE_IDENTITY" ? "remote_access" : "identity", evidenceType: "WORKFORCE_CONTINUITY", classification: item.state, severity: item.state === "CONTINUITY_VERIFIED" ? "informational" : "medium", metadata: item } })),
  ];
  const candidateDecision = candidateEvaluation.authorization ?? "ALLOW";
  const workforceDecision = workforceEvaluation.authorization ?? "ALLOW";
  return {
    demo: true,
    workspace,
    workflow: { id: workflow, workflow_type: "candidate_interview → employee_onboarding → privileged_access", status: workforceDecision === "REVIEW" ? "challenge_required" : "active", subject_entity_id: entity, consent_reference: "demo-consent", policy_reference: policyReference, latest_intervention: workforceEvaluation.intervention },
    evidence,
    policyEvidence: [{ ...policy, evidenceReference: "demo-policy", decisionTransactionReference: "demo-candidate-decision" }],
    identityContinuity: workforceEvaluation,
    canonicalTransactions: [
      { transaction_id: "demo-candidate-decision", decision: candidateDecision, reason_codes: candidateEvaluation.reasonCodes, policy_id: policy.policyId, policy_version: policy.policyVersion, requested_at: "2026-08-10T09:16:00.000Z", digest: hashCanonical(candidateEvaluation) },
      { transaction_id: "demo-workforce-decision", decision: workforceDecision, reason_codes: workforceEvaluation.reasonCodes, policy_id: policy.policyId, policy_version: policy.policyVersion, requested_at: "2026-08-21T08:02:00.000Z", digest: hashCanonical(workforceEvaluation) },
    ],
    interventions: [{ intervention_type: workforceEvaluation.intervention, status: "APPLIED" }],
    replay: [{ generated_by: "POLICY_ACKNOWLEDGED" }, { generated_by: "CANONICAL_DECISION" }, { generated_by: "IDENTITY_CONTINUITY_CHANGED" }, { generated_by: "STEP_UP_STARTED" }],
    trustMemory: [{ memory_type: "POLICY_ACKNOWLEDGED" }, { memory_type: "AI_ASSISTANCE_POLICY_CONFLICT" }, { memory_type: "IDENTITY_CONTINUITY_CHANGED" }, { memory_type: "REMOTE_ACCESS_PATH_OBSERVED" }, { memory_type: "STEP_UP_VERIFICATION_REQUIRED" }],
  };
}
