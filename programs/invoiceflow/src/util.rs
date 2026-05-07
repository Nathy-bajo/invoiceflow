use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::{BPS_DENOMINATOR, INVOICE_SEED};
use crate::errors::InvoiceError;
use crate::events::{InvoiceCompleted, MilestoneReleased};
use crate::state::{Config, Invoice, InvoiceStatus};

/// Shared release path for `approve_milestone` and `auto_release_after_timeout`.
/// Splits the milestone amount: net to freelancer, fee to treasury, signed by
/// the Invoice PDA.
pub fn release_milestone<'info>(
    invoice: &mut Account<'info, Invoice>,
    vault: &Account<'info, TokenAccount>,
    freelancer_token_account: &Account<'info, TokenAccount>,
    treasury_token_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    config: &Account<'info, Config>,
    milestone_idx: u8,
    released_by: Pubkey,
    auto_released: bool,
) -> Result<()> {
    let idx = milestone_idx as usize;
    require!(
        idx < invoice.milestones.len(),
        InvoiceError::MilestoneOutOfRange
    );
    require!(
        !invoice.milestones[idx].released,
        InvoiceError::MilestoneAlreadyReleased
    );

    // Destination account integrity. The token program will independently
    // verify mint/owner on transfer, but we surface clearer errors here and
    // also lock the treasury to the configured account.
    require_keys_eq!(
        freelancer_token_account.owner,
        invoice.freelancer,
        InvoiceError::InvalidTokenAccountOwner
    );
    require_keys_eq!(
        freelancer_token_account.mint,
        config.accepted_mint,
        InvoiceError::InvalidMint
    );
    require_keys_eq!(
        treasury_token_account.key(),
        config.treasury_token_account,
        InvoiceError::InvalidTreasuryAccount
    );
    require_keys_eq!(vault.mint, config.accepted_mint, InvoiceError::InvalidMint);

    let gross = invoice.milestones[idx].amount;
    // u128 widen for the multiplication, then narrow. Bps capped at 1000 so
    // (u64 * 10_000) / 10_000 fits trivially, but we play it safe.
    let fee_u128 = (gross as u128)
        .checked_mul(config.fee_basis_points as u128)
        .ok_or(InvoiceError::NumericOverflow)?
        / (BPS_DENOMINATOR as u128);
    let fee: u64 = fee_u128
        .try_into()
        .map_err(|_| error!(InvoiceError::NumericOverflow))?;
    let net = gross
        .checked_sub(fee)
        .ok_or(InvoiceError::NumericOverflow)?;

    // Build signer seeds for the Invoice PDA, which authorities the vault.
    let invoice_freelancer = invoice.freelancer;
    let invoice_id_bytes = invoice.invoice_id.to_le_bytes();
    let invoice_bump = invoice.bump;
    let invoice_info = invoice.to_account_info();

    let signer_seeds: &[&[u8]] = &[
        INVOICE_SEED,
        invoice_freelancer.as_ref(),
        invoice_id_bytes.as_ref(),
        std::slice::from_ref(&invoice_bump),
    ];
    let signer = &[signer_seeds];

    if net > 0 {
        let cpi = Transfer {
            from: vault.to_account_info(),
            to: freelancer_token_account.to_account_info(),
            authority: invoice_info.clone(),
        };
        let ctx = CpiContext::new_with_signer(token_program.to_account_info(), cpi, signer);
        token::transfer(ctx, net)?;
    }

    if fee > 0 {
        let cpi = Transfer {
            from: vault.to_account_info(),
            to: treasury_token_account.to_account_info(),
            authority: invoice_info,
        };
        let ctx = CpiContext::new_with_signer(token_program.to_account_info(), cpi, signer);
        token::transfer(ctx, fee)?;
    }

    invoice.milestones[idx].approved = true;
    invoice.milestones[idx].released = true;
    invoice.released_amount = invoice
        .released_amount
        .checked_add(gross)
        .ok_or(InvoiceError::NumericOverflow)?;
    invoice.last_release_at = Clock::get()?.unix_timestamp;

    emit!(MilestoneReleased {
        invoice: invoice.key(),
        milestone_idx,
        amount_to_freelancer: net,
        fee_to_treasury: fee,
        released_by,
        auto_released,
    });

    if invoice.released_amount >= invoice.total_amount {
        invoice.status = InvoiceStatus::Completed;
        emit!(InvoiceCompleted {
            invoice: invoice.key(),
            total_released: invoice.released_amount,
        });
    }
    Ok(())
}
