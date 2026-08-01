import "server-only";
import { hashCanonical } from "../trust-core/hash.ts";
import { buildSeriousIncidentArtifacts } from "./integrations.ts";
import { assertSupersedingPackage, buildSubmissionPackage } from "./packages.ts";
import { seriousIncidentRepository } from "./repository.ts";
import { screenPotentialRegulatoryRelevance } from "./screening.ts";
import type { AssessmentState, ReviewerRole, SeriousIncidentAssessmentInput, WorkspaceRole } from "./types.ts";
import { assertContainmentProgression, assertReviewerAuthorization, assertTransitionPrerequisites, deadlineProvenance } from "./workflow.ts";
import { assertSeriousIncidentRecordShape, validateAssessmentInput, validateChronologyEvent, validateCorrectiveAction, validateDeadlineMetadata, validateEvidenceSnapshot, validateEvidenceSupersession, validateExternalSubmission, validateImpact, validatePackage, validateReviewerDecision, validateScreeningInput } from "./validation.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reviewerRoleNames = new Set(["technical_reviewer", "security_reviewer", "system_owner", "compliance_reviewer", "legal_reviewer", "data_protection_reviewer", "executive_approver", "external_adviser", "regulator_liaison"]);
const protectedSelfAssignedRoles = new Set(["compliance_reviewer", "legal_reviewer", "data_protection_reviewer", "executive_approver", "external_adviser", "regulator_liaison"]);

function conflict(code: string, message: string): never { throw Object.assign(new Error(message), { status: 409, code }); }
function denied(code: string, message: string): never { throw Object.assign(new Error(message), { status: 403, code }); }
function uuidReference(value: string, name: string) { if (!UUID.test(value)) conflict("CANONICAL_REFERENCE_INVALID", `${name} must identify a canonical UUID record.`); return value; }
async function requireIncidentRole(repository: ReturnType<typeof seriousIncidentRepository>, enterpriseId: string, incidentId: string, actorId: string, allowed: string[], code: string) { const roles=await repository.assignedReviewerRoles(enterpriseId,incidentId,actorId);if(!roles.some((role)=>allowed.includes(role)))denied(code,"The authenticated actor lacks an active incident-bound role for this mutation.");return roles; }

async function ensureCase(repository: ReturnType<typeof seriousIncidentRepository>, enterpriseId: string, incidentId: string) {
  const incident = await repository.assessment(enterpriseId, incidentId);
  if (!incident) throw Object.assign(new Error("Incident assessment was not found."), { status: 404, code: "INCIDENT_NOT_FOUND" });
  return incident as Record<string, unknown>;
}

function currentAssessmentState(assessment: Record<string, unknown>, bundle: Record<string, unknown>): AssessmentState {
  const decisions = bundle.incident_reviewer_decisions as Array<Record<string, unknown>>;
  const latest = [...decisions].reverse().find((row) => typeof row.target_state === "string" && row.target_state);
  return String(latest?.target_state ?? assessment.initial_state) as AssessmentState;
}

function outstandingCorrectiveActionIds(bundle: Record<string, unknown>) {
  const actions = bundle.incident_corrective_actions as Array<Record<string, unknown>>;
  const superseded = new Set(actions.map((row) => row.supersedes_corrective_action_id).filter(Boolean).map(String));
  return actions.filter((row) => !superseded.has(String(row.id)) && String(row.effectiveness_state) !== "validated").map((row) => String(row.id));
}

async function assertCanonicalEpic26References(repository: ReturnType<typeof seriousIncidentRepository>, enterpriseId: string, assessment: SeriousIncidentAssessmentInput) {
  const references: Array<readonly ["execution_context_declarations" | "environment_attestations" | "scope_authorization_leases" | "scope_continuity_decisions", string | null | undefined, string]> = [
    ["environment_attestations", assessment.references.environmentAttestationReference, "environmentAttestationReference"],
    ["scope_continuity_decisions", assessment.references.scopeContinuityDecisionReference, "scopeContinuityDecisionReference"],
    ["scope_authorization_leases", assessment.evidenceSnapshot.scopeAuthorizationLeaseReference, "scopeAuthorizationLeaseReference"],
    ["execution_context_declarations", assessment.evidenceSnapshot.declaredEnvironmentReference, "declaredEnvironmentReference"],
    ["execution_context_declarations", assessment.evidenceSnapshot.configuredEnvironmentReference, "configuredEnvironmentReference"],
    ...assessment.evidenceSnapshot.observedEnvironmentReferences.map((reference) => ["environment_attestations", reference, "observedEnvironmentReference"] as const),
  ];
  await Promise.all(references.filter(([, value]) => Boolean(value)).map(async ([table, value, name]) => {
    const id = uuidReference(String(value), name);
    if (!await repository.canonicalReference(enterpriseId, table, id)) conflict("CANONICAL_REFERENCE_NOT_FOUND", `${name} was not found in this enterprise.`);
  }));
}

