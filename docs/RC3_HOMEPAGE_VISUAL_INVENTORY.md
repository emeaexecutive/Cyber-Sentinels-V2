# RC3 Homepage Visual Inventory

Audit date: 2026-07-16. Inventory captured before RC3 homepage rendering changes.

| Component | Purpose | Concept | Duplicate or unique | Deeper canonical route | Recommendation | Performance cost | Accessibility | Mobile behaviour | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `InteractiveTrustWalkthrough` | Animated Test Mode product walkthrough | Trust assessment lifecycle | Duplicates the adjacent lifecycle and the existing demo route | `/demo/trust-execution-flow` | Remove from homepage; retain component and existing demo functionality | Client state, timer and hydration | Button, ordered list, status legend and `aria-live`; motion still creates avoidable homepage cost | Nine-card responsive grid | DUPLICATE_REMOVE |
| `LifecycleDiagram` / `TrustFlow` | Sequential operational-trust graph | Identity through current posture | Strongest semantic implementation; becomes the sole homepage graph | `/platform` and `/trust` provide detail | Retain, update to the exact nine-stage RC3 flow and add canonical action | Server-rendered semantic HTML; horizontal overflow only on small screens | Ordered list with accessible name; numbered, non-colour nodes | Horizontally scrollable with readable minimum node width | PRIMARY_HOMEPAGE_VISUAL |
| `ComparisonCard` | Contrast identity access with operational trust | Why Cyber Sentinels is different | Unique supporting comparison, not a process graph | `/platform` | Retain in concise form | Server-rendered two-column cards | Text-equivalent lists; meaning not colour-dependent | Stacks below tablet width | SUPPORTING_HOMEPAGE_VISUAL |
| `DecisionFlow` | Second sequential assessment diagram | Identity, authority, evidence, decision, enforcement and Replay | Repeats the lifecycle graph in the same page | `/platform` | Remove homepage rendering and import; retain reusable component on Platform | Server-rendered but duplicates DOM and horizontal scrolling | Ordered list and label | Horizontal scroll | DUPLICATE_REMOVE |
| `ArchitectureBlock` | Three-column architecture diagram | Enterprise Trust Fabric | Full version already belongs on Platform | `/platform#trust-fabric` | Replace homepage diagram with a short text preview and Platform link; retain component on Platform | Moderate DOM/layout cost | Labelled container and text lists | Stacks, then becomes three columns | CANONICAL_DEEP_PAGE_VISUAL |

## Resulting homepage visual hierarchy

1. One canonical nine-stage operational-trust graph.
2. One concise text comparison supporting the buyer proposition.
3. One non-diagram Enterprise Trust Fabric preview linking to Platform.

The homepage will not render a second flow, animated lifecycle, evidence graph, Trust Memory timeline, authority diagram, provider diagram or sovereignty diagram. Those stay in their canonical deep pages.
