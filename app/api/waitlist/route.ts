import { NextResponse } from "next/server";
import { recordTrustEvent } from "@/lib/database/events";
import {
  checkRateLimitPlaceholder,
  configurationError,
  getRequestRiskFields,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // Security: public endpoint, so keep validation/rate limiting server-side.
    const rateLimited = checkRateLimitPlaceholder({
      route: "/api/waitlist",
      req,
      limit: 10,
      windowMs: 60_000,
    });

    if (rateLimited) {
      return rateLimited;
    }

    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail || email.length > 254) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createClient();
    const requestRisk = getRequestRiskFields(req);
    const { error } = await supabase.from("waitlist").insert({
      email,
      ...requestRisk,
    });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: "Could not join waitlist" },
        { status: 500 }
      );
    }

    if (!error) {
      await recordTrustEvent(supabase, {
        signal: `Waitlist entry created for ${email}`,
        audit: {
          eventType: "waitlist.created",
          actor: email,
          metadata: { source: "waitlist", ...requestRisk },
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
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
