import Link from "next/link";
import { CLUSTER, PROGRAM_ID } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-mono">
              <img src="/logo.svg" alt="" width={24} height={24} />
              <span className="font-semibold tracking-tight">invoiceflow</span>
            </div>
            <p className="mt-3 text-sm text-ink/60">
              Solana-native invoice + escrow protocol. Get paid in USDC with
              milestone-based release and dispute timeouts.
            </p>
          </div>
          <div className="text-sm">
            <div className="text-xs uppercase tracking-wider text-ink/50">Protocol</div>
            <ul className="mt-3 space-y-1.5">
              <li>
                <a
                  className="text-ink/70 hover:text-accent"
                  href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=${CLUSTER === "mainnet-beta" ? "mainnet-beta" : CLUSTER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Program on Explorer ↗
                </a>
              </li>
              <li>
                <a
                  className="text-ink/70 hover:text-accent"
                  href="https://github.com/Nathy-bajo/invoiceflow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repo ↗
                </a>
              </li>
              <li>
                <Link className="text-ink/70 hover:text-accent" href="/">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="text-xs uppercase tracking-wider text-ink/50">Network</div>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Cluster</dt>
                <dd className="capitalize">
                  {CLUSTER === "mainnet-beta" ? "mainnet" : CLUSTER}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Token</dt>
                <dd>USDC (6 decimals)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Fee</dt>
                <dd>0.5%</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-8 border-t border-ink/5 pt-6 text-xs text-ink/40">
          v0.1.0 · Apache-2.0 · Devnet preview.
        </div>
      </div>
    </footer>
  );
}
