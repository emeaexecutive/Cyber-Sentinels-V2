# Consolidation and Operational Simplification

## What was simplified

- The global navigation now centers on Platform, Hiring Security, Trust Center,
  Enterprise, Pricing and Access.
- Authenticated and admin navigation no longer places every dashboard or
  experimental surface in the primary shell.
- The homepage uses one operational path: Session Integrity, Evidence Chain,
  Governance Review, Replay Timeline and Verification Receipt.
- Homepage actions were reduced to Demo, Access and Hiring Security.
- Mission Control and shared trust-system lists now link to the operational
  workflow surfaces used in demonstrations and enterprise review.

## What was de-emphasized

The following routes remain available but are no longer promoted through shared
navigation, Mission Control or public profile CTAs:

- `/reality-os`
- `/reality-chain`
- `/trust-os`
- `/trust-fabric`
- `/trust-ledger`
- `/trust-feed`
- `/global-trust`
- `/origin-dna`
- `/synthetic-counterpart`
- `/human-presence-genome`

No route or underlying implementation was deleted.

## Navigation standard

The primary navigation standard is:

- Platform
- Hiring Security
- Trust Center
- Enterprise
- Pricing
- Access

Platform menus use operational destinations. Demo remains a prominent homepage
action rather than another persistent navigation item. Dropdown links continue
to close the open menu after navigation.

## Language standard

Use these labels consistently:

- Operational Trust
- Trust Posture
- Replay Timeline
- Governance Review
- Evidence Chain
- Authorization Lineage
- Session Integrity
- Verification Receipt

Experimental route names can remain inside their own legacy pages, but should
not replace these labels in primary workflows.

## Known remaining technical debt

- The experimental routes still add build and maintenance surface even though
  they are no longer promoted.
- Several internal type and metric names retain earlier “reality” or
  “genome” terminology for compatibility.
- Mission Control still contains compatibility metrics derived from older
  records; removing those requires a separate data-contract review.
- The npm package keeps its internal historical name
  `cyber-sentinels-v2`; this is not rendered publicly.
- Localhost references remain only in local-development documentation and
  admin readiness fallbacks.
