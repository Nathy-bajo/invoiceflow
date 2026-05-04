// End-to-end smoke test against the deployed devnet program.
//
// Runs as the deploy wallet (which is also the protocol authority + treasury):
//   1. Creates a fresh "client" keypair, airdrops some SOL, mints USDC to it
//      via the devnet faucet (https://spl-token-faucet.com works for the canonical
//      devnet USDC mint).
//   2. Creates an invoice as the deploy wallet (acting as freelancer).
//   3. Funds it from the client wallet.
//   4. Approves milestone 0 and verifies balances flowed.
//
// Usage:
//   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//   ANCHOR_WALLET=~/.config/solana/id.json \
//   npx tsx scripts/smoke-devnet.ts
//
// Requires ~3 USDC in the deploy wallet's USDC ATA (we use one milestone of
// 0.1 USDC to keep the cost low). If you don't have devnet USDC, fund first:
//   https://spl-token-faucet.com (mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import { createHash } from "crypto";

import { Invoiceflow } from "../target/types/invoiceflow";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const ONE_USDC = 1_000_000;
const CONFIG_SEED = Buffer.from("config");
const INVOICE_SEED = Buffer.from("invoice");
const VAULT_SEED = Buffer.from("vault");

function descriptionHash(s: string): number[] {
  return Array.from(createHash("sha256").update(s).digest());
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Invoiceflow as Program<Invoiceflow>;
  const conn = provider.connection;
  const deployWallet = (provider.wallet as anchor.Wallet).payer;

  console.log(`Deploy wallet: ${deployWallet.publicKey.toBase58()}`);

  // Treat the deploy wallet as the freelancer (and treasury). Spin a fresh
  // client keypair we control via this script.
  const client = Keypair.generate();
  console.log(`Client (ephemeral): ${client.publicKey.toBase58()}`);

  // Need SOL for the client to pay tx fees. Borrow from deploy wallet.
  const transferIx = SystemProgram.transfer({
    fromPubkey: deployWallet.publicKey,
    toPubkey: client.publicKey,
    lamports: 50_000_000, // 0.05 SOL — covers ATA rent + tx fees
  });
  const ftx = await provider.sendAndConfirm(
    new anchor.web3.Transaction().add(transferIx)
  );
  console.log(`Funded client SOL: ${ftx}`);

  // Move USDC from deploy wallet → client. Need the deploy wallet's ATA.
  const deployUsdc = getAssociatedTokenAddressSync(USDC_MINT, deployWallet.publicKey);
  const clientUsdc = getAssociatedTokenAddressSync(USDC_MINT, client.publicKey);

  // Create client's USDC ATA + transfer 1 USDC into it.
  const setupTx = new anchor.web3.Transaction()
    .add(
      createAssociatedTokenAccountInstruction(
        deployWallet.publicKey,
        clientUsdc,
        client.publicKey,
        USDC_MINT
      )
    )
    .add(
      createTransferInstruction(
        deployUsdc,
        clientUsdc,
        deployWallet.publicKey,
        1 * ONE_USDC
      )
    );
  const stx = await provider.sendAndConfirm(setupTx);
  console.log(`Funded client USDC: ${stx}`);

  // Derive PDAs.
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], program.programId);
  const config = await program.account.config.fetch(configPda);

  const invoiceId = new BN(Date.now());
  const [invoicePda] = PublicKey.findProgramAddressSync(
    [
      INVOICE_SEED,
      deployWallet.publicKey.toBuffer(),
      invoiceId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, invoicePda.toBuffer()],
    program.programId
  );

  // 1. Create invoice — single 1-USDC milestone, 1h dispute window.
  const sig1 = await program.methods
    .createInvoice(
      invoiceId,
      [
        {
          descriptionHash: descriptionHash("smoke-test milestone"),
          amount: new BN(1 * ONE_USDC),
          approved: false,
          released: false,
        },
      ],
      new BN(60 * 60),
      null,
      null
    )
    .accountsPartial({
      freelancer: deployWallet.publicKey,
      config: configPda,
      acceptedMint: USDC_MINT,
      invoice: invoicePda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  console.log(`✓ created  ${sig1}`);

  // 2. Fund from client.
  const sig2 = await program.methods
    .fundInvoice()
    .accountsPartial({
      client: client.publicKey,
      config: configPda,
      acceptedMint: USDC_MINT,
      invoice: invoicePda,
      vault: vaultPda,
      clientTokenAccount: clientUsdc,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log(`✓ funded   ${sig2}`);

  const vault = await getAccount(conn, vaultPda);
  console.log(`  vault holds ${Number(vault.amount) / ONE_USDC} USDC`);

  // 3. Approve milestone 0.
  const beforeFreelancer = await getAccount(conn, deployUsdc).then((a) =>
    Number(a.amount)
  );
  const beforeTreasury = await getAccount(conn, config.treasuryTokenAccount)
    .then((a) => Number(a.amount))
    .catch(() => 0);

  const sig3 = await program.methods
    .approveMilestone(0)
    .accountsPartial({
      client: client.publicKey,
      config: configPda,
      invoice: invoicePda,
      vault: vaultPda,
      freelancerTokenAccount: deployUsdc,
      treasuryTokenAccount: config.treasuryTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log(`✓ approved ${sig3}`);

  const afterFreelancer = await getAccount(conn, deployUsdc).then((a) =>
    Number(a.amount)
  );
  const afterTreasury = await getAccount(conn, config.treasuryTokenAccount)
    .then((a) => Number(a.amount))
    .catch(() => 0);

  console.log(
    `  freelancer +$${((afterFreelancer - beforeFreelancer) / ONE_USDC).toFixed(4)}`
  );
  console.log(
    `  treasury   +$${((afterTreasury - beforeTreasury) / ONE_USDC).toFixed(4)}`
  );

  const inv = await program.account.invoice.fetch(invoicePda);
  console.log(`  status: ${Object.keys(inv.status)[0]}`);
  console.log("");
  console.log(
    `Invoice: https://explorer.solana.com/address/${invoicePda.toBase58()}?cluster=devnet`
  );
  console.log(`Smoke test passed ✅`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
