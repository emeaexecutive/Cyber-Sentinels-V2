import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.redirect(
    new URL("/api/stripe/create-checkout-session", req.url),
    { status: 307 }
  );
}
