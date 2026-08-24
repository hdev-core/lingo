// src/hive/config.js
//
// Single source of truth for which Hive network and RPC authorities this
// process trusts. LINGO is mainnet-only, and authentication may only use
// the hardcoded HTTPS mainnet nodes below.

const MAINNET_API_ENDPOINTS = Object.freeze([
  'https://api.hive.blog',
  'https://api.openhive.network',
]);

const MAINNET = {
  network: 'mainnet',
  chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apiEndpoint: MAINNET_API_ENDPOINTS[0],
  apiEndpoints: MAINNET_API_ENDPOINTS,
  addressPrefix: 'STM',
};

if (process.env.HIVE_NETWORK && process.env.HIVE_NETWORK !== 'mainnet') {
  throw new Error(
    `HIVE_NETWORK is set to "${process.env.HIVE_NETWORK}", but LINGO is mainnet-only. Remove this env var or set it to "mainnet".`
  );
}

module.exports = MAINNET;