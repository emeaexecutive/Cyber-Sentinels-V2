import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const supabase = await createClient();

    const subjectName = String(formData.get("subject_name") || "");
    const userEmail = String(formData.get("user_email") || "");
    const subjectType = String(formData.get("subject_type") || "human");

    const { error } = await supabase.from("passports").insert({
      user_email: userEmail,
      subject_name: subjectName,
      subject_type: subjectType,
      trust_score: 50,
      clearance: "pending",
      verified: false,
    });

    if (error) throw error;

    await supabase.from("signals").insert({
      event: `Passport created for ${subjectName}`,
    });

    return NextResponse.redirect(new URL("/passport", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create passport" },
      { status: 500 }
    );
  }
}