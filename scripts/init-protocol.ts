// One-time protocol bootstrap script. Run after `anchor deploy`.
//
//   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//   ANCHOR_WALLET=~/.config/solana/id.json \
//   ts-node scripts/init-protocol.ts \
//     --treasury <pubkey> \
//     --fee-bps 50
//
// The wallet you run this with becomes the protocol authority.

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import { Invoiceflow } from "../target/types/invoiceflow";

const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const CONFIG_SEED = Buffer.from("config");

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Invoiceflow as Program<Invoiceflow>;

  const cluster = arg("cluster", "devnet")!;
  const usdcMint = cluster === "mainnet-beta" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
  const treasuryArg = arg("treasury");
  const treasury = treasuryArg ? new PublicKey(treasuryArg) : provider.wallet.publicKey;
  const feeBps = parseInt(arg("fee-bps", "50")!);

  const treasuryAta = getAssociatedTokenAddressSync(usdcMint, treasury);
  const treasuryAtaInfo = await provider.connection.getAccountInfo(treasuryAta);
  if (!treasuryAtaInfo) {
    console.log(`Creating treasury USDC ATA at ${treasuryAta.toBase58()}`);
    const tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        treasuryAta,
        treasury,
        usdcMint
      )
    );
    await provider.sendAndConfirm(tx);
  }

  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], program.programId);

  console.log("Program     ", program.programId.toBase58());
  console.log("Cluster     ", cluster);
  console.log("USDC mint   ", usdcMint.toBase58());
  console.log("Authority   ", provider.wallet.publicKey.toBase58());
  console.log("Treasury    ", treasury.toBase58());
  console.log("Treasury ATA", treasuryAta.toBase58());
  console.log("Config PDA  ", configPda.toBase58());
  console.log("Fee bps     ", feeBps);

  const sig = await program.methods
    .initializeConfig(feeBps)
    .accounts({
      authority: provider.wallet.publicKey,
      config: configPda,
      acceptedMint: usdcMint,
      treasury,
      treasuryTokenAccount: treasuryAta,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Initialized config in", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
