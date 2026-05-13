use anchor_lang::prelude::*;

use crate::errors::InvoiceError;
use crate::events::RaenestPayoutRequested;

/// Roadmap stub: emit-only off-ramp payout intent. The freelancer signs an
/// intent to cash out `amount` USDC to local currency, addressed to an
/// off-ramp provider's virtual-account ID. No tokens move on-chain — the
/// actual conversion is performed off-chain by an indexer listening for
/// `RaenestPayoutRequested` and calling the chosen provider's API.
///
/// This is intentionally minimal: the v1 contract layer doesn't presume to
/// know how the off-ramp settles. By emitting a signed intent we get
/// non-repudiation (the freelancer's signature on the tx) and a per-invoice
/// audit trail without coupling the protocol to any one provider.
#[derive(Accounts)]
pub struct RequestRaenestPayout<'info> {
    pub freelancer: Signer<'info>,
}

pub fn handler(
    ctx: Context<RequestRaenestPayout>,
    amount: u64,
    source_invoice: Option<Pubkey>,
    raenest_account_id: String,
    memo: String,
) -> Result<()> {
    require!(amount > 0, InvoiceError::InvalidPayoutAmount);
    require!(
        !raenest_account_id.is_empty() && raenest_account_id.len() <= 64,
        InvoiceError::InvalidRaenestAccountId
    );
    require!(memo.len() <= 200, InvoiceError::MemoTooLong);

    emit!(RaenestPayoutRequested {
        freelancer: ctx.accounts.freelancer.key(),
        source_invoice,
        amount,
        raenest_account_id,
        memo,
        requested_at: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