export async function createSeriousIncidentAssessment(input: { enterpriseId: string; actorId: string; value: unknown; correlationId: string }) {
  const assessment = validateAssessmentInput(input.value);
  if (assessment.enterpriseId !== input.enterpriseId) denied("CROSS_ENTERPRISE_REFERENCE", "Cross-enterprise incident input is denied.");
  if (assessment.state !== "draft" && assessment.state !== "evidence_collection") throw Object.assign(new Error("A new incident assessment must start in draft or evidence collection."), { status: 400, code: "INITIAL_STATE_INVALID" });
  if (!assessment.responsibilityRoles.some((role) => role.partyReference === input.actorId && ["incident_owner", "system_owner"].includes(role.roleType))) denied("INCIDENT_OWNER_REQUIRED", "The creating actor must be recorded as an incident or system owner.");
  if (assessment.responsibilityRoles.some((role) => role.assignedBy !== input.actorId)) denied("RESPONSIBILITY_ASSIGNER_MISMATCH", "Initial responsibility assignments must be attributed to the creating actor.");
  if (assessment.responsibilityRoles.some((role) => reviewerRoleNames.has(role.roleType) && !role.authorityReference)) conflict("REVIEWER_AUTHORITY_REQUIRED", "Reviewer assignments require a canonical organizational authority reference.");
  if (assessment.responsibilityRoles.some((role) => role.partyReference === input.actorId && protectedSelfAssignedRoles.has(role.roleType))) denied("PROTECTED_REVIEWER_SELF_ASSIGNMENT_DENIED", "The incident creator cannot self-assign a protected specialist reviewer role.");
  const repository = seriousIncidentRepository();
  await assertCanonicalEpic26References(repository, input.enterpriseId, assessment);
  const existing = await repository.assessment(input.enterpriseId, assessment.id);
  if (existing) {
    const existingCase = (existing as Record<string, unknown>).canonical_case;
    if (!existingCase || hashCanonical(existingCase as Record<string, unknown>) !== hashCanonical(assessment)) conflict("INCIDENT_ID_CONFLICT", "The incident identifier is already bound to different immutable evidence.");
    return { assessmentId: assessment.id, idempotentReplay: true };
  }
  const screening = screenPotentialRegulatoryRelevance(assessment.screeningInput, assessment.createdAt);
  const artifacts = buildSeriousIncidentArtifacts(assessment, screening, input.correlationId);
  await repository.create(assessment, screening, artifacts, input.actorId, input.correlationId);
  return { assessment, screening, artifacts, idempotentReplay: false };
}

export async function appendRegulatoryScreening(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository=seriousIncidentRepository();await ensureCase(repository,input.enterpriseId,input.incidentId);
  if(!input.value||typeof input.value!=="object"||Array.isArray(input.value))throw Object.assign(new Error("Screening evaluation must be an object."),{status:400,code:"SCREENING_INPUT_INVALID"});
  const raw=input.value as Record<string,unknown>;const unknown=Object.keys(raw).filter((key)=>!["screeningInput","evaluatedAt","supersedesFindingId"].includes(key));if(unknown.length)throw Object.assign(new Error(`Screening evaluation contains unsupported fields: ${unknown.join(", ")}.`),{status:400,code:"UNKNOWN_FIELD"});
  const evaluatedAt=typeof raw.evaluatedAt==="string"&&!Number.isNaN(Date.parse(raw.evaluatedAt))?new Date(raw.evaluatedAt).toISOString():null;if(!evaluatedAt)throw Object.assign(new Error("evaluatedAt must be an ISO timestamp."),{status:400,code:"TIMESTAMP_INVALID"});
  const supersedesFindingId=typeof raw.supersedesFindingId==="string"?raw.supersedesFindingId:"";if(!UUID.test(supersedesFindingId)||!await repository.incidentRecord(input.enterpriseId,input.incidentId,"incident_regulatory_trigger_findings",supersedesFindingId))conflict("SCREENING_SUPERSESSION_NOT_FOUND","A new screening result must supersede an existing result in this incident.");
  const roles=await repository.assignedReviewerRoles(input.enterpriseId,input.incidentId,input.actorId);if(!roles.some((role)=>["system_owner","technical_reviewer","security_reviewer","compliance_reviewer"].includes(role)))denied("SCREENING_ACTOR_NOT_AUTHORIZED","Operational re-screening requires an assigned owner, technical, security, or compliance reviewer.");
  const result=screenPotentialRegulatoryRelevance(validateScreeningInput(raw.screeningInput),evaluatedAt);const record={...result,supersedesFindingId};
  await repository.append(input.enterpriseId,input.incidentId,"regulatory_screening",record,input.actorId,input.correlationId);return record;
}

