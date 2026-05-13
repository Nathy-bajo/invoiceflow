"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";

import { explorerTx, formatUsdc, ONE_USDC } from "@/lib/constants";
import { getProgram } from "@/lib/program";

export function CashOutModal({
  open,
  onClose,
  freelancer,
  invoicePda,
  defaultAmount,
}: {
  open: boolean;
  onClose: () => void;
  freelancer: PublicKey;
  invoicePda: PublicKey;
  defaultAmount: number; // in base units
}) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [accountId, setAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState((defaultAmount / ONE_USDC).toFixed(2));
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;
  const isFreelancer = wallet?.publicKey?.equals(freelancer) ?? false;

  async function submit() {
    if (!wallet) {
      toast.error("Connect your wallet");
      return;
    }
    if (!isFreelancer) {
      toast.error("Only the invoice freelancer can request a payout");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount > 0");
      return;
    }
    if (!accountId.trim() || accountId.length > 64) {
      toast.error("Payout account id must be 1–64 chars");
      return;
    }

    setSubmitting(true);
    try {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
      });
      const program = getProgram(provider);
      const sig = await program.methods
        .requestRaenestPayout(
          new BN(Math.round(amt * ONE_USDC)),
          invoicePda,
          accountId.trim(),
          memo.trim()
        )
        .accountsPartial({ freelancer: wallet.publicKey })
        .rpc();
      toast.success(
        () => (
          <span className="flex items-center gap-3 text-sm">
            Payout intent submitted
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
        { duration: 6000 }
      );
      onClose();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Failed to submit payout";
      toast.error(msg.length > 140 ? msg.slice(0, 140) + "…" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              Cash out to local currency
            </h3>
            <p className="mt-1 text-sm text-ink/60">
              Sign an off-ramp intent. Conversion settles to your linked bank
              account once a backend processes the event.
            </p>
          </div>
          <button
            onClick={onClose}
            className="-m-2 p-2 text-ink/40 hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-inset ring-amber-200">
          <span className="font-medium">v2 preview</span> — emits a signed intent
          on-chain. The off-ramp provider integration is in progress; no funds
          will be disbursed on devnet.
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink/50">
              Amount (USDC)
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
                $
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-ink/15 bg-white py-2 pl-6 pr-3 text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink/50">
              Default: this milestone net (${formatUsdc(defaultAmount)})
            </p>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink/50">
              Payout account id
            </label>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="payout-account-id"
              className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1 text-[11px] text-ink/50">
              Your off-ramp provider's virtual-account identifier. Used by the
              indexer to route funds to your bank.
            </p>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink/50">
              Memo (optional)
            </label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. October retainer · Acme Corp"
              maxLength={200}
              className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-ink/15 bg-white px-4 text-sm hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !isFreelancer}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas hover:bg-accent disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Sign intent"}
          </button>
        </div>
      </div>
    </div>
  );
}
