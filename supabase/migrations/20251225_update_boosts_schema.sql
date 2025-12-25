-- Restructure boosts table for automated payments workflow
alter table public.boosts
  rename column post_id to entity_id;

alter table public.boosts
  rename column boost_until to ends_at;

alter table public.boosts
  add column if not exists entity_type text;

alter table public.boosts
  add column if not exists starts_at timestamptz;

alter table public.boosts
  add column if not exists is_active boolean default true;

alter table public.boosts
  add column if not exists payment_id uuid references public.payments(id);

alter table public.boosts
  add column if not exists created_at timestamptz default now();

update public.boosts set entity_type = coalesce(entity_type, 'listing');

update public.boosts set starts_at = coalesce(starts_at, created_at, now());

update public.boosts set is_active = coalesce(is_active, true);

alter table public.boosts
  alter column entity_type set not null,
  alter column entity_type set default 'listing';

alter table public.boosts
  alter column starts_at set not null;

alter table public.boosts
  alter column ends_at set not null;

alter table public.boosts
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.boosts
  drop column if exists poster_id,
  drop column if exists multiplier;

alter table public.boosts
  add constraint boosts_entity_type_check check (entity_type in ('company', 'listing'));

-- refresh indexes
DROP INDEX IF EXISTS idx_boosts_post_id;
DROP INDEX IF EXISTS idx_boosts_poster_id;
DROP INDEX IF EXISTS idx_boosts_boost_until;
DROP INDEX IF EXISTS idx_boosts_active;

CREATE INDEX IF NOT EXISTS idx_boosts_active_window
  ON public.boosts (is_active, ends_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_boosts_entity_lookup
  ON public.boosts (entity_type, entity_id, is_active);

-- update RLS policies for new workflow
DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can view their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Service role can insert boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can boost their listings" ON public.boosts;
DROP POLICY IF EXISTS "Users can cancel their boosts" ON public.boosts;
DROP POLICY IF EXISTS "Admins can manage boosts" ON public.boosts;

CREATE POLICY "Public can view active boosts"
  ON public.boosts FOR SELECT
  USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "Admins manage boosts"
  ON public.boosts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_boost_from_payment(
  _user_id uuid,
  _amount_cents integer,
  _currency text,
  _provider text,
  _provider_charge_id text,
  _metadata jsonb,
  _entity_id uuid,
  _entity_type text,
  _boost_days integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payment_id uuid;
  _ends_at timestamptz;
BEGIN
  IF _entity_type NOT IN ('company', 'listing') THEN
    RAISE EXCEPTION 'Invalid entity type';
  END IF;

  IF _boost_days <= 0 THEN
    RAISE EXCEPTION 'Boost duration must be greater than zero';
  END IF;

  SELECT id
    INTO _payment_id
  FROM public.payments
  WHERE provider_charge_id = _provider_charge_id;

  IF _payment_id IS NOT NULL THEN
    RETURN _payment_id;
  END IF;

  INSERT INTO public.payments (
    user_id,
    amount_cents,
    currency,
    provider,
    provider_charge_id,
    status,
    metadata
  )
  VALUES (
    _user_id,
    _amount_cents,
    lower(_currency),
    lower(_provider),
    _provider_charge_id,
    'succeeded',
    coalesce(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _payment_id;

  _ends_at := now() + make_interval(days => _boost_days);

  INSERT INTO public.boosts (
    entity_id,
    entity_type,
    starts_at,
    ends_at,
    is_active,
    payment_id
  )
  VALUES (
    _entity_id,
    _entity_type,
    now(),
    _ends_at,
    true,
    _payment_id
  );

  RETURN _payment_id;
END;
$$;
