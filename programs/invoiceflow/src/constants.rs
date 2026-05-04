use anchor_lang::prelude::*;

/// Hard cap on milestones per invoice. Keeps account size bounded and predictable.
pub const MAX_MILESTONES: usize = 5;

/// Maximum protocol fee in basis points (10% — sanity bound, not a target).
pub const MAX_FEE_BASIS_POINTS: u16 = 1_000;

/// Minimum dispute window — guards against clients setting unrealistic
/// auto-release deadlines via creative funding flows. 1 hour.
pub const MIN_DISPUTE_WINDOW_SECONDS: i64 = 60 * 60;

/// Maximum dispute window — 90 days. Beyond this, the contract is wrong tool.
pub const MAX_DISPUTE_WINDOW_SECONDS: i64 = 60 * 60 * 24 * 90;

/// PDA seeds.
pub const CONFIG_SEED: &[u8] = b"config";
pub const INVOICE_SEED: &[u8] = b"invoice";
pub const VAULT_SEED: &[u8] = b"vault";

/// Basis-points denominator.
pub const BPS_DENOMINATOR: u64 = 10_000;

#[constant]
pub const PROGRAM_VERSION: &str = "0.1.0";
