import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createStripeClient,
  upsertBillingCustomer,
  upsertSubscription,
  upsertUsageLimits,
} from "@/lib/billing/stripe";
import { getStripeWebhookSecretEnv, isEnvConfigurationError } from "@/lib/env";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
import { checkRequestRateLimit } from "@/lib/security";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { UserPlan } from "@/types/billing";
import { completeWebhookEvent, reserveWebhookEvent, retainRejectedWebhookEvent } from "@/lib/webhooks/event-ledger";

export const dynamic = "force-dynamic";
const maxWebhookBytes = 1_000_000;

async function reserveStripeEvent(event: Stripe.Event, rawBody: string) {
  const intake = await reserveWebhookEvent({ provider: "stripe", eventId: event.id, eventType: event.type, rawBody, tenantId: null, workflowId: null, correlationId: event.id });
  return intake.reserved;
}

async function finishStripeEvent(eventId: string, status: "processed" | "failed", failureReason?: string) {
  await completeWebhookEvent("stripe", eventId, status, failureReason);
}

async function retainRejectedStripeEvent(rawBody: string, reason: string) {
  await retainRejectedWebhookEvent("stripe", rawBody, reason);
}

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
    captureOperationalIssue("stripe_webhook", "warning", "Checkout webhook missing billing identifiers.", {
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
    captureOperationalIssue("stripe_webhook", "warning", "Subscription webhook missing user metadata.", {
      subscription_id: subscription.id,
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
    captureOperationalIssue("stripe_webhook", "warning", "Subscription deletion webhook missing user metadata.", {
      subscription_id: subscription.id,
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
    captureOperationalIssue("stripe_webhook", "warning", "Invoice webhook missing subscription user metadata.", {
      subscription_id: subscriptionId,
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
  const rateLimited = checkRequestRateLimit({
    route: "/api/stripe/webhook",
    req,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxWebhookBytes) {
    return NextResponse.json({ ok: false, error: "Webhook payload is too large." }, { status: 413 });
  }
  let rawBody = "";
  let retainedEventId: string | null = null;
  try {
    const stripe = createStripeClient();
    const webhookSecret = getStripeWebhookSecretEnv("Stripe webhook");
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      captureOperationalIssue("stripe_webhook", "warning", "Stripe webhook signature missing.");
      return NextResponse.json(
        { ok: false, error: "Missing signature" },
        { status: 400 }
      );
    }

    rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxWebhookBytes) {
      return NextResponse.json({ ok: false, error: "Webhook payload is too large." }, { status: 413 });
    }
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    const reserved = await reserveStripeEvent(event, rawBody);
    if (!reserved) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    retainedEventId = event.id;

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

    await finishStripeEvent(event.id, "processed");

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorCategory = isEnvConfigurationError(error)
      ? "webhook_not_configured"
      : "signature_or_processing_failure";
    if (retainedEventId) {
      await finishStripeEvent(retainedEventId, "failed", errorCategory).catch(() => undefined);
    } else if (rawBody) {
      await retainRejectedStripeEvent(rawBody, errorCategory).catch(() => undefined);
    }
    captureOperationalIssue("stripe_webhook", "error", "Stripe webhook handling failed.", {
      configured: isEnvConfigurationError(error) ? false : true,
      error_name: error instanceof Error ? error.name : "unknown",
    });

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
