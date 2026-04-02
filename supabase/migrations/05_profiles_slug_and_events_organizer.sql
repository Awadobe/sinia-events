-- Migration: Add slug + org_name to profiles, add organizer_id to events
-- This enables per-organizer calendar pages at /calendar/[slug]

-- Add slug and org_name columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_name TEXT;

-- Create index on slug for fast calendar page lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug);

-- Add organizer_id to events to link events to the organizer who created them
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.profiles(id);

-- Create index for fast event lookups by organizer
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events (organizer_id);

-- Update the trigger function so new users get an auto-generated slug from their email
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate a slug from the email (part before @)
  base_slug := lower(split_part(COALESCE(new.email, new.phone, new.id::text), '@', 1));
  -- Remove non-alphanumeric characters
  base_slug := regexp_replace(base_slug, '[^a-z0-9]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure uniqueness by appending a number if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  INSERT INTO public.profiles (id, phone, email, slug)
  VALUES (new.id, new.phone, new.email, final_slug)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    slug = COALESCE(public.profiles.slug, EXCLUDED.slug);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
