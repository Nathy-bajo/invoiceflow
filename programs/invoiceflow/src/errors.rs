use anchor_lang::prelude::*;

#[error_code]
pub enum InvoiceError {
    #[msg("Milestone count must be between 1 and MAX_MILESTONES")]
    InvalidMilestoneCount,

    #[msg("Sum of milestone amounts must equal total invoice amount")]
    MilestoneAmountMismatch,

    #[msg("Milestone amount must be greater than zero")]
    ZeroMilestoneAmount,

    #[msg("Dispute window outside allowed bounds")]
    InvalidDisputeWindow,

    #[msg("Fee basis points exceed maximum allowed")]
    InvalidFeeBasisPoints,

    #[msg("Invoice is not in the required state for this action")]
    InvalidInvoiceStatus,

    #[msg("Caller is not authorized for this invoice")]
    Unauthorized,

    #[msg("Invoice was created with an expected client; funder pubkey does not match")]
    UnexpectedClient,

    #[msg("Token mint does not match the protocol's accepted mint")]
    InvalidMint,

    #[msg("Token account owner mismatch")]
    InvalidTokenAccountOwner,

    #[msg("Milestone index out of range")]
    MilestoneOutOfRange,

    #[msg("Milestone has already been released")]
    MilestoneAlreadyReleased,

    #[msg("Auto-release timeout has not yet elapsed")]
    TimeoutNotElapsed,

    #[msg("Auto-release blocked because invoice is currently disputed")]
    DisputeActive,

    #[msg("Cannot raise dispute on an invoice in this state")]
    CannotDispute,

    #[msg("Treasury token account does not match config")]
    InvalidTreasuryAccount,

    #[msg("Numeric overflow")]
    NumericOverflow,

    #[msg("Cannot cancel a funded or completed invoice")]
    CannotCancel,

    #[msg("Payout amount must be greater than zero")]
    InvalidPayoutAmount,

    #[msg("Raenest account id must be 1..=64 UTF-8 chars")]
    InvalidRaenestAccountId,

    #[msg("Memo exceeds 200 characters")]
    MemoTooLong,
}
