import "server-only";

export const PILOT_MODE =
  String(process.env.PILOT_MODE ?? "true").toLowerCase() !== "false";

export const pilotModeNotice =
  "Pilot Mode uses isolated workspaces, cases, notifications, governance actions and demo data for controlled enterprise evaluation.";

export function pilotWorkspaceSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `pilot-${base || "workspace"}-${Date.now().toString(36)}`;
}

export function isPilotWorkspace(row: {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
}) {
  return /pilot|design partner|demo/i.test(
    `${row.name ?? ""} ${row.slug ?? ""} ${row.description ?? ""}`
  );
}
