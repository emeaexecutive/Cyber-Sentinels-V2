# Password recovery

Cyber Sentinels owns the complete password-recovery journey. No Supabase dashboard action is part of the customer flow.

## Runtime flow

1. `/login` collects the email address and a Turnstile challenge.
2. `POST /api/auth/password-reset/request` verifies Turnstile, applies an application rate limit, and calls `supabase.auth.resetPasswordForEmail()`.
3. Supabase sends the branded recovery email. Both known and unknown email addresses receive the same product response.
4. The recovery link returns to `/auth/callback`. The callback exchanges the one-time PKCE code and trusts the `PASSWORD_RECOVERY` auth event emitted by Supabase, never a user-controlled redirect flag.
5. The callback creates a short-lived, HttpOnly, same-site recovery marker and redirects to `/account/reset-password`.
6. The reset page requires both the recovery marker and a valid recovery session. It never renders the ordinary sign-in form.
7. `POST /api/auth/password-reset/complete` validates the password, calls `supabase.auth.updateUser()`, supports a provider-requested reauthentication nonce, globally signs out existing sessions, and consumes the recovery marker.
8. The user sees `Password updated successfully.` and continues to a clean sign-in. This is the selected security policy: a reset does not silently continue into the product.

## Redirect configuration

The repository configuration declares only the required callback surface:

- Production: `https://www.cybersentinels.com/auth/callback`
- Local: `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`
- Preview: `https://*-keith-speres-projects.vercel.app/auth/callback`

The Production Supabase project's Site URL must be `https://www.cybersentinels.com`, with the exact Production callback URL in its redirect allowlist. Preview uses the approved team-specific Vercel pattern; Production must not use a broad wildcard. Repository configuration does not prove that hosted dashboard settings have been applied, so the hosted non-Production project must be inspected before release qualification.

## Email delivery

`supabase/templates/recovery.html` is the Cyber Sentinels recovery template and uses Supabase's `ConfirmationURL`, which preserves the approved `redirectTo` callback and PKCE flow identifier. It contains no localhost or stale Preview URL.

The checked-in Supabase configuration does not enable custom SMTP. The local mail server captures mail for development and does not deliver externally. Hosted Preview must therefore confirm whether custom SMTP is configured. Provider HTTP 429 responses are surfaced as rate limiting; they are not converted into the privacy-preserving success message.

## Safe observability

The server emits these event names with a correlation ID and non-secret reason codes only:

- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_EMAIL_ACCEPTED_BY_PROVIDER`
- `PASSWORD_RECOVERY_CALLBACK`
- `PASSWORD_UPDATED`
- `PASSWORD_RESET_FAILED`

Email addresses, passwords, reset codes, access tokens, refresh tokens, PKCE verifiers, and provider secrets are never included in these events.
