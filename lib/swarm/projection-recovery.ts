import { verifySwarmReplay, type SwarmEvent } from "./containment.ts";
export async function recoverSwarmProjections(tenantId: string, events: SwarmEvent[], cursor: { read(): Promise<number>; advance(expected: number, next: number): Promise<number> }, project: (event: SwarmEvent) => Promise<void>, batch = 100) {
  if (!verifySwarmReplay(events, tenantId) || !Number.isSafeInteger(batch) || batch < 1 || batch > 1000) throw new Error("SWARM_PROJECTION_SOURCE_INVALID");
  const start = await cursor.read();
  if (!Number.isSafeInteger(start) || start < 0 || start > events.length) throw new Error("SWARM_PROJECTION_CURSOR_INVALID");
  const pending = events.slice(start, start + batch);
  for (const event of pending) await project(event);
  const through = start + pending.length;
  if (through > start) await cursor.advance(start, through);
  return { projected: pending.length, through, remaining: events.length - through };
}
