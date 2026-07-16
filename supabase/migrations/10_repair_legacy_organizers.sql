-- Repair older organizer accounts that were added to staff_allowlist before
-- profile and host records were created automatically.

INSERT INTO public.profiles (id, email, phone, slug)
SELECT
  user_record.id,
  user_record.email,
  user_record.phone,
  regexp_replace(
    regexp_replace(lower(split_part(user_record.email, '@', 1)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  ) || '-' || LEFT(user_record.id::text, 8)
FROM auth.users user_record
INNER JOIN public.staff_allowlist staff
  ON lower(staff.email) = lower(user_record.email)
WHERE user_record.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles profile WHERE profile.id = user_record.id
  )
ON CONFLICT (id) DO NOTHING;

-- Also repair a profile that exists but has no personal organizer host.
INSERT INTO public.hosts (type, name, slug, created_by)
SELECT
  'individual',
  COALESCE(NULLIF(profile.name, ''), split_part(profile.email, '@', 1), 'Organizer'),
  COALESCE(NULLIF(profile.slug, ''), 'organizer') || '-' || LEFT(profile.id::text, 8),
  profile.id
FROM public.profiles profile
INNER JOIN auth.users user_record ON user_record.id = profile.id
INNER JOIN public.staff_allowlist staff
  ON lower(staff.email) = lower(user_record.email)
WHERE NOT EXISTS (
  SELECT 1 FROM public.hosts host
  WHERE host.type = 'individual' AND host.created_by = profile.id
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.host_organizers (host_id, user_id, added_by)
SELECT host.id, host.created_by, host.created_by
FROM public.hosts host
INNER JOIN auth.users user_record ON user_record.id = host.created_by
INNER JOIN public.staff_allowlist staff
  ON lower(staff.email) = lower(user_record.email)
WHERE host.type = 'individual'
  AND host.created_by IS NOT NULL
ON CONFLICT DO NOTHING;
