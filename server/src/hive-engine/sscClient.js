// src/hive-engine/sscClient.js
//
// Read-only Hive-Engine client for the LINGO token, via sscjs against a
// public Hive-Engine node. Note: Hive-Engine's testnet is separate
// infrastructure from Hive's own testnet (a different sidechain, its own
// API host) -- see HIVE_ENGINE_NODE below.
//
// Issuing new LINGO tokens is NOT done through sscjs -- that still goes
// through a Hive custom_json ("ssc-mainnet-hive" / "ssc-testnet-hive")
// built and signed with wax (see waxClient.js), since Hive-Engine derives
// its state from ops broadcast on the actual Hive chain. sscjs is only for
// *reading* Hive-Engine's already-indexed contract tables/balances.

const SSC = require('sscjs');

const node = process.env.HIVE_ENGINE_NODE || 'https://testapi.steem-engine.com';
const ssc = new SSC(node);

const TOKEN_SYMBOL = process.env.LINGO_TOKEN_SYMBOL || 'LINGO';

/**
 * Reads a single account's LINGO balance from the `tokens` contract's
 * `balances` table.
 */
function getBalance(account) {
  return new Promise((resolve, reject) => {
    ssc.findOne(
      'tokens',
      'balances',
      { account, symbol: TOKEN_SYMBOL },
      (err, result) => {
        if (err) return reject(err);
        resolve(result ?? { account, symbol: TOKEN_SYMBOL, balance: '0' });
      }
    );
  });
}

/**
 * Reads token metadata (supply, precision, issuer, etc.) for LINGO.
 */
function getTokenInfo() {
  return new Promise((resolve, reject) => {
    ssc.findOne('tokens', 'tokens', { symbol: TOKEN_SYMBOL }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = { getBalance, getTokenInfo, TOKEN_SYMBOL, node };