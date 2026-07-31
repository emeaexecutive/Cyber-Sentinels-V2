import "server-only";
import { buildScopeContinuityArtifacts } from "./integrations.ts";
import { evaluateScopeContinuity } from "./evaluator.ts";
import { scopeContinuityRepository } from "./repository.ts";
import type { ScopeContinuityEvaluationInput } from "./types.ts";
import { validateScopeContinuityInput } from "./validation.ts";

function validateRequest(value: unknown, correlationId: string) {
  try {
    return validateScopeContinuityInput({ ...(value as ScopeContinuityEvaluationInput), correlationId });
  } catch (error) {
    const candidate = error as Error & { code?: string };
    throw Object.assign(new Error(candidate.message || "Scope Continuity request is invalid."), {
      status: 400,
      code: candidate.code ?? "SCOPE_REQUEST_INVALID",
    });
  }
}

export async function evaluateAndPersistScopeContinuity(input: { enterpriseId: string; actorId: string; value: unknown; correlationId: string }) {
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) throw Object.assign(new Error("Scope Continuity request must be an object."), { status: 400, code: "SCOPE_REQUEST_INVALID" });
  const candidate = validateRequest(input.value, input.correlationId);
  if (candidate.declaration?.enterpriseId !== input.enterpriseId || candidate.authorization?.enterpriseId !== input.enterpriseId || candidate.attestations?.some((item) => item.enterpriseId !== input.enterpriseId)) {
    throw Object.assign(new Error("Cross-enterprise scope input is denied."), { status: 403, code: "CROSS_ENTERPRISE_REFERENCE" });
  }
  const repository = scopeContinuityRepository();
  const canonical = await repository.canonicalInputs(input.enterpriseId, candidate);
  if (!canonical.authorization && candidate.authorization.approverId !== input.actorId) {
    throw Object.assign(new Error("The authenticated administrator must be the recorded lease approver."), { status: 403, code: "LEASE_APPROVER_MISMATCH" });
  }
  if (!canonical.declaration && candidate.declaration.accountableOwnerId !== input.actorId) {
    throw Object.assign(new Error("The authenticated administrator must be the recorded context owner."), { status: 403, code: "CONTEXT_OWNER_MISMATCH" });
  }
  const evaluatedInput: ScopeContinuityEvaluationInput = {
    ...candidate,
    declaration: (canonical.declaration ?? candidate.declaration) as ScopeContinuityEvaluationInput["declaration"],
    authorization: (canonical.authorization ?? { ...candidate.authorization, consumedActionCount: canonical.consumedActionCount }) as ScopeContinuityEvaluationInput["authorization"],
    attestations: candidate.attestations.map((item) => (canonical.attestations.get(item.id) ?? item) as ScopeContinuityEvaluationInput["attestations"][number]),
  };
  const decision = evaluateScopeContinuity(evaluatedInput);
  const artifacts = buildScopeContinuityArtifacts(evaluatedInput, decision);
  await repository.persist(evaluatedInput, decision, artifacts, input.actorId);
  return { decision, artifacts };
}
