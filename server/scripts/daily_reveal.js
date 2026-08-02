/**
 * scripts/daily_reveal.js
 *
 * Runs once per day, end-of-day UTC (via the scheduled GitHub Actions
 * workflow). Reveals the day's answer/secret publicly on-chain via
 * lingo_reveal, and flips daily_puzzles.status to 'revealed' -- from that
 * point on, GET /api/verify/:date is allowed to include answer/secret in
 * its response (see src/routes/verify.js).
 *
 * Usage: node --env-file=.env scripts/daily_reveal.js
 */

const { pool } = require('../src/db');
const { broadcastReveal } = require('../src/hive/waxClient');

async function main() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1); // edited since prev line may reveal new puzzel (today's) instead of the old one (yesterday's): const puzzleDate = new Date().toISOString().slice(0, 10);
  const puzzleDate = date.toISOString().slice(0, 10); // UTC calendar date
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT puzzle_date, answer, secret, status FROM daily_puzzles
       WHERE puzzle_date = $1 FOR UPDATE`,
      [puzzleDate]
    );
    const puzzle = result.rows[0];

    if (!puzzle) {
      throw new Error(`No daily_puzzles row for ${puzzleDate} -- did daily_commit run today?`);
    }
    if (puzzle.status === 'revealed') {
      console.log(`Puzzle for ${puzzleDate} was already revealed -- nothing to do.`);
      await client.query('ROLLBACK');
      return;
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
    console.log(`Puzzle for ${puzzleDate} revealed and marked in the DB.`);
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