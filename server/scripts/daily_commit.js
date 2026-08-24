/**
 * Daily commit job.
 *
 * Safety:
 * - Reserve DB state BEFORE broadcasting.
 * - Never broadcast inside an open SQL transaction.
 * - Recompute the stored hash using the shared helper.
 * - When recovering a pending row, search Hive first.
 * - If the exact commit was already broadcast, finalize it instead of
 *   broadcasting another transaction.
 * - If a DIFFERENT real commit exists for the same date, stop.
 */

const crypto = require('crypto');

const { commitDigest } =
  require('../src/puzzle/hashFlows');

const { pool } =
  require('../src/db');

const { broadcastCommit } =
  require('../src/hive/waxClient');

const { findLingoOperation } =
  require('../src/hive/haf');

const {
  pickWordForDate,
  markWordUsed,
} = require('../src/game/wordSelection');

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function reserveOrResume(puzzleDate) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtext('lingo_daily_commit')
       )`
    );

    const existing = await client.query(
      `SELECT
          puzzle_date::text AS puzzle_date,
          puzzle_number,
          word_length,
          answer,
          secret,
          commit_hash,
          commit_tx_id,
          status
       FROM daily_puzzles
       WHERE puzzle_date = $1`,
      [puzzleDate]
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];

      if (row.status !== 'pending') {
        console.log(
          `Puzzle for ${puzzleDate} already exists ` +
          `with status "${row.status}" -- nothing to do.`
        );

        await client.query('ROLLBACK');
        return null;
      }

      console.log(
        `Resuming pending reservation for ${puzzleDate}.`
      );

      await client.query('ROLLBACK');

      return {
        ...row,
        resumed: true,
      };
    }

    const wordLength = 5;

    const {
      id: wordId,
      word: answer,
    } = await pickWordForDate(
      client,
      { wordLength }
    );

    const secret =
      crypto.randomBytes(16).toString('hex');

    const commitHash = commitDigest({
      puzzleDate,
      answer,
      secret,
    });

    const puzzleNumberResult =
      await client.query(
        `SELECT
           COALESCE(MAX(puzzle_number), 0) + 1
             AS next
         FROM daily_puzzles`
      );

    const puzzleNumber =
      puzzleNumberResult.rows[0].next;

    await client.query(
      `INSERT INTO daily_puzzles
         (
           puzzle_date,
           puzzle_number,
           word_length,
           word_id,
           answer,
           secret,
           commit_hash,
           status
         )
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [
        puzzleDate,
        puzzleNumber,
        wordLength,
        wordId,
        answer,
        secret,
        commitHash,
      ]
    );

    await markWordUsed(
      client,
      wordId,
      puzzleDate
    );

    await client.query('COMMIT');

    console.log(
      `Reserved puzzle #${puzzleNumber} ` +
      `for ${puzzleDate} (status=pending).`
    );

    return {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      word_length: wordLength,
      answer,
      secret,
      commit_hash: commitHash,
      resumed: false,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function finalize(puzzleDate, txId) {
  const result = await pool.query(
    `UPDATE daily_puzzles
     SET
       commit_tx_id = $2,
       status = 'live'
     WHERE
       puzzle_date = $1
       AND status = 'pending'
     RETURNING puzzle_number`,
    [
      puzzleDate,
      txId,
    ]
  );

  if (result.rowCount > 0) {
    return;
  }

  const current = await pool.query(
    `SELECT status, commit_tx_id
     FROM daily_puzzles
     WHERE puzzle_date = $1`,
    [puzzleDate]
  );

  const row = current.rows[0];

  // Another recovery may already have finalized the same transaction.
  if (
    row &&
    row.status === 'live' &&
    row.commit_tx_id === txId
  ) {
    return;
  }

  throw new Error(
    `Could not finalize ${puzzleDate}; ` +
    `database state changed unexpectedly.`
  );
}

async function findMatchingCommit(
  appAccount,
  reservation
) {
  return findLingoOperation(
    appAccount,

    (op) =>
      op.json &&
      op.json.puzzle_date ===
        reservation.puzzle_date &&
      op.json.commit_hash ===
        reservation.commit_hash,

    {
      ids: ['lingo_commit'],
    }
  );
}

async function findConflictingCommit(
  appAccount,
  reservation
) {
  return findLingoOperation(
    appAccount,

    (op) =>
      op.json &&
      op.json.puzzle_date ===
        reservation.puzzle_date &&
      op.json.commit_hash !==
        reservation.commit_hash,

    {
      ids: ['lingo_commit'],
    }
  );
}

async function reconcileBeforeBroadcast(
  appAccount,
  reservation
) {
  // For a brand-new reservation, one check is enough.
  //
  // For a resumed pending reservation, the previous process may have
  // successfully broadcast and crashed before saving its tx id.
  // Give account-history indexing time to expose that transaction.
  const attempts =
    reservation.resumed ? 10 : 1;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {
    const existing =
      await findMatchingCommit(
        appAccount,
        reservation
      );

    if (existing) {
      console.log(
        `Found existing matching on-chain commit ` +
        `for ${reservation.puzzle_date}: ` +
        `${existing.transactionId}`
      );

      return existing;
    }

    const conflict =
      await findConflictingCommit(
        appAccount,
        reservation
      );

    if (conflict) {
      throw new Error(
        `CONFLICT: ${reservation.puzzle_date} ` +
        `already has a different on-chain ` +
        `lingo_commit (${conflict.transactionId}). ` +
        `Refusing to broadcast.`
      );
    }

    if (attempt < attempts) {
      console.log(
        `Waiting for account-history recovery ` +
        `check (${attempt}/${attempts})...`
      );

      await delay(3000);
    }
  }

  return null;
}

async function main() {
  const puzzleDate =
    new Date().toISOString().slice(0, 10);

  const reservation =
    await reserveOrResume(puzzleDate);

  if (!reservation) {
    return;
  }

  // Verify the exact persisted data still hashes to the reserved hash.
  const recomputed = commitDigest({
    puzzleDate: reservation.puzzle_date,
    answer: reservation.answer,
    secret: reservation.secret,
  });

  if (
    recomputed !== reservation.commit_hash
  ) {
    throw new Error(
      `Stored commit hash does not match ` +
      `reserved puzzle data for ${puzzleDate}.`
    );
  }

  const appAccount =
    process.env.HIVE_APP_ACCOUNT;

  if (!appAccount) {
    throw new Error(
      'HIVE_APP_ACCOUNT is not set.'
    );
  }

  const existing =
    await reconcileBeforeBroadcast(
      appAccount,
      reservation
    );

  if (existing) {
    await finalize(
      puzzleDate,
      existing.transactionId
    );

    console.log(
      `Recovered ${puzzleDate} from existing ` +
      `on-chain commit; puzzle is live.`
    );

    return;
  }

  console.log(
    `Broadcasting lingo_commit for puzzle ` +
    `#${reservation.puzzle_number} ` +
    `(${puzzleDate})...`
  );

  const { txId } =
    await broadcastCommit({
      puzzleDate,
      puzzleNumber:
        reservation.puzzle_number,
      wordLength:
        reservation.word_length,
      commitHash:
        reservation.commit_hash,
    });

  console.log(
    `  -> committed, tx id: ${txId}`
  );

  await finalize(
    puzzleDate,
    txId
  );

  console.log(
    `Puzzle #${reservation.puzzle_number} ` +
    `for ${puzzleDate} is live.`
  );
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(
        'daily_commit failed:',
        err
      );

      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  reserveOrResume,
  finalize,
  reconcileBeforeBroadcast,
  main,
};