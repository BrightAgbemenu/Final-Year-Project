/*
# Tighten handle_new_user execute grant

## Purpose
The security advisor flags `public.handle_new_user()` as callable via RPC
(`/rest/v1/rpc/handle_new_user`) by the `authenticated` role. The original migration
only revoked EXECUTE from PUBLIC and anon, leaving Supabase's default per-role grant
to `authenticated` in place. The function is a trigger function (RETURNS trigger)
meant to fire only via the `on_auth_user_created` trigger on auth.users — Postgres
already rejects direct invocation of trigger functions outside a trigger context, so
this is not currently exploitable, but the explicit revoke closes the advisor warning
and matches the least-privilege intent already documented for this function.

## Changes
- Revoke EXECUTE on `handle_new_user()` from `authenticated` as well.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
