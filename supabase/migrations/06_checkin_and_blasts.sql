-- Migration: Event Management Dashboard
-- 1. Add check-in tracking to registrations
-- 2. Create blasts table for email blast history

-- Add check-in columns to registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Create blasts table
CREATE TABLE IF NOT EXISTS public.blasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_blasts_event_id ON public.blasts (event_id);

-- RLS for blasts
ALTER TABLE public.blasts ENABLE ROW LEVEL SECURITY;

-- Staff can manage blasts
CREATE POLICY "Staff can manage blasts"
  ON public.blasts
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist)
  );
