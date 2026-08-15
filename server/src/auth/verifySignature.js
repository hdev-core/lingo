// src/auth/verifySignature.js
//
// Verifies that a login challenge was signed by the claimed Hive account's
// posting key.
//
// Account lookup is attempted against a hardcoded list of trusted HTTPS
// mainnet RPC nodes.Temporary HTTP/RPC/timeout failures
// are distinguished from a decisive "account does not exist" result.

const hiveConfig = require('../hive/config');
const { Signature, PublicKey } = require('hive-tx');
const crypto = require('crypto');

const HIVE_RPC_TIMEOUT_MS = 8000;


class HiveAccountNotFoundError extends Error {
  constructor(username) {
    super(`Hive account not found: ${username}`);
    this.name = 'HiveAccountNotFoundError';
    this.code = 'HIVE_ACCOUNT_NOT_FOUND';
  }
}

class HiveRpcUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HiveRpcUnavailableError';
    this.code = 'HIVE_RPC_UNAVAILABLE';
  }
}

function getHiveRpcNodes() {
  return [...new Set(hiveConfig.apiEndpoints)];
}
async function fetchHiveAccount(node, username) {
  let response;

  try {
    response = await fetch(node, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(HIVE_RPC_TIMEOUT_MS),
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1,
      }),
    });
  } catch (err) {
    throw new HiveRpcUnavailableError(
      `Hive RPC request failed for ${node}: ${err.message}`
    );
  }

  if (!response.ok) {
    throw new HiveRpcUnavailableError(
      `Hive RPC ${node} returned HTTP ${response.status}`
    );
  }

  let body;

  try {
    body = await response.json();
  } catch {
    throw new HiveRpcUnavailableError(
      `Hive RPC ${node} returned an invalid JSON response`
    );
  }

  if (body.error) {
    const rpcMessage =
      typeof body.error.message === 'string'
        ? body.error.message
        : 'Unknown JSON-RPC error';

    throw new HiveRpcUnavailableError(
      `Hive RPC ${node} returned an RPC error: ${rpcMessage}`
    );
  }

  if (!Array.isArray(body.result)) {
    throw new HiveRpcUnavailableError(
      `Hive RPC ${node} returned an unexpected response`
    );
  }

  if (body.result.length === 0) {
    throw new HiveAccountNotFoundError(username);
  }

  const account = body.result[0];

  if (!account?.posting || !Array.isArray(account.posting.key_auths)) {
    throw new HiveRpcUnavailableError(
      `Hive RPC ${node} returned malformed account data`
    );
  }

  return account;
}

async function getPostingPublicKeys(username) {
  let lastError = null;

  for (const node of getHiveRpcNodes()) {
    try {
      const account = await fetchHiveAccount(node, username);

      return account.posting.key_auths.map(([publicKey]) => publicKey);
    } catch (err) {
      if (err instanceof HiveAccountNotFoundError) {
        throw err;
      }

      lastError = err;

      console.warn(
        `Hive RPC node failed, trying fallback if available: ${node} - ${err.message}`
      );
    }
  }

  throw new HiveRpcUnavailableError(
    lastError?.message || 'All configured Hive RPC nodes are unavailable'
  );
}

async function verifyChallengeSignature({
  username,
  nonce,
  signatureHex,
}) {
  const postingPublicKeys = await getPostingPublicKeys(username);

  const messageHash = crypto.createHash('sha256').update(nonce).digest();

  let signature;

  try {
    signature = Signature.from(signatureHex);
  } catch (err) {
    console.error('Signature parsing failed:', err.message);
    return false;
  }

  return postingPublicKeys.some((keyString) => {
    try {
      const publicKey = PublicKey.fromString(keyString);
      return publicKey.verify(messageHash, signature);
    } catch (err) {
      // A dropped bs58 override, incompatible library change, or malformed
      // key must not turn user-controlled input into an unhandled 500.
      console.error('Signature verification attempt failed:', err.message);
      return false;
    }
  });
}

module.exports = {
  verifyChallengeSignature,
  HiveAccountNotFoundError,
  HiveRpcUnavailableError,
};