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

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const actor = user.email ?? user.id;

    await createSignal(supabase, "billing_checkout_disabled", {
      plan,
      actor,
    });
    await createAuditLog(
      supabase,
      "billing_checkout_disabled",
      actor,
      {
        plan,
        checkout_provider: "stripe_not_configured",
      }
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Stripe checkout is not implemented yet.",
        plan,
      },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not start checkout" },
      { status: 500 }
    );
  }
}
