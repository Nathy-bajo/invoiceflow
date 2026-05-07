use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{
    CONFIG_SEED, INVOICE_SEED, MAX_DISPUTE_WINDOW_SECONDS, MAX_METADATA_URI_LENGTH, MAX_MILESTONES,
    MIN_DISPUTE_WINDOW_SECONDS, VAULT_SEED,
};
use crate::errors::InvoiceError;
use crate::events::InvoiceCreated;
use crate::state::{Config, Invoice, InvoiceStatus, Milestone};

#[derive(Accounts)]
#[instruction(
    invoice_id: u64,
    milestones: Vec<Milestone>,
    dispute_window_seconds: i64,
    expected_client: Option<Pubkey>,
    metadata_uri: Option<String>,
    arbiter: Option<Pubkey>,
)]
pub struct CreateInvoice<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// USDC mint, must match config.
    #[account(
        constraint = accepted_mint.key() == config.accepted_mint @ InvoiceError::InvalidMint,
    )]
    pub accepted_mint: Account<'info, Mint>,

    /// Boxed so the ~290-byte Invoice lives on the heap — keeps `try_accounts`
    /// under Solana's 4KiB stack limit. Sized to actual milestone + URI len.
    #[account(
        init,
        payer = freelancer,
        space = Invoice::size(
            milestones.len(),
            metadata_uri.as_ref().map(|s| s.len()).unwrap_or(0),
        ),
        seeds = [
            INVOICE_SEED,
            freelancer.key().as_ref(),
            invoice_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub invoice: Box<Account<'info, Invoice>>,

    /// Vault token account (USDC) — PDA owned by the program, with authority
    /// set to the Invoice PDA so future releases sign via invoice seeds.
    #[account(
        init,
        payer = freelancer,
        seeds = [VAULT_SEED, invoice.key().as_ref()],
        bump,
        token::mint = accepted_mint,
        token::authority = invoice,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateInvoice>,
    invoice_id: u64,
    milestones: Vec<Milestone>,
    dispute_window_seconds: i64,
    expected_client: Option<Pubkey>,
    metadata_uri: Option<String>,
    arbiter: Option<Pubkey>,
) -> Result<()> {
    require!(
        !milestones.is_empty() && milestones.len() <= MAX_MILESTONES,
        InvoiceError::InvalidMilestoneCount
    );
    require!(
        dispute_window_seconds >= MIN_DISPUTE_WINDOW_SECONDS
            && dispute_window_seconds <= MAX_DISPUTE_WINDOW_SECONDS,
        InvoiceError::InvalidDisputeWindow
    );
    if let Some(uri) = metadata_uri.as_ref() {
        require!(
            !uri.is_empty() && uri.len() <= MAX_METADATA_URI_LENGTH,
            InvoiceError::InvalidMetadataUri
        );
    }
    if let Some(arb) = arbiter.as_ref() {
        // Arbiter must be third-party. Open-invoice client check is deferred
        // to resolve time, where InvalidArbiter catches it naturally.
        require_keys_neq!(
            *arb,
            ctx.accounts.freelancer.key(),
            InvoiceError::ArbiterCannotBeParty
        );
        if let Some(client) = expected_client.as_ref() {
            require_keys_neq!(*arb, *client, InvoiceError::ArbiterCannotBeParty);
        }
    }

    // Validate milestones: non-zero, fresh state, sum equals total.
    let mut total: u64 = 0;
    for m in &milestones {
        require!(m.amount > 0, InvoiceError::ZeroMilestoneAmount);
        require!(
            !m.approved && !m.released,
            InvoiceError::InvalidInvoiceStatus
        );
        total = total
            .checked_add(m.amount)
            .ok_or(InvoiceError::NumericOverflow)?;
    }

    let now = Clock::get()?.unix_timestamp;
    let invoice = &mut ctx.accounts.invoice;
    invoice.freelancer = ctx.accounts.freelancer.key();
    invoice.client = Pubkey::default();
    invoice.expected_client = expected_client;
    invoice.invoice_id = invoice_id;
    invoice.total_amount = total;
    invoice.released_amount = 0;
    invoice.status = InvoiceStatus::Open;
    invoice.created_at = now;
    invoice.funded_at = 0;
    invoice.last_release_at = 0;
    invoice.dispute_window_seconds = dispute_window_seconds;
    invoice.milestone_count = milestones.len() as u8;
    invoice.milestones = milestones;
    invoice.metadata_uri = metadata_uri.clone();
    invoice.arbiter = arbiter;
    invoice.bump = ctx.bumps.invoice;

    emit!(InvoiceCreated {
        invoice: invoice.key(),
        freelancer: invoice.freelancer,
        invoice_id,
        total_amount: total,
        milestone_count: invoice.milestone_count,
        expected_client,
        metadata_uri,
        arbiter,
    });
    Ok(())
}
