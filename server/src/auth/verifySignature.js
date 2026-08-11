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
  return account.posting.key_auths.map(([publicKey]) => publicKey);
}

async function verifyChallengeSignature({ username, nonce, signatureHex }) {
  const postingPublicKeys = await getPostingPublicKeys(username);

  const messageHash = crypto.createHash('sha256').update(nonce).digest();

  return postingPublicKeys.some((keyString) => {
    try {
      const signature = Signature.from(signatureHex);
      const publicKey = PublicKey.fromString(keyString);
      return publicKey.verify(messageHash, signature);
    } catch (err) {
      // A dropped bs58 override, a library upgrade, or malformed input all
      // land here as `false` with no signal. Log it so a silent 100%
      // login outage isn't invisible in production logs.
      console.error('Signature verification attempt failed:', err.message);
      return false;
    }
  });
}

module.exports = { verifyChallengeSignature };