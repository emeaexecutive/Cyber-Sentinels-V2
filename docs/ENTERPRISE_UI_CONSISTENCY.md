# Enterprise UI Consistency

Sprint 12.3 reuses the existing enterprise visual contract rather than introducing a parallel design system.

- Primary actions use `brand-primary-action`; supporting actions use `brand-secondary-action`.
- Cards use `operational-card` or `operational-panel` with the shared radius, border and surface tokens.
- Statuses use the compact `enterprise-status-badge` geometry with explicit semantic color classes.
- Layout spacing follows 4/5/6/8 spacing increments already used by enterprise surfaces.
- Typography uses `operational-eyebrow`, balanced headings and readable zinc body tokens.
- Tables use `enterprise-table`; empty and loading surfaces use `enterprise-empty-state` and `enterprise-loading-state`.
- Icons remain optional and decorative; state meaning is always available in text.

The shared public adoption rail and readiness indicators use these primitives. No new icon library, route or UI engine was added.
