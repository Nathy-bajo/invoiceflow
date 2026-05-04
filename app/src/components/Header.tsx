"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

import { CLUSTER } from "@/lib/constants";

// WalletMultiButton ships with a click handler that pops a modal — must be
// loaded client-side only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export function Header() {
  const wallet = useAnchorWallet();

  return (
    <header className="sticky top-0 z-10 border-b border-ink/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-mono text-lg group">
          <span className="relative inline-block h-3 w-3">
            <span className="absolute inset-0 rounded-sm bg-accent" />
            <span className="absolute inset-0 rounded-sm bg-accent opacity-50 group-hover:animate-ping" />
          </span>
          <span className="font-semibold tracking-tight">invoiceflow</span>
          <span className="ml-2 hidden rounded bg-ink/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink/60 sm:inline">
            {CLUSTER === "mainnet-beta" ? "mainnet" : CLUSTER}
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {wallet && (
            <>
              <Link href="/" className="hidden text-ink/70 hover:text-ink sm:inline">
                Dashboard
              </Link>
              <Link
                href="/create"
                className="hidden text-ink/70 hover:text-ink sm:inline"
              >
                New invoice
              </Link>
            </>
          )}
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  );
}
