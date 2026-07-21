export const trustDomainKeys = ["IDENTITY", "AI_AGENT", "DEVICE", "AUTHORITY", "WORKFLOW", "RUNTIME", "NETWORK", "DATA", "CONSENT", "GOVERNANCE"] as const;
export type TrustDomainKey = (typeof trustDomainKeys)[number];

export type TrustDomainDefinition = {
  domainKey: TrustDomainKey;
  version: string;
  displayName: string;
  description: string;
  active: boolean;
  effectiveAt: string;
};
