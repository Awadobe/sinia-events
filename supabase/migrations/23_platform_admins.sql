-- Platform administration is a separate responsibility from organizing
-- events. Legacy staff_allowlist entries must not grant platform-wide access.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_email_unique
  ON public.platform_admins (lower(email));

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view own role" ON public.platform_admins;
CREATE POLICY "Platform admins can view own role"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Replace the broad legacy policies with the dedicated platform role.
DROP POLICY IF EXISTS "Staff can manage events" ON public.events;
CREATE POLICY "Platform admins can manage events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Staff can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Staff can update registrations" ON public.registrations;
CREATE POLICY "Platform admins can view registrations"
  ON public.registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "Platform admins can update registrations"
  ON public.registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Staff can view invites" ON public.invites;
DROP POLICY IF EXISTS "Staff can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Staff can update invites" ON public.invites;
DROP POLICY IF EXISTS "Staff can delete invites" ON public.invites;
CREATE POLICY "Platform admins can manage invites"
  ON public.invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Staff can manage blasts" ON public.blasts;
CREATE POLICY "Platform admins can manage blasts"
  ON public.blasts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE lower(admin.email) = lower(auth.jwt() ->> 'email')
    )
  );
