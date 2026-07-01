import { NextResponse } from "next/server";
import {
  checkRequestRateLimit,
  getClientIp,
  getTurnstileTokenFromJson,
  verifyTurnstileToken,
} from "@/lib/bot-protection";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rateLimited = checkRequestRateLimit(
    req,
    "/api/auth/turnstile",
    12,
    60_000
  );
  if (rateLimited) return rateLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = body ? getTurnstileTokenFromJson(body) : "";

  if (!token || token.length > 2048) {
    return NextResponse.json(
      { ok: false, error: "Security check failed. Please try again." },
      { status: 400 }
    );
  }

  const result = await verifyTurnstileToken(token, getClientIp(req));

  if (!result.ok) {
    const unavailable = ["provider_unavailable", "provider_error"].includes(
      result.reason
    );
    return NextResponse.json(
      {
        ok: false,
        error: unavailable
          ? "Security check is temporarily unavailable."
          : "Security check failed. Please try again.",
      },
      { status: unavailable ? 503 : 400 }
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
