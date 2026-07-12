export type DegradedModeState = {
  id: string;
  title: string;
  whatHappened: string;
  actionState: "Continued" | "Paused" | "Partially completed" | "Session ended";
  evidenceState: string;
  nextAction: string;
};

export const degradedModeStates: DegradedModeState[] = [
  { id: "provider-unavailable", title: "Provider unavailable", whatHappened: "A configured provider did not return a usable response.", actionState: "Paused", evidenceState: "Available request and failure evidence was preserved; no provider result was inferred.", nextAction: "Retry after provider health recovers or route the workflow to human review." },
  { id: "provider-awaiting-credentials", title: "Provider awaiting credentials", whatHappened: "This provider is not configured for the current deployment.", actionState: "Paused", evidenceState: "Existing workflow evidence remains available; no provider call was made.", nextAction: "Ask an administrator to configure and validate the approved provider." },
  { id: "authorization-unavailable", title: "Authorization service unavailable", whatHappened: "Authority could not be evaluated safely.", actionState: "Paused", evidenceState: "The attempted action and available context were retained without granting permission.", nextAction: "Do not retry the action until authorization health is restored." },
  { id: "replay-delayed", title: "Replay write delayed", whatHappened: "The lifecycle record has not completed its Replay write.", actionState: "Partially completed", evidenceState: "Available event evidence is retained in the bounded retry path; Replay completeness is not claimed.", nextAction: "Review retry diagnostics and confirm the Replay record before relying on lifecycle completeness." },
  { id: "trust-memory-delayed", title: "Trust Memory update delayed", whatHappened: "The governed outcome has not yet updated the historical trust record.", actionState: "Partially completed", evidenceState: "The source decision and review evidence remain preserved outside the pending update.", nextAction: "Confirm the source outcome, then retry the Trust Memory update through the approved workflow." },
  { id: "governance-queue-delayed", title: "Governance queue delayed", whatHappened: "A required review has not reached an accountable owner on time.", actionState: "Paused", evidenceState: "The review request, rationale and evidence references remain recorded.", nextAction: "Assign or escalate the review; do not bypass the approval requirement." },
  { id: "session-expired", title: "Session expired", whatHappened: "The authenticated session ended before the operation completed.", actionState: "Session ended", evidenceState: "Previously committed evidence remains preserved; unsubmitted changes were not treated as final.", nextAction: "Sign in again and reopen the workflow before continuing." },
  { id: "insufficient-or-partial-evidence", title: "Insufficient or partial trust result", whatHappened: "Available evidence cannot support a complete trust decision.", actionState: "Paused", evidenceState: "All received evidence and limitations remain visible; missing evidence is not substituted.", nextAction: "Request the missing evidence or send the case to human review." },
];
