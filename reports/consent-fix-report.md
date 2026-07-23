# Consent fix report

Date: 2026-07-22

## Outcome

The first-choice cookie banner now depends only on hydration readiness and whether a valid local decision exists:

```tsx
const showConsentBanner = ready && decisionState === "undecided";
```

`saving` can still change the presentation of an already-open banner, but it cannot create or reopen the banner after a local decision.

## Behavior preserved

- Accept All, Reject Optional, and Save Preferences synchronously create and persist the local receipt before background synchronization.
- The receipt reference, choices, decision state, and `idle` synchronization status are updated before preferences close.
- The saved notification and `cs:consent-receipt-updated` event remain route-stable.
- Server synchronization remains asynchronous with bounded retry and terminal-failure states.
- Optional tracking remains fail-closed through `effectiveConsentChoices(receipt)` until the receipt is `synced`.
- Effective choices are not used to infer whether the browser user has made a decision.
- Opening `cs:open-consent-preferences` changes only preference-dialog state and does not reset the decision.

## Regression coverage

`tests/cookie-consent-recovery.test.mjs` now verifies:

- Accept All, Reject Optional, and Save Preferences establish an immediate local decision.
- `idle`, `syncing`, `retry_scheduled`, `synced`, and `failed_terminal` receipts all remain decided after serialization and remount-style parsing.
- API failure remains fail-closed without invalidating the local choice.
- The render rule does not include `saving` as a banner-existence condition.
- Opening preferences does not write `decisionState`.

## Validation

- `npm run test:cookie-consent`: PASS (13 tests)
- `npm run test:consent`: PASS (32 tests).
- `npm run lint`: PASS with six unrelated warnings and no errors.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
