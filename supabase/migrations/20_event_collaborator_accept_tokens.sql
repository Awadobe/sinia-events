-- Give each event-team assignment a private link used by the authentication
-- email to verify the invited address and open the correct workspace.
ALTER TABLE public.event_collaborators
  ADD COLUMN IF NOT EXISTS accept_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_collaborators_accept_token
  ON public.event_collaborators(accept_token);
