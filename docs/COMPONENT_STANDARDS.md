# Enterprise Component Standards

Release: 1.0 Alpha

## Foundations

- Canvas: `--brand-canvas`
- Surface: `--brand-surface`
- Raised surface: `--brand-surface-raised`
- Border: `--brand-border`
- Accent: `--brand-accent`
- Content width: existing page maximums up to `max-w-7xl`; the shell itself supports a wider operational frame.

## Cards and panels

- Use `operational-panel` for a grouped operational section.
- Use `operational-card` for one decision, metric or linked object.
- Prefer one border and one surface change; avoid stacked decorative panels.
- Keep compact metadata separate from the primary decision or next action.

## Buttons and links

- `brand-primary-action`: the one primary action for the page or workflow step.
- `brand-secondary-action`: a supporting navigation action.
- `nav-control`: compact shell or navigation control.
- Text links are appropriate for evidence, Replay and contextual drill-down.

## Trust and confidence indicators

- Use only `Healthy`, `Review`, `Blocked` or `Awaiting data` for shell health.
- Show confidence only when it has a named evidence source.
- Missing measurements remain `Awaiting data`; never coerce them to zero.
- Trust posture is scoped to a workflow and must not imply universal certainty.
- Provider states must remain bounded and must not infer live health from credentials alone.

## Spacing and typography

- Page padding: `px-5 sm:px-6 md:px-8`.
- Major section rhythm: `mt-8` or `py-8` minimum.
- Card padding: `p-4` or `p-5`; hero/panel padding may use `p-6 md:p-8`.
- Eyebrows use `operational-eyebrow`; page titles use `text-3xl md:text-4xl` unless a public marketing hero explicitly requires more.
- Body copy should use `text-sm leading-6` or `leading-7` with a bounded line length.

## Loading and performance

- Authenticated data routes use the shared `TrustOSLoading` skeleton.
- Heavy optional controls such as the command palette load in a separate chunk.
- Do not cache one tenant's protected records into a shared application cache.
- Parallelize independent server reads and preserve existing dynamic rendering where authorization or freshness requires it.
