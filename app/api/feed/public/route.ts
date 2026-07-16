import { createPublicApiContext, paginatePublicItems, publicApiPagination, publicApiSuccess } from "@/lib/api/public-contracts";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getPublicTrustFeed } from "@/lib/trust-feed/feed";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Public feed items are intentionally pre-sanitized and never include evidence,
  // admin notes, raw risk details or private PII.
  await createSignal(supabase, "trust_feed_viewed");
  await createAuditLog(supabase, "trust_feed_accessed", "public", {
    source: "public_feed_api",
  });

  const page = paginatePublicItems(getPublicTrustFeed(), publicApiPagination(request));
  return publicApiSuccess({ feed: page.items }, createPublicApiContext(request, "public_feed"), { pagination: page.pagination });
}
