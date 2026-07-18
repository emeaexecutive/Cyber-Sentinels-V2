# Sprint 16.1B.1 Responsive QA

Date: 2026-07-18

## Measured viewports

Lighthouse ran both routes at:

- Mobile: 412 x 823, device scale factor 1.75.
- Desktop: 1350 x 940, device scale factor 1.

At those emulations both pages returned 200, Accessibility/Best Practices/SEO were 100, CLS was 0 or 0.007, and no console error was recorded.

## Source-level responsive contracts

- Page gutters start at `px-4`, then grow at `sm` and `md`.
- Buyer cards are one column by default and two columns at `lg`.
- CTA collections are full-width grids on narrow screens and wrapped rows from `sm`.
- Breadcrumbs wrap and the current label may break without clipping.
- The pilot timeline is vertical by default and becomes four columns at `md`.
- Responsibilities use a one-column default and two columns at `lg`.
- Rollback is always rendered and uses readable body sizing.
- No text-size reduction, fixed card width or horizontal-scroll workaround was added.

## Requested width matrix

| Width | Status |
| ---: | --- |
| 320 | Responsive source contract verified; not individually browser-emulated |
| 375 | Responsive source contract verified; not individually browser-emulated |
| 390 | Responsive source contract verified; not individually browser-emulated |
| 430 | Responsive source contract verified; not individually browser-emulated |
| 768 | Responsive source contract verified; not individually browser-emulated |
| 1024 | Responsive source contract verified; not individually browser-emulated |
| 1280 | Responsive source contract verified; not individually browser-emulated |
| 1440 | Responsive source contract verified; not individually browser-emulated |

No visual-regression or E2E browser tooling exists in the repository, and the in-app browser execution surface was unavailable. Therefore no claim is made that every requested width received rendered overflow inspection. Part 4 or a later QA pass should run the exact matrix in a browser-capable environment.
