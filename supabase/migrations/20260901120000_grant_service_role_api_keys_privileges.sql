-- Narrow forward-only privilege repair for the public V1 API api_keys table.
-- This restores the expected service_role table privileges without widening
-- access to anon, authenticated, or PUBLIC.

grant select, insert, update, delete
on table public.api_keys
to service_role;
