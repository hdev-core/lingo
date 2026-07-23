// src/hive/haf.js
//
// Read-only indexing client. Uses the wax chain object's account_history_api
// binding, which is backed by HAfAH (HAF's account-history API) on any
// public Hive node -- we never scan blocks manually, and never run our own
// HAF instance for the MVP.
//
// This covers leaderboard/gameplay indexing: pulling a given account's
// lingo_commit / lingo_reveal / lingo_guess custom_json operations back
// off-chain for verification or display.

const { getChain } = require('./waxClient');

/**
 * Fetches an account's operation history, filtered to custom_json ops,
 * and returns only the ones matching our app's operation ids.
 *
 * @param {string} account - Hive account to read history for (e.g. the
 *   app account for commit/reveal, or a player's account for their guesses).
 * @param {object} [opts]
 * @param {number} [opts.limit=100] - max ops to scan back through
 * @param {string[]} [opts.ids] - which custom_json ids to keep
 *   (default: all three lingo ops)
 */
async function getLingoOperations(
  account,
  { limit = 100, ids = ['lingo_commit', 'lingo_reveal', 'lingo_guess'] } = {}
) {
  const chain = await getChain();

  // account_history_api.get_account_history is served by HAfAH under the
  // hood on any modern public Hive node -- no separate HAF deployment
  // needed for the MVP.
  const history = await chain.api.account_history_api.get_account_history({
    account,
    start: -1,
    limit,
    include_reversible: true,
    operation_filter_low: null, // no bitmask filtering; we filter by id below instead
  });

  return history.history
    .map(([, entry]) => entry.op)
    .filter((op) => op.type === 'custom_json_operation' && ids.includes(op.value.id))
    .map((op) => ({
      id: op.value.id,
      json: JSON.parse(op.value.json),
    }));
}

module.exports = { getLingoOperations };