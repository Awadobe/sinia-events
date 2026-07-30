-- Real venue availability and enquiry workflow.
-- Selecting a date creates an enquiry. It does not reserve or confirm a venue.

BEGIN;

ALTER TABLE public.venue_availability
  ADD COLUMN IF NOT EXISTS time_slot TEXT NOT NULL DEFAULT 'full_day',
  ADD COLUMN IF NOT EXISTS enquiry_id UUID REFERENCES public.venue_enquiries(id) ON DELETE SET NULL;

ALTER TABLE public.venue_availability
  DROP CONSTRAINT IF EXISTS venue_availability_time_slot_check;
ALTER TABLE public.venue_availability
  ADD CONSTRAINT venue_availability_time_slot_check
  CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'full_day'));

DROP INDEX IF EXISTS public.idx_venue_availability_venue_date;
DROP INDEX IF EXISTS public.idx_venue_availability_space_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_availability_venue_date_slot
  ON public.venue_availability(venue_id, date, time_slot)
  WHERE space_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_availability_space_date_slot
  ON public.venue_availability(space_id, date, time_slot)
  WHERE space_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.venue_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  price_basis TEXT NOT NULL DEFAULT 'per_event'
    CHECK (price_basis IN ('per_hour', 'per_session', 'per_day', 'per_event', 'on_request')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_enquiries
  ADD COLUMN IF NOT EXISTS time_slot TEXT NOT NULL DEFAULT 'full_day',
  ADD COLUMN IF NOT EXISTS estimated_total NUMERIC(12, 2)
    CHECK (estimated_total IS NULL OR estimated_total >= 0),
  ADD COLUMN IF NOT EXISTS response_message TEXT,
  ADD COLUMN IF NOT EXISTS alternative_date DATE,
  ADD COLUMN IF NOT EXISTS alternative_time_slot TEXT,
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS venue_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requester_notified_at TIMESTAMPTZ;

ALTER TABLE public.venue_enquiries
  DROP CONSTRAINT IF EXISTS venue_enquiries_time_slot_check;
ALTER TABLE public.venue_enquiries
  ADD CONSTRAINT venue_enquiries_time_slot_check
  CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'full_day'));

ALTER TABLE public.venue_enquiries
  DROP CONSTRAINT IF EXISTS venue_enquiries_alternative_time_slot_check;
ALTER TABLE public.venue_enquiries
  ADD CONSTRAINT venue_enquiries_alternative_time_slot_check
  CHECK (
    alternative_time_slot IS NULL
    OR alternative_time_slot IN ('morning', 'afternoon', 'evening', 'full_day')
  );

ALTER TABLE public.venue_enquiries
  DROP CONSTRAINT IF EXISTS venue_enquiries_status_check;
ALTER TABLE public.venue_enquiries
  ADD CONSTRAINT venue_enquiries_status_check
  CHECK (
    status IN (
      'submitted',
      'contacted',
      'awaiting_venue',
      'available',
      'unavailable',
      'proposed_alternative',
      'confirmed',
      'rejected',
      'inspection_scheduled',
      'cancelled',
      'closed'
    )
  );

CREATE TABLE IF NOT EXISTS public.venue_enquiry_addons (
  enquiry_id UUID NOT NULL REFERENCES public.venue_enquiries(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.venue_addons(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (enquiry_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_addons_venue
  ON public.venue_addons(venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_venue_enquiry_addons_addon
  ON public.venue_enquiry_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_venue_enquiries_requester_email
  ON public.venue_enquiries(lower(requester_email))
  WHERE requester_email IS NOT NULL;

DROP TRIGGER IF EXISTS set_venue_addons_updated_at ON public.venue_addons;
CREATE TRIGGER set_venue_addons_updated_at
  BEFORE UPDATE ON public.venue_addons
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_updated_at();

ALTER TABLE public.venue_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_enquiry_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published venue addons are public" ON public.venue_addons;
CREATE POLICY "Published venue addons are public"
  ON public.venue_addons FOR SELECT
  USING (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.venues venue
      WHERE venue.id = venue_id
        AND venue.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Venue managers manage addons" ON public.venue_addons;
CREATE POLICY "Venue managers manage addons"
  ON public.venue_addons FOR ALL TO authenticated
  USING (public.can_manage_venue(venue_id))
  WITH CHECK (public.can_manage_venue(venue_id));

DROP POLICY IF EXISTS "Requesters view selected venue addons" ON public.venue_enquiry_addons;
CREATE POLICY "Requesters view selected venue addons"
  ON public.venue_enquiry_addons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_enquiries enquiry
      WHERE enquiry.id = enquiry_id
        AND (
          enquiry.requester_user_id = auth.uid()
          OR (
            enquiry.requester_email IS NOT NULL
            AND lower(enquiry.requester_email) = lower(auth.jwt() ->> 'email')
          )
          OR public.can_manage_venue(enquiry.venue_id)
        )
    )
  );

DROP POLICY IF EXISTS "Venue managers manage selected addons" ON public.venue_enquiry_addons;
CREATE POLICY "Venue managers manage selected addons"
  ON public.venue_enquiry_addons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_enquiries enquiry
      WHERE enquiry.id = enquiry_id
        AND public.can_manage_venue(enquiry.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venue_enquiries enquiry
      WHERE enquiry.id = enquiry_id
        AND public.can_manage_venue(enquiry.venue_id)
    )
  );

COMMIT;
