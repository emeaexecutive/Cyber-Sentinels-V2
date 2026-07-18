# Sprint 16.1B.1 Accessibility Review

Date: 2026-07-18

## Measured result

Lighthouse 13.4.0 reported Accessibility `100` for both routes in mobile (412 x 823) and desktop (1350 x 940) emulation. These scores are automated measurements, not a claim of complete WCAG conformance.

| Route | Mobile | Desktop | Console errors | Accessible-name mismatch |
| --- | ---: | ---: | ---: | ---: |
| Buyer Documentation | 100 | 100 | 0 | 0 |
| Pilot Checklist | 100 | 100 | 0 | 0 |

## Verified contracts

- Named `main`, section, article, nav, list and description-list semantics are preserved.
- Breadcrumbs use an ordered list, `aria-label="Breadcrumb"` and `aria-current="page"`.
- Buyer cards use H3, DL, DT and DD semantics with unique IDs.
- The pilot timeline is an ordered list with an accessible label and Week 0 through Week 3 in source order.
- Before Kickoff, Success Metrics and Rollback are semantic lists; no fake checkbox controls exist.
- CTA groups are labelled navigation lists with native links and at least 44px (`min-h-11`) touch height.
- Focus-visible outlines and reduced-motion handling already exist in `app/globals.css`.
- Rollback content is visible without disclosure interaction; no focus trap or hover-only content was introduced.

## Resolved finding

The first mobile audit found that the visible `Menu` text did not exactly match the button's longer accessible name. The label now matches the visible state (`Menu` / `Close`); the final audit reports no mismatch.

## Limitations

No automated `test:a11y` script, axe harness or browser-driven keyboard suite exists. A manual keyboard traversal was not claimed because the in-app browser execution surface was unavailable. Native link semantics, focus CSS and Lighthouse checks provide coverage but do not replace assistive-technology testing.
