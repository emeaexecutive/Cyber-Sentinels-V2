import { NextResponse } from "next/server";
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

  return NextResponse.json({ ok: true, results });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: unknown;
    type?: unknown;
  };
  const query = typeof body.query === "string" ? body.query : null;
  const type = typeof body.type === "string" ? body.type : null;
  const results = searchTrustRegistry(query, type).map(toPublicTrustRegistryJson);

  await recordRegistrySearch(query, type);

  return NextResponse.json({ ok: true, results });
}
