import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  attachCanonicalDecisionOutcomeReview,
  CanonicalTransactionError,
} from "@/lib/trust-transaction/server";
import type { DecisionOutcomeReviewInput } from "@/src/lib/trust-transaction/canonical";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  if ((request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ ok: false, error: "UNSUPPORTED_CONTENT_TYPE" }, { status: 415 });
  }
  const { transactionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const review = await request.json().catch(() => null) as DecisionOutcomeReviewInput | null;
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return NextResponse.json({ ok: false, error: "INVALID_DECISION_OUTCOME_REVIEW" }, { status: 400 });
  }
  try {
    const result = await attachCanonicalDecisionOutcomeReview({ supabase, user, transactionId, review });
    return NextResponse.json({ ok: true, ...result }, {
      status: result.persistenceStatus === "DUPLICATE" ? 200 : 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof CanonicalTransactionError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof TypeError) {
      return NextResponse.json({ ok: false, error: "INVALID_DECISION_OUTCOME_REVIEW", message: error.message }, { status: 400 });
    }
    console.error("Decision-outcome review failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    return NextResponse.json({ ok: false, error: "DECISION_OUTCOME_REVIEW_UNAVAILABLE" }, { status: 503 });
  }
}
