import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConsentConfigurationStatus } from "@/src/lib/config/consent-config";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization");
  if (!secret || !supplied?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied.slice(7));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, code: "CONSENT_CONFIG_AUTHORIZATION_DENIED", error: "Consent configuration health access denied." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const consent = getConsentConfigurationStatus();
  return NextResponse.json(
    { consent },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
