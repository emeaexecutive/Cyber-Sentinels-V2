import { mkdir, open, readdir, readFile, link, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import { verifySwarmReplay, type SwarmState } from "./containment.ts";
import type { SwarmPersistence } from "./store.ts";

/** Local crash-recoverable CAS. Immutable, flushed snapshots are published with an
 * atomic hard link (never overwrite). Orphan .tmp files are not commits. This is
 * for local disks supporting hard links; hosted deployments use RPC persistence.
 * Hashes detect corruption, not malicious disk rollback; anchor heads externally.
 */
export function createFileSwarmPersistence(root: string): SwarmPersistence {
  const directory = (tenant: string) => join(root, hashCanonical({ tenant }));
  const filename = (version: number) => `${String(version).padStart(12, "0")}.json`;
  async function load(tenant: string) {
    const dir = directory(tenant);
    await mkdir(dir, { recursive: true });
    const files = (await readdir(dir)).filter(f => /^\d{12}\.json$/.test(f)).sort();
    if (!files.length) return null;
    if (files.some((f, i) => f !== filename(i + 1))) throw Error("SWARM_DISK_VERSION_GAP");
    const record = JSON.parse(await readFile(join(dir, files.at(-1)!), "utf8")) as { version: number; state: SwarmState; digest: string };
    if (record.version !== files.length || record.state.tenantId !== tenant
      || record.digest !== hashCanonical({ version: record.version, state: record.state })
      || !verifySwarmReplay(record.state.events, tenant)) throw Error("SWARM_DISK_INTEGRITY");
    return { version: record.version, state: record.state };
  }
  return { load, async compareAndSwap(tenant, version, state) {
    const current = await load(tenant);
    if ((current?.version ?? 0) !== version) return false;
    if (state.tenantId !== tenant || !verifySwarmReplay(state.events, tenant)) throw Error("SWARM_DISK_INTEGRITY");
    const dir = directory(tenant), temporary = join(dir, `${randomUUID()}.tmp`);
    const body = { version: version + 1, state };
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(JSON.stringify({ ...body, digest: hashCanonical(body) })); await file.sync(); }
    finally { await file.close(); }
    try { await link(temporary, join(dir, filename(version + 1))); return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
    finally { await unlink(temporary); }
  } };
}
