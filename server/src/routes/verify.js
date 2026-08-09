// src/routes/verify.js
//
// GET /api/verify/:date -- public, no auth required. Lets anyone
// independently recompute SHA256(date|answer|secret) and check it matches
// the commit_hash that was actually BROADCAST ON-CHAIN at the start of
// the day -- not just the copy of that hash sitting in our own database.
//
// FIXED (per review nit): the previous version compared the recomputed
// hash against daily_puzzles.commit_hash -- the DB's OWN copy of the
// value it broadcast. That's self-referential: if our DB were compromised
// or misconfigured, it could show a hash that "matches itself" while not
// matching what was actually committed on-chain, defeating the entire
// point of commit-reveal. This version fetches the real on-chain
// lingo_commit operation via the HAF-backed read client and compares
// against THAT instead -- the actual, independently-checkable source of
// truth.
//
// Still true from before: answer/secret are only ever included in the
// response for puzzles that have ALREADY been revealed (status =
// 'revealed'). A live or committed-but-not-yet-revealed puzzle returns
// commit data only.

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { getLingoOperations } = require('../hive/haf');

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
      commitHash: puzzle.commit_hash, // DB's copy, shown for reference only
      commitTxId: puzzle.commit_tx_id,
      revealTxId: puzzle.reveal_tx_id,
      status: puzzle.status,
    };

    // Not revealed yet -- commit data only, answer/secret withheld.
    if (puzzle.status !== 'revealed') {
      return res.status(200).json(base);
    }

    // Fetch the ACTUAL on-chain commit op -- the real, independently
    // verifiable source of truth, not our DB's copy of it.
    const appAccount = process.env.HIVE_APP_ACCOUNT;
    const onChainOps = await getLingoOperations(appAccount, {
      limit: 1000,
      ids: ['lingo_commit'],
    });
    const onChainCommit = onChainOps.find((op) => op.json.puzzle_date === puzzle.puzzle_date);

    const recomputedHash = crypto
      .createHash('sha256')
      .update(`${puzzle.puzzle_date}|${puzzle.answer}|${puzzle.secret}`)
      .digest('hex');

    return res.status(200).json({
      ...base,
      answer: puzzle.answer,
      secret: puzzle.secret,
      recomputedHash,
      onChainCommitHash: onChainCommit ? onChainCommit.json.commit_hash : null,
      // The meaningful check: recomputed hash vs. what was ACTUALLY
      // broadcast on-chain -- not vs. our own DB's stored copy.
      hashMatchesOnChain: onChainCommit
        ? recomputedHash === onChainCommit.json.commit_hash
        : null, // null = couldn't find the on-chain op to check against (e.g. outside HAF's history window)
    });
  } catch (err) {
    console.error('verify route error:', err);
    return res.status(500).json({ error: 'internal error' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;