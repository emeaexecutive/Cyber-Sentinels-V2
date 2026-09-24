import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { CanonicalContextEvidence } from "../../src/lib/trust-transaction/canonical.ts";
import type { CanonicalProviderEvidence, ProviderAdapter, ProviderAdapterInput } from "./adapters.ts";

export const JUDGEME_PROVIDER_KEY = "judgeme" as const;
export const JUDGEME_EVIDENCE_TYPE = "JUDGEME_REVIEW_OBSERVATION" as const;
export const JUDGEME_QUALIFICATION = "BLOCKED_EXTERNAL" as const;
export const JUDGEME_EVENTS = ["review/created", "review/updated", "review/created_fail"] as const;
export const JUDGEME_VERIFICATION_LABELS = ["nothing", "not-yet", "confirmed-buyer", "unconfirmed-buyer", "buyer", "verified-purchase", "semi-verified-purchase", "admin", "customer-account"] as const;
const maximumAgeMs = 86_400_000;
const referencePattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,179}$/;
const identifierPattern = /^[1-9][0-9]{0,39}$/;

/** Bindings must come from the tenant's installation and subject mapping, not a webhook claim. */
export type JudgeMeReviewBinding = {
  tenantId: string;
  installationId: string;
  shopDomain: string;
  subject: { type: "HUMAN" | "SERVICE" | "AI_AGENT"; id: string };
  productExternalId: string;
  reviewReference: string;
  providerReviewId: string | null;
};

function invalid(code: string): never { throw new TypeError(code); }
function object(value: unknown, fields: readonly string[], code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(code);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !fields.includes(key))) invalid(code);
  return result;
}
function reference(value: unknown, code: string): string {
  if (typeof value !== "string" || !referencePattern.test(value)) invalid(code);
  return value;
}
function identifier(value: unknown, code: string): string {
  if (typeof value !== "string" || !identifierPattern.test(value)) invalid(code);
  return value;
}
function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) invalid("JUDGEME_TIMESTAMP_INVALID");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) invalid("JUDGEME_TIMESTAMP_INVALID");
  return parsed;
}
function validateBinding(value: JudgeMeReviewBinding): JudgeMeReviewBinding {
  object(value, ["tenantId", "installationId", "shopDomain", "subject", "productExternalId", "reviewReference", "providerReviewId"], "JUDGEME_BINDING_INVALID");
  reference(value.tenantId, "JUDGEME_TENANT_INVALID");
  reference(value.installationId, "JUDGEME_INSTALLATION_INVALID");
  reference(value.reviewReference, "JUDGEME_REVIEW_REFERENCE_INVALID");
  object(value.subject, ["type", "id"], "JUDGEME_SUBJECT_INVALID");
  if (!["HUMAN", "SERVICE", "AI_AGENT"].includes(value.subject.type)) invalid("JUDGEME_SUBJECT_INVALID");
  reference(value.subject.id, "JUDGEME_SUBJECT_INVALID");
  if (typeof value.shopDomain !== "string" || value.shopDomain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value.shopDomain)) invalid("JUDGEME_SHOP_INVALID");
  identifier(value.productExternalId, "JUDGEME_PRODUCT_INVALID");
  if (value.providerReviewId !== null) identifier(value.providerReviewId, "JUDGEME_REVIEW_INVALID");
  return structuredClone(value);
}

