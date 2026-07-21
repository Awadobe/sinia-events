-- Flexible per-event registration questions and attendee answers.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_registration_fields_is_array'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_registration_fields_is_array
      CHECK (jsonb_typeof(registration_fields) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'registrations_custom_answers_is_object'
      AND conrelid = 'public.registrations'::regclass
  ) THEN
    ALTER TABLE public.registrations
      ADD CONSTRAINT registrations_custom_answers_is_object
      CHECK (jsonb_typeof(custom_answers) = 'object');
  END IF;
END $$;
