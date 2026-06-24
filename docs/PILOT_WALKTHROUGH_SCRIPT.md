# Cyber Sentinels Pilot Walkthrough Script

## Presenter posture

Lead with the operational problem, then show the evidence chain. Cyber Sentinels is not a binary authenticity detector and does not automate hiring decisions. It provides verification workflows, session-integrity context, accountable governance, replay and receipts.

## Five-minute founder walkthrough

### 0:00-0:40 — Why now

Open `/`.

Say: "Organizations can no longer confidently verify which person, agent or session is entering critical workflows. Synthetic applicants, AI impersonation and injected media can cross controls designed for a more verifiable world."

Then: "Cyber Sentinels is operational trust infrastructure. It connects verification, session evidence, governance and audit history so teams can act without pretending one signal is certainty."

### 0:40-1:45 — Hiring attack

Open `/demo/hiring-attack` and move from candidate intake to injection-risk detection.

Say: "A synthetic candidate enters with incomplete verification evidence. Verification begins, but identity is not treated as permanent proof. During the interview, channel evidence changes and an injection-risk flag is raised."

Point out that identity, liveness, deepfake risk and injection risk remain separate, explainable states.

### 1:45-2:45 — Human governance

Advance to governance review and manual escalation, then open `/governance` if sample data is ready.

Say: "The platform pauses the workflow and gives a human reviewer the evidence, reason and ownership context. AI may help summarize the record. Humans decide."

Show the assigned reviewer, open action and resolution notes.

### 2:45-3:45 — Replay and receipt

Open `/replay/[id]`, then `/verification/receipt/[id]`.

Say: "Replay reconstructs the operational sequence without changing it. The receipt gives security, talent and compliance teams the same concise record of what was checked, what changed and who acted."

### 3:45-4:30 — Pilot operations

Open `/dashboard`.

Show only the six pilot signals: Active Flags, Pending Reviews, Verification Workflows, Threat Activity, Session Integrity and Verification Receipts.

Say: "This is the operator view: enough context to move work forward, without dashboard overload or surveillance-style monitoring."

### 4:30-5:00 — Close and next step

Say: "A pilot starts with one controlled hiring workflow, agreed review policy and a small operator group. We measure workflow clarity, review time, evidence completeness and audit readiness."

Close: "The future of AI is not only intelligence. It is trust."

Ask: "Which high-consequence workflow would be most valuable to make replayable first?"

## Fifteen-minute enterprise walkthrough

### 0:00-2:00 — Frame the enterprise risk

Open `/` and `/demo`.

- Explain how synthetic applicants, AI impersonation and injected feeds weaken traditional point-in-time verification.
- Emphasize that the operational failure is often fragmented evidence, unclear review ownership and missing decision history.
- State the boundary: Cyber Sentinels informs accountable review; it does not make hiring decisions.

Suggested line: "The problem is not only whether one artifact is real. The problem is whether an organization can explain what it knew, what changed and why it acted."

### 2:00-5:00 — Run the hiring-security workflow

Open `/demo/hiring-attack`.

1. Show the synthetic candidate entering.
2. Initiate verification.
3. Trigger session-integrity checks.
4. Pause on the injection-risk flag and its evidence description.
5. Explain why the workflow stops for review rather than issuing an automated candidate verdict.

Invite one question before moving into governance.

### 5:00-7:30 — Explain session integrity

Open `/demo/session-integrity`, then `/dashboard/session-integrity` if sample data is available.

- Distinguish entry identity from continuing session integrity.
- Show liveness, deepfake risk, injection risk, channel integrity and anomalies as separate states.
- Explain that signal sources and limitations remain visible to the reviewer.

Suggested line: "Verification happened at entry. Trust still changed during the session."

### 7:30-10:00 — Show governance and the block

Open `/governance` and the relevant active review.

- Show reviewer assignment, evidence context and the available human actions.
- Explain escalation and resolution notes.
- Show the compromised session being treated as blocked in the demo chronology.
- Keep the candidate outcome separate from the session-security outcome.

Suggested line: "We block the compromised workflow; we do not allow a hidden score to decide a person's future."

### 10:00-12:30 — Replay and verification receipt

Open `/replay/[id]`.

- Follow the verification chronology.
- Show the injection-risk event, evidence history, governance action and reviewer outcome.
- Explain that replay is read-only operational memory.

Then open `/verification/receipt/[id]`.

- Show identity, session integrity, deepfake risk, injection risk and governance outcome.
- Point to timestamps, evidence summary, reviewer actions and audit references.
- Mention printable/PDF export for pilot evidence packs.

### 12:30-14:00 — Pilot scope and measures

Open `/dashboard` and, for an internal session, `/admin/founder-control`.

Propose a narrow pilot:

- one hiring workflow and one review policy;
- a small group spanning talent, security and governance;
- sample data first, then agreed limited live cases;
- success measures covering review completion time, evidence completeness, escalation clarity, replay usability and receipt usefulness;
- scheduled pilot review with explicit go, revise or stop criteria.

### 14:00-15:00 — Close and discovery

Say: "Cyber Sentinels makes trust operational: evidence before certainty, governance before irreversible action, and replay after every material decision."

Close: "The future of AI is not only intelligence. It is trust."

Ask:

1. Which workflow carries the highest cost when identity and session context diverge?
2. Who owns the final review today?
3. What evidence must remain available six months later?

## Before every walkthrough

- Use sample-only records unless the pilot explicitly authorizes limited live data.
- Confirm the demo, replay and receipt routes before the meeting.
- Preselect a stable replay ID and receipt ID.
- Keep a static script available if network or environment configuration is unavailable.
- Never claim perfect detection, immutable truth or autonomous trust decisions.
