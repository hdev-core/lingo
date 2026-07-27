// src/auth/verifySignature.js
//
// Verifies that a login challenge was signed by the claimed Hive account's
// posting key using WAX crypto utilities.
//
// Flow:
// 1. Fetch the account posting keys from Hive
// 2. Hash the nonce the same way Keychain signs messages
// 3. Recover the public key from the signature using WAX
// 4. Compare the recovered key with posting.key_auths

const crypto = require('crypto');
const hiveConfig = require('../hive/config');
const { getChain } = require('../hive/waxClient');

async function getPostingPublicKeys(username) {
  const response = await fetch(hiveConfig.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

  // Simplification:
  // Any posting.key_auths key is accepted.
  // Weight thresholds and delegated authorities are not resolved.
  // This is acceptable for game authentication.

  return account.posting.key_auths.map(
    ([publicKey]) => publicKey
  );
}

async function verifyChallengeSignature({
  username,
  nonce,
  signatureHex,
}) {
  const postingPublicKeys = await getPostingPublicKeys(username);

  // Keychain signs the SHA256 digest of the message.
  const messageHash = crypto
    .createHash('sha256')
    .update(nonce)
    .digest();

  const chain = await getChain();

  const recoveredPublicKey =
    chain.api.protocol.cpp_get_public_key_from_signature(
      messageHash,
      signatureHex
    );

  // Temporary debugging for end-to-end verification:
  // remove after confirming recovered key format matches posting.key_auths.
  console.log('Recovered key:', recoveredPublicKey);
  console.log('Posting keys:', postingPublicKeys);

  return postingPublicKeys.includes(recoveredPublicKey);
}

module.exports = {
  verifyChallengeSignature,
};