// src/hive/haf.js
//
// Read-only account-history helpers for Lingo custom_json operations.
// Supports pagination so old commits are not lost once account history
// exceeds the first 1000 entries.

const { getChain } = require('./waxClient');

const DEFAULT_IDS = ['lingo_commit', 'lingo_reveal', 'lingo_guess'];

function parseLingoOperations(historyRows, ids) {
  return historyRows
    .map(([index, entry]) => ({
      index,
      transactionId: entry.trx_id,
      operation: entry.op,
    }))
    .filter(
      ({ operation }) =>
        operation.type === 'custom_json_operation' &&
        ids.includes(operation.value.id)
    )
    .map(({ index, transactionId, operation }) => ({
      index,
      id: operation.value.id,
      transactionId,
      json: JSON.parse(operation.value.json),
    }));
}

async function getHistoryPage(
  account,
  { start = -1, limit = 1000 } = {}
) {
  const chain = await getChain();

  const safeLimit =
    start === -1
      ? Math.min(limit, 1000)
      : Math.min(limit, 1000, start + 1);

  if (safeLimit <= 0) {
    return [];
  }

  const history = await chain.api.account_history_api.get_account_history({
    account,
    start,
    limit: safeLimit,
    include_reversible: true,
    operation_filter_low: null,
  });

  return history.history || [];
}

async function getLingoOperations(
  account,
  { limit = 100, ids = DEFAULT_IDS } = {}
) {
  const historyRows = await getHistoryPage(account, {
    start: -1,
    limit,
  });

  return parseLingoOperations(historyRows, ids);
}

// Walk backwards through account history until the operation is found
// or the account's history is exhausted.
async function findLingoOperation(
  account,
  predicate,
  {
    ids = DEFAULT_IDS,
    pageSize = 1000,
    maxPages = 100,
  } = {}
) {
  let start = -1;

  for (let page = 0; page < maxPages; page += 1) {
    const historyRows = await getHistoryPage(account, {
      start,
      limit: pageSize,
    });

    if (historyRows.length === 0) {
      return null;
    }

    const operations = parseLingoOperations(historyRows, ids);
    const match = operations.find(predicate);

    if (match) {
      return match;
    }

    const oldestIndex = Math.min(
      ...historyRows.map(([index]) => index)
    );

    if (oldestIndex <= 0) {
      return null;
    }

    start = oldestIndex - 1;
  }

  throw new Error(
    `Account-history pagination exceeded ${maxPages} pages.`
  );
}

async function findLingoOperationByTransactionId(
  account,
  transactionId,
  options = {}
) {
  if (!transactionId) {
    return null;
  }

  return findLingoOperation(
    account,
    (op) => op.transactionId === transactionId,
    options
  );
}

module.exports = {
  getLingoOperations,
  findLingoOperation,
  findLingoOperationByTransactionId,
};