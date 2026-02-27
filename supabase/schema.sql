-- =============================================================
-- Sinia-Events: Database Schema
-- =============================================================
-- Run this in your Supabase SQL Editor to create the events table.
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  event_type    TEXT NOT NULL,
  date          TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ,
  location      TEXT,
  is_virtual    BOOLEAN NOT NULL DEFAULT FALSE,
  virtual_link  TEXT,
  image_url     TEXT,
  max_attendees INTEGER,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  slug          TEXT UNIQUE NOT NULL,
  theme_style   TEXT NOT NULL DEFAULT 'modern',
  theme_color   TEXT NOT NULL DEFAULT 'zinc',
  theme_font    TEXT NOT NULL DEFAULT 'inter',
  theme_mode    TEXT NOT NULL DEFAULT 'light',
  require_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on slug for fast public URL lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON events (slug);

-- Index on date for event listings sorted by date
CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);

-- Index on status for filtering published events
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);

-- Auto-update `updated_at` on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (enable, then add policies as needed)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public read access for published events
CREATE POLICY "Public can view published events"
  ON events
  FOR SELECT
  USING (status = 'published');

-- staff_allowlist table for admin access
CREATE TABLE IF NOT EXISTS staff_allowlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff_allowlist ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view the allowlist (optional, adjust as needed)
CREATE POLICY "Public can view staff allowlist"
  ON staff_allowlist FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can manage events ONLY IF their email is in the allowlist
CREATE POLICY "Staff can manage events"
  ON events
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist)
  );

-- =============================================================
-- Registrations table (Sprint 1B)
-- =============================================================

CREATE TABLE IF NOT EXISTS registrations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  status     TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, email)
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations (event_id);

-- RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Public can insert registrations (for the registration form)
CREATE POLICY "Anyone can register for events"
  ON registrations
  FOR INSERT
  WITH CHECK (true);

-- Staff can view all registrations
CREATE POLICY "Staff can view registrations"
  ON registrations
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist)
  );
