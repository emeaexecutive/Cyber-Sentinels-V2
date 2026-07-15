# Release 1 release-candidate demo

Duration: 7 minutes
Runtime: controlled Release 1.1.5 demo
Code contract: `buildReleaseCandidateDemo()` in `lib/core/trust-fabric.ts`

## State legend

- Live: an in-process control is executed during the demo. It does not imply external provider health.
- Configured: the product path and configuration contract exist; production evidence is not claimed.
- Simulated: controlled inputs demonstrate behavior and explainability.
- Awaiting Credentials: no provider call is made.

## Run of show

| Time | Step | State | Presenter action and proof |
| --- | --- | --- | --- |
| 0:00–0:35 | Human | Configured | Introduce the accountable human and organization context. State that the demo carries configured identity context rather than a live identity-provider assertion. |
| 0:35–1:10 | AI Agent | Configured | Show the normalized AI-agent identity, owner, purpose, workflow, and requested action. |
| 1:10–1:45 | Machine Identity | Awaiting Credentials | Show the disabled adapter boundary. Say plainly that credentials and egress review are missing and no call is made. |
| 1:45–2:25 | Authority | Live | Execute the authority graph. Show grant chain, effective scope, accountable human, decision, and limitations. |
| 2:25–3:10 | Trust Decision | Simulated | Show Why, Evidence used, Authority evaluated, Policy applied, Confidence explanation, Provider participation, and Next recommended action. |
| 3:10–3:50 | Replay | Simulated | Open the replay reference and reconstruct actor, action, evidence, policy, authority, decision, and outcome boundary. |
| 3:50–4:30 | Evidence Graph | Simulated | Show linked nodes and continuity checks. Emphasize that missing or dangling evidence remains visible. |
| 4:30–5:15 | Trust Memory™ | Simulated | Show the update reference, state, timestamp, reason, actor, evidence, and authority links. |
| 5:15–6:10 | Governance | Configured | Show policy status, review availability, accountable next action, and the human-review boundary. |
| 6:10–7:00 | Enterprise Dashboard | Configured | Close on provider maturity, validation states, performance coverage, blockers, and next milestones in the protected readiness views. |

## Presenter close

“Cyber Sentinels does not ask one provider or one score to define truth. It evaluates identity, authority, evidence, policy, runtime change, replay, and accountable governance as one explainable decision record. This release candidate proves that operating model; production provider accuracy, scale, and SLA claims remain gated on reviewed pilot evidence.”

## Fallback

If credentials or the database are unavailable, run the controlled demo object, show its explicit states, and use the evidence references in each step. Do not relabel Configured or Simulated steps as Live.
