import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createStripeClient,
  upsertBillingCustomer,
  upsertSubscription,
  upsertUsageLimits,
} from "@/lib/billing/stripe";
import { getStripeWebhookSecretEnv, isEnvConfigurationError } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { UserPlan } from "@/types/billing";

export const dynamic = "force-dynamic";

function stringId(value: string | { id: string } | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function planFromMetadata(metadata: Stripe.Metadata | null | undefined): UserPlan {
  if (
    metadata?.plan === "starter" ||
    metadata?.plan === "professional" ||
    metadata?.plan === "premium" ||
    metadata?.plan === "enterprise"
  ) {
    return metadata.plan;
  }

  return metadata?.plan === "pro" ? "professional" : "free";
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  return (subscription as unknown as { current_period_end?: number | null })
    .current_period_end ?? null;
}

async function userFromSubscription(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return {
    subscription,
    userId: subscription.metadata.user_id,
    userEmail: subscription.metadata.user_email || null,
    plan: planFromMetadata(subscription.metadata),
  };
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const supabase = createServiceRoleClient();
  const subscriptionId = stringId(session.subscription);
  const customerId = stringId(session.customer);
  const userId = session.metadata?.user_id;
  const userEmail = session.customer_details?.email ?? session.metadata?.user_email ?? null;

  if (!userId || !customerId || !subscriptionId) {
    console.error("checkout.session.completed missing billing identifiers", {
      hasUserId: Boolean(userId),
      hasCustomerId: Boolean(customerId),
      hasSubscriptionId: Boolean(subscriptionId),
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id ?? null;

  await upsertBillingCustomer(supabase, {
    userId,
    userEmail,
    stripeCustomerId: customerId,
  });
  await upsertSubscription(supabase, {
    userId,
    userEmail,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan: planFromMetadata(session.metadata),
    status: subscription.status,
    currentPeriodEnd: currentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  const userId = subscription.metadata.user_id;
  const userEmail = subscription.metadata.user_email || null;
  const customerId = stringId(subscription.customer);
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = planFromMetadata(subscription.metadata);

  if (!userId) {
    console.error("subscription webhook missing user_id metadata", {
      subscriptionId: subscription.id,
    });
    return;
  }

  if (customerId) {
    await upsertBillingCustomer(supabase, {
      userId,
      userEmail,
      stripeCustomerId: customerId,
    });
  }

  await upsertSubscription(supabase, {
    userId,
    userEmail,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan,
    status: subscription.status,
    currentPeriodEnd: currentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  const userId = subscription.metadata.user_id;

  if (!userId) {
    console.error("subscription deleted webhook missing user_id metadata", {
      subscriptionId: subscription.id,
    });
    return;
  }

  await upsertSubscription(supabase, {
    userId,
    userEmail: subscription.metadata.user_email || null,
    stripeCustomerId: stringId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id ?? null,
    plan: "free",
    status: "cancelled",
    currentPeriodEnd: currentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleInvoicePayment(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceWithSubscription = invoice as unknown as {
    subscription?: string | { id: string } | null;
  };
  const subscriptionId = stringId(invoiceWithSubscription.subscription ?? null);

  if (!subscriptionId) {
    return;
  }

  const stripe = createStripeClient();
  const { subscription, userId, userEmail, plan } = await userFromSubscription(
    stripe,
    subscriptionId
  );

  if (!userId) {
    console.error("invoice webhook missing subscription user_id metadata", {
      subscriptionId,
    });
    return;
  }

  const status =
    event.type === "invoice.payment_failed" ? "past_due" : subscription.status;
  const activePlan = status === "past_due" ? "free" : plan;
  const supabase = createServiceRoleClient();

  await upsertSubscription(supabase, {
    userId,
    userEmail,
    stripeCustomerId: stringId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id ?? null,
    plan: activePlan,
    status,
    currentPeriodEnd: currentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  if (status === "past_due") {
    await upsertUsageLimits(supabase, userId, "free");
  }
}

export async function POST(req: Request) {
  try {
    const stripe = createStripeClient();
    const webhookSecret = getStripeWebhookSecretEnv("Stripe webhook");
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Stripe webhook signature missing");
      return NextResponse.json(
        { ok: false, error: "Missing signature" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handleInvoicePayment(event);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: isEnvConfigurationError(error)
          ? "Stripe webhook is not configured."
          : "Webhook handling failed.",
      },
      { status: 400 }
    );
  }
}
