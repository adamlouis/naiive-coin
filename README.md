# naiive coin

<img src='https://s3-us-west-2.amazonaws.com/adamlouis/naiive-coin.png' />

## goals
- understand the basecoin protocol
- understand ethereum develop ecosystem
- understand limitations and technical considerations of solidity implementation for basecoin

## description

naiive-coin is a rough, proof-of-concept implementation of basecoin as described <a href='https://www.basis.io/static/basis_whitepaper_en.pdf'>here in the whitepaper</a>. In the spirit of the goals above, I've taken some shortcuts that would not be present a production implementation (e.g. tick function, clearing bids, bond prices are mutiples of 10, blatant bugs etc).

## code

### /contracts

`contracts/Basecoin.sol` contains the solidity implementation. The salient write functions in here are:

- `function transferShares(address to, uint value)`
- `function transferCoins(address to, uint value)`
- `function placeBondBid(uint price, uint quantity)`
- `function submitOracleExchangeRate(uint price)`
- `function tick()`

I’ve added some comments in the source to guide reading and call out some gotchas.

There are tests in test/TestBasecoin.sol and test/TestBasecoin.js. I got started with the `.sol` tests, but switched to `.js`. It’s much easier to write complex tests in JS. These tests were just a convenience for me to verify the system generally works.

### /src

`/src` contains a react app to visualize the state of the basecoin contract and interact with it. It'll run using you local network as a backend. It contains:
- coin supply
- oracle price
- supply change of next `tick()`
- all account and share balances
- forms for calling the above write functions
- bond bids & bond queue

## run the code

### install dependencies

in top level directory, run:

```
npm i -g truffle
npm i
```

### network

to run the network and tests:

```
truffle devlop

migrate
compile
test
```

### run react app

to start the react app on localhost:3000:

```
npm run start
```
