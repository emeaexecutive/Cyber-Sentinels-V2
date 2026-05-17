import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("passports")
      .insert({
        user_email: body.user_email,
        subject_name: body.subject_name,
        subject_type: body.subject_type,
        trust_score: body.trust_score || 50,
        clearance: "pending",
        verified: false,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("signals").insert({
      event: `Passport created for ${body.subject_name}`,
    });

    return NextResponse.json({ ok: true, passport: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Could not create passport" },
      { status: 500 }
    );
  }
}