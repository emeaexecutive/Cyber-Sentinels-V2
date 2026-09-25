import { hashCanonical } from "../trust-core/hash.ts";
import type { EnterpriseSubjectClass } from "../trust-fabric/types.ts";
import type { PurposeLineageContext } from "../trust-fabric/purpose-lineage.ts";
import type { ExternalEffectKind } from "../trust-fabric/external-effect-boundary.ts";
import type { CanonicalContextEvidence, CanonicalTrustTransactionInput } from "../trust-transaction/canonical.ts";

/** Minimum effect of each bounded interaction, not permission for its subactions. */
export const SYNTHETIC_INTERACTION_ACTIONS = {
  SUBMIT_REVIEW: { capability: "submit_review", effect: "ARTIFACT_PUBLICATION" },
  EDIT_REVIEW: { capability: "edit_review", effect: "DATA_WRITE" },
  CREATE_ACCOUNT: { capability: "create_account", effect: "ACCOUNT_CREATION" },
  POST_CONTENT: { capability: "post_content", effect: "ARTIFACT_PUBLICATION" },
  MAKE_PURCHASE: { capability: "make_purchase", effect: "DATA_WRITE" },
  ISSUE_REFUND: { capability: "issue_refund", effect: "DATA_WRITE" },
  CHANGE_RATING: { capability: "change_rating", effect: "DATA_WRITE" },
  SEND_MESSAGE: { capability: "send_message", effect: "NETWORK_EXTERNAL_COMMUNICATION" },
  REQUEST_PAYOUT: { capability: "request_payout", effect: "DATA_WRITE" },
  CREATE_LISTING: { capability: "create_listing", effect: "ARTIFACT_PUBLICATION" },
  APPROVE_TRANSACTION: { capability: "approve_transaction", effect: "DATA_WRITE" },
  EXECUTE_PROMOTION: { capability: "execute_promotion", effect: "ARTIFACT_PUBLICATION" },
} as const satisfies Record<string, { capability: string; effect: ExternalEffectKind }>;

export type SyntheticInteractionAction = keyof typeof SYNTHETIC_INTERACTION_ACTIONS;
export type SyntheticActorType = "HUMAN" | "SERVICE" | "AI_AGENT";
const subjectTypes = { HUMAN: "human", SERVICE: "machine_identity", AI_AGENT: "ai_agent" } as const satisfies Record<SyntheticActorType, EnterpriseSubjectClass>;

export const SYNTHETIC_INTERACTION_EVIDENCE_FACETS = [
  "TRANSACTION_VERIFIED", "IDENTITY_VERIFIED", "AUTHORITY_VERIFIED", "CONTENT_INTERACTION_RISK",
] as const;

/** A claim about a facet, never a grant or a substitute for configured verification. */
export type SyntheticInteractionObservation = {
  facet: typeof SYNTHETIC_INTERACTION_EVIDENCE_FACETS[number];
  sourceReference: string;
  evidenceReference: string;
  observedAt: string;
  claim: string;
  provenance: "ASSERTED" | "OBSERVED";
};

export type SyntheticInteractionRequest = {
  actor: { type: SyntheticActorType; subjectId: string; operationalEntityId: string };
  action: SyntheticInteractionAction;
  purpose: string;
  target: string;
  environment: string;
  contentDigest: string;
  idempotencyKey: string;
  credentialReference?: string;
  externalChannel?: string;
  delegationReference?: string;
};

/**
 * Server-resolved context only. Never deserialize this argument from a public request.
 * Authorization comes from the existing policy/delegation evaluator; it cannot replace
 * the Trust Contract and exact policy loaded by executeCanonicalTrustTransaction.
 */
export type SyntheticInteractionServerContext = {
  requestedAt: string;
  purposeLineage?: Omit<PurposeLineageContext, "declaredPurpose">;
  authorization?: NonNullable<CanonicalTrustTransactionInput["managedControl"]>["authorization"];
  delegation?: {
    reference: string;
    authorization: NonNullable<NonNullable<CanonicalTrustTransactionInput["managedControl"]>["authorization"]>;
  };
  observations?: SyntheticInteractionObservation[];
};

