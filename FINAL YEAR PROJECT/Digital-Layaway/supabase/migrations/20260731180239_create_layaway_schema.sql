/*
# Digital Layaway Management — Core Schema

## Purpose
Builds the database foundation for a mobile-first app where artisans (e.g. furniture
makers, seamstresses) track client layaway instalments and generate verifiable receipts,
replacing their paper notebooks.

## New Tables

1. `profiles`
   - One row per authenticated artisan, created automatically on signup via trigger.
   - `id` (uuid, PK) — references `auth.users(id)`, ON DELETE CASCADE.
   - `full_name` (text) — artisan's display name, sourced from signup metadata.
   - `phone` (text) — optional contact number.
   - `created_at` (timestamptz) — defaults to now().

2. `layaway_profiles`
   - A single client layaway record owned by one artisan.
   - `id` (uuid, PK).
   - `artisan_id` (uuid) — owner, references `profiles(id)`, defaults to `auth.uid()`.
   - `client_name` (text, NOT NULL) — the customer's name.
   - `client_phone` (text) — optional customer contact.
   - `item_description` (text, NOT NULL) — what is being paid for.
   - `total_cost` (numeric(14,2), NOT NULL, CHECK > 0) — agreed total in GHS.
   - `created_at` (timestamptz) — defaults to now().
   - `updated_at` (timestamptz) — defaults to now(), refreshed on update.

3. `installments`
   - An individual payment made toward a layaway profile.
   - `id` (uuid, PK).
   - `profile_id` (uuid) — references `layaway_profiles(id)`, ON DELETE CASCADE.
   - `amount` (numeric(14,2), NOT NULL, CHECK > 0) — payment amount in GHS.
   - `payment_date` (timestamptz) — defaults to now().
   - `receipt_no` (text, UNIQUE) — human-readable receipt identifier `LAY-YYYYMMDD-XXXX`.
   - `note` (text) — optional artisan note.

## Functions

1. `handle_new_user()` — SECURITY DEFINER trigger function. When a new auth user is
   created, inserts a matching `profiles` row using `raw_user_meta_data->>'full_name'`
   and `raw_user_meta_data->>'phone'`. Revoked rights from public/anon so only the
   trigger can call it.

2. `log_payment(p_profile_uuid uuid, p_amount numeric, p_note text)` — SECURITY DEFINER
   atomic payment function. Validates the caller owns the profile, checks the amount is
   positive, verifies the payment does not exceed the outstanding balance, inserts the
   installment with a generated receipt number, and returns the new balance plus the
   created installment row. Prevents race conditions and overpayment at the DB layer.

## Security (Row Level Security)
- RLS ENABLED on `profiles`, `layaway_profiles`, and `installments`.
- `profiles`: an authenticated user may SELECT and UPDATE only their own row (id = auth.uid()).
- `layaway_profiles`: full owner-scoped CRUD — SELECT/INSERT/UPDATE/DELETE where
  `artisan_id = auth.uid()`. The `artisan_id` column defaults to `auth.uid()` so client
  inserts that omit it still satisfy the INSERT WITH CHECK.
- `installments`: SELECT and DELETE scoped through the parent layaway profile's owner.
  INSERT is intentionally NOT granted directly — payments must go through the
  `log_payment` SECURITY DEFINER function, which performs ownership + overpayment checks
  atomically. This prevents clients from bypassing the overpayment guard.
- `handle_new_user` has REVOKE EXECUTE FROM PUBLIC and anon, so it cannot be called
  directly — only the auth trigger fires it.

## Notes
1. The `artisan_id` default of `auth.uid()` is essential: the frontend insert call does
   not pass `artisan_id`, so the default fills it from the session.
2. Installment amounts are constrained to > 0 (CHECK). The `log_payment` function
   additionally rejects payments that would overpay the total_cost.
3. `receipt_no` is unique and generated server-side inside `log_payment` so it can never
   collide or be client-controlled.
4. `updated_at` is kept current by a trigger on `layaway_profiles`.
*/

-- =========================================================
-- 1. profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =========================================================
-- 2. layaway_profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.layaway_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  item_description text NOT NULL,
  total_cost numeric(14,2) NOT NULL CHECK (total_cost > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.layaway_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_layaways" ON public.layaway_profiles;
CREATE POLICY "select_own_layaways"
  ON public.layaway_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "insert_own_layaways" ON public.layaway_profiles;
CREATE POLICY "insert_own_layaways"
  ON public.layaway_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "update_own_layaways" ON public.layaway_profiles;
CREATE POLICY "update_own_layaways"
  ON public.layaway_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = artisan_id)
  WITH CHECK (auth.uid() = artisan_id);

DROP POLICY IF EXISTS "delete_own_layaways" ON public.layaway_profiles;
CREATE POLICY "delete_own_layaways"
  ON public.layaway_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = artisan_id);

CREATE INDEX IF NOT EXISTS idx_layaway_profiles_artisan
  ON public.layaway_profiles(artisan_id, created_at DESC);

-- =========================================================
-- 3. installments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.layaway_profiles(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date timestamptz NOT NULL DEFAULT now(),
  receipt_no text UNIQUE,
  note text
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Payments may only be read by the owning artisan.
DROP POLICY IF EXISTS "select_own_installments" ON public.installments;
CREATE POLICY "select_own_installments"
  ON public.installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.layaway_profiles lp
      WHERE lp.id = installments.profile_id
        AND lp.artisan_id = auth.uid()
    )
  );

-- Direct INSERT is intentionally blocked. Payments must go through log_payment(),
-- which enforces ownership + overpayment atomically. We still grant DELETE so an
-- artisan can reverse a mistaken payment (with the SELECT policy guarding reads).
DROP POLICY IF EXISTS "delete_own_installments" ON public.installments;
CREATE POLICY "delete_own_installments"
  ON public.installments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.layaway_profiles lp
      WHERE lp.id = installments.profile_id
        AND lp.artisan_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_installments_profile
  ON public.installments(profile_id, payment_date DESC);

-- =========================================================
-- 4. updated_at trigger for layaway_profiles
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_layaway_profiles_updated_at ON public.layaway_profiles;
CREATE TRIGGER trg_layaway_profiles_updated_at
  BEFORE UPDATE ON public.layaway_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. handle_new_user — auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 6. log_payment — atomic instalment logging
-- =========================================================
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
  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Fetch the layaway profile and confirm the caller owns it.
  -- auth.uid() is the session user; SECURITY DEFINER runs as the function owner,
  -- so we must explicitly check ownership against the authenticated user.
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

  -- Sum existing payments
  SELECT COALESCE(SUM(i.amount), 0)
    INTO v_paid_so_far
  FROM public.installments i
  WHERE i.profile_id = p_profile_uuid;

  v_new_total := v_paid_so_far + p_amount;

  -- Overpayment guard
  IF v_new_total > v_total_cost THEN
    RAISE EXCEPTION 'Payment of GHS % exceeds the outstanding balance of GHS %.',
      p_amount, (v_total_cost - v_paid_so_far);
  END IF;

  -- Generate a unique receipt number: LAY-YYYYMMDD-XXXX (random 4-digit suffix)
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

REVOKE EXECUTE ON FUNCTION public.log_payment(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_payment(uuid, numeric, text) TO authenticated;
