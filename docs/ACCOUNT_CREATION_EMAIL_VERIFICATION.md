# Account Creation And Email Verification

## Signup flow

The launch signup path is `/login`.

Flow:

1. User enters an email address.
2. User enters `Password`.
3. User enters `Confirm password`.
4. The client blocks account creation when the passwords do not match and shows: `Passwords do not match.`
5. The client calls Supabase Auth `signUp`.
6. Supabase receives `emailRedirectTo` pointing to `/auth/callback`.
7. After successful signup, the page shows: `Check your email to verify your account before continuing.`

The login page keeps password sign-in, magic-link sign-in, and password reset in the same surface. The confirm-password field is only enforced for account creation.

## Password confirmation

The account creation flow requires both password fields to match before calling Supabase. This is a UX guard only; Supabase remains the source of record for password policy enforcement.

Expected behavior:

- Empty email blocks submit.
- Password shorter than six characters blocks submit.
- Mismatched password fields block submit.
- Matching password fields allow the Supabase signup request.

## Email verification flow

The application uses Supabase Auth email confirmation and a local callback route:

- Signup redirect: `/auth/callback?next=<protected-path>`
- Callback route: `/auth/callback`
- Verification waiting page: `/verify-email`

The callback exchanges the Supabase code for a session and redirects to the requested protected path. Middleware checks `email_confirmed_at` or `confirmed_at` before allowing protected workflow routes to render.

Unverified users are redirected to `/verify-email?next=<protected-path>` and are not allowed into dashboard, passport, workspace, admin, trust, replay, or verification workflows.

## Email not received state

The `/verify-email` page tells users to:

- Check spam or junk mail.
- Confirm the email address was typed correctly.
- Wait a few minutes.
- Resend the verification email.

The resend button uses Supabase Auth `resend` with `type: "signup"` and the same `/auth/callback` redirect pattern.

## Supabase dashboard settings to check

Confirm these settings directly in the Supabase dashboard before launch:

- Authentication email confirmations are enabled.
- The production Site URL is set to the public Cyber Sentinels URL.
- The production callback URL is allowlisted.
- The preview callback URL is allowlisted when testing preview deployments.
- Supabase Auth email templates use the expected confirmation link.
- SMTP or Supabase-managed email delivery is configured and tested.
- Rate limits and resend limits are acceptable for launch testing.

## Redirect URL checklist

Required callback pattern:

- `${NEXT_PUBLIC_SITE_URL}/auth/callback`

Recommended allowlist entries:

- Production: `https://<production-domain>/auth/callback`
- Preview: `https://<preview-domain>/auth/callback`
- Local development: `http://localhost:3000/auth/callback`

Runtime validation now warns when `NEXT_PUBLIC_SITE_URL` is missing or does not match the current runtime origin, because Supabase Auth redirects must be allowlisted for the exact deployment URL.

## Safety notes

- Do not commit `.env.local`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Do not bypass email verification in middleware.
- Do not weaken RLS for account creation.
- Use app-managed email provider status only as a signal; Supabase Auth email delivery must still be confirmed in the Supabase dashboard.
