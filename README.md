# InvoiceFlow

**Solana-native invoice + escrow protocol.** Freelancers create invoices, international clients fund them with USDC, milestones release on client approval, and unresponsive clients trigger an automatic timeout-based release. Built for the Colosseum + SuperteamNG / Raenest hackathon.

**Live on devnet:**

- Program: [`DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ`](https://explorer.solana.com/address/DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ?cluster=devnet) (v0.1.0 with Raenest payout stub)
- Config PDA: [`A1fy8dwFrrS8U1jgiYzA7DtEbEYtvgP5AzqY9wNwaYek`](https://explorer.solana.com/address/A1fy8dwFrrS8U1jgiYzA7DtEbEYtvgP5AzqY9wNwaYek?cluster=devnet)
- Treasury USDC ATA: [`P5hH8Ru8WwRkPy2rvxXzDRQpVGkedaDvU2RkPcpVjAe`](https://explorer.solana.com/address/P5hH8Ru8WwRkPy2rvxXzDRQpVGkedaDvU2RkPcpVjAe?cluster=devnet)
- Frontend: [invoiceflow-five-jet.vercel.app](https://invoiceflow-five-jet.vercel.app)

**Verified end-to-end on devnet** — first completed invoice [`B1ibhBzF…RQ86`](https://explorer.solana.com/address/B1ibhBzF8HX2a2vjmHpNUTA3Aswvv2kHc7rSkVbZRQ86?cluster=devnet) — three txs, status `Completed`:
1. [create](https://explorer.solana.com/tx/27fTis3crfrEUUA5YxwuJ9BqCdpYPQYodvdyQUdW4PuCYzUDbBuRSDqCR1ACEzYwo6JxfAy6bFDcbb22eie3evDS?cluster=devnet) → 2. [fund](https://explorer.solana.com/tx/2zcrYdWGwVShkS8SZo3vxgrneGttzgZLgGJcVAH1F1kGN7pFH4DBxcFCXuQ2Y9XXiRjAAKL2orkzPMf6aRbnGwxH?cluster=devnet) → 3. [approve + release](https://explorer.solana.com/tx/3sh9f1psNuqKuKnPZArkd3GTRZSoJy55zai84FgGPZdSHfchB6b82nGEdYhbtwtuB6ZFVx6ax2XsLfEBkdhz5ioo?cluster=devnet)

## Demo

[![Watch the 3-min demo](https://img.youtube.com/vi/9ck7z-tXois/maxresdefault.jpg)](https://youtu.be/9ck7z-tXois)

> 3 minutes — freelancer creates an invoice in USDC, client funds in one click, three milestones approve out, freelancer triggers the v2 Raenest off-ramp intent on-chain.

```
freelancer creates invoice  ──►  client funds in USDC  ──►  client approves milestone  ──►  freelancer's wallet
                                          │                          │
                                          ▼                          ▼
                                  vault PDA holds USDC       0.5% protocol fee → treasury
                                          │
                                          └─► after dispute window, anyone can permissionless-release
```

## What we solve

| | Problem | How InvoiceFlow handles it |
|---|---|---|
| 1 | **Custodial freeze risk.** Stripe / PayPal / Wise routinely freeze Nigerian freelancer accounts, holding weeks of income. | Vault is a Solana PDA — no human can freeze it. Not us, not Raenest, not anyone. |
| 2 | **Trust gaps in both directions.** Freelancer ships first or client pays first; either side can be burned. | Milestones release on client approval. Auto-release fires after a configurable timeout if the client ghosts. |
| 3 | **High fees + slow settlement.** Cards: 4–8%. Wires: $25 + 3 days. P2P USDT: grey-market and unauditable. | 0.5% protocol fee, <5s settlement, every release on Solana Explorer. |

## Capabilities

**Freelancer can:** create up to 5 milestones in one tx · lock the invoice to a specific client wallet, or leave it open · share a URL the client opens to fund · receive USDC directly to their wallet on each approval · force-release a milestone if the client goes silent past the dispute window · cancel an unfunded invoice and recover the SOL rent · submit a signed Raenest off-ramp intent on-chain (v2 stub).

**Client can:** fund the full invoice in one click · approve milestones one at a time with fee preview · raise a dispute that pauses auto-release · resolve their own dispute when work is fixed.

**Protocol guarantees:** vault is owned by the invoice PDA, no admin backdoor · fee can never exceed 10% — even the deployer can't set predatory fees · dispute window is bounded between 1 hour and 90 days · all arithmetic is checked, with the fee multiplication widened to 128-bit before narrowing.

## Vs the alternatives

| | Stripe / PayPal | Upwork / Fiverr | Wire transfer | **InvoiceFlow** |
|---|---|---|---|---|
| Account freeze risk in Nigeria | High | Medium (platform freezes) | Low | **None — vault is on-chain** |
| Total fee | 4–8% | 8–20% | $25 + FX | **0.5%** |
| Settlement | 3–7 days | 5–14 days | 3–5 days | **<5 seconds** |
| Milestone escrow | No | Yes | No | **Yes (on-chain)** |
| Auto-release if client ghosts | No | After 14 days, contested | No | **Yes, configurable** |
| Counterparty trust required | High | Low (platform mediates) | High | **None — code mediates** |

## Quick start

### Prerequisites

- Rust 1.75+ · Solana CLI 1.18+ · Anchor 0.31.1 · Node 20+

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"                # Solana
cargo install --git https://github.com/coral-xyz/anchor avm --tag v0.31.1 --locked
avm install 0.31.1 && avm use 0.31.1                                          # Anchor
```

### Build + run locally

```bash
git clone <this-repo> invoiceflow && cd invoiceflow
anchor keys sync          # writes your local program keypair into lib.rs / Anchor.toml
anchor build              # produces target/deploy/invoiceflow.so + IDL
npm install
anchor test               # spins up a local validator, deploys, runs the test suite
```

### Deploy to devnet

```bash
solana airdrop 5                                 # fund deploy wallet (faucet.solana.com)
anchor deploy --provider.cluster devnet          # ~3 SOL
anchor idl init -f target/idl/invoiceflow.json \
  $(solana address -k target/deploy/invoiceflow-keypair.json) \
  --provider.cluster devnet                      # publish IDL on-chain
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=$HOME/.config/solana/id.json \
  npx tsx scripts/init-protocol.ts \
    --cluster devnet \
    --treasury <YOUR_TREASURY_PUBKEY> \
    --fee-bps 50
```

### Smoke-test the devnet deploy

```bash
# Get devnet USDC into your wallet from https://spl-token-faucet.com
# (mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=$HOME/.config/solana/id.json \
  npx tsx scripts/smoke-devnet.ts
# → creates a fresh client wallet, funds it, runs create+fund+approve, prints
#   the invoice URL on Solana Explorer.
```

### Run the frontend

```bash
cd app
cp .env.example .env.local       # adjust if not on devnet
npm install
npm run sync-idl                 # copies IDL + types from ../target/{idl,types}
npm run dev                      # → http://localhost:3000
```

The app needs Phantom or Solflare and some devnet USDC (same faucet as above).

### Deploy the frontend to Vercel

```bash
cd app
npm run sync-idl
vercel --prod
```

In the Vercel dashboard set these env vars (Production + Preview):

- `NEXT_PUBLIC_CLUSTER=devnet`
- `NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com` (or your private RPC)
- `NEXT_PUBLIC_PROGRAM_ID=DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ`

## Demo flow (3-min recording)

1. **Wallet A (freelancer)** opens `/create`, defines a $1,500 invoice with three $500 milestones (Design / Build / Ship), 72-hour dispute window. Clicks Create. Lands on the invoice page, copies the share link.
2. **Wallet B (client)** opens the same link, clicks "Fund $1,500 USDC". Status flips Open → Funded; vault balance shows $1,500.
3. Back to **Wallet A** — the invoice now appears under "client" role for B and "freelancer" role for A.
4. **Wallet B** clicks Approve on milestone 1. Wallet A's USDC balance jumps by $497.50 and treasury by $2.50.
5. Repeat for milestones 2 and 3 — invoice goes Completed.
6. *(Optional second invoice)* **Wallet B** raises a dispute, then resolves it — and the auto-release button appears once the timer hits zero (use a short window for the demo).

## Roadmap

**Why this is a Raenest *partnership*, not a competitor.** InvoiceFlow doesn't move money to or from bank accounts — we don't hold reserves, don't have banking licences, don't want to. We're the contract layer that makes "client in NYC pays freelancer in Lagos" go from a 5-day Stripe-or-Wise dance into one-click escrow → approve → off-ramp. Raenest already has the bank relationships, the regulatory licences, and the NGN liquidity. The freelancer sees one product; under the hood it's two complementary fees: ours for the contract leg, Raenest's for the settlement leg.

**v2 — off-chain wiring (on-chain handshake already shipped):**

- ✅ `request_raenest_payout` instruction + `RaenestPayoutRequested` event are live on devnet. The "🇳🇬 Convert to NGN" button on the invoice page submits a signed intent.
- 🔜 Off-chain Raenest bridge: ~100 lines of TypeScript subscribing to program logs and calling Raenest's USDC→NGN settlement API. Blocked on Raenest API credentials.
- 🔜 Helius-webhook indexer feeding a Postgres cache for the dashboard.

**v3 — protocol features:**

- Optional third-party arbiter for genuine disputes.
- Invoice metadata URI (Arweave / IPFS) on top of the on-chain description hash.
- Mainnet deploy after security audit (Sec3 / OtterSec, ~6–8 weeks).

## License

Apache-2.0
