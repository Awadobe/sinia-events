ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS wedding_details JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.update_event_details(
  target_event_id UUID,
  event_patch JSONB
)
RETURNS SETOF public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF event_patch ? 'registration_fields'
     AND jsonb_typeof(event_patch->'registration_fields') <> 'array' THEN
    RAISE EXCEPTION 'registration fields must be a JSON array';
  END IF;
  IF event_patch ? 'wedding_details'
     AND jsonb_typeof(event_patch->'wedding_details') <> 'object' THEN
    RAISE EXCEPTION 'wedding details must be a JSON object';
  END IF;

  RETURN QUERY
  UPDATE public.events AS e
  SET
    title = CASE WHEN event_patch ? 'title' THEN event_patch->>'title' ELSE e.title END,
    description = CASE WHEN event_patch ? 'description' THEN event_patch->>'description' ELSE e.description END,
    event_type = CASE WHEN event_patch ? 'event_type' THEN event_patch->>'event_type' ELSE e.event_type END,
    date = CASE WHEN event_patch ? 'date' THEN (event_patch->>'date')::timestamptz ELSE e.date END,
    end_date = CASE WHEN event_patch ? 'end_date' THEN (event_patch->>'end_date')::timestamptz ELSE e.end_date END,
    location = CASE WHEN event_patch ? 'location' THEN event_patch->>'location' ELSE e.location END,
    is_virtual = CASE WHEN event_patch ? 'is_virtual' THEN (event_patch->>'is_virtual')::boolean ELSE e.is_virtual END,
    virtual_link = CASE WHEN event_patch ? 'virtual_link' THEN event_patch->>'virtual_link' ELSE e.virtual_link END,
    image_url = CASE WHEN event_patch ? 'image_url' THEN event_patch->>'image_url' ELSE e.image_url END,
    max_attendees = CASE WHEN event_patch ? 'max_attendees' THEN (event_patch->>'max_attendees')::integer ELSE e.max_attendees END,
    status = CASE WHEN event_patch ? 'status' THEN event_patch->>'status' ELSE e.status END,
    require_approval = CASE WHEN event_patch ? 'require_approval' THEN (event_patch->>'require_approval')::boolean ELSE e.require_approval END,
    theme_style = CASE WHEN event_patch ? 'theme_style' THEN event_patch->>'theme_style' ELSE e.theme_style END,
    theme_color = CASE WHEN event_patch ? 'theme_color' THEN event_patch->>'theme_color' ELSE e.theme_color END,
    theme_font = CASE WHEN event_patch ? 'theme_font' THEN event_patch->>'theme_font' ELSE e.theme_font END,
    theme_mode = CASE WHEN event_patch ? 'theme_mode' THEN event_patch->>'theme_mode' ELSE e.theme_mode END,
    registration_fields = CASE WHEN event_patch ? 'registration_fields' THEN event_patch->'registration_fields' ELSE e.registration_fields END,
    wedding_details = CASE WHEN event_patch ? 'wedding_details' THEN event_patch->'wedding_details' ELSE e.wedding_details END,
    updated_at = NOW()
  WHERE e.id = target_event_id
  RETURNING e.*;

  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_event_details(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_event_details(UUID, JSONB) TO service_role;
