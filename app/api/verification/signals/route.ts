import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateSessionIntegrity,
  normalizeSessionIntegrityInput,
  sessionSignalCategories,
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
    return NextResponse.json({ ok: false, error: "invalid_signal_input" }, { status: 400 });
  }

  const input = normalizeSessionIntegrityInput(body);
  const result = evaluateSessionIntegrity(input);

  return NextResponse.json({
    ok: true,
    supported_categories: sessionSignalCategories,
    identity_verification_state: input.identity_verification_state ?? "pending",
    ...result,
    automated_trust_decision: false,
  });
}

