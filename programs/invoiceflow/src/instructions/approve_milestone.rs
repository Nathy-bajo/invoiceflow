use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::constants::{CONFIG_SEED, INVOICE_SEED, VAULT_SEED};
use crate::errors::InvoiceError;
use crate::state::{Config, Invoice, InvoiceStatus};
use crate::util::release_milestone;

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    /// The client who funded the invoice.
    pub client: Signer<'info>,

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
        constraint = invoice.client == client.key() @ InvoiceError::Unauthorized,
        constraint = matches!(invoice.status, InvoiceStatus::Funded | InvoiceStatus::Disputed)
            @ InvoiceError::InvalidInvoiceStatus,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(
        mut,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Freelancer's USDC ATA — destination of the net amount.
    #[account(mut)]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    /// Protocol treasury USDC ATA — destination of the fee.
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ApproveMilestone>, milestone_idx: u8) -> Result<()> {
    // Approving a milestone implicitly resolves any active dispute on it —
    // client is signing off on the work explicitly.
    if ctx.accounts.invoice.status == InvoiceStatus::Disputed {
        ctx.accounts.invoice.status = InvoiceStatus::Funded;
    }

    release_milestone(
        &mut ctx.accounts.invoice,
        &ctx.accounts.vault,
        &ctx.accounts.freelancer_token_account,
        &ctx.accounts.treasury_token_account,
        &ctx.accounts.token_program,
        &ctx.accounts.config,
        milestone_idx,
        ctx.accounts.client.key(),
        false,
    )
}
