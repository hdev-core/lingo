/**
 * Mainnet commit/reveal smoke test.
 *
 * Broadcasts a real lingo_commit and lingo_reveal custom_json operation,
 * verifies both are available through account-history, and reads Hive-Engine
 * token data. This intentionally uses mainnet and must use the dedicated
 * app account's posting key only.
 */

const crypto = require('crypto');
const { broadcastCommit, broadcastReveal } = require('../src/hive/waxClient');
const { getLingoOperations } = require('../src/hive/haf');
const sscClient = require('../src/hive-engine/sscClient');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSmokeOperations(account, commitHash, secret) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const ops = await getLingoOperations(account, {
      limit: 50,
      ids: ['lingo_commit', 'lingo_reveal'],
    });

    const commit = ops.find((op) => op.json.commit_hash === commitHash);
    const reveal = ops.find(
      (op) => op.json.secret === secret && op.json.answer === 'tests'
    );

    if (commit && reveal) {
      return { commit, reveal };
    }

    console.log(`  -> waiting for account-history indexing (${attempt}/10)...`);
    await delay(3000);
  }

  throw new Error(
    'Commit and/or reveal was not found through account history within 30 seconds.'
  );
}

async function main() {
  if (process.env.HIVE_NETWORK !== 'mainnet') {
    throw new Error(
      'Refusing to run this mainnet smoke test unless HIVE_NETWORK=mainnet.'
    );
  }

  const appAccount = process.env.HIVE_APP_ACCOUNT;
  if (!appAccount) {
    throw new Error('HIVE_APP_ACCOUNT is not set.');
  }

  console.log('Network: mainnet');
  console.log(`App account: ${appAccount}`);

  const puzzleDate = new Date().toISOString().slice(0, 10);
  const answer = 'tests';
  const secret = crypto.randomBytes(16).toString('hex');
  const commitHash = crypto
    .createHash('sha256')
    .update(`${puzzleDate}|${answer}|${secret}`)
    .digest('hex');

  console.log('\n[1/3] Broadcasting lingo_commit via WAX...');
  const { txId: commitTxId } = await broadcastCommit({
    puzzleDate,
    puzzleNumber: 0,
    wordLength: answer.length,
    commitHash,
  });
  console.log(`  -> commit broadcast ok, tx id: ${commitTxId}`);

  console.log('\n[2/3] Broadcasting lingo_reveal via WAX...');
  const { txId: revealTxId } = await broadcastReveal({
    puzzleDate,
    answer,
    secret,
  });
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