import { PublicKey } from "@solana/web3.js";

import { db } from "./db";
import type { IndexedInvoice } from "./types";

type DbRow = {
  pda: string;
  freelancer: string;
  client: string;
  invoice_id: string; // pg returns BIGINT as string
  total_amount: string;
  released_amount: string;
  status: string;
  metadata_uri: string | null;
  arbiter: string | null;
  created_at: Date;
  funded_at: Date | null;
  last_release_at: Date | null;
  dispute_window_seconds: string;
};

/**
 * Read path: every invoice the wallet is freelancer OR client on, ordered
 * newest-first. This is the query the dashboard calls every time someone
 * connects a wallet — the indexes on `freelancer` and `client` keep it
 * O(matched rows) regardless of the program's total invoice count.
 */
export async function getInvoicesForWallet(
  walletBase58: string
): Promise<IndexedInvoice[]> {
  // Validate format before hitting the DB.
  try {
    new PublicKey(walletBase58);
  } catch {
    throw new Error(`invalid wallet pubkey: ${walletBase58}`);
  }

  const sql = db();
  const rows = (await sql<DbRow[]>`
    SELECT pda, freelancer, client, invoice_id, total_amount,
           released_amount, status, metadata_uri, arbiter,
           created_at, funded_at, last_release_at, dispute_window_seconds
    FROM invoices
    WHERE freelancer = ${walletBase58} OR client = ${walletBase58}
    ORDER BY created_at DESC
  `) as unknown as DbRow[];

  // The dashboard wants per-row role labels — same row appears once with
  // role=freelancer if the wallet is freelancer, or role=client otherwise.
  // (A wallet can't be both on the same invoice — disjoint at the protocol.)
  return rows.map((r) => ({
    pda: r.pda,
    invoiceId: r.invoice_id,
    totalAmount: Number(r.total_amount),
    releasedAmount: Number(r.released_amount),
    status: r.status,
    client: r.client,
    freelancer: r.freelancer,
    role: r.freelancer === walletBase58 ? "freelancer" : "client",
  }));
}

/**
 * Write path: idempotent upsert, called by both the webhook handler (one
 * row per touched invoice per program tx) and the backfill script (one row
 * per program account on first deploy).
 *
 * Takes a decoded Anchor `Invoice` plus the raw account bytes — we store
 * both because the decoded fields are queryable but the raw bytes future-
 * proof us against new program-side fields we don't know about yet.
 */
export async function upsertInvoice(
  pda: string,
  decoded: any,
  rawAccount: Uint8Array
): Promise<void> {
  const sql = db();
  const status = Object.keys(decoded.status)[0] ?? "unknown";
  const arbiter = decoded.arbiter
    ? (decoded.arbiter as PublicKey).toBase58()
    : null;
  const metadataUri = decoded.metadataUri ?? null;
  const fundedAt = decoded.fundedAt.toNumber();
  const lastReleaseAt = decoded.lastReleaseAt.toNumber();

  await sql`
    INSERT INTO invoices (
      pda, freelancer, client, invoice_id, total_amount, released_amount,
      status, metadata_uri, arbiter, created_at, funded_at, last_release_at,
      dispute_window_seconds, raw_account, indexed_at
    ) VALUES (
      ${pda},
      ${decoded.freelancer.toBase58()},
      ${decoded.client.toBase58()},
      ${decoded.invoiceId.toString()},
      ${decoded.totalAmount.toString()},
      ${decoded.releasedAmount.toString()},
      ${status},
      ${metadataUri},
      ${arbiter},
      to_timestamp(${decoded.createdAt.toNumber()}),
      ${fundedAt > 0 ? sql`to_timestamp(${fundedAt})` : null},
      ${lastReleaseAt > 0 ? sql`to_timestamp(${lastReleaseAt})` : null},
      ${decoded.disputeWindowSeconds.toString()},
      ${Buffer.from(rawAccount)},
      now()
    )
    ON CONFLICT (pda) DO UPDATE SET
      freelancer             = EXCLUDED.freelancer,
      client                 = EXCLUDED.client,
      total_amount           = EXCLUDED.total_amount,
      released_amount        = EXCLUDED.released_amount,
      status                 = EXCLUDED.status,
      metadata_uri           = EXCLUDED.metadata_uri,
      arbiter                = EXCLUDED.arbiter,
      funded_at              = EXCLUDED.funded_at,
      last_release_at        = EXCLUDED.last_release_at,
      dispute_window_seconds = EXCLUDED.dispute_window_seconds,
      raw_account            = EXCLUDED.raw_account,
      indexed_at             = now()
  `;
}

/** Used when an invoice account closes (cancel_invoice). Keeps the row but
 *  could optionally hard-delete; for audit trail purposes we keep it. */
export async function markInvoiceCancelled(pda: string): Promise<void> {
  const sql = db();
  await sql`
    UPDATE invoices SET status = 'cancelled', indexed_at = now()
    WHERE pda = ${pda}
  `;
}

export async function countInvoices(): Promise<number> {
  const sql = db();
  const rows = (await sql<{ count: string }[]>`
    SELECT count(*)::text FROM invoices
  `) as unknown as { count: string }[];
  return Number(rows[0]?.count ?? 0);
}
