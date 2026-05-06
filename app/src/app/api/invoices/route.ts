import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { fetchInvoicesForWallet } from "@/lib/indexer/fetcher";
import type { InvoicesResponse } from "@/lib/indexer/types";

const CACHE_TTL_SECONDS = 60;

/**
 * Cached invoice lookup keyed per wallet. Cache lives in Next's data cache
 * (in-memory in dev, Vercel-managed edge cache in prod) and is invalidated
 * either by the natural TTL above or by the `/api/webhook` endpoint when
 * Helius posts a program-touching transaction (tag-based revalidation).
 */
const getCachedInvoices = unstable_cache(
  (wallet: string) => fetchInvoicesForWallet(wallet),
  ["invoices-by-wallet"],
  {
    tags: ["invoices"],
    revalidate: CACHE_TTL_SECONDS,
  }
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
    const invoices = await getCachedInvoices(wallet);
    const body: InvoicesResponse = {
      invoices,
      cachedAt: new Date().toISOString(),
      ttlSeconds: CACHE_TTL_SECONDS,
      // unstable_cache doesn't expose a hit/miss flag, so we treat any
      // successful read as potentially-cached — clients shouldn't rely on it.
      fromCache: true,
    };
    return NextResponse.json(body, {
      headers: {
        // Browser cache hint matches our server cache window; Vercel CDN
        // honors `s-maxage` when we're not behind authenticated routes.
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
