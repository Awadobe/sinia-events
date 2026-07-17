-- Explicit organization invitation acceptance and safe platform suspension.
ALTER TABLE public.host_invitations
  ADD COLUMN IF NOT EXISTS accept_token UUID DEFAULT gen_random_uuid();

UPDATE public.host_invitations SET accept_token = gen_random_uuid() WHERE accept_token IS NULL;
ALTER TABLE public.host_invitations ALTER COLUMN accept_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_host_invitations_accept_token
  ON public.host_invitations(accept_token);

ALTER TABLE public.hosts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));
CREATE INDEX IF NOT EXISTS idx_hosts_status ON public.hosts(status);

-- New accounts still receive a personal host, but organization invitations
-- are no longer accepted merely because an auth record was created.
CREATE OR REPLACE FUNCTION public.create_personal_host_for_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_host_id UUID;
  host_name TEXT;
  host_slug TEXT;
BEGIN
  host_name := COALESCE(NULLIF(NEW.name, ''), NULLIF(split_part(NEW.email, '@', 1), ''), 'Organizer');
  host_slug := COALESCE(NULLIF(NEW.slug, ''), 'organizer') || '-' || LEFT(NEW.id::text, 8);

  INSERT INTO public.hosts (type, name, slug, created_by)
  VALUES ('individual', host_name, host_slug, NEW.id)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO new_host_id;

  INSERT INTO public.host_organizers (host_id, user_id, added_by)
  VALUES (new_host_id, NEW.id, NEW.id)
  ON CONFLICT DO NOTHING;

  UPDATE public.event_collaborators
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email) AND user_id IS NULL AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
