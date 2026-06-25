# Final Authentication UX

## Scope

This refinement finalizes the public account access experience without changing Supabase auth, RLS, admin authorization, or email verification enforcement.

## Auth Modes

- Sign in remains the primary mode with email, password, and a single primary submit action.
- Create account is a distinct mode with Email, Password, and Confirm Password fields always visible.
- Magic link is a tertiary account option with an email-only form and the success message: "Check your email for a secure sign-in link."
- Forgot password is a visible tertiary account option with an email-only form and the success message: "If the account exists, password reset instructions have been sent."

## Signup Controls

Create account submit stays disabled until:

- an email address is present
- the password has at least 6 characters
- Confirm Password is present
- Password and Confirm Password match
- no auth request is already in progress

When the passwords do not match, the inline message is: "Passwords do not match."

Successful signup displays: "Check your email to verify your account before continuing."

The success state also keeps resend verification support, spam or junk folder guidance, and a reminder to confirm the email address is correct.

## Admin Access

Administrative access was removed from the main auth card. The only public entry point is the subtle footer text link: "Administrative access."

Admin routes remain protected by middleware and admin verification helpers. This pass does not expose admin dashboards, bypass email verification, or weaken route protection.

## Redirect And Verification Notes

Signup and magic-link flows continue to route through `/auth/callback` with the intended `next` path preserved. Password reset continues to route through `/reset-password`. Verified email enforcement remains handled by middleware before protected workflow, dashboard, verification, and admin destinations render.
