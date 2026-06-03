# Cyber Sentinels State Of System

Last audited: 2026-06-03

## Product State

Cyber Sentinels is currently a Trust OS with these established surfaces:

- Passport creation and viewing: `/passport`, `/passports`, `/passports/[id]`
- Trust operations: `/back-office`, `/verification-queue`, `/evidence-vault`
- Intelligence: `/trust-intelligence`, `/trust-graph-engine`, `/trust-assistant`
- Governance: `/workforce-trust`, `/intent-verification`, `/autonomy-governance`, `/execution-passports`, `/state-verification`
- Support and governed content: `/help`, `/how-to-use`, `/knowledge-base`

## Core Data

Existing trust data includes:

- `passports`
- `verification_cases`
- `evidence_files`
- `decisions`
- `audit_logs`
- `signals`
- `trust_graph_nodes`
- `trust_graph_edges`
- `help_questions`
- `trust_assistant_questions`
- `knowledge_articles`
- `intent_requests`
- `autonomy_profiles`
- `passport_state_checks`
- `execution_passports`

## Integration State

- World ID: partial. Route and dependency exist; backend verification is still placeholder-level.
- Stripe: partial. Billing and checkout route exist; checkout is a Stripe placeholder.
- AI answer drafting: admin-only draft generation from approved knowledge articles. Drafts are not user-visible until admin approval.

## UX State

The UI is intentionally simplified into a Trust OS:

- Grouped navigation
- Reduced homepage
- Focused passport viewer
- Back Office tab anchors
- Footer with legal, support and corporate links
