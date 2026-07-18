# Enterprise accessibility

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Standard

The enterprise experience targets WCAG 2.2 AA across public evaluation, authentication, dashboards, governance, reports and Back Office. Accessibility is a release condition, not a marketing claim.

This review combines current source inspection with the repository's existing Lighthouse evidence. The in-app browser execution surface was unavailable on the audit date, so no fresh keyboard-only, screen-reader, zoom, contrast or responsive traversal is claimed.

## Current implementation evidence

| Area | Current source evidence | Verification state |
| --- | --- | --- |
| Focus visibility | Global `:focus-visible` outline and offset | Present in source; fresh visual coverage pending |
| Motion | `prefers-reduced-motion` disables or shortens animation and scrolling | Present in source |
| Navigation | Native links/buttons, labelled navigation, `aria-current`, mobile-menu `aria-expanded` and `aria-controls` | Present in source; full keyboard traversal pending |
| Buyer and pilot content | Semantic headings, lists, native links and responsive layouts | Existing Lighthouse runs recorded accessibility 100 for Buyer Documentation and Pilot Checklist on mobile and desktop |
| Touch targets | Shared control sizing includes a 44-pixel minimum pattern | Present in source; route-wide measurement pending |
| Command palette | Labelled modal dialog; Escape, arrow and Enter handling; initial focus | Present in source; focus containment and return are not proven |
| Loading states | Shared and route-level loading boundaries expose visible status text | Present on five route families; announcement behaviour requires assistive-technology testing |
| Form errors | Authentication and enterprise forms provide visible server/client feedback | Present on inspected forms; error-summary and focus placement are not uniformly verified |

Existing evidence is documented in `docs/epic-16/SPRINT_16_1B_1_ACCESSIBILITY.md`. It covers two public enterprise routes, not the whole application and not protected workflows.

## Required interaction contract

- Every control must have a programmatic name, visible or discoverable focus, and a native keyboard path.
- Page titles and heading levels must communicate hierarchy without relying on card position or font size.
- Menus, dialogs and palettes must support Escape, predictable focus movement, focus containment while modal, and focus return on close.
- Dynamic status, validation errors and completed actions must be announced without stealing focus unexpectedly.
- Colour cannot be the only carrier of readiness, severity, confidence or pass/block state.
- Truncated text must have an accessible full-value path; a pointer-only `title` attribute is insufficient.
- Tables require headers and a usable narrow-viewport representation.
- Charts require equivalent text, values and trends.
- Authentication timeouts must warn users and preserve recoverable work where security policy permits.
- PDF reports require tagged, ordered content before they can be called accessible documents.

## Current risks and gaps

1. No automated axe or equivalent accessibility test is part of `npm run validate`.
2. No fresh screen-reader or keyboard-only test was possible in this review.
3. The command palette does not prove a complete focus trap, focus return, listbox/option semantics or selected-option announcement.
4. The mobile menu has toggle and route-close behaviour, but Escape and outside-click behaviour are not established by the inspected source.
5. No global skip-to-content link was identified.
6. Protected dashboard, governance, report and Back Office surfaces do not have the same recorded Lighthouse coverage as the two public enterprise pages.
7. Dense tables, long Back Office controls, status badges and truncated shell context need 200%/400% zoom and reflow testing.
8. Screen-reader behaviour for toasts, asynchronous loading, errors and report downloads is unverified.
9. PDF tagging and reading order are not verified.

## Verification matrix

Before an enterprise release, test at minimum:

| Journey | Keyboard | Screen reader | 200%/400% zoom | Mobile/reflow | Contrast | Reduced motion |
| --- | --- | --- | --- | --- | --- | --- |
| Public enterprise evaluation | Required | Required | Required | Required | Required | Required |
| Login, verification and recovery | Required | Required | Required | Required | Required | Required |
| Dashboard and command palette | Required | Required | Required | Required | Required | Required |
| Governance review and approval | Required | Required | Required | Required | Required | Required |
| Trust Report review and download | Required | Required | Required | Required | Required | Required |
| Back Office administration | Required | Required | Required | Required | Required | Required |

Record browser/assistive-technology versions, route, role, viewport, result, defect and retest evidence. Lighthouse alone does not close manual WCAG criteria.
