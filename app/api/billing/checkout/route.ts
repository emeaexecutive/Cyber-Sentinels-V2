import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isClearanceTier } from "@/lib/billing/plans";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

async function getPlanFromRequest(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
    return String(body.plan ?? "");
  }

  const formData = await req.formData();
  return String(formData.get("plan") ?? "");
}

export async function POST(req: Request) {
  try {
    // Replace with Stripe Checkout later:
    // 1. validate authenticated user and selected plan
    // 2. create or reuse Stripe customer
    // 3. create Checkout Session with price id
    // 4. return the Stripe checkout URL
    const plan = await getPlanFromRequest(req);

    if (!isClearanceTier(plan)) {
      return NextResponse.json(
        { ok: false, error: "Invalid billing plan" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const actor = user?.email ?? user?.id ?? "billing_placeholder";

    await createSignal(supabase, "billing_checkout_started");
    await createSignal(supabase, "plan_upgrade_requested");
    await createSignal(supabase, "clearance_selected");
    await createAuditLog(
      supabase,
      "billing_checkout_placeholder_created",
      actor,
      {
        plan,
        checkout_provider: "stripe_placeholder",
      }
    );
    await createAuditLog(supabase, "clearance_changed", actor, {
      clearance_tier: plan,
      subscription_status: plan === "free" ? "none" : "checkout_placeholder",
    });

    return NextResponse.json({
      ok: true,
      message: "Stripe checkout placeholder",
      plan,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not start checkout" },
      { status: 500 }
    );
  }
}
