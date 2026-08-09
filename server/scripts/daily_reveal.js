/**
 * scripts/daily_reveal.js
 *
 * Runs once per day, at 23:59 UTC (via the scheduled GitHub Actions
 * workflow) -- after that day's puzzle has been live and playable all day.
 *
 * FIXED: reveals TODAY's puzzle (the day that's ending, right before
 * midnight), not yesterday's. The previous version subtracted a day
 * before computing puzzleDate, which both revealed the wrong day's
 * answer and threw on the very first run (no puzzle existed for
 * "yesterday" relative to day one). At 23:59 UTC, "today" per
 * new Date().toISOString() IS the day whose puzzle should be revealed --
 * no date arithmetic needed at all.
 *
 * 1. Finds today's daily_puzzles row (status should be 'live').
 * 2. Broadcasts lingo_reveal (answer + secret) via wax, signed with the
 *    app account's POSTING key.
 * 3. Flips status to 'revealed'.
 *
 * Usage: node scripts/daily_reveal.js
 * (no --env-file flag -- see package.json note: CI supplies real env vars
 * directly, a literal .env file won't exist on the runner)
 */

const { pool } = require('../src/db');
const { broadcastReveal } = require('../src/hive/waxClient');

async function main() {
  const puzzleDate = new Date().toISOString().slice(0, 10); // UTC calendar date
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT puzzle_date, answer, secret, status
       FROM daily_puzzles
       WHERE puzzle_date = $1
       FOR UPDATE`,
      [puzzleDate]
    );
    const puzzle = result.rows[0];

    if (!puzzle) {
      throw new Error(`No daily_puzzles row for ${puzzleDate} -- did daily_commit.js run today?`);
    }
    if (puzzle.status === 'revealed') {
      console.log(`${puzzleDate} was already revealed -- nothing to do.`);
      await client.query('ROLLBACK');
      return;
    }
    if (puzzle.status !== 'live') {
      throw new Error(`Unexpected status "${puzzle.status}" for ${puzzleDate} -- refusing to reveal.`);
    }

    console.log(`Broadcasting lingo_reveal for ${puzzleDate}...`);
    const { txId } = await broadcastReveal({
      puzzleDate,
      answer: puzzle.answer,
      secret: puzzle.secret,
    });
    console.log(`  -> revealed, tx id: ${txId}`);

    await client.query(
      `UPDATE daily_puzzles SET reveal_tx_id = $2, status = 'revealed' WHERE puzzle_date = $1`,
      [puzzleDate, txId]
    );

    await client.query('COMMIT');
    console.log(`${puzzleDate} revealed and marked complete.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('daily_reveal failed:', err);
  process.exit(1);
});