import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import type { ReviewerRole, ScreeningInput, ScreeningResult } from "./types.ts";

const SCREENING_LABEL = "OPERATIONAL SCREENING — NOT A LEGAL CONCLUSION" as const;

export function screenPotentialRegulatoryRelevance(input: ScreeningInput, evaluatedAt: string): ScreeningResult {
  const triggers: Array<[boolean | null, string, string, ReviewerRole[]]> = [
    [input.cybersecurityImpact, "CYBERSECURITY_IMPACT_REVIEW", "cybersecurity_impact", ["security_reviewer", "compliance_reviewer"]],
    [input.outsideAuthorizedHumanControl, "OUTSIDE_AUTHORIZED_HUMAN_CONTROL", "outside_authorized_human_control", ["technical_reviewer", "legal_reviewer"]],
    [input.seriousMalfunction, "SERIOUS_MALFUNCTION_REVIEW", "serious_malfunction", ["technical_reviewer", "compliance_reviewer"]],
    [input.thirdPartyHarm, "THIRD_PARTY_HARM_REVIEW", "third_party_harm", ["legal_reviewer", "data_protection_reviewer"]],
    [input.fundamentalRightsImpact, "FUNDAMENTAL_RIGHTS_REVIEW", "fundamental_rights_impact", ["legal_reviewer", "data_protection_reviewer"]],
    [input.criticalSectorImpact, "CRITICAL_SECTOR_REVIEW", "critical_sector_impact", ["security_reviewer", "executive_approver"]],
    [input.gpaiSystemicRisk, "GPAI_SYSTEMIC_RISK_REVIEW", "gpai_systemic_risk", ["compliance_reviewer", "legal_reviewer"]],
    [input.contractualReportingObligation, "CONTRACTUAL_REPORTING_REVIEW", "contractual_reporting_obligation", ["compliance_reviewer", "legal_reviewer"]],
    [input.containmentFailure, "CONTAINMENT_FAILURE_REVIEW", "containment_failure", ["security_reviewer", "executive_approver"]],
  ];
  const matched = triggers.filter(([value]) => value === true);
  const missingEvidence: string[] = [];
  if (!input.jurisdiction) missingEvidence.push("jurisdiction");
  if (!input.systemClassification) missingEvidence.push("system_classification");
  if (!input.organizationAwarenessRecorded) missingEvidence.push("organization_awareness_timestamp");
  if (input.evidenceCompleteness === "insufficient" || input.evidenceCompleteness === "unknown") missingEvidence.push("material_evidence");
  if ([input.cybersecurityImpact, input.outsideAuthorizedHumanControl, input.seriousMalfunction, input.thirdPartyHarm].every((value) => value === null)) missingEvidence.push("operational_impact_classification");

  let outcome: ScreeningResult["outcome"];
  if (matched.some(([, code]) => ["OUTSIDE_AUTHORIZED_HUMAN_CONTROL", "FUNDAMENTAL_RIGHTS_REVIEW", "CRITICAL_SECTOR_REVIEW", "GPAI_SYSTEMIC_RISK_REVIEW"].includes(code))) outcome = "specialist_review_required";
  else if (matched.length > 1) outcome = "multiple_potential_triggers";
  else if (matched.length === 1) outcome = "potential_trigger";
  else if (missingEvidence.length) outcome = "insufficient_information";
  else outcome = "no_known_trigger";

  const reasonCodes = matched.map(([, code]) => code);
  if (!reasonCodes.length) reasonCodes.push(outcome === "no_known_trigger" ? "NO_KNOWN_OPERATIONAL_TRIGGER" : "SCREENING_INFORMATION_INSUFFICIENT");
  const recommendedReviewerRoles = [...new Set(matched.flatMap(([, , , roles]) => roles))];
  if (outcome === "insufficient_information" && !recommendedReviewerRoles.length) recommendedReviewerRoles.push("technical_reviewer", "compliance_reviewer");
  const base = {
    outcome,
    label: SCREENING_LABEL,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    potentialTriggers: matched.map(([, , trigger]) => trigger).sort(),
    missingEvidence: [...new Set(missingEvidence)].sort(),
    recommendedReviewerRoles: recommendedReviewerRoles.sort(),
    evaluatedAt,
    policyId: "serious-incident-operational-screening",
    policyVersion: "1.0.0",
  };
  return { id: deterministicUuid(base), ...base, resultDigest: hashCanonical(base) };
}

export const operationalScreeningLabel = SCREENING_LABEL;
