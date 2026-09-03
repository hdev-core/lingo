// src/routes/puzzle.js
//
// Public metadata for the day's puzzle, plus the caller's own progress.
//
// SECURITY: this reads from the `daily_puzzles_public` VIEW, never the table.
// The view (see 010_security_lockdown.sql) deliberately omits `answer` and
// `secret`. Selecting from daily_puzzles here -- even with an explicit column
// list -- would be one careless edit away from leaking the answer and making
// the whole commit-reveal scheme pointless.

const express = require('express');
const { pool } = require('../db');
const { optionalAuth } = require('../auth/sessionFromRequest');

const router = express.Router();
const MAX_GUESSES = 6;

router.get('/puzzle/today', optionalAuth, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const today = new Date().toISOString().slice(0, 10); // UTC calendar date

    const result = await client.query(
      `SELECT puzzle_date, puzzle_number, word_length, status, commit_hash, commit_tx_id
       FROM daily_puzzles_public
       WHERE puzzle_date = $1`,
      [today]
    );
    const puzzle = result.rows[0];

    if (!puzzle) {
      return res.status(404).json({ error: 'no puzzle for today' });
    }

    const payload = {
      puzzleDate: puzzle.puzzle_date,
      puzzleNumber: puzzle.puzzle_number,
      wordLength: puzzle.word_length,
      maxGuesses: MAX_GUESSES,
      status: puzzle.status,
      commitHash: puzzle.commit_hash,
      commitTxId: puzzle.commit_tx_id,
      guesses: [],
      solved: false,
      attemptsRemaining: MAX_GUESSES,
    };

    // Restore an in-progress game from the server rather than localStorage, so
    // a refresh (or a different device) resumes exactly where the player was.
    if (req.hiveUsername) {
      const prior = await client.query(
        `SELECT guess_word, validation_result, attempt_number
         FROM guesses
         WHERE hive_username = $1 AND puzzle_date = $2
         ORDER BY attempt_number ASC`,
        [req.hiveUsername, today]
      );

      payload.guesses = prior.rows.map((row) => ({
        word: row.guess_word,
        feedback:
          typeof row.validation_result === 'string'
            ? JSON.parse(row.validation_result)
            : row.validation_result,
        attemptNumber: row.attempt_number,
      }));

      payload.solved = payload.guesses.some(
        (g) => Array.isArray(g.feedback) && g.feedback.every((f) => f.state === 'correct')
      );
      payload.attemptsRemaining = Math.max(0, MAX_GUESSES - payload.guesses.length);
    }

    res.status(200).json(payload);
  } catch (err) {
    console.error('puzzle route error:', err);
    res.status(500).json({ error: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
