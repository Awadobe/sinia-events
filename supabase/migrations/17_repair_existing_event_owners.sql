-- Ensure the original creator of every migrated event is also recognized as
-- an organizer for the event's current host.
INSERT INTO public.host_organizers (host_id, user_id, added_by)
SELECT DISTINCT event.host_id, event.organizer_id, event.organizer_id
FROM public.events AS event
INNER JOIN auth.users AS account ON account.id = event.organizer_id
WHERE event.host_id IS NOT NULL
  AND event.organizer_id IS NOT NULL
ON CONFLICT (host_id, user_id) DO NOTHING;
