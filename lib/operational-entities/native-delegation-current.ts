type DelegationRow = Record<string, unknown>;
const fields = ["permitted_actions", "permitted_tools", "permitted_targets", "environments"] as const;
const boundaryRank: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
function current(row: DelegationRow, now: number) {
  return row.status === "ACTIVE" && row.revoked_at === null
    && Date.parse(String(row.not_before)) <= now && Date.parse(String(row.expires_at)) > now;
}
/** Recheck the complete stored lineage at dispatch, never just the leaf's cached decision. */
export function currentNativeDelegationChain(rows: readonly DelegationRow[], authorityId: string, entityId: string, now: number): boolean {
  if (!rows.length || rows.length > 17 || rows[0].delegate_operational_entity_id !== entityId) return false;
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const child = rows[i];
    if (!current(child, now) || child.parent_authority_id !== authorityId || typeof child.delegation_id !== "string"
      || seen.has(child.delegation_id) || !Number.isInteger(child.delegation_depth)
      || !Number.isInteger(child.maximum_delegation_depth) || Number(child.delegation_depth) < 0
      || Number(child.delegation_depth) > Number(child.maximum_delegation_depth)
      || !Object.hasOwn(boundaryRank, String(child.data_boundary))) return false;
    seen.add(child.delegation_id);
    const parent = rows[i + 1];
    if (!parent) return child.parent_delegation_id === null;
    if (child.parent_delegation_id !== parent.delegation_id || parent.can_redelegate !== true
      || child.delegator_operational_entity_id !== parent.delegate_operational_entity_id
      || Number(child.delegation_depth) !== Number(parent.delegation_depth) + 1
      || Number(child.delegation_depth) > Number(parent.maximum_delegation_depth)
      || Number(child.maximum_delegation_depth) > Number(parent.maximum_delegation_depth)
      || !Object.hasOwn(boundaryRank, String(parent.data_boundary))
      || boundaryRank[String(child.data_boundary)] > boundaryRank[String(parent.data_boundary)]
      || Date.parse(String(child.expires_at)) > Date.parse(String(parent.expires_at))
      || Date.parse(String(child.not_before)) < Date.parse(String(parent.not_before))) return false;
    for (const field of fields) {
      if (!Array.isArray(child[field]) || !Array.isArray(parent[field]) || !(child[field] as unknown[]).length
        || !(child[field] as unknown[]).every(value => (parent[field] as unknown[]).includes(value))) return false;
    }
    for (const field of ["financial_limit", "execution_limit"] as const) {
      const cap = parent[field]; const requested = child[field];
      if (cap !== null && (typeof cap !== "number" || !Number.isFinite(cap) || requested === null
        || typeof requested !== "number" || !Number.isFinite(requested) || requested > cap)) return false;
    }
  }
  return false;
}
