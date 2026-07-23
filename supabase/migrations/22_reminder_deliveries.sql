-- Prevent an hourly scheduler retry or timing overlap from sending the same
-- reminder to the same attendee more than once.
CREATE TABLE IF NOT EXISTS public.reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reminder_deliveries_once
  ON public.reminder_deliveries (event_id, lower(email), reminder_type);

ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;
