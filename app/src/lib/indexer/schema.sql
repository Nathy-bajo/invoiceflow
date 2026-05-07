-- InvoiceFlow indexer schema. Run via `npm run migrate:indexer` against
-- whatever Postgres-compatible DB you point DATABASE_URL at (Neon, Vercel
-- Postgres, Supabase, plain self-hosted, all work).
--
-- Schema is conservative: we keep the decoded-and-shaped fields the
-- dashboard needs for fast queries, plus the raw account bytes so a future
-- program upgrade that adds new fields can be re-decoded without re-scanning
-- the chain.

CREATE TABLE IF NOT EXISTS invoices (
  pda                     VARCHAR(44) PRIMARY KEY,
  freelancer              VARCHAR(44) NOT NULL,
  client                  VARCHAR(44) NOT NULL,
  invoice_id              BIGINT      NOT NULL,
  total_amount            BIGINT      NOT NULL,
  released_amount         BIGINT      NOT NULL,
  status                  VARCHAR(20) NOT NULL,
  metadata_uri            TEXT,
  arbiter                 VARCHAR(44),
  created_at              TIMESTAMPTZ NOT NULL,
  funded_at               TIMESTAMPTZ,
  last_release_at         TIMESTAMPTZ,
  dispute_window_seconds  BIGINT      NOT NULL,
  raw_account             BYTEA       NOT NULL,
  indexed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot lookup paths: the dashboard filters by the connected wallet on either side.
CREATE INDEX IF NOT EXISTS idx_invoices_freelancer ON invoices (freelancer);
CREATE INDEX IF NOT EXISTS idx_invoices_client      ON invoices (client);

-- Cheap supplementary indexes for "open invoices", admin views, etc.
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at  ON invoices (created_at DESC);
