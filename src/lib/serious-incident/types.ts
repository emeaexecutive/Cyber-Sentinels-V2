export const assessmentStates = [
  "draft",
  "evidence_collection",
  "technical_review",
  "security_review",
  "compliance_review",
  "data_protection_review",
  "legal_review",
  "executive_review",
  "potentially_reportable",
  "not_reportable",
  "reporting_required",
  "submitted",
  "additional_information_requested",
  "corrective_action_open",
  "resolved",
  "reopened",
] as const;

export const incidentCategories = [
  "unauthorized_system_access",
  "execution_boundary_violation",
  "ai_outside_authorized_control",
  "model_or_agent_containment_failure",
  "cybersecurity_compromise",
  "unintended_external_action",
  "credential_exposure",
  "data_disclosure",
  "prohibited_tool_use",
  "authority_violation",
  "harmful_manipulation",
  "human_oversight_failure",
  "enforcement_failure",
  "serious_malfunction",
  "third_party_harm",
  "systemic_risk_event",
  "other",
] as const;

export const organizationRoles = ["provider", "deployer", "importer", "distributor", "product_manufacturer", "authorized_representative", "other"] as const;
export const screeningOutcomes = ["no_known_trigger", "potential_trigger", "multiple_potential_triggers", "insufficient_information", "specialist_review_required"] as const;
export const impactCategories = ["no_confirmed_impact", "attempted_access", "successful_unauthorized_access", "confidentiality_impact", "integrity_impact", "availability_impact", "financial_impact", "fundamental_rights_impact", "human_control_impact", "third_party_impact", "critical_infrastructure_impact", "systemic_risk_impact", "unknown"] as const;
export const reviewerRoles = ["technical_reviewer", "security_reviewer", "system_owner", "compliance_reviewer", "legal_reviewer", "data_protection_reviewer", "executive_approver", "external_adviser", "regulator_liaison"] as const;
export const decisionTypes = ["technical_finding", "impact_assessment", "regulatory_relevance_assessment", "reporting_decision", "submission_approval", "corrective_action_approval", "closure_approval", "reopening_decision"] as const;
export const packageStates = ["internal_draft", "reviewer_approved", "regulator_ready", "submitted", "superseded"] as const;
export const containmentStates = ["recommended", "approved", "requested", "provider_acknowledged", "attempted", "provider_confirmed", "independently_confirmed", "partially_effective", "failed", "contradicted", "outcome_unknown"] as const;
export const replayClassifications = ["TECHNICAL EVIDENCE", "PROVIDER ASSERTION", "PROVIDER CONCLUSION", "CYBER SENTINELS OPERATIONAL SCREENING", "REVIEWER DECISION", "LEGAL CONCLUSION", "REGULATOR RESPONSE", "CORRECTIVE ACTION"] as const;
export const responsibilityRoleTypes = ["model_provider","system_provider","deployer","agent_developer","application_owner","system_owner","incident_owner","evaluation_sponsor","evaluation_operator","infrastructure_provider","sandbox_or_harness_provider","runtime_security_provider","identity_provider","access_provider","affected_customer","affected_third_party","incident_responder","technical_reviewer","security_reviewer","compliance_reviewer","legal_reviewer","data_protection_reviewer","external_adviser","regulator_liaison","executive_approver"] as const;

export const chronologyEventTypes = [
  "system_approved", "system_deployed", "runtime_started", "agent_started", "triggering_instruction_received", "provider_signal_received",
  "unauthorized_action_initiated", "unintended_action_initiated", "execution_boundary_crossed", "external_resource_reached", "impact_first_observed",
  "incident_detected", "organization_became_aware", "escalation_initiated", "containment_recommended", "containment_approved", "containment_requested",
  "provider_acknowledged", "containment_attempted", "containment_confirmed", "containment_contradicted", "containment_failed", "affected_party_notified",
  "regulator_assessment_started", "reporting_decision_made", "package_approved", "submission_made", "regulator_acknowledged",
  "additional_information_requested", "additional_evidence_supplied", "corrective_measure_started", "corrective_measure_completed", "system_restored",
  "incident_closed", "incident_reopened",
] as const;

export type AssessmentState = (typeof assessmentStates)[number];
export type IncidentCategory = (typeof incidentCategories)[number];
export type OrganizationRole = (typeof organizationRoles)[number];
export type ScreeningOutcome = (typeof screeningOutcomes)[number];
export type ImpactCategory = (typeof impactCategories)[number];
export type ReviewerRole = (typeof reviewerRoles)[number];
export type DecisionType = (typeof decisionTypes)[number];
export type PackageState = (typeof packageStates)[number];
export type ContainmentState = (typeof containmentStates)[number];
export type ReplayClassification = (typeof replayClassifications)[number];
export type ChronologyEventType = (typeof chronologyEventTypes)[number];
export type ResponsibilityRoleType = (typeof responsibilityRoleTypes)[number];
export type WorkspaceRole = "owner" | "admin" | "reviewer" | "observer";
export type EvidenceCompleteness = "complete" | "partial" | "insufficient" | "unknown";
export type EvidenceConfidence = "confirmed" | "high" | "medium" | "low" | "unknown";

