-- Bullet balance system for users and companies
BEGIN;

CREATE TABLE IF NOT EXISTS public.bullets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bullets_owner_unique UNIQUE (owner_id),
  CONSTRAINT bullets_balance_nonnegative CHECK (balance >= 0)
);

CREATE INDEX IF NOT EXISTS bullets_owner_idx
  ON public.bullets (owner_id);

CREATE TABLE IF NOT EXISTS public.bullet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS bullet_transactions_owner_idx
  ON public.bullet_transactions (owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_bullets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bullets_set_updated_at ON public.bullets;
CREATE TRIGGER bullets_set_updated_at
BEFORE UPDATE ON public.bullets
FOR EACH ROW
EXECUTE FUNCTION public.handle_bullets_updated_at();

ALTER TABLE public.bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bullet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bullet owners can view" ON public.bullets;
DROP POLICY IF EXISTS "Admins manage bullets" ON public.bullets;
DROP POLICY IF EXISTS "Bullet owners can view transactions" ON public.bullet_transactions;

CREATE POLICY "Bullet owners can view"
  ON public.bullets
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.bullets.owner_id
        AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage bullets"
  ON public.bullets
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Bullet owners can view transactions"
  ON public.bullet_transactions
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.bullet_transactions.owner_id
        AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage transactions"
  ON public.bullet_transactions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.adjust_bullet_balance(uuid, integer, text, uuid, boolean);
CREATE OR REPLACE FUNCTION public.adjust_bullet_balance(
  p_owner_id uuid,
  p_delta integer,
  p_reason text,
  p_actor uuid,
  p_require_admin boolean DEFAULT false
) RETURNS public.bullets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_reason text;
  current_balance integer;
  new_balance integer;
  is_company_owner boolean;
  result_record public.bullets;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner id is required';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Delta must not be zero';
  END IF;

  normalized_reason := trim(coalesce(p_reason, ''));
  IF normalized_reason = '' THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  IF p_require_admin AND NOT public.has_role(p_actor, 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF p_delta > 0 AND NOT public.has_role(p_actor, 'admin') THEN
    RAISE EXCEPTION 'Only admins can add bullets';
  END IF;

  IF p_delta < 0 THEN
    IF p_actor = p_owner_id THEN
      -- allowed
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = p_owner_id
          AND c.owner_id = p_actor
      )
      INTO is_company_owner;

      IF NOT coalesce(is_company_owner, FALSE) AND NOT public.has_role(p_actor, 'admin') THEN
        RAISE EXCEPTION 'Not authorized to spend bullets for this owner';
      END IF;
    END IF;
  END IF;

  SELECT balance
  INTO current_balance
  FROM public.bullets
  WHERE owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.bullets (owner_id, balance)
    VALUES (p_owner_id, 0)
    ON CONFLICT (owner_id) DO NOTHING;

    SELECT balance
    INTO current_balance
    FROM public.bullets
    WHERE owner_id = p_owner_id
    FOR UPDATE;
  END IF;

  new_balance := current_balance + p_delta;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient bullet balance';
  END IF;

  UPDATE public.bullets
  SET balance = new_balance,
      updated_at = now()
  WHERE owner_id = p_owner_id;

  INSERT INTO public.bullet_transactions (owner_id, delta, reason, created_by)
  VALUES (p_owner_id, p_delta, normalized_reason, p_actor);

  SELECT *
  INTO result_record
  FROM public.bullets
  WHERE owner_id = p_owner_id;

  RETURN result_record;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_bullet_balance(uuid, integer, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_bullet_balance(uuid, integer, text, uuid, boolean) TO service_role;

COMMIT;
