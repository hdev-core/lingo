// src/auth/verifySignature.js
//
// Verifies that a login challenge was signed by the claimed Hive account's
// posting key, using hive-tx for the cryptographic verification and a
// public Hive API node to fetch the account's current posting public key(s).
//
// This is deliberately separate from waxClient.js: wax/beekeeper are used
// there for the APP's own outgoing transactions (commit/reveal), whereas
// this module verifies an arbitrary PLAYER-supplied signature against a
// public key we look up on-chain -- a different job, hence a different
// (smaller) library.

const hiveConfig = require('../hive/config');
const { Signature, PublicKey } = require('hive-tx');
const crypto = require('crypto');

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
  // key_auths is an array of [publicKey, weight] pairs
  return account.posting.key_auths.map(([publicKey]) => publicKey);
}

/**
 * Verifies that `signatureHex` is a valid signature of `nonce`, produced by
 * one of `username`'s current posting keys.
 *
 * Note: hive-tx 7.2.0 does not expose `Signature.fromString` -- use
 * `Signature.from`. Verification is called on the PublicKey instance
 * (`publicKey.verify(...)`), not on the Signature. Both calls now live
 * inside the per-key try/catch, since bad/non-hex input can throw here
 * too, not just from an invalid key.
 *
 * @param {{ username: string, nonce: string, signatureHex: string }} params
 * @returns {Promise<boolean>}
 */
async function verifyChallengeSignature({ username, nonce, signatureHex }) {
  const postingPublicKeys = await getPostingPublicKeys(username);

  // Keychain signs the SHA256 digest of the message, per Hive's standard
  // "sign buffer" convention -- we must hash the nonce the same way before
  // verifying, or every signature will appear invalid.
  const messageHash = crypto.createHash('sha256').update(nonce).digest();

  return postingPublicKeys.some((keyString) => {
    try {
      const signature = Signature.from(signatureHex);
      const publicKey = PublicKey.fromString(keyString);
      return publicKey.verify(messageHash, signature);
    } catch {
      return false;
    }
  });
}

module.exports = { verifyChallengeSignature };