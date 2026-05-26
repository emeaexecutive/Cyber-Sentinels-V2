import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const allowedReasons = ["inactivity", "absolute_timeout"] as const;

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as {
      reason?: unknown;
    };
    const reason = String(payload.reason ?? "");

    if (!allowedReasons.includes(reason as (typeof allowedReasons)[number])) {
      return NextResponse.json(
        { ok: false, error: "Invalid session expiry reason" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      await createAuditLog(supabase, "session_expired", user.email, {
        reason,
      });
      await createSignal(supabase, "Session expired for security");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
