-- Connect attendee registrations to authenticated Radius accounts.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.registrations AS registration
SET user_id = profile.id
FROM public.profiles AS profile
WHERE registration.user_id IS NULL
  AND lower(registration.email) = lower(profile.email);

CREATE INDEX IF NOT EXISTS idx_registrations_user_id
  ON public.registrations(user_id);

DROP POLICY IF EXISTS "Attendees can view their registrations" ON public.registrations;
CREATE POLICY "Attendees can view their registrations"
  ON public.registrations
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );
