// src/hive/config.js
//
// Single source of truth for which Hive network this process talks to.
// Controlled entirely by HIVE_NETWORK in .env -- nothing else in the
// codebase should hardcode a chain id or API endpoint.
//
// LINGO is mainnet-only. HIVE_NETWORK defaults to "mainnet" so a missing
// env var can never silently point production at testnet.

const NETWORKS = {
  mainnet: {
    chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
    apiEndpoint: 'https://api.hive.blog',
    addressPrefix: 'STM',
  },
  testnet: {
    chainId: '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e',
    apiEndpoint: 'https://testnet.openhive.network',
    addressPrefix: 'TST',
  },
};

const network = process.env.HIVE_NETWORK || 'mainnet';

if (!NETWORKS[network]) {
  throw new Error(
    `Unknown HIVE_NETWORK "${network}" -- expected "mainnet" or "testnet".`
  );
}

module.exports = {
  network,
  ...NETWORKS[network],
};