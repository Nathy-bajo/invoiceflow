"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonRow } from "@/components/Skeleton";
import { getProgram, statusToString } from "@/lib/program";
import { formatUsdc, PROGRAM_ID, shortAddress } from "@/lib/constants";

type InvoiceRow = {
  pda: string;
  invoiceId: string;
  totalAmount: number;
  releasedAmount: number;
  status: string;
  client: string;
  freelancer: string;
  role: "freelancer" | "client";
};

export default function Home() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed",
    });
  }, [wallet, connection]);

  useEffect(() => {
    if (!provider || !wallet) {
      setRows(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const program = getProgram(provider);
        // Fetch invoices where the connected wallet is freelancer OR client.
        // We fetch raw program accounts and decode each one inside try/catch so
        // accounts created against an older Invoice struct (before metadata_uri
        // was added) get silently skipped instead of crashing the whole list.
        const decode = (data: Buffer) => {
          try {
            return program.coder.accounts.decode("invoice", data) as any;
          } catch {
            return null;
          }
        };

        const [asFreelancer, asClient] = await Promise.all([
          connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
              { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
            ],
          }),
          connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
              { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } },
            ],
          }),
        ]);
        if (cancelled) return;

        const buildRow = (
          pubkey: PublicKey,
          acc: any,
          role: "freelancer" | "client"
        ): InvoiceRow => ({
          pda: pubkey.toBase58(),
          invoiceId: acc.invoiceId.toString(),
          totalAmount: acc.totalAmount.toNumber(),
          releasedAmount: acc.releasedAmount.toNumber(),
          status: statusToString(acc.status),
          client: acc.client.toBase58(),
          freelancer: acc.freelancer.toBase58(),
          role,
        });

        const merged: InvoiceRow[] = [
          ...asFreelancer.flatMap(({ pubkey, account }) => {
            const dec = decode(account.data);
            return dec ? [buildRow(pubkey, dec, "freelancer")] : [];
          }),
          ...asClient.flatMap(({ pubkey, account }) => {
            const dec = decode(account.data);
            return dec ? [buildRow(pubkey, dec, "client")] : [];
          }),
        ];
        setRows(merged);
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, wallet, connection]);

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
