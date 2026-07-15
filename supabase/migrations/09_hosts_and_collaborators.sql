-- Radius host model: individuals and organizations can host events.
-- Existing profiles/events are preserved and backfilled into personal hosts.

CREATE TABLE IF NOT EXISTS public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('individual', 'organization')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.host_organizers (
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (host_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS public.host_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, email)
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.hosts(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS public_slug TEXT;

-- Give every existing profile a stable personal host.
INSERT INTO public.hosts (type, name, slug, created_by)
SELECT
  'individual',
  COALESCE(NULLIF(p.name, ''), NULLIF(split_part(p.email, '@', 1), ''), 'Organizer'),
  COALESCE(NULLIF(p.slug, ''), 'organizer') || '-' || LEFT(p.id::text, 8),
  p.id
FROM public.profiles p
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.host_organizers (host_id, user_id, added_by)
SELECT h.id, h.created_by, h.created_by
FROM public.hosts h
WHERE h.type = 'individual' AND h.created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- Preserve events without an organizer under a legacy Radius host.
INSERT INTO public.hosts (type, name, slug)
VALUES ('organization', 'Radius', 'radius-legacy')
ON CONFLICT (slug) DO NOTHING;

UPDATE public.events e
SET host_id = h.id
FROM public.hosts h
WHERE e.host_id IS NULL
  AND e.organizer_id IS NOT NULL
  AND h.type = 'individual'
  AND h.created_by = e.organizer_id;

UPDATE public.events e
SET host_id = h.id
FROM public.hosts h
WHERE e.host_id IS NULL AND h.slug = 'radius-legacy';

UPDATE public.events SET public_slug = slug WHERE public_slug IS NULL;

ALTER TABLE public.events ALTER COLUMN host_id SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_host_public_slug
  ON public.events(host_id, public_slug);
CREATE INDEX IF NOT EXISTS idx_host_organizers_user ON public.host_organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_email ON public.event_collaborators(lower(email));

ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts are publicly viewable" ON public.hosts;
CREATE POLICY "Hosts are publicly viewable" ON public.hosts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their host memberships" ON public.host_organizers;
CREATE POLICY "Users can view their host memberships" ON public.host_organizers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their event collaborations" ON public.event_collaborators;
CREATE POLICY "Users can view their event collaborations" ON public.event_collaborators
  FOR SELECT USING (auth.uid() = user_id OR lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Users can view their host invitations" ON public.host_invitations;
CREATE POLICY "Users can view their host invitations" ON public.host_invitations
  FOR SELECT USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- The old table is not used by the application. Lock it down if it exists.
ALTER TABLE IF EXISTS public.event_hosts ENABLE ROW LEVEL SECURITY;

-- Create a personal host whenever a new profile is created.
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

  INSERT INTO public.host_organizers (host_id, user_id, added_by)
  SELECT invitation.host_id, NEW.id, invitation.invited_by
  FROM public.host_invitations invitation
  WHERE lower(invitation.email) = lower(NEW.email)
    AND invitation.status = 'pending'
  ON CONFLICT DO NOTHING;

  UPDATE public.host_invitations
  SET status = 'accepted'
  WHERE lower(email) = lower(NEW.email) AND status = 'pending';

  UPDATE public.event_collaborators
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email) AND user_id IS NULL AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_create_personal_host ON public.profiles;
CREATE TRIGGER on_profile_create_personal_host
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.create_personal_host_for_profile();

-- Backfill is complete; run the helper for future users only.
