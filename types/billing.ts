export type ClearanceTier = "free" | "pro" | "teams" | "reports";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled";

export type BillingPlan = {
  tier: ClearanceTier;
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  api_call_limit: number;
  report_credits: number;
  evidence_storage: string;
  highlighted?: boolean;
};

export type BillingProfile = {
  clearance_tier: ClearanceTier;
  subscription_status: SubscriptionStatus;
  billing_customer_id: string | null;
  usage_count: number;
  report_credits: number;
  api_call_limit: number;
  api_calls_used: number;
};

export type BillingEventType =
  | "clearance_selected"
  | "billing_checkout_started"
  | "plan_upgrade_requested";
