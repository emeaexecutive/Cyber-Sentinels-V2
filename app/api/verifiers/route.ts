import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  demoVerifiers,
  normalizeVerifier,
  normalizeVerifiers,
  verifierCapabilities,
  verifierStatuses,
  verifierTypes,
  type VerifierCapability,
  type VerifierRow,
  type VerifierStatus,
  type VerifierType,
} from "@/lib/verifier-network/verifiers";

function safeText(value: unknown, fallback: string, maxLength = 160) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function safeEmail(value: unknown, fallback: string) {
  const email = safeText(value, fallback, 254).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid input");
  }

  return email;
}

function safeVerifierType(value: unknown): VerifierType {
  if (typeof value !== "string") return "external_reviewer";
  if (!verifierTypes.includes(value as VerifierType)) {
    throw new Error("Invalid input");
  }

  return value as VerifierType;
}

function safeStatus(value: unknown): VerifierStatus {
  if (typeof value !== "string") return "pending";
  if (!verifierStatuses.includes(value as VerifierStatus)) {
    throw new Error("Invalid input");
  }

  return value as VerifierStatus;
}

function safeCapabilities(value: unknown): VerifierCapability[] {
  if (!Array.isArray(value)) return ["review_evidence"];

  return value.filter((item): item is VerifierCapability =>
    verifierCapabilities.includes(item as VerifierCapability)
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("verifiers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<VerifierRow[]>();

    if (error) {
      return NextResponse.json({
        ok: true,
        verifiers: demoVerifiers,
        tableAvailable: false,
      });
    }

    return NextResponse.json({
      ok: true,
      verifiers: data?.length ? normalizeVerifiers(data) : demoVerifiers,
      tableAvailable: true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve verifiers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
    const payload: VerifierRow = {
      verifier_name: safeText(body.verifier_name, "New Verifier"),
      verifier_type: safeVerifierType(body.verifier_type),
      organisation: safeText(body.organisation, "Independent"),
      email: safeEmail(body.email, user.email ?? "verifier@example.com"),
      status: safeStatus(body.status),
      capabilities: safeCapabilities(body.capabilities),
      trust_score: 50,
      assigned_cases: 0,
      completed_reviews: 0,
    };

    // Future: only admins should approve or suspend verifiers.
    const { data, error } = await supabase
      .from("verifiers")
      .insert(payload)
      .select("*")
      .returns<VerifierRow[]>();
    const verifier =
      error || !data?.[0]
        ? normalizeVerifier({
            id: "placeholder-verifier",
            ...payload,
            created_at: new Date().toISOString(),
          })
        : normalizeVerifier(data[0]);

    await createSignal(supabase, "verifier_application_created");
    await createAuditLog(supabase, "verifier_created", user.email ?? user.id, {
      verifier_id: verifier.id,
      verifier_type: verifier.verifier_type,
      table_available: !error,
    });

    return NextResponse.json(
      { ok: true, verifier, tableAvailable: !error },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid verifier input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create verifier" },
      { status: 500 }
    );
  }
}
