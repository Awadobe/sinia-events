-- Radius venue foundation.
-- Venues live inside Radius and may be managed by an organization or an
-- individual account. Availability is deliberately separate from a booking:
-- an available date can still require fresh confirmation from the venue.

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.hosts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  venue_type TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  area TEXT NOT NULL,
  address TEXT,
  landmark TEXT,
  city TEXT NOT NULL DEFAULT 'Freetown',
  country TEXT NOT NULL DEFAULT 'Sierra Leone',
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  maximum_capacity INTEGER CHECK (maximum_capacity IS NULL OR maximum_capacity > 0),
  starting_price NUMERIC(12, 2) CHECK (starting_price IS NULL OR starting_price >= 0),
  price_basis TEXT CHECK (
    price_basis IS NULL OR
    price_basis IN ('per_hour', 'per_session', 'per_day', 'per_event', 'on_request')
  ),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'suspended', 'rejected')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'in_review', 'verified')),
  verified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, email)
);

CREATE TABLE IF NOT EXISTS public.venue_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  space_type TEXT NOT NULL,
  description TEXT,
  theatre_capacity INTEGER CHECK (theatre_capacity IS NULL OR theatre_capacity >= 0),
  classroom_capacity INTEGER CHECK (classroom_capacity IS NULL OR classroom_capacity >= 0),
  banquet_capacity INTEGER CHECK (banquet_capacity IS NULL OR banquet_capacity >= 0),
  standing_capacity INTEGER CHECK (standing_capacity IS NULL OR standing_capacity >= 0),
  is_indoor BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_space_amenities (
  space_id UUID NOT NULL REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.venue_amenities(id) ON DELETE CASCADE,
  notes TEXT,
  PRIMARY KEY (space_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS public.venue_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  price_basis TEXT NOT NULL DEFAULT 'per_event'
    CHECK (price_basis IN ('per_hour', 'per_session', 'per_day', 'per_event', 'on_request')),
  included_items TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmation_required'
    CHECK (status IN ('available', 'confirmation_required', 'held', 'booked', 'blocked')),
  source TEXT NOT NULL DEFAULT 'venue_manager'
    CHECK (source IN ('venue_manager', 'radius_admin', 'enquiry', 'external_booking')),
  notes TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.venue_packages(id) ON DELETE SET NULL,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_phone TEXT NOT NULL,
  preferred_contact TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (preferred_contact IN ('whatsapp', 'phone', 'email')),
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  guest_count INTEGER CHECK (guest_count IS NULL OR guest_count > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (
      status IN (
        'submitted',
        'contacted',
        'awaiting_venue',
        'available',
        'unavailable',
        'inspection_scheduled',
        'closed'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_space_id UUID REFERENCES public.venue_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_host ON public.venues(host_id);
CREATE INDEX IF NOT EXISTS idx_venues_area ON public.venues(area);
CREATE INDEX IF NOT EXISTS idx_venue_members_user ON public.venue_members(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_members_email ON public.venue_members(lower(email));
CREATE INDEX IF NOT EXISTS idx_venue_spaces_venue ON public.venue_spaces(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_media_venue_order
  ON public.venue_media(venue_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_single_cover
  ON public.venue_media(venue_id) WHERE is_cover = true;
CREATE INDEX IF NOT EXISTS idx_venue_packages_venue ON public.venue_packages(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_availability_lookup
  ON public.venue_availability(venue_id, date, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_availability_venue_date
  ON public.venue_availability(venue_id, date) WHERE space_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_availability_space_date
  ON public.venue_availability(space_id, date) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venue_enquiries_venue_status
  ON public.venue_enquiries(venue_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_venue ON public.events(venue_id);

CREATE OR REPLACE FUNCTION public.touch_venue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_venues_updated_at ON public.venues;
CREATE TRIGGER set_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

DROP TRIGGER IF EXISTS set_venue_spaces_updated_at ON public.venue_spaces;
CREATE TRIGGER set_venue_spaces_updated_at
  BEFORE UPDATE ON public.venue_spaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

DROP TRIGGER IF EXISTS set_venue_packages_updated_at ON public.venue_packages;
CREATE TRIGGER set_venue_packages_updated_at
  BEFORE UPDATE ON public.venue_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

DROP TRIGGER IF EXISTS set_venue_availability_updated_at ON public.venue_availability;
CREATE TRIGGER set_venue_availability_updated_at
  BEFORE UPDATE ON public.venue_availability
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

DROP TRIGGER IF EXISTS set_venue_enquiries_updated_at ON public.venue_enquiries;
CREATE TRIGGER set_venue_enquiries_updated_at
  BEFORE UPDATE ON public.venue_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

CREATE OR REPLACE FUNCTION public.is_radius_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins administrator
    WHERE lower(administrator.email) = lower(auth.jwt() ->> 'email')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_venue(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_radius_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.venues venue
      WHERE venue.id = target_venue_id
        AND (
          venue.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.host_organizers organizer
            WHERE organizer.host_id = venue.host_id
              AND organizer.user_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.venue_members member
      WHERE member.venue_id = target_venue_id
        AND member.status = 'active'
        AND (
          member.user_id = auth.uid()
          OR lower(member.email) = lower(auth.jwt() ->> 'email')
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_radius_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_venue(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_radius_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_venue(UUID) TO authenticated, service_role;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_space_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published venues are public" ON public.venues;
CREATE POLICY "Published venues are public"
  ON public.venues FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Venue managers can view their venues" ON public.venues;
CREATE POLICY "Venue managers can view their venues"
  ON public.venues FOR SELECT TO authenticated
  USING (public.can_manage_venue(id));

DROP POLICY IF EXISTS "Authenticated users can create venues" ON public.venues;
CREATE POLICY "Authenticated users can create venues"
  ON public.venues FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      host_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.host_organizers organizer
        WHERE organizer.host_id = host_id AND organizer.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Venue managers can update venues" ON public.venues;
CREATE POLICY "Venue managers can update venues"
  ON public.venues FOR UPDATE TO authenticated
  USING (public.can_manage_venue(id))
  WITH CHECK (public.can_manage_venue(id));

DROP POLICY IF EXISTS "Platform admins can delete venues" ON public.venues;
CREATE POLICY "Platform admins can delete venues"
  ON public.venues FOR DELETE TO authenticated
  USING (public.is_radius_platform_admin());

DROP POLICY IF EXISTS "Venue managers can view members" ON public.venue_members;
CREATE POLICY "Venue managers can view members"
  ON public.venue_members FOR SELECT TO authenticated
  USING (
    public.can_manage_venue(venue_id)
    OR user_id = auth.uid()
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Venue managers can manage members" ON public.venue_members;
CREATE POLICY "Venue managers can manage members"
  ON public.venue_members FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Amenities are public" ON public.venue_amenities;
CREATE POLICY "Amenities are public"
  ON public.venue_amenities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Platform admins manage amenities" ON public.venue_amenities;
CREATE POLICY "Platform admins manage amenities"
  ON public.venue_amenities FOR ALL TO authenticated
  USING (public.is_radius_platform_admin())
  WITH CHECK (public.is_radius_platform_admin());

DROP POLICY IF EXISTS "Published venue spaces are public" ON public.venue_spaces;
CREATE POLICY "Published venue spaces are public"
  ON public.venue_spaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues venue
      WHERE venue.id = venue_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage spaces" ON public.venue_spaces;
CREATE POLICY "Venue managers manage spaces"
  ON public.venue_spaces FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Published space amenities are public" ON public.venue_space_amenities;
CREATE POLICY "Published space amenities are public"
  ON public.venue_space_amenities FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_spaces space
      JOIN public.venues venue ON venue.id = space.venue_id
      WHERE space.id = space_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage space amenities" ON public.venue_space_amenities;
CREATE POLICY "Venue managers manage space amenities"
  ON public.venue_space_amenities FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_spaces space
      WHERE space.id = space_id AND public.can_manage_venue(space.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_spaces space
      WHERE space.id = space_id AND public.can_manage_venue(space.venue_id)
    )
  );

DROP POLICY IF EXISTS "Published venue media is public" ON public.venue_media;
CREATE POLICY "Published venue media is public"
  ON public.venue_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues venue
      WHERE venue.id = venue_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage media" ON public.venue_media;
CREATE POLICY "Venue managers manage media"
  ON public.venue_media FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Published venue packages are public" ON public.venue_packages;
CREATE POLICY "Published venue packages are public"
  ON public.venue_packages FOR SELECT
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.venues venue
      WHERE venue.id = venue_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage packages" ON public.venue_packages;
CREATE POLICY "Venue managers manage packages"
  ON public.venue_packages FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Published venue availability is public" ON public.venue_availability;
CREATE POLICY "Published venue availability is public"
  ON public.venue_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues venue
      WHERE venue.id = venue_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage availability" ON public.venue_availability;
CREATE POLICY "Venue managers manage availability"
  ON public.venue_availability FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Anyone can submit a venue enquiry" ON public.venue_enquiries;
CREATE POLICY "Anyone can submit a venue enquiry"
  ON public.venue_enquiries FOR INSERT
  WITH CHECK (
    (requester_user_id IS NULL OR requester_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.venues venue
      WHERE venue.id = venue_id AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Requesters can view their enquiries" ON public.venue_enquiries;
CREATE POLICY "Requesters can view their enquiries"
  ON public.venue_enquiries FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR (
      requester_email IS NOT NULL
      AND lower(requester_email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Venue managers manage enquiries" ON public.venue_enquiries;
CREATE POLICY "Venue managers manage enquiries"
  ON public.venue_enquiries FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

INSERT INTO public.venue_amenities (key, name, category, icon)
VALUES
  ('air-conditioning', 'Air conditioning', 'comfort', 'snowflake'),
  ('backup-generator', 'Backup generator', 'utilities', 'zap'),
  ('parking', 'Parking area', 'access', 'car'),
  ('guest-toilets', 'Guest toilets', 'facilities', 'bath'),
  ('accessible-entrance', 'Accessible entrance', 'access', 'accessibility'),
  ('dressing-room', 'Dressing or preparation room', 'facilities', 'door-open'),
  ('stage', 'Stage or lectern', 'equipment', 'presentation'),
  ('projector', 'Projector and screen', 'equipment', 'projector'),
  ('sound-system', 'Sound system', 'equipment', 'speaker'),
  ('catering-area', 'Catering preparation area', 'facilities', 'cooking-pot'),
  ('outdoor-area', 'Outdoor area', 'space', 'trees'),
  ('security', 'Security point', 'services', 'shield-check'),
  ('chairs', 'Chairs', 'furniture', 'armchair'),
  ('tables', 'Tables', 'furniture', 'table'),
  ('drink-cooling', 'Drink tubs or cooling', 'equipment', 'ice-cream-bowl')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon;

