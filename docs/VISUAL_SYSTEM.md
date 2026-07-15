# Visual System

The visual system replaces repeated explanatory paragraphs with consistent, accessible HTML components. It uses no canvas or SVG dependency.

| Concept | Component | Canonical use |
| --- | --- | --- |
| Operational Trust Lifecycle | `LifecycleDiagram` | Before, during and after action stages |
| Enterprise Trust Fabric™ | `ArchitectureBlock` | Actors, shared architecture and accountable outputs |
| One-Click Trust Orchestration | `DecisionFlow` | Parallel evidence and one explainable decision |
| Traditional Identity vs Operational Trust | `ComparisonCard` | Category differentiation |
| Trust Memory™ Timeline | `Timeline` | Explainable trust evolution |
| Interactive walkthrough | `InteractiveTrustWalkthrough` | Seven stages in approximately 11.2 seconds |
| Buyer journeys | `BuyerJourneyGrid` | Five buying questions for four enterprise roles |

## Style contract

- Dark operational canvas, restrained cyan accent and visible border hierarchy.
- Numbered stages for sequence; no decorative metrics.
- One concept per frame and short supporting copy.
- Horizontal overflow for dense lifecycle diagrams on small screens.
- Native buttons, ordered lists, headings, `aria-current`, `aria-live` and visible focus behavior.
- Motion is initiated by the user and communicates state; product meaning remains available without animation.

## Ownership

Homepage introduces the visual system. Platform owns mechanisms, Solutions owns outcomes, Trust owns proof and limitations, and Enterprise owns adoption and buying journeys. Other pages may reuse a component but should not duplicate its full explanation.
