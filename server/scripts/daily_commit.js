/**
 * Runs once per day via the scheduled GitHub Actions workflow.
 *
 * 1. Selects today's word from the curated word bank.
 * 2. Generates a secret and commit_hash = SHA256(date|answer|secret).
 * 3. Broadcasts lingo_commit containing only the public hash, signed with
 *    the dedicated app account's posting key.
 * 4. Stores the puzzle, answer, secret, commit hash, and transaction ID in
 *    daily_puzzles with status='live'.
 * 5. Marks the selected word as used.
 *
 * A transaction-scoped PostgreSQL advisory lock prevents overlapping
 * scheduled/manual runs from creating two puzzles for the same UTC date.
 */

const crypto = require('crypto');
const { pool } = require('../src/db');
const { broadcastCommit } = require('../src/hive/waxClient');
const { pickWordForDate, markWordUsed } = require('../src/game/wordSelection');

async function main() {
  const puzzleDate = new Date().toISOString().slice(0, 10); // UTC calendar date
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('lingo_daily_commit'))`);

    const existing = await client.query(
      `SELECT puzzle_date FROM daily_puzzles WHERE puzzle_date = $1`,
      [puzzleDate]
    );
    if (existing.rows[0]) {
      console.log(`Puzzle for ${puzzleDate} already exists -- nothing to do.`);
      await client.query('ROLLBACK');
      return;
    }

    const wordLength = 5; // MVP: fixed length, see wordSelection.js comment
    const { id: wordId, word: answer } = await pickWordForDate(client, { wordLength });

    const secret = crypto.randomBytes(16).toString('hex');
    const commitHash = crypto
      .createHash('sha256')
      .update(`${puzzleDate}|${answer}|${secret}`)
      .digest('hex');

    const puzzleNumberResult = await client.query(
      `SELECT COALESCE(MAX(puzzle_number), 0) + 1 AS next FROM daily_puzzles`
    );
    const puzzleNumber = puzzleNumberResult.rows[0].next;

    console.log(`Broadcasting lingo_commit for puzzle #${puzzleNumber} (${puzzleDate})...`);
    const { txId } = await broadcastCommit({
      puzzleDate,
      puzzleNumber,
      wordLength,
      commitHash,
    });
    console.log(`  -> committed, tx id: ${txId}`);

    await client.query(
      `INSERT INTO daily_puzzles
         (puzzle_date, puzzle_number, word_length, word_id, answer, secret,
          commit_hash, commit_tx_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'live')`,
      [puzzleDate, puzzleNumber, wordLength, wordId, answer, secret, commitHash, txId]
    );
    await markWordUsed(client, wordId, puzzleDate);

    await client.query('COMMIT');
    console.log(`Puzzle #${puzzleNumber} for ${puzzleDate} is live.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('daily_commit failed:', err);
  process.exit(1);
});