export async function appendIncidentChronology(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); await ensureCase(repository, input.enterpriseId, input.incidentId);
  assertSeriousIncidentRecordShape(input.value, "chronology");
  const deadlineMetadata = validateDeadlineMetadata((input.value as Record<string, unknown>).deadlineMetadata);
  const event = { ...validateChronologyEvent(input.value), deadlineMetadata };
  if (event.enterpriseId !== input.enterpriseId || event.incidentId !== input.incidentId || event.correlationId !== input.correlationId) denied("CHRONOLOGY_REFERENCE_MISMATCH", "Chronology tenant, incident, or correlation reference is invalid.");
  const assignments = await repository.reviewerAssignments(input.enterpriseId, input.incidentId, input.actorId);
  const roles = assignments.map((item) => item.role);
  if(!roles.some((role)=>["incident_owner","system_owner","incident_responder","technical_reviewer","security_reviewer","compliance_reviewer","legal_reviewer","data_protection_reviewer","regulator_liaison","executive_approver"].includes(role)))denied("CHRONOLOGY_ACTOR_NOT_AUTHORIZED","An active incident role is required to append chronology evidence.");
  if (event.classification === "LEGAL CONCLUSION" && !roles.includes("legal_reviewer")) denied("LEGAL_CONCLUSION_ROLE_REQUIRED", "Only an assigned legal reviewer can record a legal conclusion.");
  if (event.classification === "REGULATOR RESPONSE" && !roles.includes("regulator_liaison")) denied("REGULATOR_RESPONSE_ROLE_REQUIRED", "Only an assigned regulator liaison can record attributed regulator response evidence.");
  if (["LEGAL CONCLUSION", "REGULATOR RESPONSE", "PROVIDER CONCLUSION"].includes(event.classification) && !event.evidenceReference) conflict("ATTRIBUTED_EVIDENCE_REQUIRED", "Attributed conclusions and responses require evidence.");
  if (event.supersedesEventId) { const prior=await repository.incidentRecord(input.enterpriseId,input.incidentId,"incident_chronology_events",event.supersedesEventId);if(!prior)conflict("CHRONOLOGY_SUPERSESSION_NOT_FOUND","The superseded chronology event was not found in this incident.");if(event.containmentState&&!(prior as Record<string,unknown>).containment_state)conflict("CONTAINMENT_SUPERSESSION_INVALID","A containment correction must supersede a containment record."); }
  if (event.deadlineMetadata) {
    deadlineProvenance(event.deadlineMetadata);
    if (event.deadlineMetadata.sourceType === "reviewer_supplied" && (event.deadlineMetadata.approvedBy !== input.actorId || !roles.some((role) => reviewerRoleNames.has(role)))) denied("DEADLINE_APPROVER_MISMATCH", "Reviewer-supplied deadline approval must match an assigned authenticated reviewer.");
    if (event.deadlineMetadata.sourceType === "externally_supplied" && !roles.includes("regulator_liaison")) denied("EXTERNAL_DEADLINE_LIAISON_REQUIRED", "External deadline evidence requires an assigned regulator liaison.");
    if (event.deadlineMetadata.sourceType === "policy_supplied" && !await repository.approvedPolicy(input.enterpriseId, uuidReference(event.deadlineMetadata.ruleSource,"deadline.ruleSource"))) conflict("DEADLINE_POLICY_NOT_APPROVED", "Policy-supplied deadlines require an active tenant policy version.");
  }
  if (event.containmentState) assertContainmentProgression({ state: event.containmentState, evidenceReferences: event.evidenceReference ? [event.evidenceReference] : [], independentSource: event.containmentState === "independently_confirmed" ? event.source : null });
  await repository.append(input.enterpriseId, input.incidentId, "chronology", event as unknown as Record<string, unknown>, input.actorId, input.correlationId);
  return event;
}

