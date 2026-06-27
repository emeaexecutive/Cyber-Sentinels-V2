import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { captureOperationalIssue } from "@/lib/operational-monitoring";

const bucketName = "support-screenshots";
const maxScreenshotSize = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);
const issueTypes = new Set([
  "ui_regression",
  "broken_dropdown",
  "missing_button",
  "auth_rendering",
  "replay_rendering",
  "typography_layout",
  "workflow_diagnostic",
  "other",
]);

function text(form: FormData, key: string, limit = 500) {
  return String(form.get(key) ?? "").trim().slice(0, limit);
}

function allowlistedBrowserMetadata(value: unknown) {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const textValue = (key: string, limit = 500) =>
    typeof input[key] === "string" ? input[key].slice(0, limit) : null;

  return {
    user_agent: textValue("user_agent", 1000),
    language: textValue("language", 50),
    viewport: textValue("viewport", 50),
    screen: textValue("screen", 50),
    timezone: textValue("timezone", 100),
    online: typeof input.online === "boolean" ? input.online : null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to report an issue." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const summary = text(form, "summary", 180);
    const issueType = text(form, "issue_type", 40);
    const currentRoute = text(form, "current_route", 500);
    const sessionReference = text(form, "session_reference", 100);
    const screenshot = form.get("screenshot");
    let browserMetadata: Record<string, unknown> = {};

    try {
      const parsed = JSON.parse(text(form, "browser_metadata", 3000));
      browserMetadata = allowlistedBrowserMetadata(parsed);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid browser diagnostics." }, { status: 400 });
    }

    if (!summary || !currentRoute || !sessionReference || !issueTypes.has(issueType)) {
      return NextResponse.json({ ok: false, error: "Required support details are missing." }, { status: 400 });
    }
    if (text(form, "support_consent", 20) !== "confirmed") {
      return NextResponse.json({ ok: false, error: "Diagnostic consent is required." }, { status: 400 });
    }
    if (!currentRoute.startsWith("/")) {
      return NextResponse.json({ ok: false, error: "Invalid route context." }, { status: 400 });
    }
    if (screenshot instanceof File && screenshot.size > 0) {
      if (screenshot.size > maxScreenshotSize || !allowedTypes.has(screenshot.type)) {
        return NextResponse.json({ ok: false, error: "Use a PNG, JPG or WebP screenshot up to 5MB." }, { status: 400 });
      }
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data: issue, error: insertError } = await admin
      .from("support_issues")
      .insert({
        submitted_by_user_id: user.id,
        submitted_by_email: user.email ?? null,
        issue_type: issueType,
        summary,
        details: text(form, "details", 4000) || null,
        current_route: currentRoute,
        workflow_id: text(form, "workflow_id", 200) || null,
        workflow_state: text(form, "workflow_state", 200) || null,
        replay_reference: text(form, "replay_reference", 500) || null,
        provider_state: text(form, "provider_state", 200) || null,
        auth_state: text(form, "auth_state", 40) || "authenticated",
        trust_posture_state: text(form, "trust_posture_state", 200) || null,
        session_reference: sessionReference,
        browser_metadata: browserMetadata,
        build_version: text(form, "build_version", 200) || null,
        status: "new",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !issue) {
      throw insertError ?? new Error("Support issue insert failed.");
    }

    if (screenshot instanceof File && screenshot.size > 0) {
      const extension = allowedTypes.get(screenshot.type)!;
      const path = `${user.id}/${issue.id}/screenshot.${extension}`;
      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(path, screenshot, {
          contentType: screenshot.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        await admin.from("support_issues").delete().eq("id", issue.id);
        throw uploadError;
      }

      const { error: updateError } = await admin
        .from("support_issues")
        .update({
          screenshot_storage_path: path,
          screenshot_file_name: screenshot.name.slice(0, 240),
          screenshot_content_type: screenshot.type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issue.id);

      if (updateError) {
        await admin.storage.from(bucketName).remove([path]);
        await admin.from("support_issues").delete().eq("id", issue.id);
        throw updateError;
      }
    }

    return NextResponse.json({ ok: true, issue_id: issue.id });
  } catch (error) {
    captureOperationalIssue("support_issue", "error", "Support issue submission failed.", {
      error_name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Support reporting is temporarily unavailable." }, { status: 503 });
  }
}
