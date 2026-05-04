use anchor_lang::prelude::*;

use crate::constants::INVOICE_SEED;
use crate::errors::InvoiceError;
use crate::events::DisputeResolved;
use crate::state::{Invoice, InvoiceStatus};

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub client: Signer<'info>,

    #[account(
        mut,
        seeds = [
            INVOICE_SEED,
            invoice.freelancer.as_ref(),
            invoice.invoice_id.to_le_bytes().as_ref(),
        ],
        bump = invoice.bump,
        constraint = invoice.client == client.key() @ InvoiceError::Unauthorized,
        constraint = invoice.status == InvoiceStatus::Disputed @ InvoiceError::InvalidInvoiceStatus,
    )]
    pub invoice: Account<'info, Invoice>,
}

pub fn handler(ctx: Context<ResolveDispute>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;
    invoice.status = InvoiceStatus::Funded;
    // Reset the auto-release baseline so freelancer can't immediately
    // permissionless-release the moment the dispute clears.
    invoice.last_release_at = Clock::get()?.unix_timestamp;

    emit!(DisputeResolved {
        invoice: invoice.key(),
    });
    Ok(())
}
