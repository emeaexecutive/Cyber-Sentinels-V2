import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const trustScore = decision === "approve" ? 85 : 25;

  const { data: passport, error } = await supabase
    .from("passports")
    .update({
      clearance,
      verified,
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

  await supabase.from("signals").insert({
    event: `Passport ${clearance} for ${passport.subject_name}`,
  });

  return NextResponse.redirect(new URL("/command-center", req.url));
}
