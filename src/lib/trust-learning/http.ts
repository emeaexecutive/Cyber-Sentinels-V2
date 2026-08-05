import { TrustArchitectureApiError, architectureContext, architectureCorrelationId, architectureFailure, architectureResponse, assertArchitectureMutation, architectureReference } from "../trust-architecture/http.ts";

export { TrustArchitectureApiError };
export const trustLearningContext = architectureContext;
export const trustLearningCorrelationId = architectureCorrelationId;
export const trustLearningFailure = architectureFailure;
export const trustLearningResponse = architectureResponse;
export const assertTrustLearningMutation = assertArchitectureMutation;
export const trustLearningReference = architectureReference;

export async function readTrustLearningJson(request: Request) {
  assertTrustLearningMutation(request);
  let value: unknown;
  try { value = await request.json(); } catch { throw new TrustArchitectureApiError("A valid JSON object is required.", 400, "TRUST_LEARNING_JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrustArchitectureApiError("A JSON object is required.", 400, "TRUST_LEARNING_BODY_INVALID");
  return value as Record<string, unknown>;
}

export function learningReferences(value: unknown, name: string, maximum = 50) {
  if (!Array.isArray(value) || value.length > maximum) throw new TrustArchitectureApiError(`${name} must be an array with at most ${maximum} entries.`, 400, "TRUST_LEARNING_REFERENCES_INVALID");
  return [...new Set(value.map((item) => trustLearningReference(item, name)))];
}
