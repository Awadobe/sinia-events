ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'unlisted', 'invite_only'));

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS invitation_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_invitation_token
  ON public.invites(invitation_token);

CREATE OR REPLACE FUNCTION public.set_event_visibility(target_event_id UUID, new_visibility TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_visibility NOT IN ('public', 'unlisted', 'invite_only') THEN
    RAISE EXCEPTION 'invalid event visibility';
  END IF;
  UPDATE public.events SET visibility = new_visibility, updated_at = NOW() WHERE id = target_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_visibility(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_event_visibility(UUID, TEXT) TO service_role;
