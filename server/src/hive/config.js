// src/hive/config.js
//
// Single source of truth for which Hive network this process talks to.
// LINGO is mainnet-only -- there is no testnet mode. This file has no
// branch to accidentally flip; if that ever needs to change, it should
// be a deliberate, reviewed addition, not a stray env var.

const MAINNET = {
  network: 'mainnet',
  chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apiEndpoint: 'https://api.hive.blog',
  addressPrefix: 'STM',
};

if (process.env.HIVE_NETWORK && process.env.HIVE_NETWORK !== 'mainnet') {
  throw new Error(
    `HIVE_NETWORK is set to "${process.env.HIVE_NETWORK}", but LINGO is mainnet-only. Remove this env var or set it to "mainnet".`
  );
}

module.exports = MAINNET;