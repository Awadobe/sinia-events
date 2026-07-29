ALTER TABLE public.invites
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.invites
DROP CONSTRAINT IF EXISTS invites_status_check;

ALTER TABLE public.invites
ADD CONSTRAINT invites_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'declined'));

ALTER TABLE public.invites
ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.invites
DROP CONSTRAINT IF EXISTS invites_party_size_check;

ALTER TABLE public.invites
ADD CONSTRAINT invites_party_size_check
CHECK (party_size BETWEEN 1 AND 20);
