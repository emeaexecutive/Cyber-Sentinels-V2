# V2 authentication and release closure

Prepared 29 September 2026 on PR #109. This document records source and deterministic browser evidence. The subsequent release record must establish the merged SHA, actual migration application, deployment and real Production observations separately.

## Reported symptoms and findings

Production metadata before release pointed both `www.cybersentinels.com` and `cybersentinels.com` to `dpl_8r32WrUgRsRwPUJrXzSV2pErqLPL`, target Production, READY, commit `e9a90f973aacbe6967f14a527540208431a2ec13` (PR #105). It did not contain PR #107's visible Sign Out control. The older Logout control was inside the navigation menu. PR #109 already contains the corrected always-visible control; it was retained rather than rewritten.

Two additional implementation defects could produce navigation instability:

- Login's automatic session restoration continued on recovery/error/completion URLs and could complete after the user selected Forgot password. An existing ordinary session could navigate away from an invalid recovery link; a delayed claims response could override the user's selected flow.
- The Supabase browser factory wrapped the same singleton repeatedly. An invalid-refresh result triggered expiry navigation inside the try block and again inside its catch. Nested wrappers multiplied the side effect and could reload an authentication screen.

Login/password signup also used client-side navigation after changing authentication. A shared App Router layout can retain its previous signed-out navigation state. Next.js documents [layout preservation during navigation](https://nextjs.org/docs/15/app/api-reference/file-conventions/layout); a fresh authenticated document now loads the shell and its Sign Out control.

These are reproduced source/browser defects and a verified deployment-version gap. They do not identify which particular expired link, email client or browser state caused every reported live jump. No user's password or inbox was accessed.

## Corrections and preserved boundaries

Explicit recovery/error/password-updated login URLs no longer start automatic restoration. A navigation generation invalidates pending restoration after the user changes mode or starts authentication; it is checked after user/claims/event awaits. Completed authentication uses one `window.location.replace` to fetch the current authenticated shell. The reset form retains its existing single post-success navigation after server-side session termination.

The browser client wraps each singleton once and handles an invalid-refresh failure once per operation. It clears stale browser authentication state but does not navigate away from login, callback or reset screens. Protected-page expiry goes to the stable expired-session login state. This is not a global latch across independent concurrent failures.

The callback still exchanges PKCE on the server, classifies recovery using provider metadata or verified claims, and sends one redirect with recovery state. A user-controlled `next` does not grant recovery permission. The reset page still requires a marker, verified recovery claims and user; completion refreshes and revalidates the session, changes the password, and signs out. Recovery middleware quarantine, tenant guards and REVIEW/DENY non-execution are unchanged. No application `window.open`, recovery callback tab creation or service-worker redirect mechanism was found in the audited path.

## Browser evidence and limits

`npm run test:auth-browser` runs 17 tests using Chromium and real application components/routes, with external Auth/Turnstile and framework request context replaced by controlled fixtures:

- The email/verification redirect, actual callback, reset server page and hydrated form are followed through fresh, signed-out, authenticated, stale-cookie, expired-link and consumed-link scenarios. Valid requests render only the reset document until submission, then exactly one login navigation. Invalid links do not expose the form. The tests record document requests/main-frame navigation and assert one tab and no protected page.
- Existing authenticated recovery/error/completion login screens remain stable. Delayed claims, password-login and replay-event responses cannot override Forgot password or leave its reset button disabled. Password login requests a new authenticated document rather than using a retained public SPA shell.
- The real Sign Out control is visible without opening a menu at 1440, 768 and 390 pixels; logout uses the actual route, ends the fixture session, redirects to login and denies Back/protected navigation.

The 11 browser-client expiry regressions execute the actual module and verify singleton wrapping, one expiry side effect per operation, preserved successful results, stable auth screens and untouched device preferences. They are included in `npm test`. The browser suite is now also a CI gate, using the existing Playwright dependency. Screenshots stay local under `artifacts/`.

This is deterministic browser proof, not a real Supabase email delivery or real authenticated Production session. Final recovery UX requires the user's manual email-link exercise if no authorized dedicated test inbox/session is available. Non-secret public Production smoke checks can establish route responses, safe unauthenticated reset state and protected-route denial, but cannot certify authenticated logout/backoffice behavior.

## Related release boundaries

Local validation on 29 September 2026 passed the full 1,808-test suite, lint, TypeScript checking, the production build and the scoped secret scan (zero real secret candidates). The separate Chromium suite passed all 17 tests. Hosted CI must pass on the submitted commit before merge; Production evidence remains separate from these local results.

- [Permission repair review](V2_RELEASE_PERMISSION_REVIEW.md): apply the original single ACL migration only after normal merge and an exact-target, exact-pending-set dry run. Do not rewrite migration history.
- [Internationalization](I18N_FOUNDATION.md): English remains the only published locale. Spanish is registered as pending; no fictional hreflang, translated security values, automatic redirect or paid translation service.
- [Positioning and infrastructure](V2_POSITIONING_AND_INFRASTRUCTURE.md): Execution Trust/authorization positioning, upstream IAM integration gaps and personal-agent governance only. No personal agent product or unrelated plugin was built.

Production success must be recorded with exact commit/deployment/alias and effective database permissions, without promoting synthetic providers or browser fixtures to live qualification.
