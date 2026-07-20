export const consentCategoryKeys = ["essential", "functional", "analytics", "ai_improvements", "marketing"] as const;
export const consentActions = ["ACCEPT_ALL", "REJECT_OPTIONAL", "SAVE_PREFERENCES", "WITHDRAW", "POLICY_RECONSENT", "SYSTEM_MIGRATION"] as const;
export const consentRegionProfiles = ["EEA", "UK", "US_GENERAL", "US_OPT_OUT", "GLOBAL_DEFAULT"] as const;

export type ConsentCategoryKey = (typeof consentCategoryKeys)[number];
export type ConsentAction = (typeof consentActions)[number];
export type ConsentRegionProfile = (typeof consentRegionProfiles)[number];
export type ConsentChoices = Record<ConsentCategoryKey, boolean>;

export type ConsentCategoryDefinition = {
  key: ConsentCategoryKey;
  name: string;
  description: string;
  purposes: string[];
  legalBasis: string;
  providers: string[];
  storageItems: string[];
  retention: string;
  party: "FIRST_PARTY" | "FIRST_AND_THIRD_PARTY";
  required: boolean;
  lastUpdated: string;
};

export type ConsentPolicy = {
  version: string;
  bannerVersion: string;
  preferenceSchemaVersion: "consent-preferences-v1";
  locale: string;
  effectiveAt: string;
  expiresAfterDays: number;
  categories: ConsentCategoryDefinition[];
};

export type ConsentReceiptInput = {
  receiptId: string;
  enterpriseId: string;
  userId: string | null;
  anonymousId: string | null;
  policyVersion: string;
  bannerVersion: string;
  preferenceSchemaVersion: string;
  regionProfile: ConsentRegionProfile;
  language: string;
  categories: ConsentChoices;
  purposes: string[];
  providers: string[];
  consentAction: ConsentAction;
  occurredAt: string;
  receivedAt: string;
  expiresAt: string | null;
  source: string;
  userAgentHash: string | null;
  coarseCountry: string | null;
  hashAlgorithm: "SHA-256";
  canonicalization: "RFC8785-JCS";
};

export type ConsentReceipt = ConsentReceiptInput & { receiptHash: string };

export type ConsentCookieState = {
  version: 1;
  policyVersion: string;
  categories: ConsentChoices;
  receiptId: string;
  expiresAt: string;
};
