import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Helius-compatible webhook receiver.
 *
 * Configure in Helius dashboard:
 *   - Webhook URL: https://<your-vercel>.vercel.app/api/webhook
 *   - Account addresses: [DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ]
 *   - Webhook type: Enhanced
 *   - Authorization header: HELIUS_WEBHOOK_SECRET (set in Vercel env vars)
 *
 * On any program-touching transaction Helius POSTs the parsed payload here.
 * We don't actually parse the body — we just bust the per-wallet invoice
 * cache so the next dashboard load reflects the change. Over-invalidation
 * is fine; the cost is one re-fetch per cache window.
 *
 * If the secret env var isn't set we accept all requests (dev mode). In
 * prod the secret is required — the endpoint refuses unsigned calls.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization") ?? "";
    // Helius sends the configured value as the raw header; we also accept
    // the `Bearer <secret>` form so curl tests with -H "Authorization:
    // Bearer XXX" also work during setup.
    if (provided !== secret && provided !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Touch the body so Helius doesn't see a hung request, but we don't act
  // on the contents — the cache invalidation is tag-wide.
  await req.text().catch(() => "");

  revalidateTag("invoices");
  return NextResponse.json({
    ok: true,
    revalidated: ["invoices"],
    at: new Date().toISOString(),
  });
}

/** Lightweight liveness check Helius uses on webhook setup. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "invoiceflow-indexer-webhook",
  });
}
