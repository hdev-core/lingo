/**
 * Daily reveal job.
 *
 * Safety:
 * - Explicit UTC eligibility.
 * - Recompute commit hash with the shared helper before reveal.
 * - Never broadcast while a SQL transaction is open.
 * - Reconcile against Hive before broadcasting, so a run that
 *   successfully broadcast and then crashed can be recovered.
 */

const { revealDigest } =
  require('../src/puzzle/hashFlows');

const { pool } =
  require('../src/db');

const { broadcastReveal } =
  require('../src/hive/waxClient');

const { findLingoOperation } =
  require('../src/hive/haf');

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function getEligiblePuzzle() {
  const result = await pool.query(
    `SELECT
        puzzle_date::text AS puzzle_date,
        answer,
        secret,
        commit_hash,
        reveal_tx_id,
        status
     FROM daily_puzzles
     WHERE status = 'live'
       AND puzzle_date <
         (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
     ORDER BY puzzle_date ASC
     LIMIT 1`
  );

  return result.rows[0] || null;
}

async function finalizeReveal(
  puzzleDate,
  txId
) {
  const result = await pool.query(
    `UPDATE daily_puzzles
     SET
       reveal_tx_id = $2,
       status = 'revealed'
     WHERE
       puzzle_date = $1
       AND status = 'live'
     RETURNING puzzle_date`,
    [
      puzzleDate,
      txId,
    ]
  );

  if (result.rowCount > 0) {
    return;
  }

  const current = await pool.query(
    `SELECT
       status,
       reveal_tx_id
     FROM daily_puzzles
     WHERE puzzle_date = $1`,
    [puzzleDate]
  );

  const row = current.rows[0];

  if (
    row &&
    row.status === 'revealed' &&
    row.reveal_tx_id === txId
  ) {
    return;
  }

  throw new Error(
    `Could not finalize reveal for ${puzzleDate}; ` +
    `database state changed unexpectedly.`
  );
}

async function findMatchingReveal(
  appAccount,
  puzzle
) {
  return findLingoOperation(
    appAccount,

    (op) =>
      op.json &&
      op.json.puzzle_date ===
        puzzle.puzzle_date &&
      op.json.answer ===
        puzzle.answer &&
      op.json.secret ===
        puzzle.secret,

    {
      ids: ['lingo_reveal'],
    }
  );
}

async function findConflictingReveal(
  appAccount,
  puzzle
) {
  return findLingoOperation(
    appAccount,

    (op) =>
      op.json &&
      op.json.puzzle_date ===
        puzzle.puzzle_date &&
      (
        op.json.answer !==
          puzzle.answer ||
        op.json.secret !==
          puzzle.secret
      ),

    {
      ids: ['lingo_reveal'],
    }
  );
}

async function reconcileReveal(
  appAccount,
  puzzle,
  attempts = 10
) {
  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {
    const existing =
      await findMatchingReveal(
        appAccount,
        puzzle
      );

    if (existing) {
      return existing;
    }

    const conflict =
      await findConflictingReveal(
        appAccount,
        puzzle
      );

    if (conflict) {
      throw new Error(
        `CONFLICT: ${puzzle.puzzle_date} ` +
        `already has different on-chain reveal ` +
        `data (${conflict.transactionId}). ` +
        `Refusing to broadcast.`
      );
    }

    if (attempt < attempts) {
      console.log(
        `Waiting for account-history reveal ` +
        `recovery check (${attempt}/${attempts})...`
      );

      await delay(3000);
    }
  }

  return null;
}

async function main() {
  const puzzle =
    await getEligiblePuzzle();

  if (!puzzle) {
    console.log(
      'No completed live puzzle is due for reveal.'
    );

    return;
  }

  const puzzleDate =
    puzzle.puzzle_date;

  // The reveal path now uses the SAME canonical hash format as commit
  // and verify.
  const recomputedHash =
    revealDigest({
      puzzleDate,
      answer: puzzle.answer,
      secret: puzzle.secret,
    });

  if (
    recomputedHash !==
    puzzle.commit_hash
  ) {
    throw new Error(
      `Stored commit hash mismatch for ` +
      `${puzzleDate}; refusing to reveal ` +
      `inconsistent answer/secret.`
    );
  }

  const appAccount =
    process.env.HIVE_APP_ACCOUNT;

  if (!appAccount) {
    throw new Error(
      'HIVE_APP_ACCOUNT is not set.'
    );
  }

  // A previous run may have broadcast successfully and then failed
  // before updating Postgres. Recover that transaction first.
  const existing =
    await reconcileReveal(
      appAccount,
      puzzle
    );

  if (existing) {
    await finalizeReveal(
      puzzleDate,
      existing.transactionId
    );

    console.log(
      `Recovered ${puzzleDate} ` +
      `from existing on-chain reveal.`
    );

    return;
  }

  // IMPORTANT: there is NO SQL transaction open here.
  console.log(
    `Broadcasting lingo_reveal for ` +
    `${puzzleDate}...`
  );

  const { txId } =
    await broadcastReveal({
      puzzleDate,
      answer: puzzle.answer,
      secret: puzzle.secret,
    });

  console.log(
    `  -> revealed, tx id: ${txId}`
  );

  await finalizeReveal(
    puzzleDate,
    txId
  );

  console.log(
    `${puzzleDate} revealed and marked complete.`
  );
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(
        'daily_reveal failed:',
        err
      );

      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  getEligiblePuzzle,
  finalizeReveal,
  reconcileReveal,
  main,
};