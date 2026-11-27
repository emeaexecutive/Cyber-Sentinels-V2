import type { KeyObject } from "node:crypto";
import { verifySwarmReplay, type SwarmEvent } from "../swarm/containment.ts";
import { signAuthorityReceipt, verifyAuthorityReceipt, type AuthorityReceiptSignature } from "../trust-receipts/authority-signature.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { DestinationEffect } from "./sandbox.ts";

export type TreasuryExport = {
  checkpoint: { tenantId: string; count: number; head: string; effectsDigest: string; synthetic: true };
  signature: AuthorityReceiptSignature;
  events: Array<{ event: SwarmEvent; signature: AuthorityReceiptSignature }>;
  effects: DestinationEffect[];
};
export function exportTreasuryEvidence(tenantId: string, events: SwarmEvent[], effects: DestinationEffect[], keyId: string, privateKey: KeyObject): TreasuryExport {
  const checkpoint = { tenantId, count: events.length, head: events.at(-1)?.digest ?? "0".repeat(64), effectsDigest: hashCanonical(effects), synthetic: true as const };
  const sign = (value: Record<string, unknown>, receiptId: string) => signAuthorityReceipt(value, { tenantId, receiptId, keyId, privateKey });
  return { checkpoint, signature: sign(checkpoint, `export:${checkpoint.head}`), events: events.map(event => ({ event, signature: sign(event, event.digest) })), effects };
}
/** The verifier supplies an independently pinned key AND expected checkpoint.
 * A downloaded bundle cannot choose its own trust anchor or hide a suffix.
 */
export function verifyTreasuryExport(bundle: TreasuryExport, trustedKeys: ReadonlyMap<string, KeyObject>, expected: { tenantId: string; head: string; count: number }): boolean {
  try {
    const c = bundle.checkpoint, events = bundle.events.map(e => e.event);
    return c.tenantId === expected.tenantId && c.head === expected.head && c.count === expected.count
      && c.count === events.length && c.head === (events.at(-1)?.digest ?? "0".repeat(64))
      && c.effectsDigest === hashCanonical(bundle.effects) && c.synthetic === true
      && verifySwarmReplay(events, c.tenantId)
      && verifyAuthorityReceipt(c, bundle.signature, { tenantId: c.tenantId, receiptId: `export:${c.head}`, trustedKeys })
      && bundle.events.every(({ event, signature }) => verifyAuthorityReceipt(event, signature, { tenantId: c.tenantId, receiptId: event.digest, trustedKeys }))
      && new Set(bundle.effects.map(e => e.id)).size === bundle.effects.length
      && events.filter(e => e.kind === "FINANCIAL_ALLOW" && e.details.effectId).length === bundle.effects.length
      && bundle.effects.every(effect => effect.synthetic === true && effect.payment.tenantId === c.tenantId
        && events.filter(e => e.kind === "FINANCIAL_ALLOW" && e.details.effectId === effect.id && e.details.mandateId === effect.mandateId && e.details.digest === effect.digest).length === 1);
  } catch { return false; }
}
