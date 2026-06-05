import type {
  BillingPlan,
  BillingProfile,
  ClearanceTier,
} from "@/types/billing";

export const clearancePlans: BillingPlan[] = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "Basic trust passport access for early individual use.",
    features: [
      "Limited passports",
      "Limited evidence uploads",
      "Basic Trust Passport view",
      "No advanced graph or intelligence access",
    ],
    api_call_limit: 0,
    report_credits: 0,
    evidence_storage: "Limited",
    passport_limit: 1,
    evidence_upload_limit: 3,
    trust_graph_enabled: false,
    governance_enabled: false,
    api_access_enabled: false,
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$29",
    cadence: "per month",
    description: "Expanded workflows for evidence, review and trust visibility.",
    features: [
      "More passports",
      "Evidence workflows",
      "Trust graph",
      "Notifications",
      "Appeals",
      "Trust assistant",
    ],
    api_call_limit: 250,
    report_credits: 1,
    evidence_storage: "Workflow storage",
    passport_limit: 25,
    evidence_upload_limit: 100,
    trust_graph_enabled: true,
    governance_enabled: false,
    api_access_enabled: false,
    highlighted: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "security and compliance review",
    description: "Governed trust workflows for operational teams.",
    features: [
      "Enterprise access request",
      "Admin workflows",
      "Governance modules",
      "API access",
      "Design partner access",
      "Custom security/compliance review",
    ],
    api_call_limit: 5000,
    report_credits: 10,
    evidence_storage: "Custom",
    passport_limit: null,
    evidence_upload_limit: null,
    trust_graph_enabled: true,
    governance_enabled: true,
    api_access_enabled: true,
  },
];

export const billingSignals = [
  "clearance_selected",
  "billing_checkout_started",
  "plan_upgrade_requested",
] as const;

export const billingAuditEvents = [
  "billing_checkout_created",
  "billing_checkout_completed",
  "subscription_updated",
  "subscription_cancelled",
  "invoice_payment_succeeded",
  "invoice_payment_failed",
] as const;

export const billingDatabaseFields = [
  "plan",
  "status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "passport_limit",
  "evidence_upload_limit",
  "trust_graph_enabled",
] as const;

export function getPlan(tier: string | null | undefined) {
  return (
    clearancePlans.find((plan) => plan.tier === tier) ?? clearancePlans[0]
  );
}

export function isClearanceTier(value: string): value is ClearanceTier {
  return clearancePlans.some((plan) => plan.tier === value);
}

export function createBillingProfile(
  tier: ClearanceTier = "free",
  overrides: Partial<BillingProfile> = {}
): BillingProfile {
  const plan = getPlan(tier);

  return {
    clearance_tier: tier,
    subscription_status: tier === "free" ? "none" : "active",
    billing_customer_id: null,
    usage_count: 0,
    report_credits: plan.report_credits,
    api_call_limit: plan.api_call_limit,
    api_calls_used: 0,
    ...overrides,
  };
}
