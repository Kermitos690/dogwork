-- Add connected_account_id and processing_status to billing_events for Connect traceability
ALTER TABLE public.billing_events 
  ADD COLUMN IF NOT EXISTS connected_account_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS processing_error text DEFAULT NULL;

-- Add index for faster lookups by connected account
CREATE INDEX IF NOT EXISTS idx_billing_events_connected_account 
  ON public.billing_events(connected_account_id) WHERE connected_account_id IS NOT NULL;