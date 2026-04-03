-- =============================================
-- Migration: Stripe webhook events for idempotency
-- Data: 2026-04-01
-- Execute este script no SQL Editor do Supabase
-- =============================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_created
  ON stripe_webhook_events(status, created_at DESC);
