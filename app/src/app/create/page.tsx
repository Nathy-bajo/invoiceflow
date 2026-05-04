"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  deriveConfigPda,
  deriveInvoicePda,
  deriveVaultPda,
  getProgram,
  newInvoiceId,
} from "@/lib/program";
import { explorerTx, FEE_BPS, ONE_USDC, USDC_MINT } from "@/lib/constants";
import { sha256Bytes } from "@/lib/hash";
import { buildMetadataJson, downloadAsFile } from "@/lib/metadata";

type FormMilestone = { description: string; amount: string };

const DEFAULT_MILESTONES: FormMilestone[] = [
  { description: "Design", amount: "500" },
  { description: "Build", amount: "500" },
  { description: "Ship", amount: "500" },
];

export default function CreatePage() {
  const router = useRouter();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [milestones, setMilestones] = useState<FormMilestone[]>(DEFAULT_MILESTONES);
  const [expectedClient, setExpectedClient] = useState("");
  const [disputeWindowHours, setDisputeWindowHours] = useState("72");
  const [metadataUri, setMetadataUri] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed",
    });
  }, [wallet, connection]);

  const total = milestones.reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
  const fee = (total * FEE_BPS) / 10_000;
  const freelancerNet = total - fee;

  function setMilestone(idx: number, patch: Partial<FormMilestone>) {
    setMilestones((cur) => cur.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }
  function addMilestone() {
    if (milestones.length >= 5) return;
    setMilestones((cur) => [...cur, { description: "", amount: "" }]);
  }
  function removeMilestone(idx: number) {
    if (milestones.length <= 1) return;
    setMilestones((cur) => cur.filter((_, i) => i !== idx));
  }

  function txToast(action: string, sig: string) {
    toast.success(
      () => (
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

  async function handleSubmit() {
    if (!wallet || !provider) {
      toast.error("Connect your wallet first");
      return;
    }
    const cleanMilestones = milestones
      .map((m) => ({
        description: m.description.trim(),
        amount: parseFloat(m.amount),
      }))
      .filter((m) => m.description && !Number.isNaN(m.amount) && m.amount > 0);

    if (cleanMilestones.length === 0) {
      toast.error("Add at least one milestone with description and amount");
      return;
    }
    const windowHours = parseFloat(disputeWindowHours);
    if (!windowHours || windowHours < 1) {
      toast.error("Dispute window must be at least 1 hour");
      return;
    }

    let expected: PublicKey | null = null;
    if (expectedClient.trim()) {
      try {
        expected = new PublicKey(expectedClient.trim());
      } catch {
        toast.error("Invalid client pubkey");
        return;
      }
    }

    const cleanUri = metadataUri.trim();
    if (cleanUri && cleanUri.length > 200) {
      toast.error("Metadata URI must be 200 chars or fewer");
      return;
    }

    setSubmitting(true);
    try {
      const program = getProgram(provider);
      const invoiceId = newInvoiceId();
      const [invoicePda] = deriveInvoicePda(wallet.publicKey, invoiceId);
      const [vaultPda] = deriveVaultPda(invoicePda);
      const [configPda] = deriveConfigPda();

      const milestonesPayload = await Promise.all(
        cleanMilestones.map(async (m) => ({
          descriptionHash: await sha256Bytes(m.description),
          amount: new BN(Math.round(m.amount * ONE_USDC)),
          approved: false,
          released: false,
        }))
      );

      const sig = await program.methods
        .createInvoice(
          invoiceId,
          milestonesPayload,
          new BN(Math.round(windowHours * 60 * 60)),
          expected,
          cleanUri || null
        )
        .accountsPartial({
          freelancer: wallet.publicKey,
          config: configPda,
          acceptedMint: USDC_MINT,
          invoice: invoicePda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      txToast("Invoice created", sig);
      router.push(`/invoice/${invoicePda.toBase58()}`);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Failed to create invoice";
      toast.error(msg.length > 140 ? msg.slice(0, 140) + "…" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="mt-2 text-sm text-ink/60">
          Break the work into up to 5 milestones. Your client approves each one to release
          that portion of the USDC. If they go silent, milestones auto-release after the
          dispute window.
        </p>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink/60">
              Milestones
            </h2>
            <span className="text-[11px] text-ink/50">{milestones.length} / 5</span>
          </div>
          <div className="mt-3 space-y-3">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="group flex items-end gap-3 rounded-xl border border-ink/10 bg-white p-4 transition hover:border-accent/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas font-mono text-xs text-ink/60">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] uppercase tracking-wider text-ink/50">
                    Description
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="e.g. Wireframes + style guide"
                    value={m.description}
                    onChange={(e) => setMilestone(i, { description: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[11px] uppercase tracking-wider text-ink/50">
                    USDC
                  </label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
                      $
                    </span>
                    <input
                      className="w-full rounded-md border border-ink/15 bg-white py-2 pl-6 pr-3 text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      placeholder="500"
                      inputMode="decimal"
                      value={m.amount}
                      onChange={(e) => setMilestone(i, { amount: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  disabled={milestones.length <= 1}
                  className="h-9 w-9 shrink-0 rounded-md text-ink/40 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink/40"
                  aria-label="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMilestone}
              disabled={milestones.length >= 5}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 bg-white py-3 text-sm text-ink/60 transition hover:border-accent/40 hover:text-accent disabled:opacity-30 disabled:hover:border-ink/15 disabled:hover:text-ink/60"
            >
              + Add milestone
            </button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink/50">
              Dispute window (hours)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              value={disputeWindowHours}
              onChange={(e) => setDisputeWindowHours(e.target.value)}
              inputMode="decimal"
            />
            <p className="mt-1.5 text-xs text-ink/50">
              Time the client has to approve each milestone before anyone can release it.
              Min 1 hour.
            </p>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink/50">
              Expected client (optional)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="leave blank for open invoice"
              value={expectedClient}
              onChange={(e) => setExpectedClient(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink/50">
              If set, only this wallet can fund the invoice.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-ink/10 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-ink/60">
              Off-chain metadata (optional)
            </h3>
            <button
              type="button"
              disabled={total <= 0}
              onClick={() => {
                const cleanMs = milestones
                  .map((m) => ({
                    description: m.description.trim(),
                    amount: parseFloat(m.amount),
                  }))
                  .filter(
                    (m) => m.description && !Number.isNaN(m.amount) && m.amount > 0
                  );
                if (cleanMs.length === 0) {
                  toast.error("Fill in at least one milestone first");
                  return;
                }
                downloadAsFile(
                  "invoice-metadata.json",
                  buildMetadataJson(cleanMs)
                );
                toast.success(
                  "Downloaded — upload to Arweave / IPFS, then paste the URI below"
                );
              }}
              className="text-[11px] text-accent hover:underline disabled:opacity-30"
            >
              Generate JSON →
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink/50">
            On-chain we only store a sha256 of each milestone description. Pin a
            JSON copy to Arweave or IPFS so the client can verify what they're
            approving — clients verify each entry's hash matches.
          </p>
          <input
            className="mt-3 w-full rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="ar://… or ipfs://… or https://…"
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            maxLength={200}
          />
          <p className="mt-1.5 text-[11px] text-ink/40">
            Leave blank to skip — the invoice still works, just no rich
            descriptions for the client.
          </p>
        </section>

        <div className="mt-8 overflow-hidden rounded-xl border border-ink/10 bg-white">
          <div className="grid grid-cols-3 divide-x divide-ink/5">
            <SummaryStat label="Invoice total" value={`$${total.toFixed(2)}`} highlight />
            <SummaryStat
              label={`Protocol fee (${(FEE_BPS / 100).toFixed(2)}%)`}
              value={`$${fee.toFixed(2)}`}
            />
            <SummaryStat label="You receive" value={`$${freelancerNet.toFixed(2)}`} />
          </div>
          <div className="border-t border-ink/5 bg-canvas/50 p-4">
            <button
              onClick={handleSubmit}
              disabled={submitting || !wallet || total <= 0}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-canvas transition hover:bg-accent disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas" />
                  Creating invoice…
                </>
              ) : !wallet ? (
                "Connect wallet to create"
              ) : total <= 0 ? (
                "Add at least one milestone"
              ) : (
                "Create invoice"
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/50">
              You'll get a shareable link to send to your client.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink/50">{label}</div>
      <div
        className={`mt-1 tabular-nums ${
          highlight ? "text-2xl font-semibold" : "text-lg text-ink/70"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
