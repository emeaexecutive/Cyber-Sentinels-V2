import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  analyzeOriginDNA,
  captureTypes,
  originDNAAuditEvents,
  originDNASignals,
  transformationEvents,
  type OriginAnalysisInput,
} from "@/lib/trust-engine/originDNA";

const subjectTypes = ["media", "person", "ai_agent", "evidence"] as const;
const mediaTypes = ["video", "audio", "image", "document", "profile"] as const;

function getAllowed<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

function getOptionalText(value: unknown, maxLength = 220) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value;
}

function getOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error("Invalid input");
  }

  return Math.max(0, Math.min(100, value));
}

function getTransformationEvents(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Invalid input");

  return value.map((event) =>
    getAllowed(event, transformationEvents, "uploaded")
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid origin analysis request" },
        { status: 400 }
      );
    }

    const rawMetadata =
      typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : {};
    const input: OriginAnalysisInput = {
      subject_type: getAllowed(body.subject_type, subjectTypes, "media"),
      media_type: getAllowed(body.media_type, mediaTypes, "video"),
      hash: getOptionalText(body.hash, 160),
      metadata: {
        source: getOptionalText(rawMetadata.source),
        capture_type: getAllowed(rawMetadata.capture_type, captureTypes, "unknown"),
        upload_device: getOptionalText(rawMetadata.upload_device),
        compression_signature: getOptionalText(
          rawMetadata.compression_signature
        ),
        ai_model_fingerprint: getOptionalText(
          rawMetadata.ai_model_fingerprint
        ),
        transformation_events: getTransformationEvents(
          rawMetadata.transformation_events
        ),
        generation_count: getOptionalNumber(rawMetadata.generation_count),
        edited_count: getOptionalNumber(rawMetadata.edited_count),
      },
    };
    const result = analyzeOriginDNA(input);

    try {
      const supabase = await createClient();
      await createSignal(supabase, "origin_dna_created");
      if (
        result.synthetic_probability >= 65 ||
        result.reality_state === "synthetic_generated"
      ) {
        await createSignal(supabase, "synthetic_generation_detected");
      }
      if (result.origin_confidence < 60) {
        await createSignal(supabase, "origin_confidence_dropped");
      }
      await createAuditLog(supabase, "origin_analysis_created", "origin-api", {
        subject_type: input.subject_type,
        media_type: input.media_type,
        recommended_action: result.recommended_action,
      });
    } catch {
      // Analysis response must remain available when optional logging tables
      // are not yet provisioned in V1 deployments.
    }

    return NextResponse.json({
      ok: true,
      ...result,
      signals: originDNASignals,
      audit_events: originDNAAuditEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid origin analysis request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not analyze origin" },
      { status: 500 }
    );
  }
}
