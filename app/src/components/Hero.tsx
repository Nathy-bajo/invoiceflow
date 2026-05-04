import Link from "next/link";
import { CLUSTER } from "@/lib/constants";

export function Hero({ connected }: { connected: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-ink/10 bg-white">
      <div className="absolute inset-0 bg-dotted opacity-50" aria-hidden />
      <div
        className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-teal/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-canvas px-3 py-1 text-xs font-medium text-ink/70">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live on {CLUSTER === "mainnet-beta" ? "mainnet" : CLUSTER}
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Get paid in USDC.{" "}
          <span className="bg-gradient-to-r from-accent to-teal bg-clip-text text-transparent">
            No frozen accounts.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/70">
          Create an invoice, share the link, get funded. Milestones release on client
          approval; auto-release after timeout if the client goes silent. Built for
          freelancers receiving USD from international clients.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/create"
            className="inline-flex h-11 items-center rounded-lg bg-ink px-5 text-sm font-medium text-canvas transition hover:bg-accent"
          >
            Create an invoice
          </Link>
          {!connected && (
            <span className="text-sm text-ink/60">
              Or connect your wallet to see your invoices →
            </span>
          )}
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink/70 hover:text-accent"
          >
            View on GitHub ↗
          </a>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Settlement" value="<5s" />
          <Stat label="Protocol fee" value="0.5%" />
          <Stat label="Milestones" value="up to 5" />
          <Stat label="Custodian" value="none" />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink/50">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
