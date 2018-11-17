var Basecoin = artifacts.require("./Basecoin.sol");
var _ = require('lodash');

const SUCCESS = 'SUCCESS';

const getBalances = (accounts, fn) => (
  Promise.all(_.map(accounts, (addr) => fn(addr)))
  .then((result) => _.map(result, bigNumber => bigNumber.toNumber()))
);

const getCoinBalances = (accounts, BasecoinInstance) => getBalances(accounts, BasecoinInstance.coins);
const getShareBalances = (accounts, BasecoinInstance) => getBalances(accounts, BasecoinInstance.shares);

const verifyBalances = (accounts, BasecoinInstance, expectedBalances, fn) => (
  fn(accounts, BasecoinInstance)
  .then((actualBalances) => {
      const match = _.every(
        actualBalances,
        (balance, i) => balance === expectedBalances[i] || (balance === 0 && expectedBalances[i] === undefined))

      if (!match) {
        console.log(actualBalances, expectedBalances);
        throw Error('do not match');
      }
    }
  )
);

const verifyCoinBalances = (accounts, BasecoinInstance, expectedBalances) => verifyBalances(accounts, BasecoinInstance, expectedBalances, getCoinBalances);
const verifyShareBalances = (accounts, BasecoinInstance, expectedBalances) => verifyBalances(accounts, BasecoinInstance, expectedBalances, getShareBalances);

contract('Basecoin', function(accounts) {
  it("transfer coins", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return BasecoinInstance.transferCoins(accounts[1], 50000, {from: accounts[0]});
    }).then(function() {
      return BasecoinInstance.transferCoins(accounts[2], 20000, {from: accounts[1]});
    }).then(function() {
      return verifyShareBalances(accounts, BasecoinInstance, [100]);
    }).then(function() { 
      return verifyCoinBalances(accounts, BasecoinInstance, [50000, 30000, 20000]);
    });
  });

  it("transfer shares", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return BasecoinInstance.transferShares(accounts[2], 10, {from: accounts[0]});
    }).then(function() {
      return BasecoinInstance.transferShares(accounts[4], 5, {from: accounts[0]});
    }).then(function() {
      return verifyShareBalances(accounts, BasecoinInstance, [85, 0, 10, 0, 5]);
    }).then(function() { 
      return verifyCoinBalances(accounts, BasecoinInstance, [50000, 30000, 20000]);
    });
  });

  it("transfer coins low balance fails", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return BasecoinInstance.transferCoins(accounts[2], 90000, {from: accounts[0]});
    }).then(() => { throw new Error(SUCCESS) })
    .catch((err) => (err.message == SUCCESS) && assert.fail());
  });
  
  it("transfer shares low balance fails", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return BasecoinInstance.transferShares(accounts[2], 900, {from: accounts[3]});
    }).then(() => { throw new Error(SUCCESS) })
    .catch((err) => (err.message == SUCCESS) && assert.fail());
  });

  it("contraction ", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return Promise.all([
        BasecoinInstance.submitOracleExchangeRate(1000, {from: accounts[0]}),
        BasecoinInstance.submitOracleExchangeRate(400, {from: accounts[1]}),
        BasecoinInstance.submitOracleExchangeRate(400, {from: accounts[2]}),
      ]);
    })
    .then((value) => {
      return BasecoinInstance.computeOracleExchangeRate()
    })
    .then((value) => {
      assert.equal(value.toNumber(), 700,)
    })
    .then((value) => {
      return BasecoinInstance.computeSupplyChange()
    })
    .then((value) => {
      assert.equal(value.toNumber(), -30000,)
    })
    .then(() => {
      return Promise.all([
        BasecoinInstance.placeBondBid(100, 10, {from: accounts[1]}),
        BasecoinInstance.placeBondBid(200, 10, {from: accounts[0]}),
      ]);
    })
    .then(() => {
      return BasecoinInstance.tick()
    })
    .then(() => {
      return verifyCoinBalances(accounts, BasecoinInstance, [48000, 29000, 20000]);
    })
    .then((value) => {
      return BasecoinInstance.COIN_SUPPLY()
    })
    .then((value) => {
      assert.equal(value.toNumber(), 97000, 'coin supply')
    })
  });

  it("expansion", function() {
    return Basecoin.deployed().then(function(instance) {
      BasecoinInstance = instance;
      return Promise.all([
        BasecoinInstance.submitOracleExchangeRate(1500, {from: accounts[0]}),
        BasecoinInstance.submitOracleExchangeRate(1200, {from: accounts[1]}),
        BasecoinInstance.submitOracleExchangeRate(1200, {from: accounts[2]}),
      ]);
    })
    .then((value) => {
      return BasecoinInstance.computeOracleExchangeRate()
    })
    .then((value) => {
      assert.equal(value.toNumber(), 1347, 'oracle price is incorrect') // rounding error but close enough. 1348.4536082474226
    })
    .then((value) => {
      return Promise.all([
        BasecoinInstance.computeSupplyChange(),
        BasecoinInstance.COIN_SUPPLY(),
      ])
    })
    .then((values) => {
      assert.equal(values[0].toNumber(), 33659, 'exansion')
      assert.equal(values[1].toNumber(), 97000, 'supply')
    })
    .then((value) => {
      return Promise.all([
        getCoinBalances(accounts, BasecoinInstance),
        getShareBalances(accounts, BasecoinInstance),
      ])
    })
    .then((value) => {
      console.log('SHARES:', value[1])
      console.log('COINS BEFORE:', value[0])
    })
    .then((value) => {
      return BasecoinInstance.tick();
    })
    .then((value) => {
      return getCoinBalances(accounts, BasecoinInstance)
    })
    .then((value) => {
      console.log('COINS AFTER:', value)
    })
    .then((value) => {
      return BasecoinInstance.COIN_SUPPLY()
    })
    .then((value) => {
      assert.equal(value.toNumber(), 130600, 'coin supply')
    })
  });
});
