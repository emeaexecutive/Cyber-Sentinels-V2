import { createPublicApiContext, publicApiError, publicApiSuccess } from "@/lib/api/public-contracts";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  getPublicTrustEmbed,
  toPublicTrustEmbedJson,
} from "@/lib/public-verification/embeds";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const embed = getPublicTrustEmbed(id);
  const publicEmbed = toPublicTrustEmbedJson(embed);
  const context = createPublicApiContext(request, "public_embed");

  try {
    const supabase = await createClient();
    await createSignal(supabase, "trust_embed_viewed");
    await createAuditLog(supabase, "trust_embed_viewed", "public_embed", {
      verification_id: publicEmbed.verification_id,
      badge_type: publicEmbed.badge_type,
    });
  } catch {
    // Public embed JSON should remain available before signal tables are ready.
  }

  if (publicEmbed.subject_name === "Unknown trust badge") return publicApiError("embed_not_found", "Trust embed was not found.", 404, context);
  return publicApiSuccess({ embed: publicEmbed }, context);
}
