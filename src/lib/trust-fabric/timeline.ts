import type { EnterpriseTrustTimelineItem } from "./types.ts";

export function projectEnterpriseTrustTimeline(sources: EnterpriseTrustTimelineItem[][]): EnterpriseTrustTimelineItem[] {
  const items = sources.flat().map((item) => ({ ...item, evidenceReferences: [...item.evidenceReferences], uncertainty: [...item.uncertainty] }));
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.enterpriseId}:${item.id}`;
    if (seen.has(key)) throw new TypeError(`Duplicate timeline source item: ${item.id}`);
    seen.add(key);
  }
  return items.sort((left, right) => {
    const time = new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
    if (time !== 0) return time;
    if (left.timestampConfidence !== "confirmed" || right.timestampConfidence !== "confirmed") {
      left.uncertainty = [...new Set([...left.uncertainty, "Relative ordering is uncertain."])];
      right.uncertainty = [...new Set([...right.uncertainty, "Relative ordering is uncertain."])];
    }
    return left.id.localeCompare(right.id);
  });
}

export function assertTimelineTenant(items: EnterpriseTrustTimelineItem[], enterpriseId: string) {
  if (items.some((item) => item.enterpriseId !== enterpriseId)) throw new TypeError("Cross-tenant timeline source denied.");
  return items;
}
