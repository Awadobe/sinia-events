ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS party_size INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.invites
DROP CONSTRAINT IF EXISTS invites_party_size_check;

ALTER TABLE public.invites
ADD CONSTRAINT invites_party_size_check CHECK (party_size BETWEEN 1 AND 5);
