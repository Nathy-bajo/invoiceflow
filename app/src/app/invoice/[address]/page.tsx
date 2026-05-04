"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import toast from "react-hot-toast";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { RaenestPayoutModal } from "@/components/RaenestPayoutModal";
import {
  deriveConfigPda,
  deriveVaultPda,
  getProgram,
  statusToString,
} from "@/lib/program";
import {
  explorerAccount,
  explorerTx,
  formatUsdc,
  shortAddress,
  USDC_MINT,
} from "@/lib/constants";
import { bytesToHex } from "@/lib/hash";

type InvoiceView = {
  pda: PublicKey;
  freelancer: PublicKey;
  client: PublicKey;
  expectedClient: PublicKey | null;
  invoiceId: BN;
  totalAmount: BN;
  releasedAmount: BN;
  status: string;
  createdAt: BN;
  fundedAt: BN;
  lastReleaseAt: BN;
  disputeWindowSeconds: BN;
  milestones: Array<{
    descriptionHash: number[];
    amount: BN;
    approved: boolean;
    released: boolean;
  }>;
};

export default function InvoicePage() {
  const params = useParams<{ address: string }>();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  // Tick the clock once a second so unlock-at countdowns stay live.
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed",
    });
  }, [wallet, connection]);

  const invoicePda = useMemo(() => {
    try {
      return new PublicKey(params.address);
    } catch {
      return null;
    }
  }, [params.address]);

  const reload = useCallback(async () => {
    if (!provider || !invoicePda) return;
    setError(null);
    try {
      const program = getProgram(provider);
      const acc = await program.account.invoice.fetch(invoicePda);
      setInvoice({
        pda: invoicePda,
        freelancer: acc.freelancer,
        client: acc.client,
        expectedClient: acc.expectedClient,
        invoiceId: acc.invoiceId,
        totalAmount: acc.totalAmount,
        releasedAmount: acc.releasedAmount,
        status: statusToString(acc.status),
        createdAt: acc.createdAt,
        fundedAt: acc.fundedAt,
        lastReleaseAt: acc.lastReleaseAt,
        disputeWindowSeconds: acc.disputeWindowSeconds,
        milestones: acc.milestones,
      });
      const [vault] = deriveVaultPda(invoicePda);
      try {
        const v = await getAccount(connection, vault);
        setVaultBalance(Number(v.amount));
      } catch {
        setVaultBalance(0);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [provider, invoicePda, connection]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Make sure a wallet has the USDC ATA we need; create if missing.
  async function ensureAta(owner: PublicKey): Promise<PublicKey> {
    const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
    const info = await connection.getAccountInfo(ata);
    if (info) return ata;
    if (!provider || !wallet) throw new Error("wallet required");
    // The signer pays rent for the ATA — only create ATAs you control.
    const ix = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      ata,
      owner,
      USDC_MINT
    );
    const tx = new (await import("@solana/web3.js")).Transaction().add(ix);
    await provider.sendAndConfirm(tx);
    return ata;
  }

  function txToast(action: string, sig: string) {
    toast.success(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          {action}
          <a
            className="text-accent hover:underline"
            href={explorerTx(sig)}
            target="_blank"
            rel="noopener noreferrer"
          >
            view tx ↗
          </a>
        </span>
      ),
      { duration: 5000 }
    );
  }

  async function handleFund() {
    if (!wallet || !provider || !invoice) return;
    setBusy(true);
    try {
      const program = getProgram(provider);
      const [configPda] = deriveConfigPda();
      const [vault] = deriveVaultPda(invoice.pda);
      const clientAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);
      const sig = await program.methods
        .fundInvoice()
        .accountsPartial({
          client: wallet.publicKey,
          config: configPda,
          acceptedMint: USDC_MINT,
          invoice: invoice.pda,
          vault,
          clientTokenAccount: clientAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      txToast("Invoice funded", sig);
      await reload();
    } catch (e: any) {
      console.error(e);
      toast.error(parseAnchorError(e));
    } finally {
      setBusy(false);
    }
  }

  async function callRelease(idx: number, auto: boolean) {
    if (!wallet || !provider || !invoice) return;
    setBusy(true);
    try {
      const program = getProgram(provider);
      const [configPda] = deriveConfigPda();
      const [vault] = deriveVaultPda(invoice.pda);
      const config = await program.account.config.fetch(configPda);
      const freelancerAta = await ensureAta(invoice.freelancer);

      const baseAccounts = {
        config: configPda,
        invoice: invoice.pda,
        vault,
        freelancerTokenAccount: freelancerAta,
        treasuryTokenAccount: config.treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      const sig = auto
        ? await program.methods
            .autoReleaseAfterTimeout(idx)
            .accountsPartial({ caller: wallet.publicKey, ...baseAccounts })
            .rpc()
        : await program.methods
            .approveMilestone(idx)
            .accountsPartial({ client: wallet.publicKey, ...baseAccounts })
            .rpc();
      txToast(
        auto ? `Milestone ${idx + 1} auto-released` : `Milestone ${idx + 1} approved`,
        sig
      );
      await reload();
    } catch (e: any) {
      console.error(e);
      toast.error(parseAnchorError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDispute(raise: boolean) {
    if (!wallet || !provider || !invoice) return;
    setBusy(true);
    try {
      const program = getProgram(provider);
      const sig = raise
        ? await program.methods
            .raiseDispute()
            .accountsPartial({ client: wallet.publicKey, invoice: invoice.pda })
            .rpc()
        : await program.methods
            .resolveDispute()
            .accountsPartial({ client: wallet.publicKey, invoice: invoice.pda })
            .rpc();
      txToast(raise ? "Dispute raised" : "Dispute resolved", sig);
      await reload();
    } catch (e: any) {
      console.error(e);
      toast.error(parseAnchorError(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <div className="font-medium">Couldn't load invoice</div>
            <p className="mt-1">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="mt-8 h-32" />
        </main>
        <Footer />
      </div>
    );
  }

  const isFreelancer = wallet?.publicKey?.equals(invoice.freelancer) ?? false;
  const isClient = wallet?.publicKey?.equals(invoice.client) ?? false;
  const isAssignableClient =
    !isClient &&
    invoice.status === "open" &&
    (!invoice.expectedClient ||
      (wallet?.publicKey?.equals(invoice.expectedClient) ?? false));

  const baseline = Math.max(
    invoice.fundedAt.toNumber(),
    invoice.lastReleaseAt.toNumber()
  );
  const unlockAt = baseline + invoice.disputeWindowSeconds.toNumber();
  const secondsToUnlock = Math.max(0, unlockAt - now);
  const totalReleasedPct =
    invoice.totalAmount.toNumber() > 0
      ? Math.round(
          (invoice.releasedAmount.toNumber() / invoice.totalAmount.toNumber()) * 100
        )
      : 0;

  function fmtTimer(s: number): string {
    if (s <= 0) return "now";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function fmtDate(unix: number): string {
    if (!unix) return "—";
    return new Date(unix * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Invoice #{invoice.invoiceId.toString()}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <a
              href={explorerAccount(invoice.pda.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-ink/50 hover:text-accent"
            >
              {shortAddress(invoice.pda.toBase58(), 8)} ↗
            </a>
          </div>

          <div className="flex items-center gap-2">
            {isAssignableClient && (
              <button
                onClick={handleFund}
                disabled={busy}
                className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas hover:bg-accent disabled:opacity-50"
              >
                {busy
                  ? "Working…"
                  : `Fund $${formatUsdc(invoice.totalAmount.toNumber())}`}
              </button>
            )}
            {isClient && invoice.status === "funded" && (
              <button
                onClick={() => handleDispute(true)}
                disabled={busy}
                className="h-10 rounded-lg border border-ink/15 bg-white px-4 text-sm hover:bg-ink/5 disabled:opacity-50"
              >
                Raise dispute
              </button>
            )}
            {isClient && invoice.status === "disputed" && (
              <button
                onClick={() => handleDispute(false)}
                disabled={busy}
                className="h-10 rounded-lg border border-ink/15 bg-white px-4 text-sm hover:bg-ink/5 disabled:opacity-50"
              >
                Resolve dispute
              </button>
            )}
            {isFreelancer && invoice.releasedAmount.toNumber() > 0 && (
              <button
                onClick={() => setPayoutOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 text-sm font-medium text-accent hover:bg-accent hover:text-canvas"
                title="v2 preview: convert USDC to NGN via Raenest"
              >
                <span className="text-xs">🇳🇬</span> Convert to NGN
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-ink/50">Progress</span>
            <span className="text-sm tabular-nums text-ink/70">
              ${formatUsdc(invoice.releasedAmount.toNumber())} of $
              {formatUsdc(invoice.totalAmount.toNumber())}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/5">
            <div
              className="h-full bg-gradient-to-r from-accent to-teal transition-[width] duration-500"
              style={{ width: `${totalReleasedPct}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Vault" value={`$${formatUsdc(vaultBalance ?? 0)}`} />
          <Stat
            label={
              invoice.status === "funded"
                ? "Next unlock"
                : invoice.status === "disputed"
                  ? "Paused"
                  : "Window"
            }
            value={invoice.status === "funded" ? fmtTimer(secondsToUnlock) : "—"}
          />
          <Stat label="Created" value={fmtDate(invoice.createdAt.toNumber())} />
          <Stat label="Funded" value={fmtDate(invoice.fundedAt.toNumber())} />
        </section>

        {/* Parties */}
        <section className="mt-4 rounded-xl border border-ink/10 bg-white">
          <div className="grid grid-cols-1 divide-y divide-ink/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Party
              role="Freelancer"
              addr={invoice.freelancer.toBase58()}
              isYou={isFreelancer}
            />
            <Party
              role="Client"
              addr={
                invoice.client.equals(PublicKey.default)
                  ? (invoice.expectedClient?.toBase58() ?? null)
                  : invoice.client.toBase58()
              }
              isYou={isClient}
              hint={
                invoice.client.equals(PublicKey.default)
                  ? invoice.expectedClient
                    ? "expected"
                    : "unassigned (open invoice)"
                  : null
              }
            />
          </div>
        </section>

        {/* Milestones timeline */}
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink/60">
            Milestones
          </h2>
          <ol className="mt-3 space-y-3">
            {invoice.milestones.map((m, idx) => {
              const canApprove =
                isClient &&
                !m.released &&
                (invoice.status === "funded" || invoice.status === "disputed");
              const canAuto =
                !m.released && invoice.status === "funded" && secondsToUnlock <= 0;
              return (
                <li
                  key={idx}
                  className="relative flex items-stretch gap-4 overflow-hidden rounded-xl border border-ink/10 bg-white p-4"
                >
                  {/* Timeline rail */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                        m.released ? "bg-accent text-canvas" : "bg-ink/5 text-ink/60"
                      }`}
                    >
                      {m.released ? "✓" : idx + 1}
                    </div>
                    {idx < invoice.milestones.length - 1 && (
                      <div
                        className={`mt-1 w-px flex-1 ${m.released ? "bg-accent/40" : "bg-ink/10"}`}
                      />
                    )}
                  </div>

                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        Milestone {idx + 1}
                        <span className="ml-2 text-ink/60">
                          · ${formatUsdc(m.amount.toNumber())}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-ink/40">
                        sha256: {bytesToHex(m.descriptionHash).slice(0, 32)}…
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.released && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          released
                        </span>
                      )}
                      {canApprove && (
                        <button
                          onClick={() => callRelease(idx, false)}
                          disabled={busy}
                          className="h-8 rounded-md bg-ink px-3 text-xs font-medium text-canvas hover:bg-accent disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {canAuto && (
                        <button
                          onClick={() => callRelease(idx, true)}
                          disabled={busy}
                          className="h-8 rounded-md border border-ink/15 bg-white px-3 text-xs hover:bg-ink/5 disabled:opacity-50"
                        >
                          Auto-release
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Share link panel */}
        {invoice.status === "open" && (
          <section className="mt-8 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">
              Share this invoice
            </div>
            <p className="mt-2 text-sm text-ink/70">
              Send the link to your client. They connect their wallet and fund the full
              amount in one click.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs">
                {typeof window !== "undefined" ? window.location.href : ""}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="h-7 shrink-0 rounded bg-ink px-2.5 text-[11px] font-medium text-canvas hover:bg-accent"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <RaenestPayoutModal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        freelancer={invoice.freelancer}
        invoicePda={invoice.pda}
        defaultAmount={Math.floor(
          invoice.releasedAmount.toNumber() * 0.995 // approx net of 0.5% fee
        )}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink/50">{label}</div>
      <div className="mt-1 text-base font-medium tabular-nums">{value}</div>
    </div>
  );
}

function Party({
  role,
  addr,
  isYou,
  hint,
}: {
  role: string;
  addr: string | null;
  isYou: boolean;
  hint?: string | null;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink/50">{role}</span>
        {isYou && (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            you
          </span>
        )}
      </div>
      {addr ? (
        <a
          href={explorerAccount(addr)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block font-mono text-xs text-ink/80 hover:text-accent"
        >
          {shortAddress(addr, 8)}
        </a>
      ) : (
        <div className="mt-1 text-xs italic text-ink/40">{hint ?? "—"}</div>
      )}
      {hint && addr && <div className="mt-0.5 text-[11px] text-ink/40">({hint})</div>}
    </div>
  );
}

function parseAnchorError(e: any): string {
  const msg = e?.message ?? String(e);
  // Anchor wraps program errors as "Error Code: X. Error Number: Y. Error Message: ..."
  const m = /Error Message: ([^.]+)\./.exec(msg);
  if (m) return m[1];
  // User rejection
  if (/User rejected/i.test(msg)) return "Transaction rejected";
  if (msg.length > 140) return msg.slice(0, 140) + "…";
  return msg;
}
