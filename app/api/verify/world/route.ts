import { NextResponse } from "next/server";
import {
  configurationError,
  requireAuthenticatedUser,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { getProviderAdapter } from "@/lib/providers";

export async function POST(req: Request) {
  try {
    // Security: verification proofs are sensitive. Keep the real provider
    // exchange server-side and require a Supabase session before accepting data.
    const supabase = await createClient();
    const user = await requireAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const proof = await req.json();
    const hasProof =
      proof &&
      typeof proof === "object" &&
      typeof proof.merkle_root === "string" &&
      proof.merkle_root.length <= 256 &&
      typeof proof.nullifier_hash === "string" &&
      proof.nullifier_hash.length <= 256 &&
      typeof proof.proof === "string" &&
      proof.proof.length <= 16_384;

    if (!hasProof) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification proof" },
        { status: 400 }
      );
    }

    const normalized = getProviderAdapter("world_id").normalizeResponse({
      sourceType: "placeholder",
      providerVerificationState: "none",
      identityConfidence: 0,
      sessionIntegrity: 0,
      evidenceReferences: ["World ID proof received; provider exchange not connected"],
      governanceRecommendation:
        "Do not treat this proof as verified. Connect server-side World ID verification first.",
      summary:
        "World ID proof shape was accepted, but no provider verification exchange is implemented.",
    });

    return NextResponse.json({
      ok: false,
      status: "INCONCLUSIVE",
      serverVerified: false,
      reasonCode: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED",
      message: "Proof received — server verification pending",
      error: "World ID server verification is not implemented.",
      provider: normalized,
    }, { status: 501 });
  } catch (error) {
    console.error("World ID verification failed.", error);

    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    return NextResponse.json(
      { ok: false, error: "Could not verify proof" },
      { status: 500 }
    );
  }
}
