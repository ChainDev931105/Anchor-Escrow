import * as anchor from '@project-serum/anchor';
import { Program, BN, IdlAccounts } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { assert } from "chai";
import { AnchorEscrow } from '../target/types/anchor_escrow';

describe('anchor-escrow', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.AnchorEscrow as Program<AnchorEscrow>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);  

  let mintA: Token = null;
  let mintB: Token = null;
  let initializerTokenAccountA: PublicKey = null;
  let initializerTokenAccountB: PublicKey = null;
  let takerTokenAccountA: PublicKey = null;
  let takerTokenAccountB: PublicKey = null;
  let pda: PublicKey = null;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const escrowAccount = Keypair.generate();
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();

  const generateTokenMint = async () => {
    return await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );
  }

  it("Test 0. Initialise states", async () => {
    // Request an allocation of lamports to payer
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );

    // Generate Tokens and accounts
    mintA = await generateTokenMint();
    mintB = await generateTokenMint();
    
    initializerTokenAccountA = await mintA.createAccount(provider.wallet.publicKey);
    initializerTokenAccountB = await mintB.createAccount(provider.wallet.publicKey);

    takerTokenAccountA = await mintA.createAccount(provider.wallet.publicKey);
    takerTokenAccountB = await mintB.createAccount(provider.wallet.publicKey);

    // initial mints
    await mintA.mintTo(
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );
    await mintB.mintTo(
      takerTokenAccountB,
      mintAuthority.publicKey,
      [mintAuthority],
      takerAmount
    );

    // check if mint is processed correctly
    let _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);

    assert.ok(_initializerTokenAccountA.amount.toNumber() == initializerAmount);
    assert.ok(_takerTokenAccountB.amount.toNumber() == takerAmount);
  })

  it("Test 1. EscrowInit", async () => {
    // call escrowInit
    await program.rpc.escrowInit(
      new BN(initializerAmount),
      new BN(takerAmount),
      {
        accounts: {
          initializer: provider.wallet.publicKey,
          initializerXAccount: initializerTokenAccountA,
          initializerYAccount: initializerTokenAccountB,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [escrowAccount],
      }
    );
    
    // Get the PDA that is assigned authority to token account.
    const [_pda, _nonce] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow_pda_seed"))], // this string should be matched with the one in lib.rs
      program.programId
    );

    pda = _pda;

    let _initializerTokenAccountA = await mintA.getAccountInfo(
      initializerTokenAccountA
    );

    let _escrowAccount: EscrowAccount =
      await program.account.escrowAccount.fetch(escrowAccount.publicKey);

    // Check that the new owner is the PDA.
    assert.ok(_initializerTokenAccountA.owner.equals(pda));
    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(provider.wallet.publicKey));
    assert.ok(_escrowAccount.xInAmount.toNumber() == initializerAmount);
    assert.ok(_escrowAccount.yOutAmount.toNumber() == takerAmount);
    assert.ok(
      _escrowAccount.initializerXAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.ok(
      _escrowAccount.initializerYAccount.equals(
        initializerTokenAccountB
      )
    );
  })
  
  it("Test 2. EscrowExchange", async () => {
    // call escrowExchange
    console.log("hello");
    await program.rpc.escrowExchange({
      accounts: {
        taker: provider.wallet.publicKey,
        takerYAccount: takerTokenAccountB,
        takerXAccount: takerTokenAccountA,
        initializerXAccount: initializerTokenAccountA,
        initializerYAccount: initializerTokenAccountB,
        initializerMainAccount: provider.wallet.publicKey,
        escrowAccount: escrowAccount.publicKey,
        pdaAccount: pda,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });
    console.log("hello 0");

    let _takerTokenAccountA = await mintA.getAccountInfo(takerTokenAccountA);
    console.log("hello 1");
    let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);
    console.log("hello 2");
    let _initializerTokenAccountA = await mintA.getAccountInfo(
      initializerTokenAccountA
    );
    console.log("hello 3");
    let _initializerTokenAccountB = await mintB.getAccountInfo(
      initializerTokenAccountB
    );

    console.log("hello 4");

    // Check that the initializer gets back ownership of their token account.
    assert.ok(_takerTokenAccountA.owner.equals(provider.wallet.publicKey));

    assert.ok(_takerTokenAccountA.amount.toNumber() == initializerAmount);
    assert.ok(_initializerTokenAccountA.amount.toNumber() == 0);
    assert.ok(_initializerTokenAccountB.amount.toNumber() == takerAmount);
    assert.ok(_takerTokenAccountB.amount.toNumber() == 0);
  });
});

