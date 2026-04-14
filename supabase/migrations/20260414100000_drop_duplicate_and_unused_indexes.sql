-- Drop duplicate unique constraint (booking_email_logs_upsert_key is the canonical one)
ALTER TABLE public.booking_email_logs
  DROP CONSTRAINT IF EXISTS booking_email_logs_booking_id_event_type_recipient_role_key;

-- Drop unused indexes (replaced by proper FK-covering indexes below)
DROP INDEX IF EXISTS public.booking_status_events_actor_user_id_idx;
DROP INDEX IF EXISTS public.booking_email_logs_booking_id_idx;
DROP INDEX IF EXISTS public.booking_email_logs_invoice_id_idx;

-- Composite geo index for map queries
CREATE INDEX IF NOT EXISTS idx_hosts_active_geo
  ON public.hosts (is_active, latitude, longitude)
  WHERE is_active = true;