function normalizedObservation(input: ProviderAdapterInput, binding: JudgeMeReviewBinding) {
  if (input.providerKey !== JUDGEME_PROVIDER_KEY || input.evidenceType !== JUDGEME_EVIDENCE_TYPE || input.finding !== "OBSERVED") invalid("JUDGEME_OBSERVATION_INVALID");
  reference(input.eventId, "JUDGEME_EVENT_ID_INVALID");
  object(input.subject, ["type", "id"], "JUDGEME_SUBJECT_MISMATCH");
  if (input.subject.type !== binding.subject.type || input.subject.id !== binding.subject.id) invalid("JUDGEME_SUBJECT_MISMATCH");
  const evidence = object(input.evidence, ["tenantId", "installationId", "shopDomain", "reviewReference", "eventType", "review"], "JUDGEME_FIELDS_INVALID");
  if (evidence.tenantId !== binding.tenantId || evidence.installationId !== binding.installationId || evidence.shopDomain !== binding.shopDomain || evidence.reviewReference !== binding.reviewReference) invalid("JUDGEME_INSTALLATION_BINDING_MISMATCH");
  if (!JUDGEME_EVENTS.includes(evidence.eventType as typeof JUDGEME_EVENTS[number])) invalid("JUDGEME_EVENT_UNSUPPORTED");
  const review = object(evidence.review, ["id", "product_external_id", "rating", "verified", "curated", "hidden"], "JUDGEME_REVIEW_FIELDS_INVALID");
  if (review.id !== binding.providerReviewId || review.product_external_id !== binding.productExternalId) invalid("JUDGEME_REVIEW_BINDING_MISMATCH");
  const failed = evidence.eventType === "review/created_fail";
  if (failed !== (binding.providerReviewId === null)) invalid("JUDGEME_REVIEW_ID_STATE_INVALID");
  if (review.rating !== undefined && (!Number.isInteger(review.rating) || Number(review.rating) < 1 || Number(review.rating) > 5)) invalid("JUDGEME_RATING_INVALID");
  if (review.verified !== undefined && !JUDGEME_VERIFICATION_LABELS.includes(review.verified as typeof JUDGEME_VERIFICATION_LABELS[number])) invalid("JUDGEME_VERIFICATION_LABEL_INVALID");
  if (review.curated !== undefined && (typeof review.curated !== "string" || !["not-yet", "ok", "spam"].includes(review.curated))) invalid("JUDGEME_CURATION_INVALID");
  if (review.hidden !== undefined && typeof review.hidden !== "boolean") invalid("JUDGEME_HIDDEN_INVALID");
  const occurred = timestamp(input.occurredAt);
  const expiresAt = input.expiresAt ?? new Date(occurred + maximumAgeMs).toISOString();
  if (timestamp(expiresAt) <= occurred || timestamp(expiresAt) > occurred + maximumAgeMs) invalid("JUDGEME_EXPIRY_INVALID");
  return {
    providerKey: JUDGEME_PROVIDER_KEY,
    providerClass: "APPLICATION_SIGNAL" as const,
    providerEventId: input.eventId,
    binding: structuredClone(binding),
    eventType: evidence.eventType as typeof JUDGEME_EVENTS[number],
    review: {
      id: binding.providerReviewId,
      product_external_id: binding.productExternalId,
      ...(review.rating !== undefined ? { rating: review.rating as number } : {}),
      ...(review.verified !== undefined ? { verified: review.verified as string } : {}),
      ...(review.curated !== undefined ? { curated: review.curated as string } : {}),
      ...(review.hidden !== undefined ? { hidden: review.hidden as boolean } : {}),
    },
    occurredAt: input.occurredAt,
    expiresAt,
    classification: "PROVIDER_ASSERTED_UNQUALIFIED" as const,
    qualification: JUDGEME_QUALIFICATION,
    transactionVerification: "NOT_ESTABLISHED" as const,
    identityVerification: "NOT_ESTABLISHED" as const,
    authorityVerification: "NOT_ESTABLISHED" as const,
    executionAuthorized: false as const,
  };
}

