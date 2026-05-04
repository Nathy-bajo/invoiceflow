import { PublicKey } from "@solana/web3.js";

// Program ID — must match `declare_id!` in the Anchor program.
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ"
);

// USDC mint per cluster.
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const CLUSTER =
  (process.env.NEXT_PUBLIC_CLUSTER as "devnet" | "mainnet-beta" | "localnet") || "devnet";

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
  (CLUSTER === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : CLUSTER === "localnet"
      ? "http://127.0.0.1:8899"
      : "https://api.devnet.solana.com");

export const USDC_MINT =
  CLUSTER === "mainnet-beta" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;

export const USDC_DECIMALS = 6;
export const ONE_USDC = 1_000_000;

export const INVOICE_SEED = Buffer.from("invoice");
export const VAULT_SEED = Buffer.from("vault");
export const CONFIG_SEED = Buffer.from("config");

export const FEE_BPS = 50; // 0.5% — for client-side display only

export function formatUsdc(units: number | bigint): string {
  const n = typeof units === "bigint" ? Number(units) : units;
  return (n / ONE_USDC).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function explorerTx(sig: string): string {
  const param = CLUSTER === "mainnet-beta" ? "" : `?cluster=${CLUSTER}`;
  return `https://explorer.solana.com/tx/${sig}${param}`;
}

export function explorerAccount(addr: string): string {
  const param = CLUSTER === "mainnet-beta" ? "" : `?cluster=${CLUSTER}`;
  return `https://explorer.solana.com/address/${addr}${param}`;
}
