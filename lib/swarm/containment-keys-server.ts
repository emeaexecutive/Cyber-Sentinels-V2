import "server-only";
import { createPublicKey } from "node:crypto";
import type { ContainmentKey } from "./prevention-kit";
/** Public trust anchors only. No private signing keys or caller-provided trust anchors. */
export async function configuredContainmentKey(tenantId: string, keyId: string): Promise<ContainmentKey> {
  const registry = JSON.parse(process.env.SWARM_CONTAINMENT_PUBLIC_KEYS_JSON ?? "[]") as Array<ContainmentKey & { keyId: string; publicKeyPem: string }>;
  const key = registry.find(item => item.tenantId === tenantId && item.keyId === keyId);
  if (!key || !Array.isArray(key.swarmIds) || !Number.isFinite(key.expiresAt)) throw new Error("SWARM_COMMAND_KEY_UNAVAILABLE");
  const publicKey = createPublicKey(key.publicKeyPem);
  if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("SWARM_COMMAND_KEY_INVALID");
  return { ...key, publicKey };
}