export type IncidentIdentity = {
  agentId: string;
  aiSystemId: string;
  modelProvider: string;
  modelFamily: string;
  modelVersion: string;
  agentVersion: string;
  deploymentReference: string;
  runtimeSessionReference?: string | null;
  responsibleHuman: string;
  accountableOrganization: string;
  systemOwner: string;
  incidentOwner: string;
};

export type RegulatoryContext = {
  jurisdiction: string;
  frameworkReference?: string | null;
  systemClassification: string;
  gpaiSystemicRiskStatus?: string | null;
  organizationalRole: OrganizationRole;
  incidentCategory: IncidentCategory;
  providerClassification?: string | null;
  technicalClassification: string;
  operationalScreeningClassification?: string | null;
  complianceReviewClassification?: string | null;
  legalReviewClassification?: string | null;
  regulatorClassification?: string | null;
};

export type IncidentClock = {
  firstOccurrenceAt?: string | null;
  firstProviderObservationAt?: string | null;
  firstCyberSentinelsIngestionAt: string;
  firstDetectionAt: string;
  firstHumanReviewAt?: string | null;
  organizationAwarenessAt?: string | null;
  materialityDeterminationAt?: string | null;
  containmentStartedAt?: string | null;
  containmentConfirmedAt?: string | null;
  reportingDecisionAt?: string | null;
  submissionAt?: string | null;
  regulatorAcknowledgementAt?: string | null;
  recoveryAt?: string | null;
  closureAt?: string | null;
};

export type IncidentReferences = {
  affectedSystems: string[];
  affectedOrganizations: string[];
  affectedThirdParties: string[];
  impactSummary: string;
  evidenceCompleteness: EvidenceCompleteness;
  evidenceLimitations: string[];
  replayReference?: string | null;
  trustMemoryReference?: string | null;
  evidenceGraphReference?: string | null;
  authorityLineageReference?: string | null;
  environmentAttestationReference?: string | null;
  scopeContinuityDecisionReference?: string | null;
};

export type ResponsibilityRole = {
  id: string;
  roleType: ResponsibilityRoleType;
  partyType: "organization" | "human" | "provider" | "system";
  partyReference: string;
  authorityReference?: string | null;
  assignedAt: string;
  assignedBy: string;
  supersedesRoleId?: string | null;
};

export type EvidenceSnapshotInput = {
  id: string;
  capturedAt: string;
  aiSystemIdentity: string;
  agentIdentity: string;
  modelProvider: string;
  modelFamily: string;
  modelVersion: string;
  agentVersion: string;
  promptConfigurationDigest?: string | null;
  maskedPromptReference?: string | null;
  toolConfiguration: string[];
  connectorConfiguration: string[];
  authorityGrantReferences: string[];
  scopeAuthorizationLeaseReference?: string | null;
  declaredEnvironmentReference?: string | null;
  configuredEnvironmentReference?: string | null;
  observedEnvironmentReferences: string[];
  effectiveAccess: string[];
  permittedTargets: string[];
  observedTargets: string[];
  credentialStateClassification: string;
  policyVersion: string;
  monitoringProviderHealth: string;
  unresolvedFindings: string[];
  approvedExceptionReferences: string[];
  responsibleHumanState: string;
  deploymentApprovalReference?: string | null;
  assuranceBaselineReference?: string | null;
  containmentReadiness: string;
  providerEvidenceReferences: string[];
  evidenceLimitations: string[];
  supersedesSnapshotId?: string | null;
};

export type ScreeningInput = {
  jurisdiction?: string | null;
  systemClassification?: string | null;
  gpaiSystemicRisk: boolean | null;
  highRiskUseContext: boolean | null;
  cybersecurityImpact: boolean | null;
  outsideAuthorizedHumanControl: boolean | null;
  seriousMalfunction: boolean | null;
  thirdPartyHarm: boolean | null;
  fundamentalRightsImpact: boolean | null;
  criticalSectorImpact: boolean | null;
  modelProviderRole: boolean | null;
  deployerRole: boolean | null;
  contractualReportingObligation: boolean | null;
  organizationAwarenessRecorded: boolean;
  containmentFailure: boolean | null;
  evidenceCompleteness: EvidenceCompleteness;
};

export type ScreeningResult = {
  id: string;
  outcome: ScreeningOutcome;
  label: "OPERATIONAL SCREENING — NOT A LEGAL CONCLUSION";
  reasonCodes: string[];
  potentialTriggers: string[];
  missingEvidence: string[];
  recommendedReviewerRoles: ReviewerRole[];
  evaluatedAt: string;
  policyId: string;
  policyVersion: string;
  resultDigest: string;
};

export type SeriousIncidentAssessmentInput = {
  id: string;
  enterpriseId: string;
  state: AssessmentState;
  identity: IncidentIdentity;
  regulatoryContext: RegulatoryContext;
  clocks: IncidentClock;
  references: IncidentReferences;
  responsibilityRoles: ResponsibilityRole[];
  evidenceSnapshot: EvidenceSnapshotInput;
  screeningInput: ScreeningInput;
  createdAt: string;
};

