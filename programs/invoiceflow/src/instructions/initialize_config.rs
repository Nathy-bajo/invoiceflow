use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::constants::{CONFIG_SEED, MAX_FEE_BASIS_POINTS};
use crate::errors::InvoiceError;
use crate::state::Config;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Config::SIZE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// USDC mint to accept. Verified to be a real Mint account.
    pub accepted_mint: Account<'info, Mint>,

    /// SOL wallet that controls the treasury (informational on-chain).
    /// CHECK: pubkey only — fees actually flow to treasury_token_account.
    pub treasury: UncheckedAccount<'info>,

    /// USDC token account that will receive protocol fees. Must match the
    /// accepted mint and be owned by `treasury`.
    #[account(
        constraint = treasury_token_account.mint == accepted_mint.key()
            @ InvoiceError::InvalidMint,
        constraint = treasury_token_account.owner == treasury.key()
            @ InvoiceError::InvalidTokenAccountOwner,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>, fee_basis_points: u16) -> Result<()> {
    require!(
        fee_basis_points <= MAX_FEE_BASIS_POINTS,
        InvoiceError::InvalidFeeBasisPoints
    );

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.treasury_token_account = ctx.accounts.treasury_token_account.key();
    config.accepted_mint = ctx.accounts.accepted_mint.key();
    config.fee_basis_points = fee_basis_points;
    config.bump = ctx.bumps.config;
    Ok(())
}
