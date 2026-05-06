import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Connection, PublicKey } from "@solana/web3.js";
import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";

import idl from "@/idl/invoiceflow.json";
import { PROGRAM_ID } from "@/lib/constants";
import { dbConfigured } from "@/lib/indexer/db";
import { upsertInvoice } from "@/lib/indexer/repository";

/**
 * Helius-compatible webhook receiver.
 *
 * Helius posts an array of transaction objects. For each tx we walk
 * `accountData[].account` (every pubkey involved), filter to ones owned by
 * our program, fetch their current data, decode as Invoice, and upsert into
 * Postgres. Vault PDAs and other non-Invoice program accounts decode-fail
 * silently and get skipped — that's the whole point of the try/catch.
 *
 * Without DATABASE_URL set, we fall back to the original behavior: just
 * bust the chain-fallback cache. That keeps the route useful for users who
 * haven't yet provisioned a DB.
 */

const SERVER_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
  "https://api.devnet.solana.com";

const coder = new BorshAccountsCoder(idl as unknown as Idl);

type HeliusTx = {
  signature?: string;
  accountData?: Array<{ account: string }>;
};

function tryDecode(data: Buffer): any | null {
  try {
    return coder.decode("invoice", data);
  } catch {
    return null;
  }
}

/** Pull every distinct account pubkey out of a Helius payload. */
function extractCandidates(payload: HeliusTx[]): string[] {
  const seen = new Set<string>();
  for (const tx of payload) {
    for (const a of tx.accountData ?? []) {
      if (a.account) seen.add(a.account);
    }
  }
  return [...seen];
}

async function refreshCandidates(candidates: string[]): Promise<{
  upserted: number;
  inspected: number;
}> {
  if (candidates.length === 0) return { upserted: 0, inspected: 0 };
  const conn = new Connection(SERVER_RPC, "confirmed");
  const pubkeys = candidates.map((c) => new PublicKey(c));
  // One batched RPC call instead of N — the public RPC accepts up to 100
  // at a time; tx payloads from Helius typically have <20 accounts.
  const accounts = await conn.getMultipleAccountsInfo(pubkeys);

  let upserted = 0;
  for (let i = 0; i < pubkeys.length; i++) {
    const acc = accounts[i];
    if (!acc) continue;
    if (!acc.owner.equals(PROGRAM_ID)) continue;
    const decoded = tryDecode(acc.data as Buffer);
    if (!decoded) continue; // Vault PDAs, Config, etc. — not an Invoice
    try {
      await upsertInvoice(pubkeys[i].toBase58(), decoded, acc.data);
      upserted++;
    } catch (e) {
      // Don't fail the whole webhook on one bad row.
      console.error("upsert failed for", pubkeys[i].toBase58(), e);
    }
  }
  return { upserted, inspected: candidates.length };
}

export async function POST(req: NextRequest) {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization") ?? "";
    if (provided !== secret && provided !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: HeliusTx[] = [];
  try {
    const raw = await req.json();
    body = Array.isArray(raw) ? raw : [raw];
  } catch {
    body = [];
  }

  // Always bust the chain-fallback cache so the original (no-DB) path stays
  // fresh whether or not the DB code path runs. Cheap.
  revalidateTag("invoices");

  if (!dbConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "cache-only",
      note: "DATABASE_URL not configured; only revalidated server cache",
      receivedTxCount: body.length,
    });
  }

  try {
    const candidates = extractCandidates(body);
    const { upserted, inspected } = await refreshCandidates(candidates);
    return NextResponse.json({
      ok: true,
      mode: "db-backed",
      receivedTxCount: body.length,
      candidates: inspected,
      upserted,
      at: new Date().toISOString(),
    });
  } catch (e: any) {
    // Webhook handlers MUST 200 quickly or Helius retries — log + accept.
    console.error("webhook handler failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "webhook handler error",
      },
      { status: 200 }
    );
  }
}

/** Liveness probe Helius hits during webhook setup. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "invoiceflow-indexer-webhook",
    dbConfigured: dbConfigured(),
  });
}
