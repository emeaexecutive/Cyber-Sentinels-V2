import {
  architectureContext,
  architectureCorrelationId,
  architectureFailure,
  architectureReference,
  architectureResponse,
  assertArchitectureMutation,
  TrustArchitectureApiError,
} from "@/src/lib/trust-architecture/http";
import { trustArchitectureRepository } from "@/src/lib/trust-architecture/repository";
import {
  policyGovernanceStates,
  validatePolicyGovernanceAction,
  type PolicyGovernanceState,
} from "@/lib/enterprise-operations";

function state(value: unknown, field: string): PolicyGovernanceState {
  if (!policyGovernanceStates.includes(value as PolicyGovernanceState)) {
    throw new TrustArchitectureApiError(`${field} is invalid.`, 400, "POLICY_GOVERNANCE_STATE_INVALID");
  }
  return value as PolicyGovernanceState;
}

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TrustArchitectureApiError(`${field} is required.`, 400, "POLICY_GOVERNANCE_FIELD_REQUIRED");
  }
  return value.trim();
}

function evidence(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new TrustArchitectureApiError("evidenceReferences must contain evidence.", 400, "POLICY_GOVERNANCE_EVIDENCE_REQUIRED");
  }
  return value.map((item) => String(item).trim());
}

export async function GET(request: Request, context: { params: Promise<{ policyId: string }> }) {
  const correlationId = architectureCorrelationId(request);
  try {
    const auth = await architectureContext(request, ["owner", "admin", "reviewer", "observer"]);
    const policyId = architectureReference((await context.params).policyId, "policyId");
    const events = await trustArchitectureRepository().policyGovernanceEvents(auth.enterpriseId, policyId);
    return architectureResponse({ ok: true, policyId, events }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}

export async function POST(request: Request, context: { params: Promise<{ policyId: string }> }) {
  const correlationId = architectureCorrelationId(request);
  try {
    assertArchitectureMutation(request);
    const auth = await architectureContext(request, ["owner", "admin"]);
    const policyId = architectureReference((await context.params).policyId, "policyId");
    const body = await request.json() as Record<string, unknown>;
    const previousState = state(body.previousState, "previousState");
    const nextState = state(body.nextState, "nextState");
    const reviewerId = ["APPROVED", "ACTIVE", "REJECTED", "ROLLED_BACK"].includes(nextState)
      ? auth.user.id
      : null;
    const rollbackPolicyVersionId = body.rollbackPolicyVersionId === null || body.rollbackPolicyVersionId === undefined
      ? null
      : architectureReference(body.rollbackPolicyVersionId, "rollbackPolicyVersionId");
    const action = validatePolicyGovernanceAction({
      enterpriseId: auth.enterpriseId,
      policyId,
      policyVersion: text(body.policyVersion, "policyVersion"),
      previousState,
      nextState,
      actor: auth.user.id,
      occurredAt: new Date().toISOString(),
      reason: text(body.reason, "reason"),
      evidenceReferences: evidence(body.evidenceReferences),
      authorityReference: text(body.authorityReference, "authorityReference"),
      replayReference: text(body.replayReference, "replayReference"),
      correlationId,
      reviewerId,
      rollbackPolicyVersion: rollbackPolicyVersionId,
    });
    const eventId = await trustArchitectureRepository().persistPolicyGovernance({
      enterpriseId: auth.enterpriseId,
      policyVersionId: architectureReference(body.policyVersionId, "policyVersionId"),
      previousState: action.previousState,
      nextState: action.nextState,
      actorId: auth.user.id,
      reviewerId,
      reason: action.reason,
      approvalEvidence: action.evidenceReferences,
      authorityReference: action.authorityReference,
      replayReference: action.replayReference,
      rollbackPolicyVersionId,
      correlationId,
    });
    return architectureResponse({ ok: true, policyId, eventId, state: nextState }, 201, correlationId);
  } catch (error) {
    if (error instanceof TrustArchitectureApiError) return architectureFailure(error, correlationId);
    if (error instanceof Error && /required|not allowed|must be/i.test(error.message)) {
      return architectureFailure(
        new TrustArchitectureApiError(error.message, 400, "POLICY_GOVERNANCE_INVALID"),
        correlationId,
      );
    }
    return architectureFailure(error, correlationId);
  }
}
