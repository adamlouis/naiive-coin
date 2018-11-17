pragma solidity ^0.4.17;

contract Basecoin {
    uint BASE_UNIT = 1000; // 1000 units = $1 USD
    uint MIN_BOND = 100;
    uint MAX_BOND = BASE_UNIT;

    uint BOND_EXPIRATION = 157680000; // 5 years

    uint constant SHARE_SUPPLY = 100;
    uint public COIN_SUPPLY = BASE_UNIT * 100;

    // shares
    mapping(address => uint) public shares;
    address[] shareAddresses;
    
    // coins
    mapping(address => uint) public coins;

    // bonds
    struct Bond {
        address addr;
        uint payout;
        uint expiration; // TODO: expiration
    }
    Bond[] bonds;

    // bond
     struct BondBid {
        address addr;
        uint quantity;
    }
    mapping(uint => BondBid[]) bidsByPrice;

    // exchange rate vote
    mapping(address => uint) public exchangeRates;
    address[] exchangeRateAddresses;

    function Basecoin() public {
        shares[msg.sender] = SHARE_SUPPLY;
        shareAddresses.push(msg.sender);

        coins[msg.sender] = COIN_SUPPLY;
    }
    
    enum StoreTypes { COINS, SHARES }

    // transfer `value` shares from `to` to `msg.sender`
    function transferShares(
        address to,
        uint value) public
    {
        // TODO: linked hash set for constant time lookup, addition and removal
        if (!_containsAddress(shareAddresses, to)) {
            shareAddresses.push(to);
        }
        _transfer(StoreTypes.SHARES, to, value);

        if (shares[msg.sender] == 0) {
            // remove from shareAddresses. consider better data structure.
        }
    }
    
    // transfer `value` coins from `to` to `msg.sender`
    function transferCoins(
        address to,
        uint value) public
    {
        _transfer(StoreTypes.COINS, to, value);
    }

    function _transfer(
        StoreTypes storeType,
        address _to,
        uint _value) private
    {
        mapping(address => uint) store = (storeType == StoreTypes.COINS) ? coins : shares;

        require(_to != 0x0);
        require(store[msg.sender] >= _value);
        require(store[_to] + _value > store[_to]);

        uint previousBalances = store[msg.sender] + store[_to];
        store[msg.sender] -= _value;
        store[_to] += _value;

        assert(store[msg.sender] + store[_to] == previousBalances);
    }

    // place a bid for `quanity` bonds at price `price`
    // bids are destroyed in next call to tick()
    function placeBondBid(
        uint price,
        uint quantity) public
    {
        require(quantity > 0);
        require(price >= MIN_BOND && price < MAX_BOND);
        require(price % 10 == 0);
        bidsByPrice[price].push(BondBid({
            addr: msg.sender,
            quantity: quantity
        }));
    }

    // submit a vote of `price` for the current usd-basecoin exchange rate
    // BASE_UNIT = 1000 = $1 USD
    function submitOracleExchangeRate(uint price) public {
        if (!_containsAddress(exchangeRateAddresses, msg.sender)) {
            exchangeRateAddresses.push(msg.sender);
        }
        exchangeRates[msg.sender] = price;
    }

    // compute the current exchange rate based on votes weighted by coin ownership
    // TODO: small rounding errors
   function computeOracleExchangeRate() public view returns (uint) {
        uint votingCoins = 0;
        uint oracleExchangeRate = 0;

        for (uint i = 0; i < exchangeRateAddresses.length; i++) {
            votingCoins += coins[exchangeRateAddresses[i]];
        }

        for (uint j = 0; j < exchangeRateAddresses.length; j++) {
            address addr = exchangeRateAddresses[j];
            oracleExchangeRate += (exchangeRates[addr] * coins[addr]) / votingCoins;
        }

        return oracleExchangeRate;
    }

    // "ensure that the number of coins is equal to the market cap"
    // return uint & sign to avoid casting?
    function computeSupplyChange() public view returns (int) {
        uint oracleExchangeRate = computeOracleExchangeRate();
        uint newSupply = (COIN_SUPPLY * oracleExchangeRate) / BASE_UNIT;
        return int(newSupply) - int(COIN_SUPPLY);
    }

    // read the oracle price and expand or contract the coin supply accordingly
    // this costs a lot gas. find better approaches.
    // * without the (gas % 10) == 0 restriction, this exceeds gas limit from the test react app.
    function tick() public {
        int supplyChange = computeSupplyChange();

        // TODO: reward the oracles

        if (supplyChange > 0) {
            _expandSupply(uint(supplyChange));
        } else if (supplyChange < 0) {
            // i don't like this casting
            _contractSupply(uint(supplyChange * -1));
        }

        _clearOracleExchangeRates();
        _clearBondBids();
    }

    // expand the supply by `n` by paying out bonds in the queue and issuing coins to share holders
    // TODO: use a linked list and remove expired or matured bonds in constant time.
    // here, i just leave them there with payout = 0.
    function _expandSupply(uint n) private {
        uint remainingCoins = n;

        // pay out bond holders
        for (uint i = 0; i < bonds.length; i++) {
            Bond storage bond = bonds[i];

            if (block.timestamp > bond.expiration) {
                continue;
            }

            // cap payout at number of coins need for contraction
            uint actualPayout = bond.payout;
            actualPayout = bond.payout < remainingCoins ? bond.payout : remainingCoins;

            if (actualPayout <= 0) {
                continue;
            }

            remainingCoins -= actualPayout;
            _createCoins(bond.addr, actualPayout);
            bond.payout -= actualPayout;

            if (remainingCoins <= 0) {
                return;
            }
        }

        // pay out share holders
        // TODO: what if (remainingCoins * BASE_UNIT) <<<< SHARE_SUPPLY such that coinsPerShare == 0?
        uint coinsPerShare = remainingCoins / SHARE_SUPPLY;
        for (uint j = 0; j < shareAddresses.length; j++) {
            address addr = shareAddresses[j];
            uint sharePayout = coinsPerShare * shares[addr];

            _createCoins(addr, sharePayout);
        }
    }

    // contract the supply by `n` by issuing bonds.
    // iterate over all possible bond prices, restricting bond prices to mutiples of 10.
    // TODO: look into gas costs, storage costs, required bond price granularity
    // TODO: other sorted data structure may prove better here
    function _contractSupply(uint n) private {
        uint remainingCoins = n;

        for (uint p = MAX_BOND; p >= MIN_BOND; p -= 10) {
            BondBid[] storage bids = bidsByPrice[p];

            for (uint i = 0; i < bids.length; i++) {
                BondBid storage bid = bids[i];

                // bonds are filled at the bid price
                uint coinsToDestroy = p * bid.quantity;
                coinsToDestroy = coinsToDestroy < remainingCoins ? coinsToDestroy : remainingCoins;

                uint bondPayout = (coinsToDestroy * BASE_UNIT) / p;

                if (coinsToDestroy <= remainingCoins && coinsToDestroy <= coins[bid.addr]) {
                    _destroyCoins(bid.addr, coinsToDestroy);
                    remainingCoins -= coinsToDestroy;
                    bonds.push(Bond({
                        addr: msg.sender,
                        payout: bondPayout,
                        expiration: block.timestamp + BOND_EXPIRATION
                    }));
                }

                if (remainingCoins <= 0) {
                    return;
                }
            }
        }
    }

    function _createCoins(address addr, uint count) private {
        coins[addr] += count;
        COIN_SUPPLY += count;
    }
    
    function _destroyCoins(address addr, uint count) private {
        require(coins[addr] > count);
        coins[addr] -= count;
        COIN_SUPPLY -= count;
    }

    // TODO: avoid O(N) operations like this when possible
    // linked hash set for constant time lookup, addition and removal. at what storage cost?
    function _containsAddress(address[] addresses, address target) private pure returns (bool) {
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == target) {
                return true;
            }
        }
        return false;
    }

    function _clearOracleExchangeRates() private {
        for (uint i = 0; i < exchangeRateAddresses.length; i++) {
            delete exchangeRates[exchangeRateAddresses[i]];
        }
        delete exchangeRateAddresses;
    }

    function _clearBondBids() private {
        for (uint p = MAX_BOND; p >= MIN_BOND; p -= 10) {
            delete bidsByPrice[p];
        }
    }

    function getBondsLength() public view returns (uint) {
        return bonds.length;
    }

    function getBondAddr(uint index) public view returns (address) {
        return bonds[index].addr;
    }

    function getBondPayout(uint index) public view returns (uint) {
        return bonds[index].payout;
    }

    function getBondExpiration(uint index) public view returns (uint) {
        return bonds[index].expiration;
    }

    function getBondsBidLength(uint price) public view returns (uint) {
        return bidsByPrice[price].length;
    }

    function getBondsBidAddr(uint price, uint index) public view returns (address) {
        return bidsByPrice[price][index].addr;
    }
    
    function getBondsBidQuantity(uint price, uint index) public view returns (uint) {
        return bidsByPrice[price][index].quantity;
    }
}