export async function appendIncidentImpact(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); await ensureCase(repository, input.enterpriseId, input.incidentId);
  assertSeriousIncidentRecordShape(input.value, "impact"); const impact = validateImpact(input.value);
  await requireIncidentRole(repository,input.enterpriseId,input.incidentId,input.actorId,["incident_owner","system_owner","technical_reviewer","security_reviewer","data_protection_reviewer","legal_reviewer"],"IMPACT_ACTOR_NOT_AUTHORIZED");
  if (impact.reviewerConfirmed) {
    const roles = await repository.assignedReviewerRoles(input.enterpriseId, input.incidentId, input.actorId);
    if (!roles.some((role) => ["technical_reviewer", "security_reviewer", "data_protection_reviewer", "legal_reviewer"].includes(role))) denied("IMPACT_REVIEWER_REQUIRED", "Reviewer-confirmed impact requires an assigned specialist reviewer.");
  }
  if (impact.supersedesImpactId && !await repository.incidentRecord(input.enterpriseId, input.incidentId, "incident_impact_assessments", impact.supersedesImpactId)) conflict("IMPACT_SUPERSESSION_NOT_FOUND", "The superseded impact assessment was not found in this incident.");
  await repository.append(input.enterpriseId, input.incidentId, "impact", impact as unknown as Record<string, unknown>, input.actorId, input.correlationId); return impact;
}

export async function appendReviewerDecision(input: { enterpriseId: string; actorId: string; workspaceRole: WorkspaceRole; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); const assessment = await ensureCase(repository, input.enterpriseId, input.incidentId);
  assertSeriousIncidentRecordShape(input.value, "reviewerDecision");
  const rawApprovedPackageId = typeof (input.value as Record<string, unknown>).approvedPackageId === "string" ? String((input.value as Record<string, unknown>).approvedPackageId) : null;
  if (rawApprovedPackageId && !UUID.test(rawApprovedPackageId)) throw Object.assign(new Error("approvedPackageId must be a UUID."), { status: 400, code: "PACKAGE_REFERENCE_INVALID" });
  const decision = { ...validateReviewerDecision(input.value), approvedPackageId: rawApprovedPackageId };
  const assignments = await repository.reviewerAssignments(input.enterpriseId, input.incidentId, input.actorId);
  const assignment = assignments.find((item) => item.role === decision.reviewerRole);
  if (!assignment || !assignment.authorityReference || assignment.authorityReference !== decision.organizationalAuthority) denied("REVIEWER_AUTHORITY_MISMATCH", "Reviewer authority must match the actor's active tenant-bound assignment.");
  if (decision.supersedesDecisionId && !await repository.reviewerDecision(input.enterpriseId, input.incidentId, decision.supersedesDecisionId)) conflict("DECISION_SUPERSESSION_NOT_FOUND", "The superseded reviewer decision was not found in this incident.");
  const bundle = await repository.bundle(input.enterpriseId, input.incidentId);
  const latestDecision = [...(bundle.incident_reviewer_decisions as Array<Record<string, unknown>>)].reverse().find((row) => row.target_state);
  if (decision.reviewerRole === "executive_approver" && latestDecision?.reviewer_role === "legal_reviewer" && decision.targetState && decision.supersedesDecisionId !== latestDecision.id) denied("LEGAL_DECISION_SUPERSESSION_REQUIRED", "An executive decision cannot replace the latest legal finding without explicit supersession.");
  const approvedPackageId = decision.approvedPackageId ?? null;
  if (decision.targetState === "submitted" && approvedPackageId) {
    const packageRecord = (bundle.incident_submission_packages as Array<Record<string, unknown>>).find((row) => row.id === approvedPackageId && ["reviewer_approved", "regulator_ready", "submitted"].includes(String(row.state)));
    const submissionRecord = (bundle.incident_external_submissions as Array<Record<string, unknown>>).find((row) => row.package_id === approvedPackageId && Number(row.package_version) === Number(packageRecord?.version) && String(row.package_digest) === String(packageRecord?.package_digest) && ["transferred", "acknowledged", "supplemented", "closed"].includes(String(row.state)));
    if (!packageRecord || !submissionRecord) conflict("SUBMISSION_EVIDENCE_REQUIRED", "Submitted state requires the exact approved package version, digest, and linked external submission record.");
  }
  assertReviewerAuthorization({ workspaceRole: input.workspaceRole, assignedRoles: assignments.map((item) => item.role), decision, approvedPackageId });
  assertTransitionPrerequisites({
    from: currentAssessmentState(assessment, bundle),
    decision,
    hasSubmissionEvidence: (bundle.incident_external_submissions as Array<Record<string, unknown>>).some((row) => ["transferred", "acknowledged", "rejected", "returned_for_clarification", "supplemented", "closed"].includes(String(row.state))),
    hasRegulatorResponse: (bundle.incident_chronology_events as Array<Record<string, unknown>>).some((row) => row.classification === "REGULATOR RESPONSE"),
    outstandingMandatoryCorrectiveActionIds: outstandingCorrectiveActionIds(bundle),
  });
  await repository.append(input.enterpriseId, input.incidentId, "reviewer_decision", decision as unknown as Record<string, unknown>, input.actorId, input.correlationId); return decision;
}

