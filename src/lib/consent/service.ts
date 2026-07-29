import "server-only";

import { canonicalizeJson } from "@/src/lib/trust-events/canonicalize";
import { sha256Hex, signTrustEvent } from "@/src/lib/trust-events/hash";
import { TRUST_EVENT_CANONICALIZATION, TRUST_EVENT_HASH_ALGORITHM, TRUST_EVENT_SCHEMA_VERSION } from "@/src/lib/trust-events/types";
import { currentConsentPolicy, normalizeConsentChoices } from "./policy.ts";
import { consentRepository } from "./repository.ts";
import { signConsentReceipt } from "./receipt.ts";
import { consentActions, type ConsentAction } from "./types.ts";
import type { ConsentRequestContext } from "./http.ts";

const actionEvents: Record<ConsentAction, string> = { ACCEPT_ALL: "consent.accept_all", REJECT_OPTIONAL: "consent.reject_optional", SAVE_PREFERENCES: "consent.preferences.saved", WITHDRAW: "consent.withdrawn", POLICY_RECONSENT: "consent.policy.reconsent_required", SYSTEM_MIGRATION: "consent.preferences.saved" };

export async function persistConsentChoice(input: { context: ConsentRequestContext; action: unknown; choices: unknown; policyVersion: unknown; idempotencyKey: string; correlationId: string; source: string }) {
  if (!consentActions.includes(input.action as ConsentAction)) throw Object.assign(new Error("Consent action is invalid."), { status: 400, code: "CONSENT_ACTION_INVALID" });
  const action = input.action as ConsentAction;
  if (input.policyVersion !== currentConsentPolicy.version) throw Object.assign(new Error("The active consent policy requires a fresh choice."), { status: 409, code: "CONSENT_POLICY_VERSION_MISMATCH" });
  if (!/^[A-Za-z0-9_.:-]{8,160}$/.test(input.idempotencyKey)) throw Object.assign(new Error("A valid Idempotency-Key is required."), { status: 400, code: "IDEMPOTENCY_KEY_REQUIRED" });
  let choices = normalizeConsentChoices(input.choices, input.context.regionProfile);
  if (action === "ACCEPT_ALL") choices = { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true };
  if (["REJECT_OPTIONAL", "WITHDRAW"].includes(action)) choices = { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false };
  const enabled = currentConsentPolicy.categories.filter((category) => choices[category.key]);
  const now = new Date(); const expires = new Date(now.getTime() + currentConsentPolicy.expiresAfterDays * 86_400_000);
  const receipt = signConsentReceipt({ receiptId: crypto.randomUUID(), enterpriseId: input.context.enterpriseId, userId: input.context.userId, anonymousId: input.context.userId ? null : input.context.anonymousIdHash, policyVersion: currentConsentPolicy.version, bannerVersion: currentConsentPolicy.bannerVersion, preferenceSchemaVersion: currentConsentPolicy.preferenceSchemaVersion, regionProfile: input.context.regionProfile, language: input.context.language, categories: choices, purposes: enabled.flatMap((category) => category.purposes), providers: enabled.flatMap((category) => category.providers), consentAction: action, occurredAt: now.toISOString(), receivedAt: now.toISOString(), expiresAt: expires.toISOString(), source: input.source.slice(0, 80), userAgentHash: input.context.userAgentHash, coarseCountry: input.context.coarseCountry, hashAlgorithm: "SHA-256", canonicalization: "RFC8785-JCS" });
  const requestHash = sha256Hex(canonicalizeJson({ action, choices, policyVersion: input.policyVersion, subjectKey: input.context.subjectKey }));
  const repository = consentRepository();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const head = await repository.chainHead(input.context.enterpriseId, input.correlationId);
    const base = { enterpriseId: input.context.enterpriseId, schemaVersion: TRUST_EVENT_SCHEMA_VERSION, subject: { type: "HUMAN" as const, id: input.context.subjectKey }, actor: { type: input.context.userId ? "USER" as const : "SYSTEM" as const, id: input.context.subjectKey }, workflow: null, session: null, authority: null, provider: { key: "cyber_sentinels_consent", protocol: "UNSIGNED" as const, serverVerified: true, eventId: receipt.receiptId, transactionId: input.idempotencyKey, deliveryId: null }, normalizedFacts: { policyVersion: receipt.policyVersion, receiptReference: `consent-receipt:${receipt.receiptId}`, regionProfile: receipt.regionProfile, source: receipt.source, categories: receipt.categories }, evidenceReferences: [`consent-receipt:${receipt.receiptId}`], occurredAt: receipt.occurredAt, receivedAt: receipt.receivedAt, canonicalization: TRUST_EVENT_CANONICALIZATION, hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM, ordering: { late: false, supersedesEventId: null, providerSequence: null } };
    const actionEvent = signTrustEvent({ ...base, eventId: crypto.randomUUID(), eventType: actionEvents[action], reasonCodes: [`CONSENT_${action}`], sequence: head.sequence + 1, previousHash: head.eventHash });
    const receiptEvent = signTrustEvent({ ...base, eventId: crypto.randomUUID(), eventType: "consent.receipt.created", reasonCodes: ["CONSENT_RECEIPT_INTEGRITY_RECORDED"], sequence: head.sequence + 2, previousHash: actionEvent.eventHash });
    const result = await repository.persist({ receipt, subjectKey: input.context.subjectKey, idempotencyKey: input.idempotencyKey, requestHash, trustEvents: [actionEvent, receiptEvent], correlationId: input.correlationId });
    if (result.status === "CHAIN_CONFLICT") continue;
    if (result.status === "CONFLICT") throw Object.assign(new Error("Idempotency key was already used with a different consent choice."), { status: 409, code: "IDEMPOTENCY_KEY_CONFLICT" });
    return { choices: normalizeConsentChoices(result.categories, input.context.regionProfile), replayed: result.status === "DUPLICATE", expiresAt: result.expiresAt, receiptReference: result.receiptId, receiptHash: result.receiptHash };
  }
  throw Object.assign(new Error("Consent ledger contention exceeded the safe retry limit."), { status: 503, code: "CONSENT_CHAIN_CONTENTION" });
}

