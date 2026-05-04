pub mod approve_milestone;
pub mod auto_release;
pub mod cancel_invoice;
pub mod create_invoice;
pub mod fund_invoice;
pub mod initialize_config;
pub mod raise_dispute;
pub mod request_raenest_payout;
pub mod resolve_dispute;
pub mod update_config;

// Glob re-export so the auto-generated `__client_accounts_*` and
// `__cpi_client_accounts_*` modules created by `#[derive(Accounts)]` are
// reachable from `crate::` (where the `#[program]` macro looks them up).
// `handler` symbols collide harmlessly across modules — this is a warning,
// not an error, and we always call `module::handler` explicitly.
pub use approve_milestone::*;
pub use auto_release::*;
pub use cancel_invoice::*;
pub use create_invoice::*;
pub use fund_invoice::*;
pub use initialize_config::*;
pub use raise_dispute::*;
pub use request_raenest_payout::*;
pub use resolve_dispute::*;
pub use update_config::*;
