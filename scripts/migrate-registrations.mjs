#!/usr/bin/env node

/**
 * Direct PostgreSQL migration runner for Supabase
 * Connects to the Supabase PostgreSQL database directly and runs DDL.
 */

import pg from 'pg';
const { Client } = pg;

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
const PROJECT_REF = 'wipliylxgzeyxcundegv';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '';

// Use the pooler connection (port 6543) or direct (port 5432)
const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

// If no password, try using the service role key approach via psql-compatible URL
const client = new Client({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD || 'postgres',
  ssl: { rejectUnauthorized: false },
});

const SQL = `
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

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations (event_id);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can register for events" ON registrations;
  DROP POLICY IF EXISTS "Staff can view registrations" ON registrations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Anyone can register for events"
  ON registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view registrations"
  ON registrations FOR SELECT
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM staff_allowlist));
`;

async function run() {
  console.log('🚀 Connecting to Supabase PostgreSQL...');
  try {
    await client.connect();
    console.log('✅ Connected. Running migration...\n');
    await client.query(SQL);
    console.log('✅ Migration completed successfully!');
    console.log('   - registrations table created');
    console.log('   - Index on event_id created');
    console.log('   - RLS policies applied');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.log('\n💡 You need to set SUPABASE_DB_PASSWORD in .env.local');
      console.log('   Find it in: Supabase Dashboard > Settings > Database > Connection string');
    }
  } finally {
    await client.end();
  }
}

run();
