use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod util;

pub use instructions::*;
pub use state::Milestone;

// Synced from target/deploy/invoiceflow-keypair.json. After cloning the
// repo for the first time, run `anchor keys sync` to regenerate this with
// your local keypair (the keypair file isn't checked in).
declare_id!("DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ");

#[program]
pub mod invoiceflow {
    use super::*;

    /// One-time initializer for protocol-wide config (treasury, fee, accepted mint).
    /// Called by deployer post-deploy. The PDA seed is fixed so re-running it fails.
    pub fn initialize_config(ctx: Context<InitializeConfig>, fee_basis_points: u16) -> Result<()> {
        instructions::initialize_config::handler(ctx, fee_basis_points)
    }

    /// Update mutable config fields. Authority-gated.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_fee_basis_points: Option<u16>,
        new_treasury: Option<Pubkey>,
        new_treasury_token_account: Option<Pubkey>,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_config::handler(
            ctx,
            new_fee_basis_points,
            new_treasury,
            new_treasury_token_account,
            new_authority,
        )
    }

    /// Freelancer creates a new invoice. Allocates the Invoice PDA and the
    /// vault token account (owned by the Invoice PDA). Status starts Open.
    /// `metadata_uri` is an optional pointer to off-chain JSON containing the
    /// human-readable milestone descriptions; clients verify each entry's
    /// sha256 against the on-chain `description_hash`.
    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: u64,
        milestones: Vec<Milestone>,
        dispute_window_seconds: i64,
        expected_client: Option<Pubkey>,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        instructions::create_invoice::handler(
            ctx,
            invoice_id,
            milestones,
            dispute_window_seconds,
            expected_client,
            metadata_uri,
        )
    }

    /// Client funds the invoice — transfers `total_amount` USDC into the vault.
    /// Locks `client` on the Invoice and transitions Open -> Funded.
    pub fn fund_invoice(ctx: Context<FundInvoice>) -> Result<()> {
        instructions::fund_invoice::handler(ctx)
    }

    /// Client approves a single milestone. The milestone amount is split:
    /// (1 - fee) -> freelancer ATA, fee -> treasury ATA.
    /// Marks milestone approved+released, advances status to Completed when all done.
    pub fn approve_milestone(ctx: Context<ApproveMilestone>, milestone_idx: u8) -> Result<()> {
        instructions::approve_milestone::handler(ctx, milestone_idx)
    }

    /// Permissionless: after `dispute_window_seconds` since funding (or last
    /// release), anyone can release the next un-released milestone. This protects
    /// freelancers from non-responsive clients. Disabled while Disputed.
    pub fn auto_release_after_timeout(
        ctx: Context<AutoReleaseAfterTimeout>,
        milestone_idx: u8,
    ) -> Result<()> {
        instructions::auto_release::handler(ctx, milestone_idx)
    }

    /// Client pauses auto-release by raising a dispute.
    pub fn raise_dispute(ctx: Context<RaiseDispute>) -> Result<()> {
        instructions::raise_dispute::handler(ctx)
    }

    /// Client clears their own dispute, resuming the milestone flow.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>) -> Result<()> {
        instructions::resolve_dispute::handler(ctx)
    }

    /// Freelancer cancels an unfunded invoice (Open only). Closes the vault
    /// and refunds rent to the freelancer.
    pub fn cancel_invoice(ctx: Context<CancelInvoice>) -> Result<()> {
        instructions::cancel_invoice::handler(ctx)
    }

    /// v2 ROADMAP STUB: signed intent for off-chain USDC → NGN conversion via
    /// Raenest. Emits `RaenestPayoutRequested` only — no on-chain token
    /// movement. An off-chain indexer is expected to consume the event and
    /// drive the Raenest API. See `instructions/request_raenest_payout.rs`.
    pub fn request_raenest_payout(
        ctx: Context<RequestRaenestPayout>,
        amount: u64,
        source_invoice: Option<Pubkey>,
        raenest_account_id: String,
        memo: String,
    ) -> Result<()> {
        instructions::request_raenest_payout::handler(
            ctx,
            amount,
            source_invoice,
            raenest_account_id,
            memo,
        )
    }
}
