import { Connection, PublicKey } from "@solana/web3.js";
import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";

import idl from "@/idl/invoiceflow.json";
import { PROGRAM_ID } from "@/lib/constants";
import type { IndexedInvoice } from "./types";

/** Server-side RPC. Falls back to the public devnet endpoint when no private
 *  RPC is configured — fine for low traffic, gets throttled at scale, which
 *  is exactly the problem the cache + webhook layer in front of us solves. */
const SERVER_RPC =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
  "https://api.devnet.solana.com";

const coder = new BorshAccountsCoder(idl as unknown as Idl);

function statusToString(status: any): string {
  if (!status) return "unknown";
  return Object.keys(status)[0] ?? "unknown";
}

/**
 * Try-decode an account buffer into an Invoice. Returns null on any
 * failure — that's the whole point: program upgrades change the layout
 * and we don't want stale accounts crashing the dashboard.
 */
function tryDecode(data: Buffer): any | null {
  try {
    return coder.decode("invoice", data);
  } catch {
    return null;
  }
}

function buildRow(
  pubkey: PublicKey,
  acc: any,
  role: "freelancer" | "client"
): IndexedInvoice {
  return {
    pda: pubkey.toBase58(),
    invoiceId: acc.invoiceId.toString(),
    totalAmount: acc.totalAmount.toNumber(),
    releasedAmount: acc.releasedAmount.toNumber(),
    status: statusToString(acc.status),
    client: acc.client.toBase58(),
    freelancer: acc.freelancer.toBase58(),
    role,
  };
}

/**
 * The single hot read path. Two filtered `getProgramAccounts` calls — one
 * for invoices where the wallet is the freelancer (offset 8), one where the
 * wallet is the client (offset 8 + 32). Decoded with a per-account
 * try/catch so any account written under an older Invoice layout silently
 * drops out of the result instead of poisoning the whole response.
 *
 * Designed to be wrapped in a Vercel cache (`unstable_cache`) — this
 * function itself does no caching.
 */
export async function fetchInvoicesForWallet(
  walletBase58: string
): Promise<IndexedInvoice[]> {
  let walletKey: PublicKey;
  try {
    walletKey = new PublicKey(walletBase58);
  } catch {
    throw new Error(`invalid wallet pubkey: ${walletBase58}`);
  }

  const connection = new Connection(SERVER_RPC, "confirmed");

  const [asFreelancer, asClient] = await Promise.all([
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8, bytes: walletKey.toBase58() } },
      ],
    }),
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8 + 32, bytes: walletKey.toBase58() } },
      ],
    }),
  ]);

  return [
    ...asFreelancer.flatMap(({ pubkey, account }) => {
      const dec = tryDecode(account.data as Buffer);
      return dec ? [buildRow(pubkey, dec, "freelancer")] : [];
    }),
    ...asClient.flatMap(({ pubkey, account }) => {
      const dec = tryDecode(account.data as Buffer);
      return dec ? [buildRow(pubkey, dec, "client")] : [];
    }),
  ];
}
