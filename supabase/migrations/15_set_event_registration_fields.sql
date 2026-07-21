-- Reliably update custom registration questions for both migrated and newly
-- created events. Only trusted server-side requests may call this function.
CREATE OR REPLACE FUNCTION public.set_event_registration_fields(
  target_event_id UUID,
  new_fields JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(new_fields) <> 'array' THEN
    RAISE EXCEPTION 'registration fields must be a JSON array';
  END IF;

  UPDATE public.events
  SET registration_fields = new_fields,
      updated_at = NOW()
  WHERE id = target_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_registration_fields(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_event_registration_fields(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.set_event_registration_fields(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_event_registration_fields(UUID, JSONB) TO service_role;
