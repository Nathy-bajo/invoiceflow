use anchor_lang::prelude::*;

use crate::constants::INVOICE_SEED;
use crate::errors::InvoiceError;
use crate::events::DisputeRaised;
use crate::state::{Invoice, InvoiceStatus};

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
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
        constraint = invoice.status == InvoiceStatus::Funded @ InvoiceError::CannotDispute,
    )]
    pub invoice: Account<'info, Invoice>,
}

pub fn handler(ctx: Context<RaiseDispute>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;
    invoice.status = InvoiceStatus::Disputed;

    emit!(DisputeRaised {
        invoice: invoice.key(),
        raised_by: ctx.accounts.client.key(),
    });
    Ok(())
}
