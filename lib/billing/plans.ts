import type {
  BillingPlan,
  BillingProfile,
  ClearanceTier,
} from "@/types/billing";

export const clearancePlans: BillingPlan[] = [
  {
    tier: "free",
    name: "Free",
    price: "€0",
    cadence: "",
    description: "Entry access for one verification workflow.",
    features: [
      "1 verification workflow",
      "Limited evidence uploads",
      "Basic trust passport visibility",
      "Early platform access",
    ],
    verification_workflow_limit: 1,
    operational_activity_tracking: true,
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
    tier: "starter",
    name: "Starter",
    price: "€9.99/month",
    cadence: "",
    description: "A focused tier for early operational verification work.",
    features: [
      "Up to 5 verification workflows",
      "Evidence workflows",
      "Notifications",
      "Basic audit visibility",
    ],
    verification_workflow_limit: 5,
    operational_activity_tracking: true,
    api_call_limit: 50,
    report_credits: 1,
    evidence_storage: "Workflow storage",
    passport_limit: 5,
    evidence_upload_limit: 25,
    trust_graph_enabled: false,
    governance_enabled: false,
    api_access_enabled: false,
  },
  {
    tier: "professional",
    name: "Professional",
    price: "€29.99/month",
    cadence: "",
    description: "Operational trust workflows with graph and audit depth.",
    features: [
      "Up to 15 verification workflows",
      "Trust graph access",
      "Appeals",
      "Advanced audit visibility",
      "Operational trust workflows",
    ],
    verification_workflow_limit: 15,
    operational_activity_tracking: true,
    api_call_limit: 250,
    report_credits: 3,
    evidence_storage: "Workflow storage",
    passport_limit: 15,
    evidence_upload_limit: 75,
    trust_graph_enabled: true,
    governance_enabled: false,
    api_access_enabled: false,
    highlighted: true,
  },
  {
    tier: "premium",
    name: "Premium",
    price: "€39.99/month",
    cadence: "",
    description: "Expanded visibility for teams handling higher workflow volume.",
    features: [
      "Up to 25 verification workflows",
      "Advanced trust intelligence",
      "Governance workflows",
      "Expanded operational visibility",
    ],
    verification_workflow_limit: 25,
    operational_activity_tracking: true,
    api_call_limit: 500,
    report_credits: 1,
    evidence_storage: "Workflow storage",
    passport_limit: 25,
    evidence_upload_limit: 100,
    trust_graph_enabled: true,
    governance_enabled: true,
    api_access_enabled: false,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "Trust infrastructure for governed operational collaboration.",
    features: [
      "Custom workflow volumes",
      "Admin/governance tooling",
      "Enterprise onboarding",
      "Design partner access",
      "API access",
      "Operational collaboration",
    ],
    verification_workflow_limit: null,
    operational_activity_tracking: true,
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
  "verification_workflow_count",
  "operational_activity_count",
  "passport_limit",
  "evidence_upload_limit",
  "evidence_upload_count",
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
    verification_workflow_count: 0,
    evidence_upload_count: 0,
    operational_activity_count: 0,
    report_credits: plan.report_credits,
    api_call_limit: plan.api_call_limit,
    api_calls_used: 0,
    ...overrides,
  };
}
