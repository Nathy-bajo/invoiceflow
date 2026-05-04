const STEPS = [
  {
    n: "01",
    title: "Create the invoice",
    body: "Define up to 5 milestones with amounts. Optionally lock the invoice to a specific client wallet.",
  },
  {
    n: "02",
    title: "Client funds",
    body: "Client opens your share link, connects their wallet, and transfers the full USDC amount into a program-owned vault.",
  },
  {
    n: "03",
    title: "Approve & release",
    body: "Client approves a milestone — the corresponding USDC flows to your wallet. 0.5% goes to the protocol treasury.",
  },
  {
    n: "04",
    title: "Auto-release after timeout",
    body: "If the client goes silent past the dispute window, anyone can permissionless-release the next milestone.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-xs font-medium uppercase tracking-wider text-ink/60">
        How it works
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-ink/10 bg-white p-5 transition hover:border-accent/30 hover:shadow-sm"
          >
            <div className="font-mono text-xs text-accent">{s.n}</div>
            <h3 className="mt-2 font-medium">{s.title}</h3>
            <p className="mt-2 text-sm text-ink/60">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
