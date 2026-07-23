-- Published does not always mean publicly discoverable. Direct browser access
-- to Supabase must follow the same visibility rules as the Radius API.
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
DROP POLICY IF EXISTS "Public can view published public events" ON public.events;
CREATE POLICY "Public can view published public events"
  ON public.events
  FOR SELECT
  USING (status = 'published' AND visibility = 'public');

-- Signed-in attendees may still load events attached to their own tickets,
-- including unlisted or invite-only events.
DROP POLICY IF EXISTS "Attendees can view registered events" ON public.events;
CREATE POLICY "Attendees can view registered events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.registrations registration
      WHERE registration.event_id = events.id
        AND (
          registration.user_id = auth.uid()
          OR lower(registration.email) = lower(auth.jwt() ->> 'email')
        )
    )
  );
