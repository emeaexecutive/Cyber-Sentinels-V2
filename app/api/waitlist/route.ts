import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!error) {
      await recordTrustEvent(supabase, {
        signal: `Waitlist entry created for ${email}`,
        audit: {
          eventType: "waitlist.created",
          actor: email,
          metadata: { source: "waitlist" },
        },
        trustUpdate: {
          action: "trust.update",
          actor: email,
          subject: email,
          metadata: { source: "waitlist.created" },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