export async function appendSubmissionPackage(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); const assessmentRow = await ensureCase(repository, input.enterpriseId, input.incidentId);
  await requireIncidentRole(repository,input.enterpriseId,input.incidentId,input.actorId,["incident_owner","system_owner","compliance_reviewer","legal_reviewer","executive_approver"],"PACKAGE_ACTOR_NOT_AUTHORIZED");
  assertSeriousIncidentRecordShape(input.value, "submissionPackage"); const packageInput = validatePackage(input.value); let reviewerRole: ReviewerRole | null = null; let approvalDecision: Record<string, unknown> | null = null;
  if (packageInput.approvedByDecisionId) {
    const decision = await repository.reviewerDecision(input.enterpriseId, input.incidentId, packageInput.approvedByDecisionId);
    if (!decision || String((decision as Record<string, unknown>).decision_type) !== "submission_approval") conflict("PACKAGE_APPROVAL_NOT_FOUND", "An authorized package approval decision was not found.");
    approvalDecision = decision as Record<string, unknown>;
    reviewerRole = String(approvalDecision.reviewer_role) as ReviewerRole;
  }
  const bundle = await repository.bundle(input.enterpriseId, input.incidentId);
  const packages = bundle.incident_submission_packages as Array<Record<string, unknown>>;
  if (!packageInput.supersedesPackageId && (packageInput.version !== 1 || packages.length)) conflict("PACKAGE_VERSION_SEQUENCE_INVALID", "The first package must be version 1; later packages must supersede the latest version.");
  let priorPackage: Record<string, unknown> | null = null;
  if (packageInput.supersedesPackageId) {
    const prior = await repository.package(input.enterpriseId, input.incidentId, packageInput.supersedesPackageId);
    if (!prior) conflict("PACKAGE_SUPERSESSION_NOT_FOUND", "Superseded package was not found.");
    priorPackage = prior as Record<string, unknown>;
    const latestVersion = packages.reduce((maximum, row) => Math.max(maximum, Number(row.version)), 0);
    if (Number((prior as Record<string, unknown>).version) !== latestVersion) conflict("PACKAGE_SUPERSESSION_STALE", "A new package must supersede the latest package version.");
    assertSupersedingPackage({ id: String((prior as Record<string, unknown>).id), version: Number((prior as Record<string, unknown>).version) }, packageInput);
  }
  const assessment = validateAssessmentInput(assessmentRow.canonical_case ?? assessmentRow.case_payload);
  const packageRecord = buildSubmissionPackage({ assessment, packageInput, reviewerRole, artifacts: bundle });
  if (packageInput.state === "internal_draft" && packageInput.approvedByDecisionId) conflict("DRAFT_PACKAGE_APPROVAL_INVALID", "An internal draft cannot carry an approval decision.");
  if (packageInput.state !== "internal_draft") {
    const approvalEvidence = Array.isArray(approvalDecision?.evidence_references) ? approvalDecision.evidence_references.map(String) : [];
    if (!priorPackage || String(priorPackage.state) !== "internal_draft" || approvalDecision?.approved_package_id !== priorPackage.id || !approvalEvidence.includes(`package-content-sha256:${packageRecord.contentDigest}`) || String(priorPackage.content_digest) !== packageRecord.contentDigest) conflict("PACKAGE_APPROVAL_CONTENT_MISMATCH", "Package approval must bind the exact canonical content digest of the superseded draft.");
  }
  await repository.append(input.enterpriseId, input.incidentId, "submission_package", packageRecord as unknown as Record<string, unknown>, input.actorId, input.correlationId); return packageRecord;
}

