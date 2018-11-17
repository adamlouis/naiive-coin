import React, { PureComponent as Component } from 'react'
import BasecoinContract from '../build/contracts/Basecoin.json'
import getWeb3 from './utils/getWeb3'
import _ from 'lodash';
import styled from 'styled-components';

const Navbar = styled.div`
  background-color: #0A0A0A;
  color: #FAFAFA;
  font-size: 18px;
  font-family: monospace; 
  height: 60px;
  display: flex;
  align-items: center;
`;

const NavbarName = styled.div`
  margin-left: 50px;
`;

const ContentName = styled.div`
  font-size: 18px;
  font-family: monospace; 
  font-weight: bold;
  margin: 20px 0px;
`;

const ContentWrapper = styled.div`
  margin: 20px;
  padding: 20px;
  background: papayawhip;
  font-family: monospace; 
`;

const BalanceHeader = styled.th`
  text-align: left;
  min-width: 100px;
  padding-bottom: 10px;
  font-size: 16px;
`;

const BalanceRow = styled.tr`
`;

const BalanceDatum = styled.td`
  padding: 10px 10px 5px 0px;
`;

const StatsContainer = styled.div`
  margin-bottom: 10px;
`;

const StatsKey = styled.div`
  margin: 5px 20px 5px 0px;
  font-weight: bold;
`;

