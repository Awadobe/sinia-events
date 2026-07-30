-- Optional YouTube walkthrough for venue profiles.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS video_url TEXT;

