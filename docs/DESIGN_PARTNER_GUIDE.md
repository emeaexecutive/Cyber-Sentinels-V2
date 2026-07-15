# Design Partner Guide

Release 1.2.1 supports a controlled enterprise pilot. It does not represent production certification, provider accuracy, an SLA, or autonomous policy decisions.

## Pilot outcome

The design partner should be able to create an organization workspace, record identity and provider configuration, select a governed trust policy, run the first verification walkthrough, review the decision, inspect Replay and Evidence Graph context, record a human governance outcome, and see the resulting operational posture.

## Roles

- Enterprise administrator: confirms organization, identity choice, provider state, policy and reviewer ownership.
- Workflow owner: defines purpose, action and required evidence.
- Governance reviewer: owns escalations and records the authoritative human outcome.
- Cyber Sentinels operator: validates deployment configuration, provider boundaries and pilot evidence.

## Guided path

1. Open `/enterprise/pilot-setup` with an authenticated account.
2. Confirm welcome and pilot scope.
3. Enter organization and reviewer contacts.
4. Select Supabase Auth, SAML, OIDC or SCIM readiness.
5. record provider state as `Configured`, `Optional` or `Awaiting Credentials`.
6. Select one enterprise trust policy and confirm its thresholds, escalation path, review requirements and evidence requirements.
7. Confirm the administrator declaration and create the workspace.
8. Complete the first case: evidence, decision, Replay, governance and dashboard review.

## Capability labels

- `Live`: the control executed in the current request with retained evidence.
- `Configured`: code and required configuration are present; this is not provider health.
- `Simulated`: controlled product behavior using synthetic inputs.
- `Awaiting Credentials`: no provider call is made.

## Success evidence

Retain the workspace ID, case ID, selected policy, provider configuration state, evidence references, decision explanation, replay reference, Trust Memory reference when available, reviewer outcome and acceptance sign-off. Do not record secret values in tickets, screenshots or audit notes.

## Exit criteria

Pilot exit requires named ownership, credentialed production checks for enabled providers, tenant-isolation validation against the deployed Supabase project, webhook signature tests, rate-limit tests, session-expiry tests, agreed data retention, a reviewed dataset plan and documented rollback ownership.
