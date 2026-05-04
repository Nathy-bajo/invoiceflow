use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, MAX_FEE_BASIS_POINTS};
use crate::errors::InvoiceError;
use crate::state::Config;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ InvoiceError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateConfig>,
    new_fee_basis_points: Option<u16>,
    new_treasury: Option<Pubkey>,
    new_treasury_token_account: Option<Pubkey>,
    new_authority: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(bps) = new_fee_basis_points {
        require!(
            bps <= MAX_FEE_BASIS_POINTS,
            InvoiceError::InvalidFeeBasisPoints
        );
        config.fee_basis_points = bps;
    }
    if let Some(t) = new_treasury {
        config.treasury = t;
    }
    if let Some(t) = new_treasury_token_account {
        config.treasury_token_account = t;
    }
    if let Some(a) = new_authority {
        config.authority = a;
    }
    Ok(())
}
