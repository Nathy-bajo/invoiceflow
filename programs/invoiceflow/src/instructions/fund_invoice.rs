use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{CONFIG_SEED, INVOICE_SEED, VAULT_SEED};
use crate::errors::InvoiceError;
use crate::events::InvoiceFunded;
use crate::state::{Config, Invoice, InvoiceStatus};

#[derive(Accounts)]
pub struct FundInvoice<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        constraint = accepted_mint.key() == config.accepted_mint @ InvoiceError::InvalidMint,
    )]
    pub accepted_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
            INVOICE_SEED,
            invoice.freelancer.as_ref(),
            invoice.invoice_id.to_le_bytes().as_ref(),
        ],
        bump = invoice.bump,
        constraint = invoice.status == InvoiceStatus::Open @ InvoiceError::InvalidInvoiceStatus,
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(
        mut,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
        constraint = vault.mint == config.accepted_mint @ InvoiceError::InvalidMint,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Client's USDC source. Must be a USDC ATA owned by the signer.
    #[account(
        mut,
        constraint = client_token_account.mint == config.accepted_mint @ InvoiceError::InvalidMint,
        constraint = client_token_account.owner == client.key() @ InvoiceError::InvalidTokenAccountOwner,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FundInvoice>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;

    // If freelancer scoped the invoice to a specific client, enforce it.
    if let Some(expected) = invoice.expected_client {
        require_keys_eq!(
            expected,
            ctx.accounts.client.key(),
            InvoiceError::UnexpectedClient
        );
    }

    let amount = invoice.total_amount;

    let cpi_accounts = Transfer {
        from: ctx.accounts.client_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.client.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let now = Clock::get()?.unix_timestamp;
    invoice.client = ctx.accounts.client.key();
    invoice.status = InvoiceStatus::Funded;
    invoice.funded_at = now;
    invoice.last_release_at = now;

    emit!(InvoiceFunded {
        invoice: invoice.key(),
        client: invoice.client,
        amount,
        funded_at: now,
    });
    Ok(())
}
