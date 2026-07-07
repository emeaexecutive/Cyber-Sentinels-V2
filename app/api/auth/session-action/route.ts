import { NextResponse } from "next/server";
import { generateMfaChallenge } from "@/lib/auth/mfa";
import { recordAuthReplayEvent } from "@/lib/auth/auth-replay-events";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/session-security", request.url), {
      status: 303,
    });
  }

  const formData = await request.formData().catch(() => null);
  const action = String(formData?.get("action") ?? "");

  if (action === "step_up") {
    const challenge = generateMfaChallenge({
      userId: user.id,
      method: "sms_otp",
      purpose: "dashboard_session_security_step_up",
    });
    await recordAuthReplayEvent(supabase, {
      user,
      eventType: "mfa_challenge",
      request,
      decision: challenge.provider_state === "Live" ? "step_up" : "review",
      trustPosture: challenge.provider_state === "Live" ? "step_up_required" : "awaiting_credentials",
      metadata: { challenge },
    });
  }

  return NextResponse.redirect(new URL("/dashboard/session-security?step_up=1", request.url), {
    status: 303,
  });
}
