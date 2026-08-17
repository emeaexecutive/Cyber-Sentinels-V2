import { NextResponse } from "next/server";
import { ensureControlledAgentAlpha } from "@/lib/onboarding/controlled-agent-alpha";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function nonProductionOnly() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const productionReference = "kecgtsfibkypjuaxqbjx";
  return process.env.VERCEL_ENV !== "production" && !supabaseUrl.includes(productionReference);
}

export async function POST() {
  if (!nonProductionOnly()) {
    return NextResponse.json(
      { ok: false, error: "CANONICAL_JOURNEY_REFUSES_PRODUCTION" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const result = await ensureControlledAgentAlpha({ supabase, user });
    return NextResponse.json(
      { ok: true, result },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Canonical Alpha/Beta/Gamma initialization failed safely.", {
      code: (error as { code?: string })?.code ?? "UNKNOWN",
    });
    return NextResponse.json(
      { ok: false, error: "CANONICAL_JOURNEY_INITIALIZATION_FAILED" },
      { status: 503 },
    );
  }
}
