-- Separate full event managers from staff who only check guests in.
ALTER TABLE public.event_collaborators
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager'
  CHECK (role IN ('manager', 'check_in'));

UPDATE public.event_collaborators
SET role = 'manager'
WHERE role IS NULL;
