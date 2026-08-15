// src/hive-engine/sscClient.js
//
// Read-only Hive-Engine client for the LINGO token, via sscjs against a
// public Hive-Engine node. LINGO is mainnet-only -- defaults to the
// mainnet Hive-Engine RPC node, not the testnet one.
//
// Issuing new LINGO tokens is NOT done through sscjs -- that still goes
// through a Hive custom_json ("ssc-mainnet-hive") built and signed with
// wax (see waxClient.js), since Hive-Engine derives its state from ops
// broadcast on the actual Hive chain. sscjs is only for *reading*
// Hive-Engine's already-indexed contract tables/balances.

const SSC = require('sscjs');

const node = process.env.HIVE_ENGINE_NODE || 'https://api.hive-engine.com/rpc';
const ssc = new SSC(node);

const TOKEN_SYMBOL = process.env.LINGO_TOKEN_SYMBOL || 'LINGO';

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

function getTokenInfo() {
  return new Promise((resolve, reject) => {
    ssc.findOne('tokens', 'tokens', { symbol: TOKEN_SYMBOL }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = { getBalance, getTokenInfo, TOKEN_SYMBOL, node };