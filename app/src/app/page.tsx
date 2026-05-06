"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonRow } from "@/components/Skeleton";
import { formatUsdc, shortAddress } from "@/lib/constants";
import type {
  IndexedInvoice,
  InvoicesResponse,
} from "@/lib/indexer/types";

type InvoiceRow = IndexedInvoice;

export default function Home() {
  const wallet = useAnchorWallet();
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setRows(null);
      return;
    }
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        // Hit our cached indexer endpoint instead of getProgramAccounts
        // direct from the browser. This funnels all reads through one
        // server cache (60s TTL, plus tag-based invalidation from the
        // /api/webhook endpoint when Helius pushes a program update),
        // so public-RPC throttling stays bounded as the program grows.
        const res = await fetch(
          `/api/invoices?wallet=${wallet.publicKey.toBase58()}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const body = (await res.json()) as InvoicesResponse;
        if (cancelled) return;
        setRows(body.invoices);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Hero connected={!!wallet} />
      {!wallet ? (
        <main className="flex-1">
          <HowItWorks />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-ink/60">
                Your invoices
              </h2>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</p>
            </div>
            <Link
              href="/create"
              className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-canvas hover:bg-accent"
            >
              + New invoice
            </Link>
          </div>

          {!rows && !error && (
            <div className="mt-6 overflow-hidden rounded-xl border border-ink/10 bg-white">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}
          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {rows && rows.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-ink/20 bg-white p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-canvas" />
              <h3 className="mt-4 font-medium">No invoices yet</h3>
              <p className="mt-1 text-sm text-ink/60">
                Create your first invoice and share the link with your client.
              </p>
              <Link
                href="/create"
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-canvas hover:bg-accent"
              >
                Create invoice
              </Link>
            </div>
          )}
          {rows && rows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-ink/50">
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Counterparty</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium text-right">Released</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pct =
                      r.totalAmount > 0
                        ? Math.round((r.releasedAmount / r.totalAmount) * 100)
                        : 0;
                    return (
                      <tr
                        key={r.pda + r.role}
                        className="border-t border-ink/5 transition hover:bg-canvas/60"
                      >
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-md bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/70">
                            {r.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {shortAddress(
                            r.role === "freelancer" ? r.client : r.freelancer,
                            6
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-medium tabular-nums">
                          ${formatUsdc(r.totalAmount)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-sm tabular-nums text-ink/80">
                              ${formatUsdc(r.releasedAmount)}
                            </span>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-ink/5">
                              <div
                                className="h-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={r.status} size="sm" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/invoice/${r.pda}`}
                            className="text-accent hover:underline"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}
      <Footer />
    </div>
  );
}