export type IncidentChronologyEvent = {
  id: string;
  enterpriseId: string;
  incidentId: string;
  eventType: ChronologyEventType;
  source: string;
  sourceType: string;
  sourceAuthority: string;
  occurredAt: string;
  timestampConfidence: EvidenceConfidence;
  ingestedAt: string;
  orderingConfidence: EvidenceConfidence;
  evidenceReference?: string | null;
  integrityState: "verified" | "unverified" | "invalid" | "unknown";
  correlationId: string;
  classification: ReplayClassification;
  summary: string;
  containmentState?: ContainmentState | null;
  deadlineMetadata?: { deadline: string; sourceType: "reviewer_supplied" | "policy_supplied" | "externally_supplied"; ruleSource: string; rationale: string; timezone: string; uncertainty: string; approvedBy: string } | null;
  supersedesEventId?: string | null;
};

export type ImpactAssessmentInput = {
  id: string;
  categories: ImpactCategory[];
  affectedResourceReferences: string[];
  affectedDataClassifications: string[];
  affectedOrganizations: string[];
  affectedUserEstimate?: number | null;
  durationSeconds?: number | null;
  geographicScope: string[];
  reversibility: string;
  persistence: string;
  independentConfirmation: boolean;
  evidenceReferences: string[];
  evidenceLimitations: string[];
  confidence: EvidenceConfidence;
  reviewerConfirmed: boolean;
  assessedAt: string;
  supersedesImpactId?: string | null;
};

export type ReviewerDecisionInput = {
  id: string;
  reviewerRole: ReviewerRole;
  organizationalAuthority: string;
  decisionType: DecisionType;
  decision: string;
  targetState?: AssessmentState | null;
  approvedPackageId?: string | null;
  rationale: string;
  evidenceReferences: string[];
  unresolvedIssues: string[];
  conditions: string[];
  decidedAt: string;
  approvalChain: string[];
  supersedesDecisionId?: string | null;
  conflictOfInterestDeclared?: boolean | null;
};

export type SubmissionPackageInput = {
  id: string;
  version: number;
  state: PackageState;
  incidentSummary: string;
  evidenceIndex: string[];
  unresolvedUncertainty: string[];
  evidenceIntegrityDigests: string[];
  replayReference?: string | null;
  trustMemoryReference?: string | null;
  exportSchemaVersion: string;
  exportedAt: string;
  approvedByDecisionId?: string | null;
  supersedesPackageId?: string | null;
};

export type SubmissionPackage = SubmissionPackageInput & {
  packageDigest: string;
  machineReadable: Record<string, unknown>;
  humanReadableSummary: string;
};

export type ExternalSubmissionInput = {
  id: string;
  state: "prepared" | "internally_approved" | "transferred" | "acknowledged" | "rejected" | "returned_for_clarification" | "supplemented" | "closed";
  destinationAuthority: string;
  jurisdiction: string;
  submissionChannel: string;
  externalReference?: string | null;
  submittedAt?: string | null;
  submittingActor?: string | null;
  packageId: string;
  packageVersion: number;
  packageDigest: string;
  acknowledgementReference?: string | null;
  acknowledgementAt?: string | null;
  followUpDeadline?: string | null;
  limitations: string[];
  supersedesSubmissionId?: string | null;
};

export type CorrectiveActionInput = {
  id: string;
  actionType: string;
  actionOwner: string;
  accountableApprover: string;
  targetDate?: string | null;
  completionDate?: string | null;
  completionEvidenceReferences: string[];
  validationEvidenceReferences: string[];
  residualRisk: string;
  reviewerApprovalDecisionId?: string | null;
  effectivenessState: "planned" | "in_progress" | "completed_unvalidated" | "validated" | "ineffective" | "unknown";
  linkedContradictionReference?: string | null;
  linkedFindingReference?: string | null;
  linkedPackageReference?: string | null;
  supersedesCorrectiveActionId?: string | null;
};

export type EvidenceSupersessionInput = {
  id: string;
  recordType: "provider_evidence" | "impact_assessment" | "incident_classification" | "responsibility_attribution" | "containment_outcome" | "reporting_decision" | "corrective_action" | "evidence_snapshot";
  originalRecordId: string;
  correctedRecordId: string;
  correctionReason: string;
  evidenceReferences: string[];
  approvedByDecisionId?: string | null;
  correctedAt: string;
};

export type SeriousIncidentArtifacts = {
  authorityLineage: Array<{ type: string; from: string; to: string; evidenceReference?: string | null; occurredAt: string }>;
  evidenceGraph: { nodes: Array<{ id: string; type: string; label: string; metadata: Record<string, unknown> }>; relationships: Array<{ from: string; to: string; type: string; evidenceReference?: string | null }> };
  replay: IncidentChronologyEvent[];
  trustMemory: Array<{ eventKind: string; subject: string; evidenceReferences: string[]; decisionAuthority?: string | null; reason: string; occurredAt: string; supersedesEventId?: string | null }>;
};