const StatsValue = styled.div`
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const getBalances = (accounts, fn) => (
  Promise.all(_.map(accounts, (addr) => fn(addr)))
  .then((result) => _.map(result, bigNumber => bigNumber.toNumber()))
);

const getCoinBalances = (accounts, BasecoinInstance) => getBalances(accounts, BasecoinInstance.coins);
const getShareBalances = (accounts, BasecoinInstance) => getBalances(accounts, BasecoinInstance.shares);

const getBonds = (BasecoinInstance) => (
  BasecoinInstance.getBondsLength()
  .then((bondCount) => {
    const promises = [];
    for (let i = 0; i < bondCount; i++) {
      promises.push(Promise.all([
        BasecoinInstance.getBondAddr(i),
        BasecoinInstance.getBondPayout(i),
        BasecoinInstance.getBondExpiration(i),
      ]));
    }
    return Promise.all(promises).then((results) => {
      return _.map(results, r => {
        return {
          addr: r[0],
          payout: r[1].toNumber(),
          expiration: r[2].toNumber(),
        }
      })
    })
  })
)

const getBondBids = (BasecoinInstance) => {
  const promises = [];
  const prices = [];

  for (let i = 100; i < 1000; i += 100) {
    prices.push(i);
    promises.push(BasecoinInstance.getBondsBidLength(i));
  }

  return Promise.all(promises)
  .then((lengths) => {
    const pricePromises = [];

    for (let j = 0; j < prices.length; j++) {
      for (let k = 0; k < lengths[j]; k++) {
        pricePromises.push(Promise.all([
          prices[j],
          BasecoinInstance.getBondsBidAddr(prices[j], k),
          BasecoinInstance.getBondsBidQuantity(prices[j], k),
        ]));
      }
    }
    return Promise.all(pricePromises).then((results) => {
      const bidsByPrice = {};
      const resultsByPrice = _.groupBy(results, r => r[0]);
      _.forEach(resultsByPrice, (values, price) => {
        bidsByPrice[price] = _.map(values, (entry) => {
          return {
            price,
            addr: entry[1],
            quantity: entry[2].toNumber(),
          }
        });
      });
      return bidsByPrice;
    });
  });
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      accounts: [],
      coins: [],
      shares: [],
      web3: null
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch(() => {
      console.log('Error finding web3.')
    })
  }

  instantiateContract() {
    /*
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    const Basecoin = contract(BasecoinContract)
    Basecoin.setProvider(this.state.web3.currentProvider)

    // Declaring this for later so we can chain functions on Basecoin.
    let BasecoinInstance;

    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {
      Basecoin.deployed().then((instance) => {
        BasecoinInstance = instance;
        this.BasecoinInstance = BasecoinInstance;
        this.accounts = accounts;
        return this.refreshData();
      })
    })
  }

  refreshData = () => {
    Promise.all([
      getCoinBalances(this.accounts, this.BasecoinInstance),
      getShareBalances(this.accounts, this.BasecoinInstance),
      this.BasecoinInstance.computeOracleExchangeRate(),
      this.BasecoinInstance.computeSupplyChange(),
      this.BasecoinInstance.COIN_SUPPLY(),
      getBonds(this.BasecoinInstance),
    ]).then((results) => {
      return this.setState({
        coins: results[0],
        shares: results[1],
        oraclePrice: results[2].toNumber(),
        supplyChange: results[3].toNumber(),
        supply: results[4].toNumber(),
        bonds: results[5],
      })
    });
    Promise.all([
      getBondBids(this.BasecoinInstance),
    ]).then((results) => {
      return this.setState({
        bidsByPrice: results[0],
      })
    });
  }

  renderSnapshot() {
    return (
      <ContentWrapper>
        <StatsContainer>
            <StatsRow>
                <StatsKey>
                  supply
                </StatsKey>
                <StatsValue>
                    { this.state.supply }
                </StatsValue>
            </StatsRow>
            <StatsRow>
                <StatsKey>
                  oracle price
                </StatsKey>
                <StatsValue>
                    { this.state.oraclePrice }
                </StatsValue>
            </StatsRow>
            <StatsRow>
                <StatsKey>
                    supply change
                </StatsKey>
                <StatsValue>
                  { this.state.supplyChange > 0 ? '+' : '' }
                  { this.state.supplyChange }
                </StatsValue>
            </StatsRow>
        </StatsContainer>
        <hr />
        <ContentName>balances</ContentName>
        <table>
          <tbody>
            <BalanceRow>
              <BalanceHeader>account</BalanceHeader>
              <BalanceHeader>coins</BalanceHeader>
              <BalanceHeader>shares</BalanceHeader>
            </BalanceRow>
            {
              _.map(this.accounts, (account, i) => (
                <BalanceRow key={`${account}_${this.state.coins[i]}_${this.state.coins[i]}`}>
                  <BalanceDatum>{account}</BalanceDatum>
                  <BalanceDatum>{this.state.coins[i]}</BalanceDatum>
                  <BalanceDatum>{this.state.shares[i]}</BalanceDatum>
                </BalanceRow>
              ))
            }
          </tbody>
        </table>
        <hr />
        <ContentName>bond queue</ContentName>
        <table>
          <tbody>
            <BalanceRow>
              <BalanceHeader>address</BalanceHeader>
              <BalanceHeader>payout</BalanceHeader>
              <BalanceHeader>expiration</BalanceHeader>
            </BalanceRow>
            {
              _.map(this.state.bonds, (bond, i) => (
                <BalanceRow key={`${bond.addr}_${bond.payout}_${bond.expiration}_${i}`}>
                  <BalanceDatum>{bond.addr}</BalanceDatum>
                  <BalanceDatum>{bond.payout}</BalanceDatum>
                  <BalanceDatum>{bond.expiration}</BalanceDatum>
                </BalanceRow>
              ))
            }
          </tbody>
        </table>
        <hr />
        <ContentName>bond bids</ContentName>
        <table>
          <tbody>
            <BalanceRow>
              <BalanceHeader>address</BalanceHeader>
              <BalanceHeader>price</BalanceHeader>
              <BalanceHeader>quantity</BalanceHeader>
            </BalanceRow>
            {
              _.map(this.state.bidsByPrice, (bids, price) => (
                _.map(bids, (bid, i) => (
                  <BalanceRow key={`${bid.addr}_${bid.quantity}_${i}`}>
                    <BalanceDatum>{bid.addr}</BalanceDatum>
                    <BalanceDatum>{price}</BalanceDatum>
                    <BalanceDatum>{bid.quantity}</BalanceDatum>
                  </BalanceRow>
                ))
              ))
            }
          </tbody>
        </table>
      </ContentWrapper>
    )
  }

  didMakeTransaction = (tx) => {
    this.refreshData();
    console.log('gas used: ', tx.receipt.gasUsed);
  }

  render() {
    return (
      <div className="App">
        <Navbar>
          <NavbarName>
            Naiive Coin
          </NavbarName>
        </Navbar>
        { this.renderSnapshot() }
        <Controls
          BasecoinInstance={this.BasecoinInstance}
          accounts={this.accounts}
          didMakeTransaction={this.didMakeTransaction}
        />
      </div>
    );
  }
}

const Module = styled.div`
  border: solid black 2px;
  margin-bottom: 20px;
  padding: 20px; 
`;

const ModuleContent = styled.div`
  margin: 20px;
  display: flex;
