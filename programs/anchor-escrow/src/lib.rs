use anchor_lang::prelude::*;

declare_id!("67kJ2ZuNXM78kx1FrwJkLR4vKWREDCHLQDJjWKWQRHRd");

#[program]
pub mod anchor_escrow {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
