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
      return NextResponse.redirect(new URL("/login?next=/billing", req.url), {
        status: 303,
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("Stripe billing not configured");

      return NextResponse.json(
        { ok: false, error: "Billing portal is not configured." },
        { status: 503 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: billingCustomer } = await serviceSupabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!billingCustomer?.stripe_customer_id) {
      return NextResponse.redirect(new URL("/pricing", req.url), {
        status: 303,
      });
    }

    const stripe = createStripeClient();
    const { portalReturnUrl } = getBillingReturnUrls();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: portalReturnUrl,
    });

    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (error) {
    console.error("Stripe customer portal creation failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: isEnvConfigurationError(error)
          ? "Billing portal is not configured."
          : "Could not open billing portal.",
      },
      { status: 503 }
    );
  }
}
