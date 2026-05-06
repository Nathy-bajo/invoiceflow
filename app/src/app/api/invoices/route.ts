import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { dbConfigured } from "@/lib/indexer/db";
import { getInvoicesForWallet } from "@/lib/indexer/repository";
import { fetchInvoicesForWallet as fetchFromChain } from "@/lib/indexer/fetcher";
import type { InvoicesResponse } from "@/lib/indexer/types";

const CACHE_TTL_SECONDS = 60;

/**
 * Two read modes:
 *   1. DB-backed (when DATABASE_URL is set): Postgres SELECT with O(matched-rows)
 *      cost regardless of program total. Updated by /api/webhook on every
 *      program-touching tx, so freshness is "Helius-relay latency" — typically
 *      1–3 seconds.
 *   2. Chain-direct fallback (when DATABASE_URL is unset): same logic as the
 *      pre-Postgres indexer — two filtered getProgramAccounts calls wrapped
 *      in a 60s server cache. Works out of the box without provisioning a DB.
 */
const fetchChainCached = unstable_cache(
  (wallet: string) => fetchFromChain(wallet),
  ["invoices-by-wallet"],
  { tags: ["invoices"], revalidate: CACHE_TTL_SECONDS }
);

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json(
      { error: "missing ?wallet=<pubkey>" },
      { status: 400 }
    );
  }

  try {
    const useDb = dbConfigured();
    const invoices = useDb
      ? await getInvoicesForWallet(wallet)
      : await fetchChainCached(wallet);

    const body: InvoicesResponse = {
      invoices,
      cachedAt: new Date().toISOString(),
      ttlSeconds: useDb ? 0 : CACHE_TTL_SECONDS,
      fromCache: !useDb,
    };
    return NextResponse.json(body, {
      headers: useDb
        ? {
            // DB reads are fresh — let CDNs hold them briefly to absorb
            // bursts but not so long that recently-changed invoices linger.
            "cache-control": "public, s-maxage=10, stale-while-revalidate=30",
          }
        : {
            "cache-control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 4}`,
          },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "fetch failed" },
      { status: 502 }
    );
  }
}
