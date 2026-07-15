-- 08_security_fixes.sql

-- 1. Fix broken Registrations Update action
-- Add UPDATE policy for registrations so admin check-ins and approvals work
CREATE POLICY "Staff can update registrations" ON registrations
    FOR UPDATE USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

-- 2. Secure the invites table
-- Enable RLS and add basic staff policies
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view invites" ON invites
    FOR SELECT USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

CREATE POLICY "Staff can insert invites" ON invites
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

CREATE POLICY "Staff can update invites" ON invites
    FOR UPDATE USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

CREATE POLICY "Staff can delete invites" ON invites
    FOR DELETE USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

-- 3. Fix privacy leak in profiles
-- Drop the existing public select policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- Create a new policy that only allows public to view safe fields if needed, 
-- or restrict entirely to authenticated staff. Since we might need public profiles 
-- (e.g. for organizer profiles), we can restrict the query columns or just rely on the API.
-- For now, let's create a policy that only staff can view all profiles, 
-- and users can view their own profile.
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" ON profiles
    FOR SELECT USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));

-- Note: if public event pages need organizer info, the API uses service_role key 
-- to fetch it, so RLS won't block the API. This safely prevents direct Supabase JS 
-- client access from the browser leaking all profile info.
