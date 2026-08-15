// src/hive/waxClient.js
//
// Server-side wrapper around @hiveio/wax (NOT dhive) for building and
// signing the app account's own custom_json operations.

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
      const { wallet } = await session.createWallet(`lingo-app-wallet-${randomUUID()}`, undefined, true);
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
    json: { puzzle_date: puzzleDate, puzzle_number: puzzleNumber, word_length: wordLength, commit_hash: commitHash },
  });
}

async function broadcastReveal({ puzzleDate, answer, secret }) {
  return broadcastAppCustomJson({
    id: 'lingo_reveal',
    json: { puzzle_date: puzzleDate, answer, secret },
  });
}

// FIX (review #7): smoke tests use a COMPLETELY DIFFERENT operation id
// (lingo_smoke_*, not lingo_commit/lingo_reveal). This makes it
// structurally impossible for a smoke-test broadcast to be confused with,
// or shadow, a real day's commit/reveal -- regardless of what date the
// smoke test happens to use. haf.js's default id filter for real
// operations (lingo_commit/lingo_reveal/lingo_guess) will simply never
// match a smoke op, full stop -- this isn't a "best effort" mitigation,
// it's a structural guarantee.
async function broadcastSmokeCommit({ puzzleDate, commitHash }) {
  return broadcastAppCustomJson({
    id: 'lingo_smoke_commit',
    json: { puzzle_date: puzzleDate, commit_hash: commitHash, smoke_test: true },
  });
}

async function broadcastSmokeReveal({ puzzleDate, answer, secret }) {
  return broadcastAppCustomJson({
    id: 'lingo_smoke_reveal',
    json: { puzzle_date: puzzleDate, answer, secret, smoke_test: true },
  });
}

module.exports = {
  getChain,
  broadcastCommit,
  broadcastReveal,
  broadcastSmokeCommit,
  broadcastSmokeReveal,
};