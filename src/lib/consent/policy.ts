import { consentCategoryKeys, consentRegionProfiles, type ConsentChoices, type ConsentPolicy, type ConsentRegionProfile } from "./types.ts";

export const currentConsentPolicy: ConsentPolicy = {
  version: "2026-07-20.1",
  bannerVersion: "trust-banner-v1",
  preferenceSchemaVersion: "consent-preferences-v1",
  locale: "en",
  effectiveAt: "2026-07-20T00:00:00.000Z",
  expiresAfterDays: 180,
  categories: [
    { key: "essential", name: "Essential", description: "Required for authentication, session security, CSRF protection, fraud prevention, service delivery and consent storage.", purposes: ["authentication", "session_security", "fraud_prevention", "consent_storage"], legalBasis: "Required service operation; configuration and legal review remain enterprise-specific.", providers: ["Cyber Sentinels", "Supabase", "Cloudflare", "Vercel"], storageItems: ["authentication session", "admin verification", "cs_consent", "cs_consent_anon"], retention: "Session or documented security retention period", party: "FIRST_AND_THIRD_PARTY", required: true, lastUpdated: "2026-07-20" },
    { key: "functional", name: "Functional", description: "Remembers optional display settings and enables non-essential interface behavior.", purposes: ["interface_preferences", "nonessential_personalization"], legalBasis: "Consent where required; configured per region policy.", providers: ["Cyber Sentinels"], storageItems: ["optional interface preferences"], retention: "Up to 180 days", party: "FIRST_PARTY", required: false, lastUpdated: "2026-07-20" },
    { key: "analytics", name: "Analytics", description: "Measures anonymous product usage and performance to improve the service.", purposes: ["product_analytics", "performance_analysis", "service_improvement"], legalBasis: "Consent where prior consent is required.", providers: ["Configured analytics provider only"], storageItems: ["analytics identifiers when configured"], retention: "Provider-specific; must be catalogued", party: "FIRST_AND_THIRD_PARTY", required: false, lastUpdated: "2026-07-20" },
    { key: "ai_improvements", name: "AI Improvements", description: "Allows privacy-minimised feature and assistant-quality evaluation where permitted. Customer-confidential or personal data is never included automatically.", purposes: ["workflow_improvement", "assistant_quality", "anonymous_feature_analysis"], legalBasis: "Explicit consent and enterprise configuration.", providers: ["Cyber Sentinels"], storageItems: ["privacy-minimised feature telemetry"], retention: "Up to 90 days when configured", party: "FIRST_PARTY", required: false, lastUpdated: "2026-07-20" },
    { key: "marketing", name: "Marketing", description: "Enables campaign attribution, advertising, retargeting and social-media tracking when configured.", purposes: ["campaign_attribution", "advertising", "retargeting"], legalBasis: "Consent where required; opt-out rules may apply by configured region.", providers: ["Configured marketing provider only"], storageItems: ["marketing identifiers when configured"], retention: "Provider-specific; must be catalogued", party: "FIRST_AND_THIRD_PARTY", required: false, lastUpdated: "2026-07-20" },
  ],
};

const strictDefaults: ConsentChoices = { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false };

export function isConsentRegionProfile(value: unknown): value is ConsentRegionProfile {
  return typeof value === "string" && consentRegionProfiles.includes(value as ConsentRegionProfile);
}

export function consentDefaults(profile: ConsentRegionProfile): ConsentChoices {
  // Opt-out profiles alter notices and withdrawal handling, never the
  // pre-choice tracker state. No optional technology loads before known state.
  void profile;
  return { ...strictDefaults };
}

export function normalizeConsentChoices(value: unknown, profile: ConsentRegionProfile): ConsentChoices {
  const defaults = consentDefaults(profile);
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  const choices = Object.fromEntries(consentCategoryKeys.map((key) => [key, key === "essential" ? true : record[key] === true])) as ConsentChoices;
  choices.essential = true;
  return choices;
}

export function regionProfileFromCountry(country: string | null | undefined): ConsentRegionProfile {
  const code = country?.trim().toUpperCase();
  if (code === "GB") return "UK";
  if (code && new Set(["AT","BE","BG","HR","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HU","IE","IS","IT","LI","LT","LU","LV","MT","NL","NO","PL","PT","RO","SE","SI","SK"]).has(code)) return "EEA";
  return "GLOBAL_DEFAULT";
}

export function privacyLevel(choices: ConsentChoices) {
  const enabled = consentCategoryKeys.filter((key) => key !== "essential" && choices[key]).length;
  return enabled === 0 ? "High" : enabled === consentCategoryKeys.length - 1 ? "Broad" : "Custom";
}