`;

const ModuleName = styled.div`
  font-size: 14px;
  font-weight: bold;
`;

const ModuleInput = styled.input`
  margin-right: 8px;
  width: 200px;
`;
const ModuleButton = styled.button`
  margin-right: 8px;
`;

const SelectContainer = styled.div`
  margin-right: 8px;
`;

const SelectName = styled.div`
  margin-right: 8px;
`;

const handleErr = (err) => {
  console.log(err);
  alert('could not complete transaction');
}

class Controls extends Component {
  /* using refs like this is bad practice :|  */
  transferCoins = () => {
    this.props.BasecoinInstance.transferCoins(
      this.refs.tcoin_to.value,
      this.tcoin_amount.value,
      {from: this.refs.tcoin_from.value}
    )
    .then(this.props.didMakeTransaction)
    .catch(handleErr);
  }

  transferShares = () => {
    this.props.BasecoinInstance.transferShares(
      this.refs.tshare_to.value,
      this.tshare_amount.value,
      {from: this.refs.tshare_from.value, gas:3141592}
    )
    .then(this.props.didMakeTransaction)
    .catch(handleErr);
  }

  bid = () => {
    if (this.bid_price.value % 10 !== 0) {
      alert('multiples of 10 only');
      return;
    }
    this.props.BasecoinInstance.placeBondBid(
      this.bid_price.value,
      this.bid_quantity.value,
      {from: this.refs.bid_to.value, gas:3141592}
    ).then(this.props.didMakeTransaction)
    .catch(handleErr);
  }

  vote = () => {
    this.props.BasecoinInstance.submitOracleExchangeRate(
      this.vote_price.value,
      {from: this.refs.vote_from.value}
    )
    .then(this.props.didMakeTransaction)
    .catch(handleErr);
  }

  tick = () => {
    this.props.BasecoinInstance.tick({from: this.props.accounts[0], gas:3141592})
    .then(this.props.didMakeTransaction)
    .catch(handleErr);
  }

  renderAccountOptions = (ref, name) => {
    return (
      <SelectContainer>
        <SelectName>{ name }</SelectName>
        <select ref={ref}>
          {
            _.map(this.props.accounts, (account) => (
              <option key={account} value={account}>{account}</option>
            ))
          }
        </select>
      </SelectContainer>
    )
  }

  render() {
     return (
       <ContentWrapper>
          <ContentName>
            controls
          </ContentName>
          <Module>
            <ModuleName>transfer coins</ModuleName>
            <ModuleContent>
                { this.renderAccountOptions('tcoin_from', 'from') }
                { this.renderAccountOptions('tcoin_to', 'to') }
                <ModuleInput innerRef={(v) => this.tcoin_amount = v} type='text' placeholder='amount'/>
                <ModuleButton onClick={this.transferCoins}>run</ModuleButton>
            </ModuleContent>
          </Module>
          <Module>
            <ModuleName>transfer shares</ModuleName>
            <ModuleContent>
                { this.renderAccountOptions('tshare_from', 'from') }
                { this.renderAccountOptions('tshare_to', 'to') }
                <ModuleInput innerRef={(v) => this.tshare_amount = v} type='text' placeholder='amount'/>
                <ModuleButton onClick={this.transferShares}>run</ModuleButton>
            </ModuleContent>
          </Module>
          <Module>
            <ModuleName>place bond bid</ModuleName>
            <ModuleContent>
              { this.renderAccountOptions('bid_to', 'buyer') }
              <ModuleInput innerRef={(v) => this.bid_price = v} type='text' placeholder='price (multiple of 10, >= 100, < 1000)'/>
              <ModuleInput innerRef={(v) => this.bid_quantity = v} type='text' placeholder='quantity'/>
              <ModuleButton onClick={this.bid}>run</ModuleButton>
            </ModuleContent>
          </Module>
          <Module>
            <ModuleName>submit oracle vote</ModuleName>
            <ModuleContent>
              { this.renderAccountOptions('vote_from', 'voter') }
              <ModuleInput innerRef={(v) => this.vote_price = v} type='text' placeholder='price'/>
              <ModuleButton onClick={this.vote}>run</ModuleButton>
            </ModuleContent>
          </Module>
          <Module>
            <ModuleName>tick</ModuleName>
            <ModuleContent>
              <ModuleButton onClick={this.tick}>run</ModuleButton>
            </ModuleContent>
          </Module>
       </ContentWrapper>
     )
  }

}

export default App
