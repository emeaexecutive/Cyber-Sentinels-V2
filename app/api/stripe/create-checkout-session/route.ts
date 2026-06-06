import { NextResponse } from "next/server";
import { createStripeClient, getBillingReturnUrls } from "@/lib/billing/stripe";
import { isEnvConfigurationError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login?next=/pricing", req.url), {
        status: 303,
      });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    if (!stripeSecretKey || !priceId) {
      console.log("Stripe billing not configured");

      return NextResponse.json(
        { ok: false, error: "Stripe price is not configured." },
        { status: 503 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const stripe = createStripeClient();
    const { successUrl, cancelUrl } = getBillingReturnUrls();
    const userEmail = user.email ?? null;

    const { data: existingCustomer } = await serviceSupabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingCustomer?.stripe_customer_id ?? undefined,
      customer_email: existingCustomer?.stripe_customer_id ? undefined : userEmail ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        user_email: userEmail ?? "",
        plan: "professional",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: userEmail ?? "",
          plan: "professional",
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { ok: false, error: "Could not create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: isEnvConfigurationError(error)
          ? "Billing is not configured."
          : "Could not start checkout.",
      },
      { status: 503 }
    );
  }
}
