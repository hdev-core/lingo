// src/routes/verify.js
//
// GET /api/verify/:date -- public, no auth required. Lets anyone
// independently recompute SHA256(date|answer|secret) and check it matches
// the commit_hash that was broadcast at the start of the day. This is the
// whole point of the commit-reveal scheme: verifiable after the fact,
// without trusting the server's word.
//
// Critical rule this endpoint enforces: answer/secret are only ever
// included in the response for puzzles that have ALREADY been revealed
// (status = 'revealed'). A live or committed-but-not-yet-revealed puzzle
// returns commit data only -- never the answer. This is a deliberate
// exception to "answer/secret are server-only": the whole design goal of
// commit-reveal is that they become PUBLIC, but only after reveal, never
// before. Contrast with src/routes/guess.js, which never exposes them at
// all, at any time.

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

router.get('/verify/:date', async (req, res) => {
  const { date } = req.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT puzzle_date, puzzle_number, word_length, commit_hash,
              commit_tx_id, reveal_tx_id, status, answer, secret
       FROM daily_puzzles
       WHERE puzzle_date = $1`,
      [date]
    );
    const puzzle = result.rows[0];

    if (!puzzle) {
      return res.status(404).json({ error: 'no puzzle for that date' });
    }

    const base = {
      puzzleDate: puzzle.puzzle_date,
      puzzleNumber: puzzle.puzzle_number,
      wordLength: puzzle.word_length,
      commitHash: puzzle.commit_hash,
      commitTxId: puzzle.commit_tx_id,
      revealTxId: puzzle.reveal_tx_id,
      status: puzzle.status,
    };

    // Not revealed yet -- commit data only, answer/secret withheld exactly
    // as if this were the locked-down daily_puzzles_public view.
    if (puzzle.status !== 'revealed') {
      return res.status(200).json(base);
    }

    // Revealed -- now it's correct and intentional to expose answer/secret,
    // plus the recomputed hash so the caller doesn't even have to trust our
    // arithmetic; they can compare recomputedHash to commitHash themselves.
    const recomputedHash = crypto
      .createHash('sha256')
      .update(`${puzzle.puzzle_date}|${puzzle.answer}|${puzzle.secret}`)
      .digest('hex');

    return res.status(200).json({
      ...base,
      answer: puzzle.answer,
      secret: puzzle.secret,
      recomputedHash,
      hashMatches: recomputedHash === puzzle.commit_hash,
    });
  } catch (err) {
    console.error('verify route error:', err);
    return res.status(500).json({ error: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;