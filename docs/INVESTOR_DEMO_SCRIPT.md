# Investor Demo Script

## 30-second pitch

Cyber Sentinels is the enterprise workflow trust layer.

Identity verification is usually treated as a point-in-time check, but risk changes after a person or system enters a workflow. Cyber Sentinels connects provider verification, session integrity, workflow evidence, human governance, replay and verification receipts so enterprises can understand what changed and why a decision was made.

We start with Hiring Security and Session Integrity, where synthetic applicants, proxy interviews and injected sessions create a clear operational need.

## Two-minute pitch

Enterprise teams increasingly make sensitive decisions with fragmented evidence. An identity provider may verify entry, a device tool may flag a session change, a reviewer may act in another system, and the final audit record may never connect those events.

Cyber Sentinels creates one reviewable chronology:

1. A candidate enters a governed hiring workflow.
2. The interview session begins.
3. Provider verification is checked and retained as evidence.
4. Session integrity changes.
5. Governance escalation is assigned to a named reviewer.
6. Replay reconstructs the chronology.
7. A verification receipt records the outcome.
8. Trust posture updates with the history preserved.

The wedge is Hiring Security plus Session Integrity. The broader category is an Enterprise Workflow Trust Layer: infrastructure for evidence continuity, authorization context and governed decisions across sensitive workflows.

The moat is not a single detection model. It is the operational trust memory around each decision—provider evidence, governance history, replay chronology, receipts and evolving posture.

Cyber Sentinels orchestrates provider-backed verification signals, workflow evidence, governance review and replay. It does not claim perfect real/fake detection.

## Ten-minute demo flow

### 0:00–1:00 — Frame the problem

Open `/investor`.

Explain that point-in-time identity checks do not prove that a live workflow stayed trustworthy. Show the Hiring Security and Session Integrity wedge and the four-part moat: governance, evidence, replay and trust memory.

### 1:00–3:30 — Walk through Hiring Security

Open `/demo/hiring-attack`.

Use workflow `CS-HIRE-1043` as the narrative anchor:

- candidate intake is recorded
- interview session begins
- provider result is attached as evidence
- session/channel evidence changes
- a named reviewer receives the escalation

Emphasize that the provider response and anomaly are review inputs, not automatic rejection logic.

### 3:30–5:00 — Show Session Integrity

Continue to `/demo/session-integrity`.

Explain the separation between identity assurance and live-session integrity. Show the observable evidence: provider state, channel context, injection risk, timestamps and reviewer assignment.

Use the line: “Detection is one signal. Session integrity, evidence and governance determine the final review state.”

### 5:00–6:30 — Show canonical replay

Open a seeded `/replay/[id]` record.

Point out:

- provider evidence
- signal changes
- trust-state transitions
- reviewer action
- authorization lineage
- workflow outcome
- evidence and audit references

Replay is the canonical operational evidence view, not a generated narrative detached from records.

### 6:30–7:45 — Show the verification receipt

Open the linked `/verification/receipt/[id]`.

Show the printable pilot handoff:

- workflow outcome
- escalation summary
- evidence references
- replay reference
- reviewer attribution
- governance state

Explain that the receipt is an audit-grade workflow record, not a blockchain claim or perfect authenticity certificate.

### 7:45–8:45 — Show evolving trust posture

Open `/dashboard/trust-posture`.

Show how posture changes after provider evidence, session degradation and governance intervention. Contrast prior state, current state and the evidence that caused the transition.

Trust posture is workflow-specific. It is not a permanent score about a person.

### 8:45–9:30 — Show validation discipline

Open `/admin/test-lab` only in an authenticated admin walkthrough.

Show provider failure, injected session, proxy interview, trust degradation and governance escalation scenarios. State clearly that these are deterministic product-behavior checks, not accuracy benchmarks.

### 9:30–10:00 — Close with the pilot ask

Open `/design-partner` or `/enterprise-access?intent=design_partner`.

Ask the partner to:

- test one hiring security workflow
- validate provider evidence and failure states
- review replay and receipt continuity
- provide operational feedback on ownership, policy and evidence requirements

## Investor Q&A

### What category is this?

Enterprise Workflow Trust Layer: infrastructure connecting verification evidence, session integrity, authorization context, governance and replay across sensitive workflows.

### Why start with hiring?

Hiring is a legible enterprise wedge with urgent synthetic-identity risk, multi-team review pressure and a clear workflow outcome. It also produces evidence and governance patterns reusable beyond hiring.

### Is this a deepfake detector?

No. Cyber Sentinels can orchestrate media-risk and session-integrity signals, but it is built around the governed workflow decision. It does not claim perfect real/fake detection.

### What is the moat?

The accumulated operational trust memory: normalized provider evidence, workflow chronology, reviewer actions, authorization lineage, replay and portable receipts.

### Why not rely on identity providers?

Providers supply important evidence at specific points. Cyber Sentinels preserves their results inside the broader workflow and keeps later session changes, governance action and outcomes connected.

### Does the platform replace human review?

No. High-risk outcomes remain human-governed. Automation may prepare evidence inside declared authority, but reviewer ownership and rationale remain visible.

### Is this surveillance?

No. The product is purpose-bound to explicit enterprise workflows and retained operational evidence. It does not create hidden behavioral monitoring or universal identity scores.

### How do design partners contribute?

They validate workflow fit, useful provider evidence, escalation policy, reviewer ownership, replay quality and receipt requirements using real operational feedback.

### What expands beyond hiring?

The same evidence-governance-replay model can support other sensitive approval, access and autonomous-system workflows after the hiring wedge is validated. This is direction, not a claim of current deployment breadth.

## What is proven today

- A coherent Hiring Security and Session Integrity demo.
- Explicit provider-signal normalization and provider-state visibility.
- Explainable trust-state transitions.
- Governance escalation and reviewer attribution.
- Replay linked to workflow evidence and authorization context.
- Printable verification receipts.
- Evolving trust posture.
- Deterministic validation scenarios.
- Authenticated, consent-based screenshot support.
- Protected admin review surfaces.

## What is provider-backed

The platform contains provider adapters, provider registry states, normalized verification responses and evidence panels. A workflow can retain configured provider responses as evidence.

Demo and validation scenarios may use controlled provider states. Never present a simulated response as a live provider result. During a live pilot, identify the configured provider, the source record and any missing evidence.

## What still requires benchmarking

- Real-world detection performance by provider, attack type and environment.
- False-positive and false-negative rates.
- Provider latency and availability under pilot load.
- Session-integrity performance across devices, browsers and network conditions.
- Reviewer agreement and time-to-resolution.
- Pilot conversion, workflow completion and operational cost.
- Retention, privacy and compliance requirements for each enterprise.

Benchmarking should use agreed datasets, representative workflows and provider-specific evidence. Do not infer accuracy from deterministic demo scenarios.

## Claims boundary

Use:

- provider-backed evidence
- workflow trust
- session integrity
- governance review
- replay chronology
- verification receipt
- evolving trust posture

Avoid:

- perfect detection
- guaranteed authenticity
- universal trust score
- autonomous certainty
- surveillance or hidden monitoring
- unverified provider performance claims