const referencePattern = /^[A-Za-z0-9_.:/-]{1,180}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const consequentialActions = new Set<SyntheticInteractionAction>([
  "MAKE_PURCHASE", "ISSUE_REFUND", "REQUEST_PAYOUT", "APPROVE_TRANSACTION", "EXECUTE_PROMOTION",
]);

function reference(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !referencePattern.test(value)) throw new TypeError(`Invalid synthetic interaction ${field}.`);
}

function observations(context: SyntheticInteractionServerContext): CanonicalContextEvidence[] {
  const items = context.observations ?? [];
  if (!Array.isArray(items) || items.length > 32) throw new TypeError("Synthetic interaction observations must be bounded.");
  return items.map((item) => {
    if (!SYNTHETIC_INTERACTION_EVIDENCE_FACETS.includes(item.facet)) throw new TypeError("Unknown synthetic interaction evidence facet.");
    reference(item.sourceReference, "evidence source");
    reference(item.evidenceReference, "evidence reference");
    reference(item.claim, "evidence claim");
    if (!["ASSERTED", "OBSERVED"].includes(item.provenance)) throw new TypeError("Invalid observation provenance.");
    if (typeof item.observedAt !== "string") throw new TypeError("Invalid observation time.");
    const at = Date.parse(item.observedAt);
    if (!Number.isFinite(at) || at > Date.parse(context.requestedAt)) throw new TypeError("Invalid observation time.");
    const metadata = {
      facet: item.facet, sourceReference: item.sourceReference, evidenceReference: item.evidenceReference,
      claim: item.claim, provenance: item.provenance,
      serverVerified: false, authorizesInteraction: false,
    };
    return {
      providerClass: "APPLICATION_SIGNAL", providerKey: item.sourceReference,
      // Risk labels stay in metadata: some canonical evidence type names trigger REVIEW.
      evidenceType: item.facet, observedAt: item.observedAt, outcome: "OBSERVED",
      evidenceDigest: hashCanonical({ ...metadata, observedAt: item.observedAt }), metadata,
    };
  });
}

/**
 * Pure input composer. The caller uses the existing canonical transaction service
 * for authentication, tenant/entity resolution, current authority, policy and receipts.
 * This module neither decides nor persists nor executes a provider action.
 */
