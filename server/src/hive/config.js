// src/hive/config.js
//
// Single source of truth for which Hive network this process talks to.
// Controlled entirely by HIVE_NETWORK in .env -- nothing else in the
// codebase should hardcode a chain id or API endpoint.

const NETWORKS = {
  mainnet: {
    chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
    apiEndpoint: 'https://api.hive.blog',
    addressPrefix: 'STM',
  },
  testnet: {
    // Public Hive testnet, per https://developers.hive.io/quickstart/
    chainId: '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e',
    apiEndpoint: 'https://testnet.openhive.network',
    addressPrefix: 'TST',
  },
};

const network = process.env.HIVE_NETWORK || 'testnet';

if (!NETWORKS[network]) {
  throw new Error(
    `Unknown HIVE_NETWORK "${network}" -- expected "mainnet" or "testnet".`
  );
}

module.exports = {
  network,
  ...NETWORKS[network],
};