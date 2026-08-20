import Stripe from "stripe";
import {
  getSiteUrlEnv,
  getStripeProPriceIdEnv,
  getStripeSecretKeyEnv,
} from "@/lib/env";
import { getPlan } from "@/lib/billing/plans";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { UserPlan } from "@/types/billing";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export function createStripeClient() {
  const secretKey = getStripeSecretKeyEnv("Stripe API");
  if (process.env.STRIPE_LIVE?.trim().toUpperCase() === "YES" || !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_LIVE_DISABLED_FOR_PREVIEW_QUALIFICATION");
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-07-29.dahlia",
  });
}

export function getProPriceId() {
  return getStripeProPriceIdEnv("Stripe Pro price");
}

export function getBillingReturnUrls() {
  const siteUrl = getSiteUrlEnv("Stripe return URLs").replace(/\/$/, "");

  return {
    successUrl: `${siteUrl}/billing?checkout=success`,
    cancelUrl: `${siteUrl}/pricing?checkout=cancelled`,
    portalReturnUrl: `${siteUrl}/billing`,
  };
}

function stripeTimestampToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

export async function upsertUsageLimits(
  supabase: ServiceRoleClient,
  userId: string,
  planName: UserPlan
) {
  const plan = getPlan(planName);

  const { error } = await supabase.from("usage_limits").upsert(
    {
      user_id: userId,
      plan: planName,
      max_passports: plan.passport_limit,
      max_evidence_uploads: plan.evidence_upload_limit,
      trust_graph_enabled: plan.trust_graph_enabled,
      governance_enabled: plan.governance_enabled,
      api_access_enabled: plan.api_access_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("billing usage limits upsert failed", error);
  }
}

export async function upsertBillingCustomer(
  supabase: ServiceRoleClient,
  values: {
    userId: string;
    userEmail: string | null;
    stripeCustomerId: string;
  }
) {
  const { error } = await supabase.from("billing_customers").upsert(
    {
      user_id: values.userId,
      user_email: values.userEmail,
      stripe_customer_id: values.stripeCustomerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("billing customer upsert failed", error);
    throw error;
  }
}

export async function upsertSubscription(
  supabase: ServiceRoleClient,
  values: {
    userId: string;
    userEmail: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    plan: UserPlan;
    status: string;
    currentPeriodEnd?: number | null;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: values.userId,
      user_email: values.userEmail,
      stripe_customer_id: values.stripeCustomerId,
      stripe_subscription_id: values.stripeSubscriptionId,
      stripe_price_id: values.stripePriceId,
      plan: values.plan,
      status: values.status,
      current_period_end: stripeTimestampToIso(values.currentPeriodEnd),
      cancel_at_period_end: values.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    },
    values.stripeSubscriptionId
      ? { onConflict: "stripe_subscription_id" }
      : { onConflict: "user_id" }
  );

  if (error) {
    console.error("subscription upsert failed", error);
    throw error;
  }

  await upsertUsageLimits(
    supabase,
    values.userId,
    values.status === "active" || values.status === "trialing"
      ? values.plan
      : "free"
  );
}
