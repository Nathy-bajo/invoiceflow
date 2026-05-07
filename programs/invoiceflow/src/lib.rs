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

    /// One-time initializer for protocol Config (treasury, fee, mint). Deployer-only.
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

    /// Freelancer creates an invoice (Open). Optional `metadata_uri` points
    /// to off-chain JSON of milestone descriptions; `arbiter` allows a third
    /// party to settle disputes via `arbiter_resolve`.
    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: u64,
        milestones: Vec<Milestone>,
        dispute_window_seconds: i64,
        expected_client: Option<Pubkey>,
        metadata_uri: Option<String>,
        arbiter: Option<Pubkey>,
    ) -> Result<()> {
        instructions::create_invoice::handler(
            ctx,
            invoice_id,
            milestones,
            dispute_window_seconds,
            expected_client,
            metadata_uri,
            arbiter,
        )
    }

    /// Arbiter settles a Disputed invoice — refund to client, rest to freelancer minus fee.
    pub fn arbiter_resolve(
        ctx: Context<ArbiterResolve>,
        refund_to_client_amount: u64,
    ) -> Result<()> {
        instructions::arbiter_resolve::handler(ctx, refund_to_client_amount)
    }

    /// Client funds the invoice (transfers USDC into the vault, Open → Funded).
    pub fn fund_invoice(ctx: Context<FundInvoice>) -> Result<()> {
        instructions::fund_invoice::handler(ctx)
    }

    /// Client approves a milestone — net to freelancer, fee to treasury. Last one → Completed.
    pub fn approve_milestone(ctx: Context<ApproveMilestone>, milestone_idx: u8) -> Result<()> {
        instructions::approve_milestone::handler(ctx, milestone_idx)
    }

    /// Permissionless release after `dispute_window_seconds` of client silence.
    /// Blocked while Disputed.
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

    /// v2 stub: emits a signed `RaenestPayoutRequested` intent for an off-chain
    /// bridge to consume. No token movement on-chain.
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
