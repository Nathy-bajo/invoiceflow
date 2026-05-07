use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{BPS_DENOMINATOR, CONFIG_SEED, INVOICE_SEED, VAULT_SEED};
use crate::errors::InvoiceError;
use crate::events::DisputeArbitrated;
use crate::state::{Config, Invoice, InvoiceStatus};

/// Arbiter splits the remaining vault on a `Disputed` invoice — `refund_to_client_amount`
/// to client, rest to freelancer minus fee. Status → `Completed`. Only the recorded arbiter.
#[derive(Accounts)]
pub struct ArbiterResolve<'info> {
    pub arbiter: Signer<'info>,

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
        constraint = invoice.status == InvoiceStatus::Disputed
            @ InvoiceError::InvalidInvoiceStatus,
        // Arbiter must be set AND match the caller. We unwrap_or(default()) so
        // the constraint is well-formed when arbiter is None — that case is
        // caught by the `is_some` check in the handler with a clearer error.
        constraint = invoice.arbiter.is_some() @ InvoiceError::NoArbiterSet,
        constraint = invoice.arbiter.unwrap() == arbiter.key()
            @ InvoiceError::InvalidArbiter,
    )]
    pub invoice: Box<Account<'info, Invoice>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
        constraint = vault.mint == config.accepted_mint @ InvoiceError::InvalidMint,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Freelancer's USDC ATA — receives the freelancer's share (net of fee).
    #[account(
        mut,
        constraint = freelancer_token_account.owner == invoice.freelancer
            @ InvoiceError::InvalidTokenAccountOwner,
        constraint = freelancer_token_account.mint == config.accepted_mint
            @ InvoiceError::InvalidMint,
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    /// Client's USDC ATA — receives the refunded amount.
    #[account(
        mut,
        constraint = client_token_account.owner == invoice.client
            @ InvoiceError::InvalidTokenAccountOwner,
        constraint = client_token_account.mint == config.accepted_mint
            @ InvoiceError::InvalidMint,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    /// Protocol treasury USDC ATA — receives the fee on freelancer's portion.
    #[account(
        mut,
        constraint = treasury_token_account.key() == config.treasury_token_account
            @ InvoiceError::InvalidTreasuryAccount,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ArbiterResolve>, refund_to_client_amount: u64) -> Result<()> {
    let vault_balance = ctx.accounts.vault.amount;
    require!(
        refund_to_client_amount <= vault_balance,
        InvoiceError::RefundExceedsVault
    );

    let freelancer_gross = vault_balance
        .checked_sub(refund_to_client_amount)
        .ok_or(InvoiceError::NumericOverflow)?;

    // Fee applies only to the freelancer's portion — the client refund is
    // a return of capital, not earned income.
    let fee_u128 = (freelancer_gross as u128)
        .checked_mul(ctx.accounts.config.fee_basis_points as u128)
        .ok_or(InvoiceError::NumericOverflow)?
        / (BPS_DENOMINATOR as u128);
    let fee: u64 = fee_u128
        .try_into()
        .map_err(|_| error!(InvoiceError::NumericOverflow))?;
    let freelancer_net = freelancer_gross
        .checked_sub(fee)
        .ok_or(InvoiceError::NumericOverflow)?;

    // Build PDA signer seeds for the Invoice (vault authority).
    let invoice_freelancer = ctx.accounts.invoice.freelancer;
    let invoice_id_bytes = ctx.accounts.invoice.invoice_id.to_le_bytes();
    let invoice_bump = ctx.accounts.invoice.bump;
    let invoice_info = ctx.accounts.invoice.to_account_info();

    let signer_seeds: &[&[u8]] = &[
        INVOICE_SEED,
        invoice_freelancer.as_ref(),
        invoice_id_bytes.as_ref(),
        std::slice::from_ref(&invoice_bump),
    ];
    let signer = &[signer_seeds];

    if refund_to_client_amount > 0 {
        let cpi = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.client_token_account.to_account_info(),
            authority: invoice_info.clone(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer);
        token::transfer(cpi_ctx, refund_to_client_amount)?;
    }

    if freelancer_net > 0 {
        let cpi = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.freelancer_token_account.to_account_info(),
            authority: invoice_info.clone(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer);
        token::transfer(cpi_ctx, freelancer_net)?;
    }

    if fee > 0 {
        let cpi = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: invoice_info,
        };
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer);
        token::transfer(cpi_ctx, fee)?;
    }

    let invoice = &mut ctx.accounts.invoice;
    invoice.released_amount = invoice
        .released_amount
        .checked_add(freelancer_gross)
        .ok_or(InvoiceError::NumericOverflow)?;
    invoice.status = InvoiceStatus::Completed;
    invoice.last_release_at = Clock::get()?.unix_timestamp;

    emit!(DisputeArbitrated {
        invoice: invoice.key(),
        arbiter: ctx.accounts.arbiter.key(),
        refund_to_client: refund_to_client_amount,
        freelancer_gross,
        fee_to_treasury: fee,
    });
    Ok(())
}
