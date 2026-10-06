/*
# Exclude voided installments from balance calculations

## Purpose
Caught by the integration test suite, not manual inspection: `log_payment()` and
`guard_total_cost_reduction()` both predate `installments.voided_at` (added in
20260803100000) and never got updated to filter by it. Both still sum every
installment row regardless of voided status, so after `void_installment()) frees
up balance, the artisan's displayed balance (frontend queries already filter
voided_at) and the server's own overpayment/reduction checks disagree — a payment
the UI says should fit gets rejected by log_payment, and total_cost can be blocked
from decreasing by a payment that's no longer actually counted.

## Changes
- `log_payment()`: v_paid_so_far now sums only non-voided installments.
- `guard_total_cost_reduction()`: same fix, same reasoning.
No signature or return-shape changes — existing callers are unaffected.
*/

CREATE OR REPLACE FUNCTION public.log_payment(
  p_profile_uuid uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS TABLE (
  new_balance numeric,
  installment_id uuid,
  receipt_no text,
  total_paid numeric,
  total_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artisan_id uuid;
  v_total_cost numeric(14,2);
  v_paid_so_far numeric(14,2);
  v_new_total numeric(14,2);
  v_receipt text;
  v_installment_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  SELECT lp.artisan_id, lp.total_cost
    INTO v_artisan_id, v_total_cost
  FROM public.layaway_profiles lp
  WHERE lp.id = p_profile_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This layaway profile does not exist.';
  END IF;

  IF v_artisan_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to log payments for this profile.';
  END IF;

  SELECT COALESCE(SUM(i.amount), 0)
    INTO v_paid_so_far
  FROM public.installments i
  WHERE i.profile_id = p_profile_uuid
    AND i.voided_at IS NULL;

  v_new_total := v_paid_so_far + p_amount;

  IF v_new_total > v_total_cost THEN
    RAISE EXCEPTION 'Payment of GHS % exceeds the outstanding balance of GHS %.',
      p_amount, (v_total_cost - v_paid_so_far);
  END IF;

  v_receipt := 'LAY-' || to_char(now(), 'YYYYMMDD') || '-'
    || lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO public.installments (profile_id, amount, receipt_no, note)
  VALUES (p_profile_uuid, p_amount, v_receipt, p_note)
  RETURNING id INTO v_installment_id;

  RETURN QUERY
    SELECT
      (v_total_cost - v_new_total)::numeric AS new_balance,
      v_installment_id AS installment_id,
      v_receipt AS receipt_no,
      v_new_total::numeric AS total_paid,
      v_total_cost::numeric AS total_cost;
END;
$$;

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
  WHERE i.profile_id = NEW.id
    AND i.voided_at IS NULL;

  IF NEW.total_cost < v_paid_so_far THEN
    RAISE EXCEPTION 'Total cost cannot be less than the amount already paid on this record.';
  END IF;

  RETURN NEW;
END;
$$;
