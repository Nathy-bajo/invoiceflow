use anchor_lang::prelude::*;

#[event]
pub struct InvoiceCreated {
    pub invoice: Pubkey,
    pub freelancer: Pubkey,
    pub invoice_id: u64,
    pub total_amount: u64,
    pub milestone_count: u8,
    pub expected_client: Option<Pubkey>,
    pub metadata_uri: Option<String>,
}

#[event]
pub struct InvoiceFunded {
    pub invoice: Pubkey,
    pub client: Pubkey,
    pub amount: u64,
    pub funded_at: i64,
}

#[event]
pub struct MilestoneReleased {
    pub invoice: Pubkey,
    pub milestone_idx: u8,
    pub amount_to_freelancer: u64,
    pub fee_to_treasury: u64,
    pub released_by: Pubkey,
    pub auto_released: bool,
}

#[event]
pub struct InvoiceCompleted {
    pub invoice: Pubkey,
    pub total_released: u64,
}

#[event]
pub struct DisputeRaised {
    pub invoice: Pubkey,
    pub raised_by: Pubkey,
}

#[event]
pub struct DisputeResolved {
    pub invoice: Pubkey,
}

#[event]
pub struct InvoiceCancelled {
    pub invoice: Pubkey,
    pub freelancer: Pubkey,
}

#[event]
pub struct RaenestPayoutRequested {
    pub freelancer: Pubkey,
    /// Optional reference to the invoice the funds came from. Useful for
    /// indexers to pair a payout with the source escrow.
    pub source_invoice: Option<Pubkey>,
    pub amount: u64,
    /// Raenest virtual-account identifier (UTF-8). The off-chain bridge maps
    /// this to a real NGN bank account on Raenest's side.
    pub raenest_account_id: String,
    /// Free-form note shown on the freelancer's transaction history.
    pub memo: String,
    pub requested_at: i64,
}