export async function createConsentPolicy(input: { enterpriseId: string; actorId: string; version: string; status: string; effectiveAt: string; supersedesVersion: string | null; locale: string; contentHash: string; requiresReconsent: boolean; correlationId: string }) {
  const repository=consentRepository(); const head=await repository.chainHead(input.enterpriseId,input.correlationId); const actorReference=`administrator:${sha256Hex(`consent-admin-v1:${input.actorId}`)}`; const recordedAt=new Date().toISOString(); const base={enterpriseId:input.enterpriseId,schemaVersion:TRUST_EVENT_SCHEMA_VERSION,subject:{type:"ORGANIZATION" as const,id:`enterprise:${input.enterpriseId}`},actor:{type:"ADMINISTRATOR" as const,id:actorReference},workflow:null,session:null,authority:null,provider:{key:"cyber_sentinels_consent",protocol:"UNSIGNED" as const,serverVerified:true,eventId:input.version,transactionId:null,deliveryId:null},normalizedFacts:{policyVersion:input.version,effectiveAt:input.effectiveAt,locale:input.locale,requiresReconsent:input.requiresReconsent},evidenceReferences:[],occurredAt:recordedAt,receivedAt:recordedAt,canonicalization:TRUST_EVENT_CANONICALIZATION,hashAlgorithm:TRUST_EVENT_HASH_ALGORITHM,ordering:{late:false,supersedesEventId:null,providerSequence:null}};
  const versionEvent=signTrustEvent({...base,eventId:crypto.randomUUID(),eventType:"consent.policy.version_changed",reasonCodes:["CONSENT_POLICY_VERSION_CHANGED"],sequence:head.sequence+1,previousHash:head.eventHash}); const events=[versionEvent];
  if(input.requiresReconsent)events.push(signTrustEvent({...base,eventId:crypto.randomUUID(),eventType:"consent.policy.reconsent_required",reasonCodes:["CONSENT_POLICY_RECONSENT_REQUIRED"],sequence:head.sequence+2,previousHash:versionEvent.eventHash}));
  return repository.createPolicy({policy:{enterpriseId:input.enterpriseId,version:input.version,status:input.status,effectiveAt:input.effectiveAt,supersedesVersion:input.supersedesVersion,locale:input.locale,contentHash:input.contentHash,requiresReconsent:input.requiresReconsent,createdBy:input.actorId},trustEvents:events,correlationId:input.correlationId,actorReference});
}
