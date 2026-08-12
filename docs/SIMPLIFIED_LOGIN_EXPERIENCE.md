# Simplified login experience

## Product outcome

Cyber Sentinels authentication now presents one customer task at a time. The signed-out screen asks for email and password, offers password recovery and an email sign-in link, and links to account creation. It does not explain authentication infrastructure.

Account creation collects work email, password, and confirmation. Successful registration becomes a dedicated check-email screen with a masked address, resend action, and a direct return to sign in.

Successful authentication honors a validated safe internal `next` route. Without one, the user enters `/operational-entities`. A first-time workspace presents a short setup action before Operational Entities. Developer credentials remain a deliberate journey under Developers → API Keys.

## Removed from the ordinary journey

- The two-column authentication architecture explainer.
- The sign-in/create-account tab panel.
- The session-continuity panel and normal signed-out status message.
- Supabase cookie and redirect-mechanics copy.
- A separate magic-link screen; the action now runs directly from sign in.
- Turnstile branding and implementation detail during successful operation.
- Canonical Alpha/Beta bootstrap terminology on first workspace entry.
- The separate API-client concept between API Keys and creating an External Agent key.

This removes one authentication mode screen, one session-status panel, one architecture panel, and one developer credential concept from the visible paths. Normal login is a single submit from the sign-in form; new-account verification is one dedicated confirmation screen; developer onboarding proceeds directly from API Keys to key creation and connection examples.

## State and security contract

The customer experience maps internal outcomes to `SIGNED_OUT`, `SIGNING_IN`, `EMAIL_VERIFICATION_REQUIRED`, `AUTHENTICATED`, `AUTHENTICATION_FAILED`, `SECURITY_VERIFICATION_FAILED`, and `RATE_LIMITED`. Provider errors are classified into stable customer-safe messages and are never rendered raw.

The redesign retains Turnstile with server-side verification, Supabase authentication and email verification, safe redirect validation, session storage behavior, auth event recording, rate limiting, middleware authorization, tenant isolation, and API-key scope enforcement. Existing PKCE callback, secure cookie, CSRF, session rotation, API authorization, and audit controls are unchanged.

## QA matrix

| Persona | Primary path | Expected result |
| --- | --- | --- |
| New customer | Sign in → Create account → Check email → Sign in | Clear verification and workspace entry |
| Returning customer | Sign in → Operational Entities | No infrastructure terminology or extra status screen |
| Developer | Workspace → Developers → API Keys → External Agent | Scoped key, one-time secret, copy action, connection examples |
| Investor demo | Landing → Sign in → workspace | A direct product story without implementation exposition |

The layouts use a single responsive column for authentication and responsive grids for workspace and developer forms. Automated source, type, security-contract, and production-build checks cover both the simplified copy and the retained controls. Interactive desktop/mobile visual capture still requires an available browser automation session.
