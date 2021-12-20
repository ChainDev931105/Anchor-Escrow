use anchor_lang::prelude::*;
use spl_token::instruction::AuthorityType;
use anchor_spl::token::{self, SetAuthority, Token, TokenAccount, Transfer};

declare_id!("67kJ2ZuNXM78kx1FrwJkLR4vKWREDCHLQDJjWKWQRHRd");


#[program]
pub mod anchor_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    pub fn escrow_init(
        ctx: Context<EscrowInit>,
        x_in_amount: u64,
        y_out_amount: u64,
    ) -> ProgramResult {
        ctx.accounts.escrow_account.initializer_key = *ctx.accounts.initializer.key;
        ctx.accounts.escrow_account.initializer_x_account = 
            *ctx.accounts.initializer_x_account.to_account_info().key;
        ctx.accounts.escrow_account.initializer_y_account = 
            *ctx.accounts.initializer_x_account.to_account_info().key;
        ctx.accounts.escrow_account.x_in_amount = x_in_amount;
        ctx.accounts.escrow_account.y_out_amount = y_out_amount;

        // should be implement authority part with pda

        Ok(())
    }

    pub fn escrow_cancel(
        ctx: Context<EscrowCancel>
    ) -> ProgramResult {

        token::set_authority(
            ctx.accounts.into_set_authority_context(),
            AuthorityType::AccountOwner,
            Some(ctx.account.escrow_account.initializer_key),
        )?;

        Ok(())
    }

    pub fn escrow_exchange(
        ctx: Context<EscrowExchange>
    ) -> ProgramResult {

        // step 1. { amount : x_in_amount, token : x }, program -> taker
        token::transfer(
            ctx.accounts.into_transfer_to_taker_context(),
            ctx.accounts.escrow_account.x_in_amount,
        )?;

        // step 2. { amount : y_out_amount, token : y }, taker -> initializer
        token::transfer(
            ctx.accounts.into_transfer_to_initializer_context(),
            ctx.accounts.escrow_account.y_out_amount,
        )?;

        // 
        token::set_authority(
            ctx.accounts.into_set_authority_context(),
            ctx.accounts.escrow_account.x_in_amount,
            Some(ctx.account.escrow_account.initializer_key),
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct EscrowInit<'info> {
    #[account(signer)]
    pub initializer: AccountInfo<'info>,
    #[account(mut)]
    pub initializer_x_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub initializer_y_account: Account<'info, TokenAccount>,
    #[account(init, payer = initializer, space = 8 + EscrowAccount::LEN)]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>, // system_program is neccessary here because of escrow_account annotation
}

#[derive(Accounts)]
pub struct EscrowCancel<'info> {
    pub initializer: AccountInfo<'info>,
    pub escrow_account: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct EscrowExchange<'info> {
    #[account(signer)]
    pub taker: AccountInfo<'info>,
    #[account(mut)]
    pub taker_x_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub taker_y_account: Account<'info, TokenAccount>,
    pub escrow_account: Account<'info, EscrowAccount>,
}

#[account]
pub struct EscrowAccount {
    pub initializer_key: Pubkey,
    pub initializer_x_account: Pubkey,
    pub initializer_y_account: Pubkey,
    pub x_in_amount: u64,
    pub y_out_amount: u64,
}

impl EscrowAccount {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8;
}

impl<'info> EscrowCancel<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
    }
}

impl<'info> EscrowExchange<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
    }

    fn into_transfer_to_taker_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
    }

    fn into_transfer_to_initializer_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
    }
}


