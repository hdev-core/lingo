/**
 * Mainnet commit/reveal smoke test.
 *
 * FIXED (review #7): now broadcasts under a dedicated lingo_smoke_commit /
 * lingo_smoke_reveal operation id, never the real lingo_commit /
 * lingo_reveal ids. This structurally guarantees a smoke-test broadcast
 * can never be confused with, or shadow, a real day's puzzle commitment
 * -- regardless of what date happens to be used, since haf.js's default
 * id filter for real gameplay ops will never match a smoke op at all.
 *
 * This intentionally uses mainnet and must use the dedicated app
 * account's posting key only.
 */

const crypto = require('crypto');
const { calculateCommitHash } = require('../src/puzzle/commitHash');
const { broadcastSmokeCommit, broadcastSmokeReveal } = require('../src/hive/waxClient');
const { getLingoOperations } = require('../src/hive/haf');
const sscClient = require('../src/hive-engine/sscClient');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSmokeOperations(account, commitHash, secret) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const ops = await getLingoOperations(account, {
      limit: 50,
      ids: ['lingo_smoke_commit', 'lingo_smoke_reveal'], // NOT lingo_commit/lingo_reveal
    });

    const commit = ops.find((op) => op.json.commit_hash === commitHash);
    const reveal = ops.find((op) => op.json.secret === secret && op.json.answer === 'tests');

    if (commit && reveal) {
      return { commit, reveal };
    }

    console.log(`  -> waiting for account-history indexing (${attempt}/10)...`);
    await delay(3000);
  }

  throw new Error('Commit and/or reveal was not found through account history within 30 seconds.');
}

async function main() {
  if (process.env.HIVE_NETWORK !== 'mainnet') {
    throw new Error('Refusing to run this mainnet smoke test unless HIVE_NETWORK=mainnet.');
  }

  if (process.env.MAINNET_SMOKE_CONFIRMATION !== 'BROADCAST_MAINNET_SMOKE') {
    throw new Error('Refusing to broadcast. Set MAINNET_SMOKE_CONFIRMATION=BROADCAST_MAINNET_SMOKE.');
  }

  const appAccount = process.env.HIVE_APP_ACCOUNT;
  if (!appAccount) {
    throw new Error('HIVE_APP_ACCOUNT is not set.');
  }

  console.log('Network: mainnet');
  console.log(`App account: ${appAccount}`);
  console.log('Operation ids: lingo_smoke_commit / lingo_smoke_reveal (isolated from real gameplay ops)');

  const puzzleDate = new Date().toISOString().slice(0, 10);
  const answer = 'tests';
  const secret = crypto.randomBytes(16).toString('hex');
  const commitHash = calculateCommitHash({ puzzleDate, answer, secret });

  console.log('\n[1/3] Broadcasting lingo_smoke_commit via WAX...');
  const { txId: commitTxId } = await broadcastSmokeCommit({ puzzleDate, commitHash });
  console.log(`  -> commit broadcast ok, tx id: ${commitTxId}`);

  console.log('\n[2/3] Broadcasting lingo_smoke_reveal via WAX...');
  const { txId: revealTxId } = await broadcastSmokeReveal({ puzzleDate, answer, secret });
  console.log(`  -> reveal broadcast ok, tx id: ${revealTxId}`);

  console.log('\n[3/3] Verifying both operations through account history...');
  await waitForSmokeOperations(appAccount, commitHash, secret);
  console.log('  -> commit and reveal found on-chain');

  console.log('\nHive-Engine token info...');
  console.log(`  -> Hive-Engine node: ${sscClient.node}`);
  const tokenInfo = await sscClient.getTokenInfo();
  console.log(
    tokenInfo
      ? `  -> token found: ${JSON.stringify(tokenInfo)}`
      : `  -> no "${sscClient.TOKEN_SYMBOL}" token exists yet`
  );

  console.log('\nMainnet smoke test complete.');
  console.log(`Commit tx id: ${commitTxId}`);
  console.log(`Reveal tx id: ${revealTxId}`);
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err);
  process.exit(1);
});