var ProviderEngine = require("web3-provider-engine");
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
var initAragonJS = require('./utils/aragonjs-wrapper');
var Web3 = require("web3");
var Transaction = require('ethereumjs-tx');

function AragonProvider(provider, ens, dao, forwardingAddress) {
  this.addresses = forwardingAddress;

  this.wrapper = initAragonJS(dao, ens, {
    accounts: provider.accounts,
    provider: provider,
    onTransaction: transaction => {
      this.transactionPaths = transaction
    }
  })
  .catch(err => {
    reporter.error('Error inspecting DAO')
    reporter.debug(err)
    process.exit(1)
  })

  const tmp_accounts = this.addresses;
  const tmp_wallets = this.wallets;

  this.engine = new ProviderEngine();
  this.engine.addProvider(new HookedSubprovider({
    getAccounts: function(cb) { cb(null, tmp_accounts) },
    getPrivateKey: function(address, cb) {
      if (!tmp_wallets[address]) { return cb('Account not found'); }
      else { cb(null, tmp_wallets[address].getPrivateKey().toString('hex')); }
    },
    signTransaction: async function(txParams, cb) {

      var transactionPaths = await this.wrapper.getForwardPath(txParams.from, txParams.to, txParams.data)
      cb(null, transactionPaths[0]);
    }
  }));
  this.engine.addProvider(new ProviderSubprovider(provider));
  this.engine.start(); // Required by the provider engine.
};

AragonProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

AragonProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
AragonProvider.prototype.getAddress = function(idx) {
  console.log('getting addresses', this.addresses[0], idx)
  if (!idx) { return this.addresses[0]; }
  else { return this.addresses[idx]; }
}

// returns the addresses cache
AragonProvider.prototype.getAddresses = function() {
  return this.addresses;
}

module.exports = AragonProvider;
