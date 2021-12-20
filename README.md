# Anchor-Escrow

An example of an escrow program, inspired by PaulX tutorial seen here
https://paulx.dev/blog/2021/01/14/programming-on-solana-an-introduction/
This example has some changes to implementation, but more or less should be the same overall
Also gives examples on how to use some newer anchor features and CPI

User (Initializer) constructs an escrow deal:
- SPL token (X) they will offer and amount
- SPL token (Y) count they want in return and amount
- Program will take ownership of initializer's token X account


Once this escrow is initialised, either:
1.  User (Taker) can call the exchange function to exchange their Y for X
    This will close the escrow account and no longer be usable
OR
2.  If no one has exchanged, the initializer can close the escrow account
    Initializer will get back ownership of their token X account