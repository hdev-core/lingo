/**
 * Reveals the oldest live puzzle whose UTC day has already ended.
 *
 * The database state—not the GitHub runner's wall-clock date—decides which
 * puzzle is eligible. This stays correct if a scheduled run starts late.
 */

const { pool } = require('../src/db');
const { broadcastReveal } = require('../src/hive/waxClient');

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT puzzle_date::text AS puzzle_date, answer, secret, status
       FROM daily_puzzles
       WHERE status = 'live'
         AND puzzle_date < CURRENT_DATE
       ORDER BY puzzle_date ASC
       LIMIT 1
       FOR UPDATE`
    );
    const puzzle = result.rows[0];

    if (!puzzle) {
      console.log('No completed live puzzle is due for reveal.');
      await client.query('ROLLBACK');
      return;
    }

    const puzzleDate = puzzle.puzzle_date;

    console.log(`Broadcasting lingo_reveal for ${puzzleDate}...`);
    const { txId } = await broadcastReveal({
      puzzleDate,
      answer: puzzle.answer,
      secret: puzzle.secret,
    });
    console.log(`  -> revealed, tx id: ${txId}`);

    await client.query(
      `UPDATE daily_puzzles
       SET reveal_tx_id = $2, status = 'revealed'
       WHERE puzzle_date = $1`,
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
