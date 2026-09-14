export type DocumentIntegrityDecision = "ALLOW" | "REVIEW" | "DENY";
export type DocumentIntegrityReasonCode =
  | "DOCUMENT_INTEGRITY_VERIFIED"
  | "DOCUMENT_CONTENT_MISMATCH"
  | "HIDDEN_CONTENT_DETECTED"
  | "UNTRUSTED_INSTRUCTION_DETECTED"
  | "PROMPT_INJECTION_SUSPECTED"
  | "INPUT_AUTHORITY_EXCEEDED"
  | "DOCUMENT_REVIEW_REQUIRED";

export type DocumentIntegrityContext = {
  documentDigest: string;
  documentType: string;
  sourceReference: string;
  visibleContentDigest: string;
  machineExtractedContentDigest: string;
  contentDiscrepancy: boolean;
  hiddenContentDetected: boolean;
  instructionLikeContentDetected: boolean;
  instructionClassification?: "BENIGN_METADATA" | "RECRUITING_INSTRUCTION" | "POLICY_OVERRIDE" | "SECRET_REQUEST" | "UNKNOWN";
  confidence: number;
  provenance: string;
  receivingAgent: string;
  workflowStage: string;
  policyReference: string;
};

const digest = /^[a-f0-9]{64}$/;
const reference = /^[A-Za-z0-9_.:@/+-]{1,240}$/;

export function parseDocumentIntegrityContext(value: unknown): DocumentIntegrityContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("DOCUMENT_INTEGRITY_CONTEXT_INVALID");
  const input = value as Record<string, unknown>;
  const forbidden = ["decision", "reasonCodes", "integrityState", "fraud", "malicious", "trustScore"];
  if (forbidden.some((key) => key in input)) throw new TypeError("CALLER_FORGED_INTEGRITY_STATE");
  const text = (key: string) => typeof input[key] === "string" ? String(input[key]).trim() : "";
  const boolean = (key: string) => typeof input[key] === "boolean" ? input[key] as boolean : false;
  const context = {
    documentDigest: text("documentDigest"),
    documentType: text("documentType"),
    sourceReference: text("sourceReference"),
    visibleContentDigest: text("visibleContentDigest"),
    machineExtractedContentDigest: text("machineExtractedContentDigest"),
    contentDiscrepancy: boolean("contentDiscrepancy"),
    hiddenContentDetected: boolean("hiddenContentDetected"),
    instructionLikeContentDetected: boolean("instructionLikeContentDetected"),
    instructionClassification: (input.instructionClassification ? String(input.instructionClassification) : undefined) as DocumentIntegrityContext["instructionClassification"],
    confidence: Number(input.confidence),
    provenance: text("provenance"),
    receivingAgent: text("receivingAgent"),
    workflowStage: text("workflowStage"),
    policyReference: text("policyReference"),
  } satisfies DocumentIntegrityContext;
  if (![context.documentDigest, context.visibleContentDigest, context.machineExtractedContentDigest].every((value) => digest.test(value))) throw new TypeError("DOCUMENT_DIGEST_INVALID");
  if (![context.documentType, context.sourceReference, context.provenance, context.receivingAgent, context.workflowStage, context.policyReference].every((value) => reference.test(value))) throw new TypeError("DOCUMENT_REFERENCE_INVALID");
  if (!Number.isFinite(context.confidence) || context.confidence < 0 || context.confidence > 1) throw new TypeError("DOCUMENT_CONFIDENCE_INVALID");
  if (context.instructionClassification && !["BENIGN_METADATA", "RECRUITING_INSTRUCTION", "POLICY_OVERRIDE", "SECRET_REQUEST", "UNKNOWN"].includes(context.instructionClassification)) throw new TypeError("INSTRUCTION_CLASSIFICATION_INVALID");
  return context;
}

export function evaluateDocumentIntegrity(context: DocumentIntegrityContext) {
  const reasonCodes: DocumentIntegrityReasonCode[] = [];
  if (!context.contentDiscrepancy && context.documentDigest === context.visibleContentDigest && context.visibleContentDigest === context.machineExtractedContentDigest && !context.hiddenContentDetected && !context.instructionLikeContentDetected) {
    reasonCodes.push("DOCUMENT_INTEGRITY_VERIFIED");
  }
  if (context.contentDiscrepancy || context.visibleContentDigest !== context.machineExtractedContentDigest) reasonCodes.push("DOCUMENT_CONTENT_MISMATCH");
  if (context.hiddenContentDetected) reasonCodes.push("HIDDEN_CONTENT_DETECTED");
  if (context.instructionLikeContentDetected) reasonCodes.push("UNTRUSTED_INSTRUCTION_DETECTED");
  if (["POLICY_OVERRIDE", "SECRET_REQUEST"].includes(context.instructionClassification ?? "")) reasonCodes.push("PROMPT_INJECTION_SUSPECTED", "INPUT_AUTHORITY_EXCEEDED");
  const deny = reasonCodes.includes("INPUT_AUTHORITY_EXCEEDED");
  const review = reasonCodes.some((code) => ["DOCUMENT_CONTENT_MISMATCH", "HIDDEN_CONTENT_DETECTED", "UNTRUSTED_INSTRUCTION_DETECTED", "PROMPT_INJECTION_SUSPECTED"].includes(code));
  return { decision: deny ? "DENY" as const : review ? "REVIEW" as const : "ALLOW" as const, reasonCodes };
}
