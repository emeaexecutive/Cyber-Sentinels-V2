# Sprint 16.1B.1 Analytics Review

Date: 2026-07-18

## Current state

No active product analytics provider or analytics consent controller exists in this repository. `package.json` has no analytics SDK, the root layout mounts no analytics provider, and `/cookies` explicitly labels analytics as a placeholder that is not active.

The sprint rule requires reuse of an existing provider and forbids adding a vendor. Therefore no event emitter, hidden tracking, page-view beacon, scroll tracker or analytics cookie was added. Navigation cannot be blocked by analytics because no analytics code executes.

## Reserved event contract

These names are approved for a future consented integration but are **not emitted in this release**:

| Event | Intended trigger | Safe properties |
| --- | --- | --- |
| `enterprise_buyer_documentation_viewed` | Buyer Documentation route view | route, source route, viewport class, environment |
| `enterprise_pilot_checklist_viewed` | Pilot Checklist route view | route, source route, viewport class, environment |
| `enterprise_request_demo_clicked` | Request Demo activation | route, CTA label, destination, environment |
| `enterprise_book_pilot_clicked` | Book Pilot activation | route, CTA label, destination, environment |
| `enterprise_contact_clicked` | Contact Enterprise activation | route, CTA label, destination, environment |
| `enterprise_buyer_card_viewed` | Role card becomes meaningfully visible | route, approved buyer context, viewport class |
| `enterprise_pilot_timeline_viewed` | Timeline becomes meaningfully visible | route, viewport class |
| `enterprise_next_step_clicked` | Contextual route-to-route link activation | route, source route, destination, CTA label |

## Prohibited properties

Identity data, names, email addresses, authentication/session values, customer or pilot identifiers, sensitive evidence, free text, provider secrets and authorization context must not be sent.

## Activation gate

Before these events can be implemented:

1. Approve and mount one analytics provider.
2. Implement optional-cookie preference controls and document them in `/cookies` and `/privacy`.
3. Add a consent-gated, failure-isolated client boundary.
4. Add once-only page and visibility semantics with duplicate-firing tests.
5. Verify navigation succeeds when the provider is blocked or unavailable.

Scroll-depth tracking was not implemented because it is not already supported.
