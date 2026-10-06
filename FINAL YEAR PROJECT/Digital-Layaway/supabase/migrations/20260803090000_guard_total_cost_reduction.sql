/*
# Guard against total_cost being reduced below amount already paid

## Purpose
`log_payment()` guarantees a payment can never push total_paid above total_cost,
but `layaway_profiles.total_cost` can also be changed later via a plain UPDATE
(the edit-client flow). The `update_own_layaways` RLS policy only checks that the
caller owns the row — it does not check the new total_cost against installments
already recorded. Without a DB-level guard, an UPDATE issued directly against the
REST API (bypassing the app's client-side check in EditClientModal) could set
total_cost below the sum of existing installments, producing a negative balance
and breaking the invariant the rest of the app relies on.

## Changes
- `guard_total_cost_reduction()` — BEFORE UPDATE trigger function on
  `layaway_profiles`. When total_cost is being changed, sums the profile's
  installments and rejects the update if the new total_cost would be less than
  that sum. Runs SECURITY INVOKER (matching set_updated_at) since the artisan
  already has SELECT rights on their own installments via RLS.
- Trigger only fires when total_cost actually changes (WHEN clause), so ordinary
  name/phone/description edits are unaffected.
*/

CREATE OR REPLACE FUNCTION public.guard_total_cost_reduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paid_so_far numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(i.amount), 0)
    INTO v_paid_so_far
  FROM public.installments i
  WHERE i.profile_id = NEW.id;

  IF NEW.total_cost < v_paid_so_far THEN
    RAISE EXCEPTION 'Total cost cannot be less than the amount already paid on this record.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_total_cost_reduction ON public.layaway_profiles;
CREATE TRIGGER trg_guard_total_cost_reduction
  BEFORE UPDATE ON public.layaway_profiles
  FOR EACH ROW
  WHEN (OLD.total_cost IS DISTINCT FROM NEW.total_cost)
  EXECUTE FUNCTION public.guard_total_cost_reduction();
