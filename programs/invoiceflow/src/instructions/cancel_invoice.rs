use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount};

use crate::constants::{INVOICE_SEED, VAULT_SEED};
use crate::errors::InvoiceError;
use crate::events::InvoiceCancelled;
use crate::state::{Invoice, InvoiceStatus};

#[derive(Accounts)]
pub struct CancelInvoice<'info> {
    /// Freelancer recovers the rent from both the invoice account and the
    /// vault token account.
    #[account(mut)]
    pub freelancer: Signer<'info>,

    #[account(
        mut,
        close = freelancer,
        seeds = [
            INVOICE_SEED,
            invoice.freelancer.as_ref(),
            invoice.invoice_id.to_le_bytes().as_ref(),
        ],
        bump = invoice.bump,
        has_one = freelancer @ InvoiceError::Unauthorized,
        constraint = invoice.status == InvoiceStatus::Open @ InvoiceError::CannotCancel,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(
        mut,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
        constraint = vault.amount == 0 @ InvoiceError::CannotCancel,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelInvoice>) -> Result<()> {
    // Close vault — invoice PDA signs with its seeds.
    let invoice_freelancer = ctx.accounts.invoice.freelancer;
    let invoice_id_bytes = ctx.accounts.invoice.invoice_id.to_le_bytes();
    let invoice_bump = ctx.accounts.invoice.bump;
    let signer_seeds: &[&[u8]] = &[
        INVOICE_SEED,
        invoice_freelancer.as_ref(),
        invoice_id_bytes.as_ref(),
        std::slice::from_ref(&invoice_bump),
    ];
    let signer = &[signer_seeds];

    let cpi = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.freelancer.to_account_info(),
        authority: ctx.accounts.invoice.to_account_info(),
    };
    let ctx_close =
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer);
    token::close_account(ctx_close)?;

    // Set status for the event before close. Anchor's `close = freelancer`
    // wipes the data afterward, so we mutate-and-emit before returning.
    let invoice_key = ctx.accounts.invoice.key();
    ctx.accounts.invoice.status = InvoiceStatus::Cancelled;

    emit!(InvoiceCancelled {
        invoice: invoice_key,
        freelancer: ctx.accounts.freelancer.key(),
    });
    Ok(())
}
