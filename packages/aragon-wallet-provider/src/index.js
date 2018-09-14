var ProviderEngine = require("web3-provider-engine");
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
var initAragonJS = require('./utils/aragonjs-wrapper');
var Web3 = require("web3");
var Transaction = require('ethereumjs-tx');

function AragonProvider(provider, ens, dao, forwardingAddress) {
  this.addresses = forwardingAddress;
  this.provider = provider;
  this.wrapper = {}

  const tmp_accounts = this.addresses;
  const tmp_wallets = this.wallets;

  this.engine = new ProviderEngine();
  this.engine.addProvider(new HookedSubprovider({
    getAccounts: function(cb) {
      cb(null, tmp_accounts)
    },
    getPrivateKey: function(address, cb) {
      if (!tmp_wallets[address]) { return cb('Account not found'); }
      else { cb('Aragon wallet does not use private keys'); }
    },
    signTransaction: async function(txParams, cb) {
      var transactionPaths = await this.wrapper.getForwardPath(txParams.from, txParams.to, txParams.data)
      cb(null, transactionPaths[0]);
    }
  }));
  if(!provider.sendAsync) provider.sendAsync = provider.send
  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new ProviderSubprovider(provider));
  this.engine.start(); // Required by the provider engine.


  this.wrapper = initAragonJS(dao, ens, {
    accounts: provider.accounts,
    provider: this,
    onTransaction: transaction => {
      this.transactionPaths = transaction
    }
  })
};

AragonProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

AragonProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
AragonProvider.prototype.getAddress = function(idx) {
  if (!idx) { return this.addresses[0]; }
  else { return this.addresses[idx]; }
}

// returns the addresses cache
AragonProvider.prototype.getAddresses = function() {
  return this.addresses;
}

// returns the addresses cache
AragonProvider.prototype.on = function(type, callback) {
  return this.provider.on(type, callback);
}

module.exports = AragonProvider;
