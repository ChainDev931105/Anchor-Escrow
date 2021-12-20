import * as anchor from '@project-serum/anchor';
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

  it("Test 1. Initialise states", async () => {
    // Request an allocation of lamports to payer
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );

    mintA = await generateTokenMint();
    mintB = await generateTokenMint();
    
    initializerTokenAccountA = await mintA.createAccount(provider.wallet.publicKey);
    initializerTokenAccountB = await mintB.createAccount(provider.wallet.publicKey);

    takerTokenAccountA = await mintA.createAccount(provider.wallet.publicKey);
    takerTokenAccountB = await mintB.createAccount(provider.wallet.publicKey);

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

    let _initializerTokenAccountA = await mintA.getAccountInfo(
      initializerTokenAccountA
    );
    let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);

    assert.ok(_initializerTokenAccountA.amount.toNumber() == initializerAmount);
    assert.ok(_takerTokenAccountB.amount.toNumber() == takerAmount);
  })
});

