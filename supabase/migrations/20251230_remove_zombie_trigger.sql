-- Remove zombie trigger causing "record new has no field boost" error
DROP TRIGGER IF EXISTS trg_set_boosts_is_active ON public.boosts;
DROP FUNCTION IF EXISTS set_boosts_is_active();
