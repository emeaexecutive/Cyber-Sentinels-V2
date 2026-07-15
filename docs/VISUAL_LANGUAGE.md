# Visual Language

Release 1.1.3 uses a restrained enterprise visual system to explain operational trust without adding product architecture.

## Principles

1. One diagram replaces a paragraph cluster.
2. Every visual has an accessible label and a readable text equivalent.
3. Cyan indicates an active trust relationship, not certainty or approval.
4. Dark surfaces, measured contrast and generous whitespace keep the experience audit-oriented rather than surveillance-oriented.
5. Provider, evidence and trust states retain their source and limitations.

## Shared components

`components/enterprise-visuals.tsx` owns the reusable Lifecycle Diagram, Comparison Card, Timeline, Trust Flow, Decision Flow, Evidence Card, Provider Card and Architecture Block.

The components use semantic HTML and shared CSS connectors. Pages supply content; pages do not duplicate SVG paths, diagram markup or flow styling.

## Typography and rhythm

- Eyebrow: ownership or visual type.
- Heading: the one question answered by the section.
- Caption: the smallest explanation needed to interpret the visual.
- Node: one operational state or responsibility.
- Section spacing: 64-96 pixels, with a maximum content width of 1152 pixels.

Motion respects `prefers-reduced-motion`. Meaning never depends on animation or colour alone.
