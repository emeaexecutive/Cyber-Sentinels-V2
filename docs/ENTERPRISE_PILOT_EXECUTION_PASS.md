# Enterprise Pilot Execution Pass

Date: 2 July 2026

## Pilot workflow summary

The enterprise pilot uses one existing operational path:

1. Hiring Security explains the use case and starts the protected candidate
   workflow.
2. Candidate Verification records intake and evidence context without
   self-approving an outcome.
3. Session Integrity records liveness, injection risk, deepfake risk,
   device/channel integrity, and manual-review need as separate signals.
4. Trust Center shows Trust Posture, provider evidence, Governance Review,
   Authorization Lineage, and replay availability for the workflow.
5. Governance Review assigns a human reviewer, preserves evidence, and records
   escalation, evidence requests, approval, rejection, or explained
   false-positive resolution.
6. Replay Timeline reconstructs what happened and what changed.
7. Verification Receipt preserves the final reviewed operational outcome.

The protected validation lab links directly to the demo Replay Timeline and
Verification Receipt so operators can move from deterministic scenarios to the
same evidence surfaces used in an enterprise walkthrough.

## Replay execution quality

Replay Timeline is organized for a sub-two-minute review:

- summary cards expose completion, review, evidence, receipt, and final-state
  status;
- the operational Evidence Chain connects Session Integrity, Governance Review,
  Replay Timeline, and Verification Receipt;
- a validation summary states what triggered, why, which evidence was used,
  which reviewer action occurred, and how Trust Posture changed;
- provider evidence summaries remain explicitly bounded;
- Authorization Lineage and reviewer attribution remain visible; and
- the final operational outcome is distinct from detection signals.

Replay is read-only and reconstructs retained evidence only. It does not infer
provider success, missing events, or a human decision.

## Governance handling

- Governance queues remain authenticated and workspace/admin constrained.
- Reviewer assignment and manual-review state remain visible.
- Escalation, evidence requests, approval, rejection, and resolution use
  explicit human-action language.
- Explained context and false positives use the existing resolved state with
  reviewer notes; no duplicate status system was introduced.
- Evidence remains linked through governance, replay, receipt, and audit
  references.
- Fake-actor enforcement retains separate block, remove, report,
  false-positive, and Governance Review escalation actions behind admin access.

## Provider readiness

Every operator-facing provider and integration uses:

- `Live`
- `Simulated`
- `Awaiting Credentials`
- `Disabled`

`Live` means a supported code path passed its explicit configuration gate. It
does not claim provider uptime, accuracy, a successful customer verification,
or independent assurance. Partial webhook-only ATS setup remains `Awaiting
Credentials`; unused or placeholder adapters are presented as `Disabled`.
Credential values are never rendered.

## Security and access review

- `/admin/*` and the validation lab retain middleware and route-level admin
  protection.
- Governance and Trust Center surfaces require authenticated users and existing
  reviewer/workspace authority.
- Verification routes retain verified-email and authenticated workflow gates.
- Provider secrets remain server-side; status surfaces expose only operational
  state and required environment variable names.
- Public navigation does not expose direct admin tooling.
- No auth, RLS, database policy, storage policy, or service-role boundary was
  weakened in this pass.

## Remaining validation requirements

- Exercise the walkthrough with public, verified user, reviewer, and verified
  admin accounts on the deployed domain.
- Verify deployed Supabase RLS, private storage, migrations, and database
  constraints against the pilot project.
- Run each configured provider through success, invalid credential, timeout,
  revoked credential, and partial configuration cases.
- Complete a live mobile browser walkthrough for navigation, login, candidate
  intake, Session Integrity, Trust Center, Replay Timeline, and Verification
  Receipt.
- Upload and review a consented support screenshot in the target storage
  project.
- Run reviewer assignment, false-positive resolution, evidence request, and
  fake-actor enforcement against seeded production-like pilot data.

## Known limitations

- Environment-variable presence cannot prove provider uptime or credential
  validity.
- Rule-based signals prioritize review; they are not trained detection or
  biometric certainty.
- Replay completeness depends on upstream retention of timestamps, evidence
  references, reviewer ownership, and authorization changes.
- Verification Receipts are evidence summaries, not legal proof.
- Live viewport automation was unavailable in the execution environment; mobile
  and interactive checks remain a deployment validation item rather than a
  claimed result.