export async function appendExternalSubmission(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); await ensureCase(repository, input.enterpriseId, input.incidentId);
  const assignedRoles = await repository.assignedReviewerRoles(input.enterpriseId, input.incidentId, input.actorId);
  if (!assignedRoles.some((role) => ["regulator_liaison", "executive_approver"].includes(role))) denied("SUBMISSION_ACTOR_NOT_AUTHORIZED", "An assigned regulator liaison or executive approver must record external submission evidence.");
  const submission = validateExternalSubmission(input.value);
  if (submission.submittingActor && submission.submittingActor !== input.actorId) denied("SUBMISSION_ACTOR_MISMATCH", "Submission actor is derived from authenticated context.");
  const authenticatedSubmission = { ...submission, submittingActor: input.actorId };
  if (submission.followUpDeadlineMetadata) {
    deadlineProvenance(submission.followUpDeadlineMetadata);
    if (submission.followUpDeadlineMetadata.sourceType !== "externally_supplied" && submission.followUpDeadlineMetadata.approvedBy !== input.actorId) denied("FOLLOW_UP_DEADLINE_APPROVER_MISMATCH", "Follow-up deadline approval must match the authenticated actor.");
    if (submission.followUpDeadlineMetadata.sourceType === "policy_supplied" && !await repository.approvedPolicy(input.enterpriseId, uuidReference(submission.followUpDeadlineMetadata.ruleSource,"followUpDeadline.ruleSource"))) conflict("DEADLINE_POLICY_NOT_APPROVED", "Policy-supplied follow-up deadlines require an active tenant policy version.");
  }
  const packageRecord = await repository.package(input.enterpriseId, input.incidentId, submission.packageId);
  if (!packageRecord || !["reviewer_approved", "regulator_ready", "submitted"].includes(String((packageRecord as Record<string, unknown>).state)) || String((packageRecord as Record<string, unknown>).package_digest) !== submission.packageDigest || Number((packageRecord as Record<string, unknown>).version) !== submission.packageVersion) conflict("APPROVED_PACKAGE_MISMATCH", "External submission requires the exact approved immutable package version and digest.");
  const supersededSubmission = submission.supersedesSubmissionId ? await repository.incidentRecord(input.enterpriseId, input.incidentId, "incident_external_submissions", submission.supersedesSubmissionId) as Record<string, unknown> | null : null;
  if (submission.supersedesSubmissionId && !supersededSubmission) conflict("SUBMISSION_SUPERSESSION_NOT_FOUND", "The superseded submission was not found in this incident.");
  if (submission.state === "supplemented" && !submission.supersedesSubmissionId) conflict("SUPPLEMENT_ORIGINAL_REQUIRED", "A supplement must reference the original submission record.");
  if (submission.state === "supplemented" && (supersededSubmission?.supersedes_submission_id || supersededSubmission?.destination_authority !== submission.destinationAuthority || supersededSubmission?.jurisdiction !== submission.jurisdiction)) conflict("SUPPLEMENT_ORIGINAL_MISMATCH", "A supplement must point directly to the original submission for the same authority and jurisdiction.");
  await repository.append(input.enterpriseId, input.incidentId, "external_submission", authenticatedSubmission as unknown as Record<string, unknown>, input.actorId, input.correlationId); return authenticatedSubmission;
}

export async function appendCorrectiveAction(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); const assessment=await ensureCase(repository, input.enterpriseId, input.incidentId);await requireIncidentRole(repository,input.enterpriseId,input.incidentId,input.actorId,["incident_owner","system_owner","security_reviewer","compliance_reviewer","legal_reviewer","executive_approver"],"CORRECTIVE_ACTION_ACTOR_NOT_AUTHORIZED"); const action = validateCorrectiveAction(input.value);const bundle=await repository.bundle(input.enterpriseId,input.incidentId);
  if(currentAssessmentState(assessment,bundle)==="resolved"&&action.effectivenessState!=="validated")conflict("INCIDENT_REOPEN_REQUIRED","A failed or unresolved corrective action requires the incident to be reopened first.");
  if (action.supersedesCorrectiveActionId && !await repository.incidentRecord(input.enterpriseId, input.incidentId, "incident_corrective_actions", action.supersedesCorrectiveActionId)) conflict("CORRECTIVE_ACTION_SUPERSESSION_NOT_FOUND", "The superseded corrective action was not found in this incident.");
  if (action.effectivenessState === "validated") {
    const decision = action.reviewerApprovalDecisionId ? await repository.reviewerDecision(input.enterpriseId, input.incidentId, action.reviewerApprovalDecisionId) : null;
    if (!decision || String((decision as Record<string, unknown>).decision_type) !== "corrective_action_approval") conflict("CORRECTIVE_ACTION_VALIDATION_DECISION_REQUIRED", "Validation requires an authorized corrective-action approval decision.");
  }
  await repository.append(input.enterpriseId, input.incidentId, "corrective_action", action as unknown as Record<string, unknown>, input.actorId, input.correlationId); return action;
}

