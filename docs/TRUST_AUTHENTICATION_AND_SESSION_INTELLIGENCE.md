# Trust Authentication And Session Intelligence

Date: July 7, 2026

## Why Auth Is Part Of Trust

Cyber Sentinels treats authentication as the first trust event in a workflow. A signed-in user is not automatically trusted for every action; the session also carries email verification, MFA readiness, device continuity, geo consistency, session integrity, trust posture and governance state.

The trust authentication layer returns one of four outcomes:

- `allow` - current evidence supports continuing.
- `step_up` - the user should complete stronger verification before continuing.
- `review` - governance review should evaluate the session or permission context.
- `block` - the session or workflow should not continue.

## Session Continuity Model

The browser client uses bounded Supabase auth calls for `getUser`, `getSession` and `refreshSession`, and protected routes continue to redirect stale or missing sessions through `/login?next=...`.

The login page now checks for a restorable session, shows the current restoration state, and records replay-safe session restoration events when an authenticated session is recovered. Remember-this-browser is treated as a continuity preference while Supabase remains the source of truth for session cookies and refresh behavior.

## MFA Readiness

`lib/auth/mfa.ts` provides the support structure for:

- SMS OTP readiness.
- Authenticator app readiness.
- Step-up challenge metadata.
- Trusted device status.
- Recovery flow placeholders.

SMS and authenticator providers are not faked. When credentials or provider configuration are missing, the UI reports `Awaiting Credentials`.

## Geo Intelligence Model

`lib/runtime/geo-session-intelligence.ts` evaluates:

- Geo mismatch.
- Impossible-travel placeholder.
- Unusual session country.
- New device.
- Unusual browser/device.
- Risky session posture.
- Session continuity score.

These signals are labelled `Heuristic Baseline` and `Runtime Intelligence`. They are runtime review context, not location certainty or fraud-detection accuracy.

## Replayable Auth Events

Auth events are recorded through `lib/auth/auth-replay-events.ts` and `/api/auth/replay-event` after a user is authenticated. Events are written to audit logs and replay timeline context without passwords, tokens, cookies or provider secrets.

Covered events:

- Login.
- Logout.
- Password reset completion.
- MFA challenge.
- Geo mismatch.
- Step-up authentication.
- Blocked session.
- Suspicious login.
- Session restoration.

Each replay entry includes actor identity, session/geo context when available, trust posture, decision and explicit `secrets_included: false` metadata.

## Trusted Device Model

Trusted-device status is currently a continuity signal, not a device identity guarantee. A provider-backed device-risk adapter is still required before trusted-device decisions should be treated as production-grade device assurance.

## UX Surfaces

- `/login` - polished sign-in, create account, magic link and password reset request flow with password visibility, remember-session preference, session restoration state and loading feedback.
- `/reset-password` - password update with visibility controls and replay event recording after authenticated update.
- `/dashboard/session-security` - active sessions, MFA status, trusted devices, suspicious activity, trust posture, recent auth events and replayable session context.
- `/admin/provider-status` - protected admin status page for Supabase email auth, magic links, MFA, SMS, geo intelligence and provider orchestration.

## Current Provider Limitations

- SMS OTP is `Awaiting Credentials` unless server-side SMS provider configuration is present.
- Authenticator-app MFA is `Awaiting Credentials` unless the Supabase MFA/TOTP configuration flag is present.
- Geo intelligence is heuristic and depends on runtime headers or configured providers.
- Impossible-travel detection is a placeholder without provider-backed location timestamp evidence.
- Trusted-device status is simulated readiness until a validated device-risk provider is connected.

## Production Readiness Gaps

- Configure and validate SMS or authenticator MFA providers before enforcing MFA as `Live`.
- Add a governed trusted-device provider before treating device continuity as strong assurance.
- Decide retention and access rules for auth replay events in Supabase RLS.
- Add operational tests against real Supabase session refresh, password reset and MFA enrollment flows.
- Calibrate session-risk thresholds with reviewed enterprise pilot data.
