// src/routes/guess.js
//
// POST /api/guess -- the one endpoint that ever reads daily_puzzles.answer.
// It NEVER includes the answer, the word_id, or the secret anywhere in its
// response -- only per-letter Wordle feedback. This is the enforcement
// point for the "answer/secret never exposed to the frontend" requirement
// from the security lockdown work.
//
// FIXED (review #3): previously guessed at the auth shape (JWT_SECRET,
// payload.hiveUsername) instead of reusing the real issuer. That
// mismatched the actual session.js (SESSION_JWT_SECRET, payload.username,
// via verifySession()) and 401'd every authenticated request. Now reuses
// verifySession() directly -- no separate jwt.verify call, no guessed
// secret name, no guessed payload field.

const express = require('express');
const { pool } = require('../db');
const { getFeedback } = require('../game/wordFeedback');
const { isValidGuess } = require('../game/validWords');
const { requireAuth } = require('../auth/sessionFromRequest');

const router = express.Router();

router.post('/guess', requireAuth, async (req, res) => {
  const hiveUsername = req.hiveUsername;
  const { guess } = req.body;

  if (typeof guess !== 'string' || guess.length === 0) {
    return res.status(400).json({ error: 'guess is required' });
  }

  let client;
  try {
    client = await pool.connect();
    const today = new Date().toISOString().slice(0, 10); // UTC calendar date

    // Explicit column list -- never `SELECT *` on daily_puzzles.
    const puzzleResult = await client.query(
      `SELECT word_length, answer, status
       FROM daily_puzzles
       WHERE puzzle_date = $1`,
      [today]
    );
    const puzzle = puzzleResult.rows[0];

    if (!puzzle || puzzle.status !== 'live') {
      return res.status(404).json({ error: 'no live puzzle for today' });
    }

    if (guess.length !== puzzle.word_length) {
      return res
        .status(400)
        .json({ error: `guess must be ${puzzle.word_length} letters` });
    }

    if (!isValidGuess(guess)) {
      return res.status(400).json({ error: 'not a recognized word' });
    }

    const attemptsResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM guesses
       WHERE hive_username = $1 AND puzzle_date = $2`,
      [hiveUsername, today]
    );
    const attemptNumber = attemptsResult.rows[0].count + 1;

    if (attemptNumber > 6) {
      return res.status(409).json({ error: 'no attempts remaining today' });
    }

    const feedback = getFeedback(puzzle.answer, guess);
    const solved = guess.toLowerCase() === puzzle.answer.toLowerCase();

    // The UNIQUE (hive_username, puzzle_date, attempt_number) constraint
    // from the schema is the real backstop here -- if two requests race,
    // the DB itself rejects the duplicate rather than relying on this
    // application-level count being perfectly synchronized.
    await client.query(
      `INSERT INTO guesses (hive_username, puzzle_date, attempt_number, guess_word, validation_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [hiveUsername, today, attemptNumber, guess.toLowerCase(), JSON.stringify(feedback)]
    );

    // Response includes feedback and solved/attempts-used only -- never
    // puzzle.answer, never word_id, never secret.
    res.status(200).json({
      feedback,
      solved,
      attemptNumber,
      attemptsRemaining: 6 - attemptNumber,
    });
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation -- the DB constraint caught a race/duplicate attempt
      return res.status(409).json({ error: 'attempt already recorded' });
    }
    console.error('guess route error:', err);
    res.status(500).json({ error: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;