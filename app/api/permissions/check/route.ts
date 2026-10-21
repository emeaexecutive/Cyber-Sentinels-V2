export async function POST() {
  return Response.json(
    {
      ok: false,
      error: "LEGACY_ADVISORY_ENDPOINT_RETIRED",
      message: "This endpoint never authorized consequential actions. Use the canonical V1 trust decision API.",
    },
    { status: 410 }
  );
}
