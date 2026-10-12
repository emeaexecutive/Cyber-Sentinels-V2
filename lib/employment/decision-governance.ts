export type EmploymentOutcome = "HIRED" | "NOT_HIRED" | "HOLD" | "WITHDRAWN" | "MORE_EVIDENCE_REQUIRED";

export type EmploymentDecisionPolicy = {
  policyId: string;
  policyVersion: string;
  humanReviewRequired: boolean;
  disclosureRequired: boolean;
};

export type EmploymentFinding = {
  system: string;
  provider: string;
  model: string;
  version: string;
  provenanceReference: string;
  finding: string;
  criteria: string[];
  operatingRules: string[];
  evidenceReferences: string[];
};

export type EmploymentReview = {
  reviewerId: string;
  authorityReference: string;
  rationale: string;
  actions: string[];
  reviewedEvidenceReferences: string[];
};

export function employmentReviewerAuthorityIsCurrent(
  authority: Record<string, unknown> | null,
  reviewerId: string,
  now = Date.now(),
  expectedReference?: string,
) {
  if (!authority || authority.subject_type !== "human" || String(authority.subject_id) !== reviewerId || authority.revocation_state !== "active") return false;
  const issuedAt = Date.parse(String(authority.issued_at));
  const expiresAt = Date.parse(String(authority.expires_at));
  const contract = authority.contract && typeof authority.contract === "object" && !Array.isArray(authority.contract)
    ? authority.contract as Record<string, unknown>
    : {};
  const requiredAuthority = Array.isArray(contract.requiredAuthority) ? contract.requiredAuthority.map(String) : [];
  return issuedAt <= now && expiresAt > now
    && requiredAuthority.includes("employment_decision_reviewer")
    && (!expectedReference || String(authority.contract_id) === expectedReference);
}

const meaningfulReviewActions = new Set([
  "EVIDENCE_INSPECTED",
  "CRITERIA_APPLIED",
  "CANDIDATE_CONTEXT_CONSIDERED",
  "CHALLENGE_CONSIDERED",
  "CONTRADICTION_RESOLVED",
  "CORRECTION_REQUESTED",
]);

function requiredText(value: unknown, field: string, maxLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function referenceList(value: unknown, field: string, minimum = 1) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array of references.`);
  const result = [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  if (result.length < minimum || result.length > 100 || result.some((item) => item.length > 240)) {
    throw new TypeError(`${field} must contain ${minimum} to 100 valid references.`);
  }
  return result;
}

export function validateEmploymentFinding(value: Record<string, unknown>): EmploymentFinding {
  const model = value.model && typeof value.model === "object" && !Array.isArray(value.model)
    ? value.model as Record<string, unknown>
    : {};
  return {
    system: requiredText(value.system, "system", 160),
    provider: requiredText(model.provider, "model.provider", 160),
    model: requiredText(model.name, "model.name", 160),
    version: requiredText(model.version, "model.version", 160),
    provenanceReference: requiredText(model.provenanceReference, "model.provenanceReference", 240),
    finding: requiredText(value.finding, "finding", 2000),
    criteria: referenceList(value.criteria, "criteria"),
    operatingRules: referenceList(value.operatingRules, "operatingRules"),
    evidenceReferences: referenceList(value.evidenceReferences, "evidenceReferences"),
  };
}

export function validateIndependentEmploymentReview(
  value: Record<string, unknown>,
  context: { reviewerId: string; caseCreatorId: string; authorityCurrent: boolean; policy: EmploymentDecisionPolicy },
): EmploymentReview {
  if (!context.policy.humanReviewRequired) throw new TypeError("The active employment policy must require human review.");
  if (!context.authorityCurrent) throw new TypeError("A current, unexpired reviewer authority is required.");
  if (!context.reviewerId || context.reviewerId === context.caseCreatorId) {
    throw new TypeError("The case creator cannot approve their own employment review.");
  }
  const rationale = requiredText(value.rationale, "rationale", 4000);
  if (rationale.length < 40 || /^(approve|approved|looks good|agree)\b[.! ]*$/i.test(rationale)) {
    throw new TypeError("Independent review requires a substantive rationale, not a rubber-stamp response.");
  }
  const actions = referenceList(value.actions, "actions", 2);
  if (actions.some((action) => !meaningfulReviewActions.has(action))) {
    throw new TypeError("Review actions must identify meaningful evidence or criteria work.");
  }
  return {
    reviewerId: context.reviewerId,
    authorityReference: requiredText(value.authorityReference, "authorityReference", 240),
    rationale,
    actions,
    reviewedEvidenceReferences: referenceList(value.reviewedEvidenceReferences, "reviewedEvidenceReferences"),
  };
}

export function validateSupportedEmploymentOverride(value: Record<string, unknown>, originalEvidenceReferences: string[]) {
  const rationale = requiredText(value.rationale, "rationale", 4000);
  if (rationale.length < 40) throw new TypeError("An override requires a substantive rationale.");
  const evidenceReferences = referenceList(value.evidenceReferences, "evidenceReferences");
  if (!evidenceReferences.some((reference) => !originalEvidenceReferences.includes(reference))) {
    throw new TypeError("An override requires supporting evidence beyond the original AI finding.");
  }
  return { rationale, evidenceReferences };
}

export function validateHumanEmploymentDetermination(value: Record<string, unknown>, context: {
  actorId: string;
  caseCreatorId: string;
  review: EmploymentReview | null;
  policy: EmploymentDecisionPolicy;
}) {
  if (!context.policy.humanReviewRequired || !context.review) {
    throw new TypeError("A completed independent human review is required before determination.");
  }
  if (context.actorId === context.caseCreatorId) {
    throw new TypeError("The case creator cannot self-approve the final determination.");
  }
  const outcome = requiredText(value.outcome, "outcome", 40) as EmploymentOutcome;
  if (!["HIRED", "NOT_HIRED", "HOLD", "WITHDRAWN", "MORE_EVIDENCE_REQUIRED"].includes(outcome)) {
    throw new TypeError("outcome is not a supported human determination.");
  }
  return {
    outcome,
    rationale: requiredText(value.rationale, "rationale", 4000),
    evidenceReferences: referenceList(value.evidenceReferences, "evidenceReferences"),
    determinedBy: context.actorId,
    determinedByHuman: true as const,
  };
}

export function validateEmploymentDisclosure(value: Record<string, unknown>, policy: EmploymentDecisionPolicy) {
  if (!policy.disclosureRequired) throw new TypeError("The active policy does not require a disclosure event.");
  const contentHash = requiredText(value.contentHash, "contentHash", 80);
  if (!/^sha256:[a-f0-9]{64}$/i.test(contentHash)) throw new TypeError("contentHash must be a SHA-256 digest.");
  const transmittedAt = requiredText(value.transmittedAt, "transmittedAt", 40);
  if (!Number.isFinite(Date.parse(transmittedAt)) || Date.parse(transmittedAt) > Date.now()) {
    throw new TypeError("transmittedAt must be a valid timestamp no later than now.");
  }
  const recipientReference = requiredText(value.recipientReference, "recipientReference", 240);
  if (!/^candidate:[a-z0-9][a-z0-9._:-]{1,120}$/i.test(recipientReference)) {
    throw new TypeError("recipientReference must be an opaque candidate reference.");
  }
  return {
    contentVersion: requiredText(value.contentVersion, "contentVersion", 160),
    contentHash,
    recipientReference,
    transmittedAt: new Date(transmittedAt).toISOString(),
    deliveryEvidenceReference: requiredText(value.deliveryEvidenceReference, "deliveryEvidenceReference", 240),
  };
}