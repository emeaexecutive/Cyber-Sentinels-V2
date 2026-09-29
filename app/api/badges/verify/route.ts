function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 160) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return Response.json(
        { ok: false, error: "Invalid badge request" },
        { status: 400 }
      );
    }

    getRequiredText(body, "badge_id");
    getRequiredText(body, "subject_id");
    // The marketplace helper is a demonstration fixture, not a persisted verifier.
    return Response.json({
      ok: false,
      code: "BADGE_VERIFICATION_NOT_CONFIGURED",
      error: "Persisted badge verification is not configured.",
    }, { status: 501, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return Response.json(
        { ok: false, error: "Invalid badge request" },
        { status: 400 }
      );
    }

    return Response.json(
      { ok: false, error: "Could not verify badge" },
      { status: 500 }
    );
  }
}
