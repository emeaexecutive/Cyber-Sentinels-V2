-- Passport verification decisions are platform-admin review actions, not
-- customer self-service updates. The admin route uses a server-only client.
revoke update on table public.passports from authenticated;