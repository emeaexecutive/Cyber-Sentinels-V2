import type {
  BillingPlan,
  BillingProfile,
  ClearanceTier,
} from "@/types/billing";

export const clearancePlans: BillingPlan[] = [
  {
    tier: "free",
    name: "Free",
    price: "£/€0",
    cadence: "forever",
    description: "Entry access for early trust workflows.",
    features: [
      "Waitlist",
      "1 basic Trust Passport",
      "Demo Trust Radar",
      "Limited verification history",
    ],
    api_call_limit: 0,
    report_credits: 0,
    evidence_storage: "Demo only",
  },
  {
    tier: "pro",
    name: "Pro",
    price: "£/€9-15",
    cadence: "per month placeholder",
    description: "Verified personal trust layer for human and media proof.",
    features: [
      "Verified Human Passport",
      "Human Presence Index™",
      "Reality Passport™",
      "Origin Trace™",
      "Trust Timeline™",
      "Trust Embeds(TM)",
      "Trust Seals(TM)",
      "Trust Registry listing",
      "Evidence Vault access",
      "Client Portal access",
    ],
    api_call_limit: 250,
    report_credits: 1,
    evidence_storage: "1 GB placeholder",
    highlighted: true,
  },
  {
    tier: "teams",
    name: "Teams",
    price: "£/€49-99",
    cadence: "per month placeholder",
    description: "Operational trust tooling for teams and partner workflows.",
    features: [
      "Hiring Shield",
      "Verification Queue",
      "Back Office",
      "Admin decisions",
      "Trust API access",
      "Trust Embeds(TM)",
      "Trust Seals(TM)",
      "Trust Registry listing",
      "Developer Console",
      "Client Portal workspace",
    ],
    api_call_limit: 5000,
    report_credits: 10,
    evidence_storage: "25 GB placeholder",
  },
  {
    tier: "reports",
    name: "Reports",
    price: "£/€49-99",
    cadence: "per report placeholder",
    description: "One-off candidate or media verification report.",
    features: [
      "Candidate Trust Report",
      "One-off verification",
      "Human review-ready summary",
      "Export-ready evidence notes",
    ],
    api_call_limit: 25,
    report_credits: 1,
    evidence_storage: "Per-report bundle",
  },
];

export const billingSignals = [
  "clearance_selected",
  "billing_checkout_started",
  "plan_upgrade_requested",
] as const;

export const billingAuditEvents = [
  "billing_checkout_placeholder_created",
  "clearance_changed",
] as const;

export const billingDatabaseFields = [
  "clearance_tier",
  "subscription_status",
  "billing_customer_id",
  "usage_count",
  "report_credits",
  "api_call_limit",
  "api_calls_used",
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
