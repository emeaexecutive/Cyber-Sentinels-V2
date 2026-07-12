export type TrustOSAccessLevel = "user" | "admin-unverified" | "admin";

export type TrustOSContext = {
  organization: string;
  workspace: string;
  workflow: string;
  entity: string;
  trustPosture: string;
  authorityState: string;
  activeInvestigation: string;
  correlationId: string;
};

function segmentAfter(pathname: string, segment: string) {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf(segment);
  const value = index >= 0 ? parts[index + 1] : undefined;
  return value && !["register", "runtime", "posture"].includes(value) ? decodeURIComponent(value) : null;
}

function shortReference(value: string | null) {
  if (!value) return null;
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function deriveTrustOSContext(pathname: string, accessLevel: TrustOSAccessLevel): TrustOSContext {
  const workspaceId = shortReference(segmentAfter(pathname, "workspace"));
  const agentId = shortReference(segmentAfter(pathname, "agents") ?? segmentAfter(pathname, "agent"));
  const profileId = shortReference(segmentAfter(pathname, "profile"));
  const replayId = shortReference(segmentAfter(pathname, "replay"));
  const sessionId = shortReference(segmentAfter(pathname, "session"));
  const receiptId = shortReference(segmentAfter(pathname, "receipt"));
  const correlationId = replayId ?? sessionId ?? receiptId;

  const workflow = replayId
    ? `Replay ${replayId}`
    : sessionId
      ? `Session ${sessionId}`
      : receiptId
        ? `Receipt ${receiptId}`
        : pathname.includes("governance")
          ? "Governance review"
          : pathname.includes("workspace")
            ? "Workspace operations"
            : "No workflow selected";

  const entity = agentId
    ? `AI agent ${agentId}`
    : profileId
      ? `Human ${profileId}`
      : pathname.includes("provider")
        ? "Provider estate"
        : "No entity selected";

  return {
    organization: "Authenticated organization",
    workspace: workspaceId ? `Workspace ${workspaceId}` : "Enterprise workspace",
    workflow,
    entity,
    trustPosture: pathname.includes("trust-posture") || pathname.includes("trust-center")
      ? "Open posture context"
      : "Workflow-specific",
    authorityState: accessLevel === "admin"
      ? "Verified administrator"
      : accessLevel === "admin-unverified"
        ? "Admin verification required"
        : "Verified enterprise user",
    activeInvestigation: pathname.includes("risk") || pathname.includes("integrity") || replayId
      ? workflow
      : "No active investigation",
    correlationId: correlationId ?? "Not present",
  };
}

export type TrustOSSearchItem = {
  label: string;
  description: string;
  href: string;
  category: "Navigate" | "Search" | "Action" | "Investigate";
  access: "all" | "admin";
  keywords: string[];
};

export const trustOSSearchCatalog: TrustOSSearchItem[] = [
  { label: "Overview", description: "Enterprise decision summary and active work.", href: "/dashboard", category: "Navigate", access: "all", keywords: ["home", "overview", "dashboard"] },
  { label: "Operations", description: "Workspaces, cases and workflow coordination.", href: "/workspace", category: "Navigate", access: "all", keywords: ["workflow", "operations", "cases"] },
  { label: "Trust", description: "Current posture, evidence continuity and Trust Memory.", href: "/trust-center", category: "Navigate", access: "all", keywords: ["posture", "memory", "trust"] },
  { label: "Runtime", description: "Session integrity and runtime trust context.", href: "/dashboard/session-integrity", category: "Navigate", access: "all", keywords: ["runtime", "session", "integrity"] },
  { label: "Governance", description: "Reviews, ownership and accountable actions.", href: "/dashboard/governance", category: "Navigate", access: "all", keywords: ["review", "approval", "governance"] },
  { label: "Providers", description: "Provider readiness and operational boundaries.", href: "/admin/provider-status", category: "Navigate", access: "admin", keywords: ["provider", "vendor", "credentials"] },
  { label: "Administration", description: "Protected enterprise administration.", href: "/admin/access", category: "Navigate", access: "admin", keywords: ["admin", "operations", "access"] },
  { label: "Humans", description: "Find human profiles and identity evidence.", href: "/profile", category: "Search", access: "all", keywords: ["human", "person", "identity", "profile"] },
  { label: "AI Agents", description: "Find agent identity, ownership and runtime records.", href: "/agents", category: "Search", access: "all", keywords: ["agent", "ai", "owner"] },
  { label: "Machine Identities", description: "Find machine actors through the governed agent registry.", href: "/agents", category: "Search", access: "all", keywords: ["machine", "service", "workload", "credential"] },
  { label: "Evidence", description: "Open protected evidence records and review queues.", href: "/evidence-vault", category: "Search", access: "admin", keywords: ["evidence", "file", "proof"] },
  { label: "Replay", description: "Find verification chronology and retained decisions.", href: "/trust-replay", category: "Search", access: "all", keywords: ["replay", "timeline", "chronology"] },
  { label: "Trust Memory\u2122", description: "Review how trust evolved across governed outcomes.", href: "/trust-center#trust-memory", category: "Search", access: "all", keywords: ["memory", "history", "evolution"] },
  { label: "Governance Records", description: "Find review, escalation and approval activity.", href: "/dashboard/governance", category: "Search", access: "all", keywords: ["governance", "reviewer", "escalation"] },
  { label: "Provider Records", description: "Find provider readiness and limitations.", href: "/admin/provider-status", category: "Search", access: "admin", keywords: ["provider", "readiness", "limitation"] },
  { label: "Workflows", description: "Find enterprise workspaces and trust cases.", href: "/workspace", category: "Search", access: "all", keywords: ["workflow", "workspace", "case"] },
  { label: "Create Workspace", description: "Start a governed workspace using the existing workflow.", href: "/workspace#new-workspace", category: "Action", access: "all", keywords: ["new", "create", "workspace"] },
  { label: "Open Notifications", description: "Review consolidated enterprise updates.", href: "/notifications", category: "Action", access: "all", keywords: ["notifications", "inbox", "updates"] },
  { label: "Investigate Active Flags", description: "Inspect evidence-backed operational flags.", href: "/dashboard/interview-risk", category: "Investigate", access: "all", keywords: ["flag", "risk", "investigate"] },
  { label: "Investigate Session Integrity", description: "Trace runtime changes into evidence and governance.", href: "/dashboard/session-integrity", category: "Investigate", access: "all", keywords: ["session", "integrity", "investigate"] },
  { label: "Investigate Trust Execution", description: "Review measured trust execution diagnostics.", href: "/admin/trust-execution", category: "Investigate", access: "admin", keywords: ["execution", "latency", "decision"] },
];
