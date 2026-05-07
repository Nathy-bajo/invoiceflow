/**
 * One-shot migration script for the InvoiceFlow indexer DB.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-indexer.ts
 *
 * Idempotent — applies CREATE TABLE / CREATE INDEX with `IF NOT EXISTS`.
 * Run once after pointing at a new DB, and after pulling any schema change.
 */

import fs from "node:fs";
import path from "node:path";

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "app",
  "src",
  "lib",
  "indexer",
  "schema.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, prepare: false });
  try {
    const ddl = fs.readFileSync(SCHEMA_PATH, "utf-8");
    await sql.unsafe(ddl);
    const [{ count }] = (await sql<{ count: string }[]>`
      SELECT count(*)::text FROM invoices
    `) as unknown as { count: string }[];
    console.log("✓ migrated; rows in invoices table:", count);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
