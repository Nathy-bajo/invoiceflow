"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import toast from "react-hot-toast";

import { explorerTx, FEE_BPS, formatUsdc, ONE_USDC, USDC_MINT } from "@/lib/constants";
import { deriveConfigPda, deriveVaultPda, getProgram } from "@/lib/program";

export function ArbiterModal({
  open,
  onClose,
  invoicePda,
  freelancer,
  client,
  vaultBalance,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  invoicePda: PublicKey;
  freelancer: PublicKey;
  client: PublicKey;
  vaultBalance: number; // in base units
  onResolved: () => void;
}) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [refund, setRefund] = useState((vaultBalance / ONE_USDC / 2).toFixed(2));
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const refundUnits = Math.max(
    0,
    Math.min(vaultBalance, Math.round(parseFloat(refund || "0") * ONE_USDC))
  );
  const freelancerGross = vaultBalance - refundUnits;
  const fee = Math.floor((freelancerGross * FEE_BPS) / 10_000);
  const freelancerNet = freelancerGross - fee;

  async function ensureAta(owner: PublicKey, signer: PublicKey): Promise<PublicKey> {
    const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
    const info = await connection.getAccountInfo(ata);
    if (info) return ata;
    if (!wallet) throw new Error("wallet required");
    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed",
    });
    const ix = createAssociatedTokenAccountInstruction(signer, ata, owner, USDC_MINT);
    const tx = new (await import("@solana/web3.js")).Transaction().add(ix);
    await provider.sendAndConfirm(tx);
    return ata;
  }

  async function submit() {
    if (!wallet) {
      toast.error("Connect your wallet");
      return;
    }
    if (refundUnits < 0 || refundUnits > vaultBalance) {
      toast.error("Refund must be between $0 and the vault balance");
      return;
    }

    setSubmitting(true);
    try {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
      });
      const program = getProgram(provider);
      const [configPda] = deriveConfigPda();
      const [vault] = deriveVaultPda(invoicePda);
      const config = await program.account.config.fetch(configPda);

      // Ensure both destination ATAs exist (the arbiter signs + pays rent if missing).
      const [freelancerAta, clientAta] = await Promise.all([
        ensureAta(freelancer, wallet.publicKey),
        ensureAta(client, wallet.publicKey),
      ]);

      const sig = await program.methods
        .arbiterResolve(new BN(refundUnits))
        .accountsPartial({
          arbiter: wallet.publicKey,
          config: configPda,
          invoice: invoicePda,
          vault,
          freelancerTokenAccount: freelancerAta,
          clientTokenAccount: clientAta,
          treasuryTokenAccount: config.treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      toast.success(
        () => (
          <span className="flex items-center gap-3 text-sm">
            Dispute arbitrated
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
      onResolved();
      onClose();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Arbitration failed";
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
              Arbitrate dispute
            </h3>
            <p className="mt-1 text-sm text-ink/60">
              Split the remaining vault balance between client and freelancer.
              Decision is final and on-chain.
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

        <div className="mt-5">
          <label className="block text-[11px] uppercase tracking-wider text-ink/50">
            Refund to client (USDC) — vault has ${formatUsdc(vaultBalance)}
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
              $
            </span>
            <input
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-ink/15 bg-white py-2 pl-6 pr-3 text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded bg-ink/5 px-2 py-0.5 text-[11px] hover:bg-ink/10"
              onClick={() => setRefund("0")}
            >
              0% (all to freelancer)
            </button>
            <button
              type="button"
              className="rounded bg-ink/5 px-2 py-0.5 text-[11px] hover:bg-ink/10"
              onClick={() => setRefund((vaultBalance / ONE_USDC / 2).toFixed(2))}
            >
              50/50
            </button>
            <button
              type="button"
              className="rounded bg-ink/5 px-2 py-0.5 text-[11px] hover:bg-ink/10"
              onClick={() => setRefund((vaultBalance / ONE_USDC).toFixed(2))}
            >
              100% (full refund)
            </button>
          </div>
        </div>

        <dl className="mt-5 space-y-2 rounded-lg bg-canvas/50 p-3 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-ink/60">Refund to client</dt>
            <dd className="font-medium">${formatUsdc(refundUnits)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/60">
              Freelancer net (after {(FEE_BPS / 100).toFixed(2)}% fee)
            </dt>
            <dd className="font-medium">${formatUsdc(freelancerNet)}</dd>
          </div>
          <div className="flex justify-between text-xs text-ink/40">
            <dt>Protocol fee</dt>
            <dd>${formatUsdc(fee)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-ink/15 bg-white px-4 text-sm hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas hover:bg-accent disabled:opacity-50"
          >
            {submitting ? "Arbitrating…" : "Sign + resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}
