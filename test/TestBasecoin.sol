pragma solidity ^0.4.17;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Basecoin.sol";

contract TestBasecoin {
    
    // uint expected;
    // uint actual;

    // function testSolidity() public {
    //     uint n1 = 5;
    //     uint n2 = 2;
    //     expected = n1 / n2;
    //     actual = 2;
    //     Assert.equal(expected, actual, "");
    // }

    // // Testing the adopt() function
    // function testIntialAllocations() public {
    //     Basecoin basecoin = new Basecoin();
    //     Assert.equal(basecoin.shares(basecoin.initialAddress()), 100, "");
    //     Assert.equal(basecoin.coins(basecoin.initialAddress()),1000,"unexpected initial coins" );
    // }

    // // Testing the adopt() function
    // function testTransferCoin() public {
    //     Basecoin basecoin = new Basecoin();
    //     address recipient = 123;
    //     uint value = 400;

    //     Assert.equal(basecoin.coins(recipient), 0, "");
    //     Assert.equal(basecoin.coins(basecoin.initialAddress()), 1000, "");
    //     Assert.equal(basecoin.shares(recipient), 0, "");
    //     Assert.equal(basecoin.shares(basecoin.initialAddress()), 100, "");

    //     basecoin.transferCoins(recipient, value);

    //     Assert.equal(basecoin.coins(recipient), value, "");
    //     Assert.equal(basecoin.coins(basecoin.initialAddress()), 1000 - value, "");
    //     Assert.equal(basecoin.shares(recipient), 0, "");
    //     Assert.equal(basecoin.shares(basecoin.initialAddress()), 100, "");
    // }

    // // Testing the adopt() function
    // function transferShares() public {
    //     Basecoin basecoin = new Basecoin();
    //     address recipient = 123;
    //     uint value = 60;

    //     Assert.equal(basecoin.coins(recipient), 0, "");
    //     Assert.equal(basecoin.coins(basecoin.initialAddress()), 1000, "");
    //     Assert.equal(basecoin.shares(recipient), 0, "");
    //     Assert.equal(basecoin.shares(basecoin.initialAddress()), 100, "");

    //     basecoin.transferShares(recipient, value);

    //     Assert.equal(basecoin.coins(recipient), 0, "");
    //     Assert.equal(basecoin.coins(basecoin.initialAddress()), 1000, "");
    //     Assert.equal(basecoin.shares(recipient), 60, "");
    //     Assert.equal(basecoin.shares(basecoin.initialAddress()), 40, "");
    // }

    // // Testing the adopt() function
    // function testBondBid() public {
    //     Basecoin basecoin = new Basecoin();
        
    //     uint price = 200;
    //     uint quantity = 4;

    //     basecoin.placeBondBid(price, quantity);
    // }

    // // Testing the adopt() function
    // function testOraclePrice() public {
    //     Basecoin basecoin = new Basecoin();
    //     uint v;

    //     basecoin.submitOracleExchangeRate(3);
    //     v = basecoin.computeOracleExchangeRate();
    //     Assert.equal(v, 3, "");

    //     basecoin.submitOracleExchangeRate(7);
    //     v = basecoin.computeOracleExchangeRate();
    //     Assert.equal(v, 7, "");
    // }
}
