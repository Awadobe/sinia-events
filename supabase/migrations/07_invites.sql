-- Invites table for tracking event invitations
create table if not exists invites (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references events(id) on delete cascade not null,
    email text not null,
    name text,
    status text default 'sent' check (status in ('sent', 'accepted', 'declined')),
    sent_at timestamptz default now(),
    accepted_at timestamptz,
    created_at timestamptz default now(),
    
    -- Prevent duplicate invites to the same email for the same event
    unique(event_id, email)
);

-- Index for fast lookups
create index if not exists idx_invites_event_id on invites(event_id);
create index if not exists idx_invites_email on invites(email);
