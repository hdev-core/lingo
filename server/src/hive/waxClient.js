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
// Signing uses @hiveio/beekeeper as the in-memory wallet, per the pattern
// documented at https://doc.openhive.network/wax/ ("Using createHiveChain").

// NOTE: @hiveio/wax and @hiveio/beekeeper are ESM-only packages (they
// declare "type": "module" with no "require" export condition). Since the
// rest of this workspace is CommonJS, we load them with dynamic import()
// rather than require() -- import() works fine from CJS and is the
// supported way to consume an ESM-only dependency here.
const hiveConfig = require('./config');

let chainPromise;
let walletPromise;

// Lazily create (and cache) the wax chain instance, pinned to whichever
// network HIVE_NETWORK selects.
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

// Lazily create an in-memory Beekeeper wallet and import the app account's
// posting key into it. The key only ever lives in process memory -- it's
// read once from HIVE_APP_POSTING_KEY at startup, never logged, never
// written to disk.
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
      const { wallet } = await session.createWallet('lingo-app-wallet');
      const publicKey = await wallet.importKey(postingKey);
      return { wallet, publicKey };
    })();
  }
  return walletPromise;
}

// Signs and broadcasts a single custom_json operation using the app
// account's posting key. Used for both lingo_commit and lingo_reveal --
// they're structurally identical (app-signed, posting-key, custom_json),
// only the payload id/json differ.
async function broadcastAppCustomJson({ id, json }) {
  const appAccount = process.env.HIVE_APP_ACCOUNT;
  if (!appAccount) {
    throw new Error('HIVE_APP_ACCOUNT is not set.');
  }

  const chain = await getChain();
  const { wallet, publicKey } = await getWallet();

  const tx = await chain.createTransaction();
  tx.pushOperation({
    custom_json: {
      required_auths: [],
      required_posting_auths: [appAccount],
      id,
      json: JSON.stringify(json),
    },
  }).validate();

  const signedTx = tx.sign(wallet, publicKey);
  const result = await chain.broadcast(signedTx);

  return { txId: result.id ?? result.tx_id, raw: result };
}

/**
 * Broadcasts the daily lingo_commit custom_json.
 * @param {{ puzzleDate: string, puzzleNumber: number, wordLength: number, commitHash: string }} params
 */
async function broadcastCommit({ puzzleDate, puzzleNumber, wordLength, commitHash }) {
  return broadcastAppCustomJson({
    id: 'lingo_commit',
    json: {
      puzzle_date: puzzleDate, // e.g. "2026-07-22" (UTC calendar date)
      puzzle_number: puzzleNumber,
      word_length: wordLength,
      commit_hash: commitHash, // SHA256(date | answer | secret) -- hex string
    },
  });
}

/**
 * Broadcasts the end-of-day lingo_reveal custom_json.
 * @param {{ puzzleDate: string, answer: string, secret: string }} params
 */
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