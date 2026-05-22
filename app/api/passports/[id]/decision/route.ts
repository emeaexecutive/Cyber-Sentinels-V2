import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
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

  if (!decision) {
    return NextResponse.json(
      { ok: false, error: "Invalid passport decision" },
      { status: 400 }
    );
  }

  const clearance = decision === "approve" ? "approved" : "rejected";
  const verified = decision === "approve";
  const reviewStatus = decision === "approve" ? "verified" : "rejected";
  const trustScore = calculateTrustScore({
    reviewOutcome: decision === "approve" ? "allow" : "deny",
  });

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
}
