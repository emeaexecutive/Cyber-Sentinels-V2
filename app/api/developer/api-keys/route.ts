import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createPlaceholderApiKey,
  getApiKeySummaries,
  recordApiKeyAudit,
  recordApiKeySignal,
} from "@/lib/api/apiKeys";

function safeLabel(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "Trust API key";
  }

  if (typeof value !== "string" || value.length > 80) {
    throw new Error("Invalid input");
  }

  return value;
}

function safeEnvironment(value: unknown): "test" | "live" {
  if (value === undefined || value === null || value === "") return "test";
  if (value === "test" || value === "live") return value;

  throw new Error("Invalid input");
}

export async function GET() {
  try {
    // Future: add per-user and per-organization rate limiting here.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getApiKeySummaries(supabase, user);

    await recordApiKeyAudit(
      supabase,
      "api_key_viewed",
      user.email ?? user.id,
      {
        key_count: result.keys.length,
        table_available: result.tableAvailable,
      }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve API keys" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Future: enforce key quotas, org roles, and rate limits before creation.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const keyResult = await createPlaceholderApiKey(supabase, user, {
      label: safeLabel(body.label),
      environment: safeEnvironment(body.environment),
    });

    await recordApiKeySignal(supabase, "api_key_created");
    await recordApiKeyAudit(
      supabase,
      "api_key_created",
      user.email ?? user.id,
      {
        api_key_id: keyResult.key.id,
        key_prefix: keyResult.key.key_prefix,
        table_available: keyResult.tableAvailable,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        key: keyResult.key,
        tableAvailable: keyResult.tableAvailable,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid API key input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create API key" },
      { status: 500 }
    );
  }
}
