import { NextResponse } from "next/server";
import {
  getLedgerEventsForSubject,
  toPublicTrustLedgerJson,
} from "@/lib/trust-engine/trustLedger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const events = getLedgerEventsForSubject(id).map(toPublicTrustLedgerJson);

  return NextResponse.json({
    ok: true,
    subject_id: id,
    events,
  });
}