/** Pure reference boundary: no transport, credentials, webhook verification, or decision authority. */
export function createJudgeMeReferenceAdapter(expectedBinding: JudgeMeReviewBinding): ProviderAdapter {
  const binding = validateBinding(expectedBinding);
  const normalize = (input: ProviderAdapterInput) => {
    const facts = normalizedObservation(input, binding);
    if (input.digest !== undefined && input.digest !== null && input.digest !== hashCanonical(facts)) invalid("JUDGEME_DIGEST_MISMATCH");
    return facts;
  };
  const validate = (input: ProviderAdapterInput) => {
    try { normalize(input); return []; }
    catch (error) { return [error instanceof TypeError ? error.message : "JUDGEME_OBSERVATION_INVALID"]; }
  };
  return {
    providerKey: JUDGEME_PROVIDER_KEY,
    providerClass: "APPLICATION_SIGNAL",
    validate,
    async verify(input) {
      const errors = validate(input);
      return { verified: false, reasonCodes: errors.length ? errors : ["REFERENCE_ADAPTER_NON_LIVE", "PROVIDER_ATTESTATION_NOT_CONFIGURED"] };
    },
    normalize,
    async mapEvidence(input, receivedAt = new Date().toISOString()): Promise<CanonicalProviderEvidence> {
      const facts = normalize(input);
      const received = timestamp(receivedAt);
      if (received < timestamp(facts.occurredAt) || received >= timestamp(facts.expiresAt)) invalid("JUDGEME_OBSERVATION_NOT_CURRENT");
      const payloadHash = hashCanonical(facts);
      return {
        evidenceId: deterministicUuid({ providerKey: JUDGEME_PROVIDER_KEY, payloadHash }),
        providerKey: JUDGEME_PROVIDER_KEY,
        providerClass: "APPLICATION_SIGNAL",
        subject: { ...binding.subject },
        evidenceType: JUDGEME_EVIDENCE_TYPE,
        result: "INCONCLUSIVE",
        normalizedFacts: facts,
        occurredAt: facts.occurredAt,
        receivedAt,
        expiresAt: facts.expiresAt,
        payloadHash,
        cryptographicallyVerified: false,
        serverVerified: false,
        reasonCodes: ["REFERENCE_ADAPTER_NON_LIVE", "PROVIDER_ATTESTATION_NOT_CONFIGURED", "PROVIDER_FINDING_IS_NOT_A_CYBER_SENTINELS_DECISION"],
      };
    },
  };
}

export function toJudgeMeContextEvidence(evidence: CanonicalProviderEvidence, at = new Date().toISOString()): CanonicalContextEvidence {
  if (evidence.providerKey !== JUDGEME_PROVIDER_KEY || evidence.providerClass !== "APPLICATION_SIGNAL" || evidence.evidenceType !== JUDGEME_EVIDENCE_TYPE || evidence.result !== "INCONCLUSIVE" || evidence.serverVerified !== false || evidence.cryptographicallyVerified !== false) invalid("JUDGEME_UNQUALIFIED_EVIDENCE_REQUIRED");
  const facts = evidence.normalizedFacts as ReturnType<typeof normalizedObservation>;
  const binding = validateBinding(facts.binding);
  const normalized = normalizedObservation({
    providerKey: evidence.providerKey, evidenceType: evidence.evidenceType, eventId: facts.providerEventId,
    subject: evidence.subject, finding: "OBSERVED", occurredAt: evidence.occurredAt, expiresAt: evidence.expiresAt,
    evidence: { tenantId: binding.tenantId, installationId: binding.installationId, shopDomain: binding.shopDomain, reviewReference: binding.reviewReference, eventType: facts.eventType, review: facts.review },
  }, binding);
  if (hashCanonical(normalized) !== evidence.payloadHash || hashCanonical(facts) !== evidence.payloadHash) invalid("JUDGEME_DIGEST_MISMATCH");
  const evaluated = timestamp(at);
  if (timestamp(evidence.receivedAt) < timestamp(evidence.occurredAt) || evaluated < timestamp(evidence.receivedAt) || evaluated >= timestamp(normalized.expiresAt)) invalid("JUDGEME_OBSERVATION_NOT_CURRENT");
  return {
    providerClass: "APPLICATION_SIGNAL", providerKey: JUDGEME_PROVIDER_KEY,
    evidenceType: JUDGEME_EVIDENCE_TYPE, observedAt: evidence.occurredAt,
    outcome: "OBSERVED", evidenceDigest: evidence.payloadHash,
    metadata: { ...normalized, serverVerified: false, cryptographicallyVerified: false },
  };
}
