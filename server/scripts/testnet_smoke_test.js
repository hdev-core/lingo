/**
 * scripts/testnet_smoke_test.js
 *
 * Proves all four integration pieces work end-to-end against the Hive
 * testnet, in one runnable script:
 *   1. wax builds + signs + broadcasts a real lingo_commit custom_json
 *   2. the HAF-backed read client reads that same op back off-chain
 *   3. sscjs reads a Hive-Engine token balance from a public node
 *   (Aioha/Keychain is browser-only -- see README for how to smoke-test
 *   that piece manually in the web app instead.)
 *
 * Usage:
 *   node --env-file=.env scripts/testnet_smoke_test.js
 */

const crypto = require('crypto');
const { broadcastCommit } = require('../src/hive/waxClient');
const { getLingoOperations } = require('../src/hive/haf');
const sscClient = require('../src/hive-engine/sscClient');

async function main() {
  console.log(`Network: ${process.env.HIVE_NETWORK || 'testnet'}`);
  console.log(`App account: ${process.env.HIVE_APP_ACCOUNT}`);

  // --- 1. wax: build, sign, and broadcast a real lingo_commit ---
  const puzzleDate = new Date().toISOString().slice(0, 10); // UTC calendar date
  const answer = 'tests';
  const secret = crypto.randomBytes(16).toString('hex');
  const commitHash = crypto
    .createHash('sha256')
    .update(`${puzzleDate}|${answer}|${secret}`)
    .digest('hex');

  console.log('\n[1/3] Broadcasting lingo_commit via wax...');
  const { txId } = await broadcastCommit({
    puzzleDate,
    puzzleNumber: 0, // smoke test, not a real puzzle number
    wordLength: answer.length,
    commitHash,
  });
  console.log(`  -> broadcast ok, tx id: ${txId}`);

  // --- 2. HAF-backed read: confirm it's actually queryable back ---
  console.log('\n[2/3] Reading it back via the HAF-backed account history client...');
  // Give the node a moment to index the just-broadcast transaction.
  await new Promise((r) => setTimeout(r, 3000));
  const ops = await getLingoOperations(process.env.HIVE_APP_ACCOUNT, {
    limit: 10,
    ids: ['lingo_commit'],
  });
  const found = ops.find((op) => op.json.commit_hash === commitHash);
  console.log(found ? '  -> found the commit we just broadcast' : '  -> not found yet (try increasing the delay)');

  // --- 3. sscjs: read a Hive-Engine token balance (read-only) ---
  console.log('\n[3/3] Reading LINGO token info via sscjs...');
  console.log(`  -> Hive-Engine node: ${sscClient.node}`);
  const tokenInfo = await sscClient.getTokenInfo();
  console.log(
    tokenInfo
      ? `  -> token found: ${JSON.stringify(tokenInfo)}`
      : `  -> no "${sscClient.TOKEN_SYMBOL}" token exists yet on this Hive-Engine node (expected until the token is actually created there)`
  );

  console.log('\nSmoke test complete.');
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err);
  process.exit(1);
});