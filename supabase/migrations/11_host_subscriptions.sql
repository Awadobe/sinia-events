-- Visitors can follow a specific organization or independent organizer by email.
CREATE TABLE IF NOT EXISTS public.host_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, email)
);

CREATE INDEX IF NOT EXISTS idx_host_subscriptions_active
  ON public.host_subscriptions(host_id, status);

ALTER TABLE public.host_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions are handled only by server routes using the service role key.
-- No public table policies are intentionally created, keeping subscriber
-- addresses private from browsers and other subscribers.
