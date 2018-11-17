var Basecoin = artifacts.require("./Basecoin.sol");

module.exports = function(deployer) {
  deployer.deploy(Basecoin);
};