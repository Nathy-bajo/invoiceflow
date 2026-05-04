use anchor_lang::prelude::*;

use crate::constants::{MAX_METADATA_URI_LENGTH, MAX_MILESTONES};

#[account]
pub struct Config {
    /// Authority allowed to update mutable config fields.
    pub authority: Pubkey,
    /// Wallet receiving protocol fees (informational; transfers go to ATA below).
    pub treasury: Pubkey,
    /// USDC token account owned by `treasury` — the actual fee sink.
    pub treasury_token_account: Pubkey,
    /// Mint accepted as payment (USDC on the active cluster).
    pub accepted_mint: Pubkey,
    /// Protocol fee taken from each release, in basis points (50 = 0.5%).
    pub fee_basis_points: u16,
    pub bump: u8,
}

impl Config {
    pub const SIZE: usize = 8 // discriminator
        + 32 // authority
        + 32 // treasury
        + 32 // treasury_token_account
        + 32 // accepted_mint
        + 2  // fee_basis_points
        + 1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub struct Milestone {
    /// keccak256 / sha256 of the off-chain milestone description. Lets the UI
    /// prove what was approved without putting human-readable text on-chain.
    pub description_hash: [u8; 32],
    /// USDC amount (in base units — 6 decimals) for this milestone.
    pub amount: u64,
    /// Set true when client (or auto-release) approves this milestone.
    pub approved: bool,
    /// Set true once funds have actually been transferred out.
    pub released: bool,
}

impl Milestone {
    pub const SIZE: usize = 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum InvoiceStatus {
    /// Created by freelancer, awaiting client funding.
    Open,
    /// Client has funded the vault; milestones in flight.
    Funded,
    /// Client raised a dispute — auto-release blocked until resolved.
    Disputed,
    /// All milestones released; vault should be empty.
    Completed,
    /// Freelancer cancelled before any funding occurred.
    Cancelled,
}

#[account]
pub struct Invoice {
    /// Payee — the wallet that receives released funds.
    pub freelancer: Pubkey,
    /// Payer — `Pubkey::default()` until first funding.
    pub client: Pubkey,
    /// Optional pre-set client. If `Some`, only this pubkey may fund.
    pub expected_client: Option<Pubkey>,
    /// Stable per-freelancer counter. Combined with `freelancer` to derive PDA.
    pub invoice_id: u64,
    /// Sum of milestone.amount. Set at creation, never mutated.
    pub total_amount: u64,
    /// Sum of milestone.amount for milestones with released = true.
    pub released_amount: u64,
    pub status: InvoiceStatus,
    pub created_at: i64,
    /// Unix ts of fund_invoice. Used as base for the auto-release timer.
    pub funded_at: i64,
    /// Unix ts of last successful release. Resets the auto-release timer
    /// per-milestone (each completed step buys the client more time on the next).
    pub last_release_at: i64,
    /// Seconds after `funded_at` / `last_release_at` before the next milestone
    /// can be auto-released by anyone.
    pub dispute_window_seconds: i64,
    /// Number of valid entries in `milestones`. `<= MAX_MILESTONES`.
    pub milestone_count: u8,
    pub milestones: Vec<Milestone>,
    /// Optional pointer to off-chain JSON containing the human-readable
    /// milestone descriptions (e.g. `ar://…`, `ipfs://…`, or an https gateway).
    /// The on-chain `description_hash` per milestone lets clients verify the
    /// fetched text without trusting the freelancer's UI. Bounded length so
    /// account size stays predictable.
    pub metadata_uri: Option<String>,
    pub bump: u8,
}

impl Invoice {
    /// Account size for a `milestone_count`-milestone invoice with a
    /// `metadata_uri_len`-byte URI. Pass `None`'s length as 0.
    pub const fn size(milestone_count: usize, metadata_uri_len: usize) -> usize {
        8 // discriminator
            + 32 // freelancer
            + 32 // client
            + 1 + 32 // Option<Pubkey> expected_client
            + 8  // invoice_id
            + 8  // total_amount
            + 8  // released_amount
            + 1  // status (enum, single variant)
            + 8  // created_at
            + 8  // funded_at
            + 8  // last_release_at
            + 8  // dispute_window_seconds
            + 1  // milestone_count
            + 4 + milestone_count * Milestone::SIZE // Vec<Milestone>
            + 1 + 4 + metadata_uri_len // Option<String> metadata_uri
            + 1 // bump
    }

    /// Worst-case size — used when allocating with the user-supplied count.
    pub const MAX_SIZE: usize = Self::size(MAX_MILESTONES, MAX_METADATA_URI_LENGTH);
}
