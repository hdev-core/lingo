// src/hive/haf.js
//
// Read-only indexing client. Uses the wax chain object's account_history_api
// binding, which is backed by HAfAH (HAF's account-history API) on any
// public Hive node -- we never scan blocks manually.

const { getChain } = require('./waxClient');

async function getLingoOperations(
  account,
  { limit = 100, ids = ['lingo_commit', 'lingo_reveal', 'lingo_guess'] } = {}
) {
  const chain = await getChain();

  const history = await chain.api.account_history_api.get_account_history({
    account,
    start: -1,
    limit,
    include_reversible: true,
    operation_filter_low: null,
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