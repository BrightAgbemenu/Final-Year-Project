/*
# Fix mutable search_path on set_updated_at

The `set_updated_at()` trigger function was created without an explicit search_path,
triggering a security advisor warning (function_search_path_mutable). This sets a
fixed search_path to `public`, which is the only schema the function touches. No
behavior change — the trigger still updates `updated_at` on every row update.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
