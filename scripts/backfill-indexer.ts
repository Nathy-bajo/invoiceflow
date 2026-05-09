/**
 * One-shot backfill: reads every Invoice account from the deployed program
 * and inserts/updates the matching row in Postgres. Run once after migrate
 * to populate a fresh DB; safe to re-run any time (upsert is idempotent).
 *
 * Usage:
 *   DATABASE_URL=postgres://... \
 *   SOLANA_RPC_URL=https://api.devnet.solana.com \
 *     npx tsx scripts/backfill-indexer.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import postgres from "postgres";

import idl from "../target/idl/invoiceflow.json";

const DATABASE_URL = process.env.DATABASE_URL;
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(idl.address);

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const coder = new BorshAccountsCoder(idl as unknown as Idl);

function tryDecode(data: Buffer): any | null {
  try {
    return coder.decode("Invoice", data);
  } catch {
    return null;
  }
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, prepare: false });
  const conn = new Connection(RPC, "confirmed");

  console.log("scanning program accounts on", RPC, "...");
  const accs = await conn.getProgramAccounts(PROGRAM_ID);
  console.log("  found", accs.length, "program accounts (incl. non-invoices)");

  let upserted = 0;
  let skipped = 0;
  for (const { pubkey, account } of accs) {
    const decoded = tryDecode(account.data as Buffer);
    if (!decoded) {
      skipped++;
      continue;
    }
    // BorshAccountsCoder returns snake_case keys (raw from IDL).
    if (
      !decoded.funded_at?.toNumber ||
      !decoded.last_release_at?.toNumber ||
      !decoded.dispute_window_seconds?.toString ||
      !decoded.created_at?.toNumber
    ) {
      skipped++;
      continue;
    }
    const status = Object.keys(decoded.status)[0] ?? "unknown";
    const arbiter = decoded.arbiter
      ? (decoded.arbiter as PublicKey).toBase58()
      : null;
    const fundedAt = decoded.funded_at.toNumber();
    const lastReleaseAt = decoded.last_release_at.toNumber();

    await sql`
      INSERT INTO invoices (
        pda, freelancer, client, invoice_id, total_amount, released_amount,
        status, metadata_uri, arbiter, created_at, funded_at, last_release_at,
        dispute_window_seconds, raw_account, indexed_at
      ) VALUES (
        ${pubkey.toBase58()},
        ${decoded.freelancer.toBase58()},
        ${decoded.client.toBase58()},
        ${decoded.invoice_id.toString()},
        ${decoded.total_amount.toString()},
        ${decoded.released_amount.toString()},
        ${status},
        ${decoded.metadata_uri ?? null},
        ${arbiter},
        to_timestamp(${decoded.created_at.toNumber()}),
        ${fundedAt > 0 ? sql`to_timestamp(${fundedAt})` : null},
        ${lastReleaseAt > 0 ? sql`to_timestamp(${lastReleaseAt})` : null},
        ${decoded.dispute_window_seconds.toString()},
        ${Buffer.from(account.data)},
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
    upserted++;
  }

  console.log(`✓ backfill done: ${upserted} upserted, ${skipped} skipped (non-invoice accounts)`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
