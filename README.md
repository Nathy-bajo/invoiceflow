<p align="center">
  <img src="app/public/logo.svg" alt="InvoiceFlow" width="120" />
</p>

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

> 4 minutes — freelancer creates an invoice in USDC, client funds in one click, three milestones approve out, freelancer triggers the v2 Raenest off-ramp intent on-chain.

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

**Freelancer can:** create up to 5 milestones in one tx · lock the invoice to a specific client wallet, or leave it open · share a URL the client opens to fund · receive USDC directly to their wallet on each approval · attach an off-chain metadata URI (Arweave / IPFS) so clients can verify each milestone's description against its on-chain sha256 · force-release a milestone if the client goes silent past the dispute window · cancel an unfunded invoice and recover the SOL rent · submit a signed Raenest off-ramp intent on-chain (v2 stub).

**Client can:** fund the full invoice in one click · approve milestones one at a time with fee preview · raise a dispute that pauses auto-release · resolve their own dispute when work is fixed · trust an optional third-party arbiter (set by the freelancer at create time) to adjudicate genuine disputes by splitting the vault between the two parties.

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
- `NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com` (browser RPC; or your private RPC)
- `NEXT_PUBLIC_PROGRAM_ID=DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ`
- `SOLANA_RPC_URL=https://api.devnet.solana.com` (server-side RPC for the indexer cache; private Helius URL recommended at scale)
- `HELIUS_WEBHOOK_SECRET=<long-random-string>` (shared secret used to authenticate the indexer webhook below)

### (Optional) Persistent Postgres indexer + Helius webhook

The dashboard works out of the box with a 60-second server cache fronting direct chain reads — fine at hackathon scale. For mainnet-shaped traffic, swap in a persistent Postgres-backed indexer fed by Helius webhooks:

1. **Provision a Postgres database.** Any provider works; the cheapest paths are:
   - **Neon** (free tier, ~30s signup): https://neon.tech → create project → copy the `postgres://...` connection string with `?sslmode=require`
   - **Vercel Postgres**: dashboard → Storage → Create Database → Postgres → free tier covers up to 60 hours of compute/month
   - **Supabase**, **Railway**, or any self-hosted Postgres also work — the driver is plain `postgres`

2. **Set `DATABASE_URL`** in the Vercel project (Production + Preview env vars), and locally in `app/.env.local` for development.

3. **Run migrations + backfill** once:

   ```bash
   DATABASE_URL='postgres://...' npm run migrate:indexer
   DATABASE_URL='postgres://...' SOLANA_RPC_URL=https://api.devnet.solana.com \
     npm run backfill:indexer
   ```

   Migration creates the `invoices` table + indexes; backfill scans the deployed program and upserts every existing invoice. Both are idempotent — safe to re-run after schema changes or program redeploys.

4. **Point a Helius webhook** at the app for real-time updates:

   1. Create an account at https://helius.dev and grab an API key.
   2. **Webhooks → Create webhook**:
      - **Webhook URL**: `https://<your-vercel>.vercel.app/api/webhook`
      - **Authentication header**: paste your `HELIUS_WEBHOOK_SECRET` value
      - **Transaction type**: `ANY`
      - **Account addresses**: `DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ` (the program)
      - **Webhook type**: `Enhanced`

   On every program-touching tx Helius now POSTs to `/api/webhook`. The handler walks the tx's `accountData[]`, fetches each account's current state in one batched RPC call, decodes any that are Invoices, and upserts into Postgres — so the dashboard reflects the change in ~1–3 seconds.

## Roadmap

**Why this is a Raenest *partnership*, not a competitor.** InvoiceFlow doesn't move money to or from bank accounts — we don't hold reserves, don't have banking licences, don't want to. We're the contract layer that makes "client in NYC pays freelancer in Lagos" go from a 5-day Stripe-or-Wise dance into one-click escrow → approve → off-ramp. Raenest already has the bank relationships, the regulatory licences, and the NGN liquidity. The freelancer sees one product; under the hood it's two complementary fees: ours for the contract leg, Raenest's for the settlement leg.

**v2 — off-chain wiring (on-chain handshake already shipped):**

- ✅ `request_raenest_payout` instruction + `RaenestPayoutRequested` event are live on devnet. The "🇳🇬 Convert to NGN" button on the invoice page submits a signed intent.
- 🔜 Off-chain Raenest bridge: we subscribe to program logs and calling Raenest's USDC→NGN settlement API. Blocked on Raenest API credentials.
- ✅ Helius-webhook indexer feeding a Postgres cache for the dashboard — shipped (see v3 row).

**v3 — protocol features:**

- ✅ Helius-webhook indexer + persistent Postgres cache replacing the dashboard's direct `getProgramAccounts` scans — shipped. Defaults to a 60s server cache when `DATABASE_URL` is unset; flips to DB-backed indexing when configured (see deploy section).
- ✅ Optional third-party arbiter for genuine disputes — shipped, see the `arbiter` field on `create_invoice` and the new `arbiter_resolve` instruction.
- ✅ Invoice metadata URI (Arweave / IPFS) on top of the on-chain description hash, see `metadata_uri` field on `create_invoice` and the verified-description badges on the invoice page.
- Mainnet deploy after security audit (Sec3 / OtterSec).

## License

Apache-2.0
