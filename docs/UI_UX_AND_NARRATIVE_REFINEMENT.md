# UI, UX and Narrative Refinement

Date: 2 July 2026

## Enterprise design goals

Cyber Sentinels should feel like calm operational infrastructure:

- evidence before claims;
- clear state before decorative metrics;
- human review before automated certainty;
- one primary action per workflow stage;
- restrained color, borders and shadows; and
- readable hierarchy on desktop and mobile.

This pass changes presentation and content only. It adds no route, trust system,
provider capability, database behavior, auth rule or RLS policy.

## Typography standards

- Public hero headings use `text-4xl`, scale through `sm:text-5xl`, and stop at
  `md:text-6xl`.
- Product and dashboard headings use `text-3xl` to `text-5xl` according to
  hierarchy.
- Section headings use `text-xl` or `text-3xl`; card headings use `text-lg` or
  `text-xl`.
- Body text uses the shared `text-sm` treatment with a relaxed line height.
- Metadata uses the shared `text-xs` treatment. Custom 10px and 11px labels
  were removed.
- Uppercase labels use restrained tracking rather than wide prototype-style
  letter spacing.
- Lowest-contrast text remains lifted through the global zinc color overrides.

The homepage retains:

- `Operational trust for intelligent systems.`
- `Understand identity, authenticity and trust across every workflow.`

Supporting copy now immediately explains that evidence and session changes can
trigger Governance Review, while Replay Timeline preserves the reason.

## Navigation standards

Public navigation remains focused on:

- Platform
- Hiring Security
- Trust Center
- Enterprise
- Pricing
- Access

Internal and experimental concepts remain absent from public navigation.
Dropdowns keep viewport-constrained width, outside-click handling and Escape
handling. Navigation rows wrap on narrow screens rather than causing horizontal
overflow.

## Narrative standards

Visible platform language should use:

- Operational Trust
- Trust Posture
- Replay Timeline
- Governance Review
- Evidence Chain
- Session Integrity
- Authorization Lineage
- Verification Receipt

Legacy terms such as reality OS, trust fabric, trust OS, global trust and
synthetic counterpart are not used in the reviewed public, dashboard,
governance or replay narratives.

The platform story is:

1. A person, agent or workflow enters.
2. Identity, Session Integrity and evidence are checked.
3. Trust Posture changes when context changes.
4. Governance Review controls sensitive next actions.
5. Replay Timeline explains what happened and why.
6. Verification Receipt preserves the reviewed outcome.

## Replay UX principles

Replay is organized for comprehension in under one minute:

- final Trust Posture, Evidence Chain, Governance Review and provider state
  appear first;
- scenario evidence, governance requirement and validation boundary are reduced
  to one compact row;
- chronology follows immediately;
- each event separates what happened, available evidence, Trust Posture change,
  Governance Review and Authorization Lineage;
- the final operational outcome is visually distinct; and
- simulation and provider limitations remain explicit.

The previous pre-chronology evidence, operational-note and false-positive panels
were consolidated to reduce scrolling and repeated context.

## Governance UX principles

Governance Review leads with four questions:

- Why did the workflow escalate?
- Which evidence exists?
- Who owns the decision?
- How will the action change Trust Posture?

The page removes a generic cybersecurity comparison block, avoids an abstract
completion percentage, and uses operational counts for pending reviews,
escalations, unresolved risks and evidence-refresh prompts. Human reviewers
remain authoritative.

## Dashboard standards

The Review Dashboard now prioritizes four operational metrics:

- Active Flags
- Pending Reviews
- Session Integrity
- Verification Receipts

Duplicate Governance Action and Workflow Trust counters were removed. Marketing
shortcuts were replaced with Replay Timeline and Governance Review actions. The
empty state is one concise explanation rather than three repetitive cards. The
decorative grid background was removed.

## Trust Evaluation Lab standards

- Benchmark maturity remains explicit.
- Concept, Simulated and Prototype labels are visible.
- Provider-backed evidence always carries a validation boundary.
- Every benchmark and scenario states that validation is required.
- No accuracy, benchmark-result or automated-certainty claim is introduced.
- Scenario cards retain Trust Posture, provider state, evaluation question,
  evidence structure and manual-review context without repeating
  false-positive detail.

## Visual consistency

- Standard cards use restrained `rounded-lg` corners, dark surfaces and subtle
  zinc borders.
- Navigation and zinc-800 borders were softened.
- Bright cyan remains reserved for primary actions, active state and important
  operational links.
- Dashboard background decoration was reduced.
- Existing shadow use remains limited to dropdown elevation.

## Responsive source review

Source checks confirm:

- global navigation wraps and dropdown width is constrained to the viewport;
- login uses reduced mobile padding and moves to its fixed-width form column
  only at the large breakpoint;
- replay cards stack before their desktop grid layouts;
- dashboard and evaluation cards collapse to one column;
- CTA groups wrap; and
- no reviewed page introduces fixed mobile widths or horizontal overflow.

The in-app browser control surface was unavailable in this environment.
Deployed-browser validation is still required for visual screenshots, layout
shift observation, dropdown interaction, narrow-device wrapping and protected
role transitions.
