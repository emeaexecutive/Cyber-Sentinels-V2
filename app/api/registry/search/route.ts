import { createPublicApiContext, paginatePublicItems, publicApiPagination, publicApiSuccess } from "@/lib/api/public-contracts";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  searchTrustRegistry,
  toPublicTrustRegistryJson,
} from "@/lib/public-verification/trustRegistry";

async function recordRegistrySearch(query: string | null, type: string | null) {
  try {
    const supabase = await createClient();
    await createSignal(supabase, "trust_registry_searched");
    await createAuditLog(supabase, "trust_registry_searched", "public_registry", {
      query,
      type,
    });
  } catch {
    // Public registry search should remain available before signal tables exist.
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  const type = url.searchParams.get("type");
  const results = searchTrustRegistry(query, type).map(toPublicTrustRegistryJson);

  await recordRegistrySearch(query, type);

  const page = paginatePublicItems(results, publicApiPagination(req));
  return publicApiSuccess({ results: page.items }, createPublicApiContext(req, "public_registry"), { pagination: page.pagination });
}
