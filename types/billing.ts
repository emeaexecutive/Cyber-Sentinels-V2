export type ClearanceTier = "free" | "pro" | "enterprise";
export type UserPlan = ClearanceTier;

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "cancelled"
  | "incomplete";

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
  passport_limit: number | null;
  evidence_upload_limit: number | null;
  trust_graph_enabled: boolean;
  governance_enabled: boolean;
  api_access_enabled: boolean;
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
