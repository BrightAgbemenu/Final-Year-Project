/*
# Soft-delete installments via an audited void, instead of a hard DELETE

## Purpose
The app tells the client a receipt is verifiable proof of payment, backed by the
database record. But the previous `delete_own_installments` RLS policy let an
artisan permanently erase that row with a plain DELETE — no trace, no reason,
no timestamp. That's a real gap between the claim and the mechanism: an artisan
could quietly remove a payment after handing over a receipt for it.

## Changes
1. `installments` gains `voided_at` (timestamptz) and `void_reason` (text).
2. The `delete_own_installments` policy is dropped. Installments now have no
   client-writable DELETE (or UPDATE) path at all — matching the existing
   pattern where `installments` has no client-writable INSERT either.
3. `void_installment(p_installment_id, p_reason)` — SECURITY DEFINER, mirrors
   `log_payment`: verifies the caller owns the profile the installment belongs
   to, marks it voided (not deleted), and returns the recalculated balance.
   Voiding an already-voided installment is rejected.

## Notes
- Voided installments are excluded from balance/total_paid calculations and
  from the UI (filtered client-side via `voided_at IS NULL`), so day-to-day
  behavior is unchanged — but the row, its amount, and *why* it was removed
  now persist for accountability instead of disappearing.
*/

ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text;

DROP POLICY IF EXISTS "delete_own_installments" ON public.installments;

CREATE OR REPLACE FUNCTION public.void_installment(
  p_installment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  new_balance numeric,
  total_paid numeric,
  total_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_artisan_id uuid;
  v_total_cost numeric(14,2);
  v_paid_so_far numeric(14,2);
BEGIN
  SELECT i.profile_id
    INTO v_profile_id
  FROM public.installments i
  WHERE i.id = p_installment_id
    AND i.voided_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This payment does not exist or has already been removed.';
  END IF;

  SELECT lp.artisan_id, lp.total_cost
    INTO v_artisan_id, v_total_cost
  FROM public.layaway_profiles lp
  WHERE lp.id = v_profile_id;

  IF v_artisan_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to remove this payment.';
  END IF;

  UPDATE public.installments
  SET voided_at = now(),
      void_reason = p_reason
  WHERE id = p_installment_id;

  SELECT COALESCE(SUM(i.amount), 0)
    INTO v_paid_so_far
  FROM public.installments i
  WHERE i.profile_id = v_profile_id
    AND i.voided_at IS NULL;

  RETURN QUERY
    SELECT
      (v_total_cost - v_paid_so_far)::numeric AS new_balance,
      v_paid_so_far::numeric AS total_paid,
      v_total_cost::numeric AS total_cost;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.void_installment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_installment(uuid, text) TO authenticated;