export function composeSyntheticInteraction(
  request: SyntheticInteractionRequest,
  serverContext: SyntheticInteractionServerContext,
): CanonicalTrustTransactionInput {
  if (typeof request.action !== "string" || !Object.hasOwn(SYNTHETIC_INTERACTION_ACTIONS, request.action)) throw new TypeError("Unknown synthetic interaction action.");
  if (typeof request.actor.type !== "string" || !Object.hasOwn(subjectTypes, request.actor.type)) throw new TypeError("Unknown synthetic actor type.");
  reference(request.actor.subjectId, "subject");
  reference(request.actor.operationalEntityId, "operational entity");
  reference(request.purpose, "purpose");
  reference(request.environment, "environment");
  if (typeof request.target !== "string" || !request.target.trim() || request.target !== request.target.trim() || request.target.length > 300 || /[\u0000-\u001f\u007f]/.test(request.target)) throw new TypeError("Invalid synthetic interaction target.");
  if (typeof request.contentDigest !== "string" || !digestPattern.test(request.contentDigest)) throw new TypeError("A SHA-256 content digest is required.");
  if (typeof request.idempotencyKey !== "string" || !/^[A-Za-z0-9_.:-]{8,180}$/.test(request.idempotencyKey)) throw new TypeError("Invalid synthetic interaction idempotency key.");
  if (typeof serverContext.requestedAt !== "string" || !Number.isFinite(Date.parse(serverContext.requestedAt))) throw new TypeError("Invalid synthetic interaction evaluation time.");
  for (const key of ["credentialReference", "externalChannel", "delegationReference"] as const) {
    if (request[key] !== undefined) reference(request[key], key);
  }
  const action = SYNTHETIC_INTERACTION_ACTIONS[request.action];
  const contextEvidence = observations(serverContext);
  const purposeLineage: PurposeLineageContext = {
    ...structuredClone(serverContext.purposeLineage ?? {}), declaredPurpose: request.purpose,
  };
  let authorization = serverContext.authorization ? structuredClone(serverContext.authorization) : undefined;
  const delegation = serverContext.delegation ? structuredClone(serverContext.delegation) : null;
  if (delegation && delegation.reference !== request.delegationReference) throw new TypeError("Delegation reference does not match the requested interaction.");
  for (const evaluated of [authorization, delegation?.authorization]) {
    if (!evaluated) continue;
    if (!["ALLOW", "REVIEW", "DENY"].includes(evaluated.decision) || !Array.isArray(evaluated.reasonCodes) || !evaluated.reasonCodes.length || evaluated.reasonCodes.length > 32) throw new TypeError("Invalid server authorization context.");
    evaluated.reasonCodes.forEach((reason) => reference(reason, "authorization reason"));
  }
  if (delegation) {
    const decisions = [authorization?.decision, delegation.authorization.decision];
    authorization = {
      decision: decisions.includes("DENY") ? "DENY" : decisions.includes("REVIEW") ? "REVIEW" : "ALLOW",
      reasonCodes: [...new Set([...(authorization?.reasonCodes ?? []), ...delegation.authorization.reasonCodes])],
    };
  }
  const requiredReviews: string[] = [];
  if (request.delegationReference && !delegation) requiredReviews.push("DELEGATION_EVALUATION_REQUIRED");
  // The generic effect enum cannot prove amount/currency/recipient, budget, or executor
  // qualification. No caller assertion can remove this first-increment restriction.
  if (consequentialActions.has(request.action)) requiredReviews.push("INTERACTION_EXECUTION_QUALIFICATION_REQUIRED");
  if (requiredReviews.length) authorization = {
    decision: authorization?.decision === "DENY" ? "DENY" : "REVIEW",
    reasonCodes: [...new Set([...(authorization?.reasonCodes ?? []), ...requiredReviews])],
  };
  const externalEffectBoundary = {
    target: request.target, externalEffect: action.effect,
    credentialReference: request.credentialReference ?? null,
    externalChannel: request.externalChannel ?? null,
  };
  const binding = {
    category: "SYNTHETIC_INTERACTION_TRUST", version: 1,
    actor: { type: request.actor.type, subjectId: request.actor.subjectId, operationalEntityId: request.actor.operationalEntityId },
    action: request.action, purpose: request.purpose, target: request.target, environment: request.environment,
    contentDigest: request.contentDigest, delegationReference: request.delegationReference ?? null,
    externalEffectBoundary, purposeLineage, authorization: authorization ?? null, contextEvidence,
  };
  return {
    trustObject: { subjectType: subjectTypes[request.actor.type], subjectId: request.actor.subjectId },
    operationalEntityId: request.actor.operationalEntityId,
    action: {
      type: action.capability, purpose: request.purpose, resource: request.target,
      environment: request.environment, payloadDigest: hashCanonical(binding),
    },
    idempotencyKey: request.idempotencyKey, requestedAt: serverContext.requestedAt,
    managedControl: {
      externalEffectBoundary, purposeLineage, authorization,
      contextEvidence: [
        ...contextEvidence,
        {
          providerClass: "APPLICATION_SIGNAL", providerKey: "cyber_sentinels_workflow",
          evidenceType: "SYNTHETIC_INTERACTION_REQUEST", observedAt: serverContext.requestedAt,
          outcome: "OBSERVED", evidenceDigest: hashCanonical(binding),
          metadata: {
            category: binding.category, version: binding.version, action: request.action,
            contentDigest: request.contentDigest, delegationReference: binding.delegationReference,
            authorizesInteraction: false,
          },
        },
      ],
    },
  };
}
