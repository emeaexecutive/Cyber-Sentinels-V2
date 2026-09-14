export type PurposeContinuityState = "CONFIRMED" | "UNPROVEN" | "DRIFTED";
export type PurposeDriftState = "NONE" | "POTENTIAL" | "MATERIAL";
export type PurposeLineageDecision = "ALLOW" | "REVIEW" | "DENY";
export type PurposeLineageReasonCode =
  | "DECLARED_PURPOSE_VERIFIED"
  | "PURPOSE_CONTINUITY_CONFIRMED"
  | "PURPOSE_DRIFT"
  | "AUTHORITY_PURPOSE_MISMATCH"
  | "PROVIDER_VIEW_INCOMPLETE"
  | "CROSS_PROVIDER_ACTIVITY"
  | "IDENTITY_FRAGMENTATION"
  | "CREDENTIAL_ACCESS_OUTSIDE_DECLARED_PURPOSE";

export type PurposeProviderObservation = {
  providerId: string;
  observedPurpose: string | null;
  completeContext: boolean;
  attributionEstablished: boolean;
};

export type PurposeLineageContext = {
  declaredPurpose?: string | null;
  observedPurpose?: string | null;
  purposeEvidence?: string[];
  purposeContinuity?: PurposeContinuityState;
  purposeDrift?: PurposeDriftState;
  providerObservations?: PurposeProviderObservation[];
  credentialInteraction?: string | null;
};

export type PurposeLineageResult = {
  decision: PurposeLineageDecision;
  reasonCodes: PurposeLineageReasonCode[];
  purposeContinuity: PurposeContinuityState;
  purposeDrift: PurposeDriftState;
  correlation: "NONE" | "CAMPAIGN_CORRELATION";
  attribution: "NOT_ESTABLISHED" | "ESTABLISHED";
};

function normalized(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function matches(left: string, right: string) {
  return left === right || left.startsWith(`${right}:`) || right.startsWith(`${left}:`);
}

export function evaluatePurposeLineage(input: {
  authorityObjective: string;
  actionPurpose: string;
  context?: PurposeLineageContext | null;
}): PurposeLineageResult | null {
  const context = input.context;
  if (!context) return null;
  if (context.purposeEvidence !== undefined && (!Array.isArray(context.purposeEvidence) || context.purposeEvidence.length > 32 || context.purposeEvidence.some((reference) => typeof reference !== "string" || !/^[A-Za-z0-9_.:@/+-]{1,240}$/.test(reference)))) {
    throw new TypeError("PURPOSE_EVIDENCE_INVALID");
  }
  const declared = normalized(context.declaredPurpose);
  const observed = normalized(context.observedPurpose);
  if (!declared) return null;

  const reasonCodes: PurposeLineageReasonCode[] = [];
  const authorityPurpose = normalized(input.authorityObjective);
  const actionPurpose = normalized(input.actionPurpose);
  const declaredMatchesAuthority = matches(declared, authorityPurpose);
  const declaredMatchesAction = matches(declared, actionPurpose);
  if (declaredMatchesAuthority && declaredMatchesAction) reasonCodes.push("DECLARED_PURPOSE_VERIFIED");
  else reasonCodes.push("AUTHORITY_PURPOSE_MISMATCH");

  let purposeContinuity = context.purposeContinuity ?? "UNPROVEN";
  let purposeDrift = context.purposeDrift ?? "NONE";
  if (observed) {
    if (matches(observed, declared) && matches(observed, actionPurpose)) {
      purposeContinuity = "CONFIRMED";
      purposeDrift = "NONE";
      reasonCodes.push("PURPOSE_CONTINUITY_CONFIRMED");
    } else {
      purposeContinuity = "DRIFTED";
      purposeDrift = "MATERIAL";
      reasonCodes.push("PURPOSE_DRIFT");
    }
  }

  if (context.credentialInteraction && /harvest|exfiltrat|steal|collect.*credential/i.test(context.credentialInteraction)) {
    reasonCodes.push("CREDENTIAL_ACCESS_OUTSIDE_DECLARED_PURPOSE");
  }

  const providers = context.providerObservations ?? [];
  const providerIds = new Set(providers.map((item) => item.providerId));
  const crossProvider = providerIds.size > 1;
  const incompleteProviderContext = providers.some((item) => !item.completeContext);
  if (crossProvider) reasonCodes.push("CROSS_PROVIDER_ACTIVITY");
  if (incompleteProviderContext) reasonCodes.push("PROVIDER_VIEW_INCOMPLETE");

  const attribution = providers.length > 0 && providers.every((item) => item.attributionEstablished)
    ? "ESTABLISHED"
    : "NOT_ESTABLISHED";
  if (crossProvider && attribution === "NOT_ESTABLISHED") reasonCodes.push("IDENTITY_FRAGMENTATION");

  const denied = reasonCodes.some((code) => ["AUTHORITY_PURPOSE_MISMATCH", "CREDENTIAL_ACCESS_OUTSIDE_DECLARED_PURPOSE"].includes(code));
  const review = purposeDrift !== "NONE" || purposeContinuity === "UNPROVEN" || incompleteProviderContext || crossProvider;
  return {
    decision: denied ? "DENY" : review ? "REVIEW" : "ALLOW",
    reasonCodes: [...new Set(reasonCodes)],
    purposeContinuity,
    purposeDrift,
    correlation: crossProvider ? "CAMPAIGN_CORRELATION" : "NONE",
    attribution,
  };
}
