import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const proof = await req.json();

  // Placeholder: wire this to World ID backend verification after creating your World Developer Portal app.
  // Keep this server-side only. Never expose secret verification logic to the browser.
  return NextResponse.json({
    ok: true,
    provider: "world-id",
    action: process.env.WORLD_ACTION,
    received: Boolean(proof)
  });
}
