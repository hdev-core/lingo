// src/auth/verifySignature.js
//
// Verifies that a login challenge was signed by the claimed Hive account's
// posting key, using hive-tx for signature verification and a public Hive
// API node to fetch the account's current posting public key(s).

const crypto = require('crypto');
const hiveConfig = require('../hive/config');
const { Signature, PublicKey } = require('hive-tx');

async function getPostingPublicKeys(username) {
  const response = await fetch(hiveConfig.apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'condenser_api.get_accounts',
      params: [[username]],
      id: 1,
    }),
  });

  const { result } = await response.json();
  if (!result || result.length === 0) {
    throw new Error(`Hive account not found: ${username}`);
  }

  const account = result[0];
  return account.posting.key_auths.map(([publicKey]) => publicKey);
}

/**
 * Verifies that `signatureHex` is a valid signature of `nonce`, produced by
 * one of `username`'s current posting keys.
 */
async function verifyChallengeSignature({ username, nonce, signatureHex }) {
  const postingPublicKeys = await getPostingPublicKeys(username);

  const messageHash = crypto.createHash('sha256').update(nonce).digest();
  const signature = Signature.from(signatureHex);

  return postingPublicKeys.some((keyString) => {
    try {
      const publicKey = PublicKey.fromString(keyString);
      return publicKey.verify(messageHash, signature);
    } catch {
      return false;
    }
  });
}

module.exports = { verifyChallengeSignature };