import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateSessionIntegrity,
  normalizeSessionIntegrityInput,
} from "@/lib/session-integrity/model";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_risk_input" }, { status: 400 });
  }

  const input = normalizeSessionIntegrityInput(body);
  const result = evaluateSessionIntegrity(input);
  const flagged = result.signals.filter(
    (signal) => signal.requires_manual_review || ["medium", "high"].includes(signal.risk_level)
  );

  return NextResponse.json({
    ok: true,
    session_id: input.session_id || null,
    identity_verification_state: input.identity_verification_state ?? "pending",
    overall_status: result.overall_status,
    manual_review_required: result.manual_review_required,
    verification_flags: flagged,
    all_signals: result.signals,
    explanation: result.summary,
    automated_rejection: false,
  });
}

