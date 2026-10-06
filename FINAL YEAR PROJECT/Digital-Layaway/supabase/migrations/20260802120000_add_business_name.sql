/*
# Add business_name to profiles

## Purpose
Lets an artisan set a business/shop name (e.g. "Ama's Fashion House") distinct from their
personal full_name, so receipts and WhatsApp messages can be signed with the name a client
actually recognizes, rather than only the individual's own name.

## Changes
- `profiles.business_name` (text, nullable) — optional, editable via the existing
  `update_own_profile` RLS policy (no policy changes needed; it already covers all columns
  on the caller's own row).
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text;
