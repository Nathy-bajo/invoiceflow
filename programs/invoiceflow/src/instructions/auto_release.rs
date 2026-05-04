use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::constants::{CONFIG_SEED, INVOICE_SEED, VAULT_SEED};
use crate::errors::InvoiceError;
use crate::state::{Config, Invoice, InvoiceStatus};
use crate::util::release_milestone;

#[derive(Accounts)]
pub struct AutoReleaseAfterTimeout<'info> {
    /// Anyone — typically the freelancer themselves, or a keeper bot.
    pub caller: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [
            INVOICE_SEED,
            invoice.freelancer.as_ref(),
            invoice.invoice_id.to_le_bytes().as_ref(),
        ],
        bump = invoice.bump,
        constraint = invoice.status == InvoiceStatus::Funded @ InvoiceError::InvalidInvoiceStatus,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(
        mut,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<AutoReleaseAfterTimeout>, milestone_idx: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let invoice = &ctx.accounts.invoice;

    // Per-milestone timer: client gets `dispute_window_seconds` from the most
    // recent of (funded_at, last_release_at) to react. After that, this
    // milestone unlocks for permissionless release.
    let baseline = invoice.last_release_at.max(invoice.funded_at);
    let unlock_at = baseline
        .checked_add(invoice.dispute_window_seconds)
        .ok_or(InvoiceError::NumericOverflow)?;
    require!(now >= unlock_at, InvoiceError::TimeoutNotElapsed);

    // Status is enforced via account constraint — Disputed status blocks this
    // path entirely; client must resolve_dispute first.
    require!(
        invoice.status != InvoiceStatus::Disputed,
        InvoiceError::DisputeActive
    );

    release_milestone(
        &mut ctx.accounts.invoice,
        &ctx.accounts.vault,
        &ctx.accounts.freelancer_token_account,
        &ctx.accounts.treasury_token_account,
        &ctx.accounts.token_program,
        &ctx.accounts.config,
        milestone_idx,
        ctx.accounts.caller.key(),
        true,
    )
}