export async function appendEvidenceSnapshot(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); const assessmentRow = await ensureCase(repository, input.enterpriseId, input.incidentId);await requireIncidentRole(repository,input.enterpriseId,input.incidentId,input.actorId,["incident_owner","system_owner","technical_reviewer","security_reviewer"],"SNAPSHOT_ACTOR_NOT_AUTHORIZED"); const snapshot = validateEvidenceSnapshot(input.value);
  if (!snapshot.supersedesSnapshotId) conflict("SNAPSHOT_SUPERSESSION_REQUIRED", "A later evidence snapshot must supersede the preserved incident-time snapshot.");
  if (!await repository.incidentRecord(input.enterpriseId, input.incidentId, "incident_evidence_snapshots", snapshot.supersedesSnapshotId)) conflict("SNAPSHOT_SUPERSESSION_NOT_FOUND", "The superseded snapshot was not found in this incident.");
  const assessment = validateAssessmentInput(assessmentRow.canonical_case ?? assessmentRow.case_payload);
  await assertCanonicalEpic26References(repository, input.enterpriseId, { ...assessment, evidenceSnapshot: snapshot });
  await repository.append(input.enterpriseId, input.incidentId, "evidence_snapshot", snapshot as unknown as Record<string, unknown>, input.actorId, input.correlationId); return snapshot;
}

export async function appendEvidenceCorrection(input: { enterpriseId: string; actorId: string; incidentId: string; value: unknown; correlationId: string }) {
  const repository = seriousIncidentRepository(); await ensureCase(repository, input.enterpriseId, input.incidentId);await requireIncidentRole(repository,input.enterpriseId,input.incidentId,input.actorId,["technical_reviewer","security_reviewer","compliance_reviewer","legal_reviewer","data_protection_reviewer","executive_approver"],"CORRECTION_ACTOR_NOT_AUTHORIZED"); const correction = validateEvidenceSupersession(input.value);
  const tables = {
    provider_evidence: "incident_chronology_events", impact_assessment: "incident_impact_assessments", incident_classification: "incident_reviewer_decisions", responsibility_attribution: "incident_responsibility_roles", containment_outcome: "incident_chronology_events", reporting_decision: "incident_reviewer_decisions", corrective_action: "incident_corrective_actions", evidence_snapshot: "incident_evidence_snapshots",
  } as const;
  const table = tables[correction.recordType];
  if (!await repository.incidentRecord(input.enterpriseId, input.incidentId, table, correction.originalRecordId) || !await repository.incidentRecord(input.enterpriseId, input.incidentId, table, correction.correctedRecordId)) conflict("CORRECTION_RECORD_NOT_FOUND", "Correction records must both exist in this incident.");
  const approval=correction.approvedByDecisionId?await repository.reviewerDecision(input.enterpriseId,input.incidentId,correction.approvedByDecisionId):null;
  if (correction.approvedByDecisionId && !approval) conflict("CORRECTION_APPROVAL_NOT_FOUND", "Correction approval decision was not found.");
  if (["incident_classification","responsibility_attribution","reporting_decision"].includes(correction.recordType) && (!approval || !["compliance_reviewer","legal_reviewer","executive_approver"].includes(String((approval as Record<string,unknown>).reviewer_role)))) conflict("PROTECTED_CORRECTION_APPROVAL_REQUIRED","Protected attribution and reporting corrections require an authorized approval decision.");
  await repository.append(input.enterpriseId, input.incidentId, "evidence_supersession", correction as unknown as Record<string, unknown>, input.actorId, input.correlationId); return correction;
}
