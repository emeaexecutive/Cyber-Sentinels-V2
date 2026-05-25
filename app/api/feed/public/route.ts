import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getPublicTrustFeed } from "@/lib/trust-feed/feed";

export async function GET() {
  const supabase = await createClient();

  // Public feed items are intentionally pre-sanitized and never include evidence,
  // admin notes, raw risk details or private PII.
  await createSignal(supabase, "trust_feed_viewed");
  await createAuditLog(supabase, "trust_feed_accessed", "public", {
    source: "public_feed_api",
  });

  return NextResponse.json({
    ok: true,
    feed: getPublicTrustFeed(),
  });
}
