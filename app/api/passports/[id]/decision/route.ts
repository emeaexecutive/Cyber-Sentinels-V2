import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import {
  configurationError,
  getRequestRiskFields,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";

type Decision = "approve" | "reject";

function getDecision(formData: FormData): Decision | null {
  const decision = String(formData.get("decision") || "");

  if (decision === "approve" || decision === "reject") {
    return decision;
  }

  return null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Security: review decisions are privileged admin/back-office actions.
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const formData = await req.formData();
    const decision = getDecision(formData);
    const { id } = await context.params;
    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    if (!decision || !validId) {
      return NextResponse.json(
        { ok: false, error: "Invalid passport decision" },
        { status: 400 }
      );
    }

    const clearance = decision === "approve" ? "approved" : "rejected";
    const verified = decision === "approve";
    const reviewStatus = decision === "approve" ? "verified" : "rejected";
    // Security: the client submits only the decision verb; the resulting trust
    // score is derived server-side to prevent score poisoning.
    const trustScore = calculateTrustScore({
      reviewOutcome: decision === "approve" ? "allow" : "deny",
    });
    const requestRisk = getRequestRiskFields(req);

    const { data: passport, error } = await supabase
      .from("passports")
      .update({
        clearance,
        verified,
        review_status: reviewStatus,
        trust_score: trustScore,
      })
      .eq("id", id)
      .select("subject_name")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Could not update passport" },
        { status: 500 }
      );
    }

    await recordTrustEvent(supabase, {
      signal: `Passport ${clearance} for ${passport.subject_name}`,
      audit: {
        eventType: "passport.review_status_changed",
        actor: user.email ?? user.id,
        metadata: {
          passport_id: id,
          subject_name: passport.subject_name,
          review_status: reviewStatus,
          clearance,
          verified,
          ...requestRisk,
        },
      },
      trustUpdate: {
        action: "trust.update",
        actor: user.email ?? user.id,
        subject: passport.subject_name,
        score: trustScore,
        metadata: {
          passport_id: id,
          review_status: reviewStatus,
        },
      },
    });

    return NextResponse.redirect(new URL("/command-center", req.url));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    return NextResponse.json(
      { ok: false, error: "Could not update passport" },
      { status: 500 }
    );
  }
}
