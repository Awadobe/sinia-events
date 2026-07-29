-- Details used by public venue discovery and venue-owner onboarding.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS event_types TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS rules TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS additional_charges TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_venues_event_types
  ON public.venues USING GIN(event_types);

