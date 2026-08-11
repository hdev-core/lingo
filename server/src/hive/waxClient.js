// src/hive/waxClient.js
//
// Server-side wrapper around @hiveio/wax (NOT dhive) for building and
// signing the app account's own custom_json operations:
//   - lingo_commit  (start of day, posting key)
//   - lingo_reveal  (end of day, posting key)
//
// Player-broadcast lingo_guess ops are signed client-side through Aioha +
// Hive Keychain, never here -- this module never touches a player's key.
//
// NOTE: @hiveio/wax and @hiveio/beekeeper are ESM-only packages (no
// "require" export condition). Since the rest of this workspace is
// CommonJS, they're loaded here with dynamic import() -- confirmed working
// (require() throws ERR_PACKAGE_PATH_NOT_EXPORTED, import() doesn't).

const { randomUUID } = require('crypto');
const hiveConfig = require('./config');

let chainPromise;
let walletPromise;

function getChain() {
  if (!chainPromise) {
    chainPromise = (async () => {
      const { createHiveChain } = await import('@hiveio/wax');
      return createHiveChain({
        chainId: hiveConfig.chainId,
        apiEndpoint: hiveConfig.apiEndpoint,
      });
    })();
  }
  return chainPromise;
}

async function getWallet() {
  if (!walletPromise) {
    walletPromise = (async () => {
      const postingKey = process.env.HIVE_APP_POSTING_KEY;
      if (!postingKey) {
        throw new Error('HIVE_APP_POSTING_KEY is not set.');
      }
      const { default: beekeeperFactory } = await import('@hiveio/beekeeper');
      const bk = await beekeeperFactory();
      const session = bk.createSession('lingo-app-session');
      const { wallet } = await session.createWallet(
        `lingo-app-wallet-${randomUUID()}`,
        undefined,
        true
      );
      //const { wallet } = await session.createWallet('lingo-app-wallet');
      const publicKey = await wallet.importKey(postingKey);
      return { wallet, publicKey };
    })();
  }
  return walletPromise;
}

async function broadcastAppCustomJson({ id, json }) {
  const appAccount = process.env.HIVE_APP_ACCOUNT;
  if (!appAccount) {
    throw new Error('HIVE_APP_ACCOUNT is not set.');
  }

  const chain = await getChain();
  const { wallet, publicKey } = await getWallet();
  const tx = await chain.createTransaction();
  tx.pushOperation({
    custom_json_operation: {
      required_auths: [],
      required_posting_auths: [appAccount],
      id,
      json: JSON.stringify(json),
    },
  }).validate();

  tx.sign(wallet, publicKey);
  const txId = tx.id;

  await chain.broadcast(tx);

  return { txId, raw: undefined };
}

async function broadcastCommit({ puzzleDate, puzzleNumber, wordLength, commitHash }) {
  return broadcastAppCustomJson({
    id: 'lingo_commit',
    json: {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      word_length: wordLength,
      commit_hash: commitHash,
    },
  });
}

async function broadcastReveal({ puzzleDate, answer, secret }) {
  return broadcastAppCustomJson({
    id: 'lingo_reveal',
    json: {
      puzzle_date: puzzleDate,
      answer,
      secret,
    },
  });
}

module.exports = {
  getChain,
  broadcastCommit,
  broadcastReveal,
};
