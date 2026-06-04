import { NextResponse } from "next/server";
import {
  configurationError,
  requireAuthenticatedUser,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

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
      typeof proof.nullifier_hash === "string" &&
      typeof proof.proof === "string";

    if (!hasProof) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification proof" },
        { status: 400 }
      );
    }

    // Placeholder: wire this to World ID backend verification after creating
    // your World Developer Portal app. Never expose secret verification logic.
    return NextResponse.json({
      ok: true,
      provider: "world-id",
      actionConfigured: Boolean(process.env.WORLD_ACTION),
      received: true,
    });
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
