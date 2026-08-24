// src/routes/verify.js
//
// GET /api/verify/:date
// Public verification endpoint.

const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyDigest } = require('../puzzle/hashFlows');
const { pool } = require('../db');
const {
  findLingoOperationByTransactionId,
} = require('../hive/haf');

const router = express.Router();

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'too many requests, slow down',
  },
});

// Only settled revealed results are cached.
//
// IMPORTANT: if the exact transaction cannot currently be found, do NOT
// cache that failed lookup. It could simply be an RPC/indexing delay.
const revealedCache = new Map();

router.get('/verify/:date', verifyLimiter, async (req, res) => {
  const { date } = req.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'date must be YYYY-MM-DD',
    });
  }

  const cached = revealedCache.get(date);

  if (cached) {
    return res.status(200).json(cached);
  }

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT
          puzzle_date::text AS puzzle_date,
          puzzle_number,
          word_length,
          commit_hash,
          commit_tx_id,
          reveal_tx_id,
          status,
          answer,
          secret
       FROM daily_puzzles
       WHERE puzzle_date = $1`,
      [date]
    );

    const puzzle = result.rows[0];

    if (!puzzle) {
      return res.status(404).json({
        error: 'no puzzle for that date',
      });
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

    // Before reveal, do not expose answer or secret.
    if (puzzle.status !== 'revealed') {
      return res.status(200).json(base);
    }

    const appAccount = process.env.HIVE_APP_ACCOUNT;

    const onChainCommit =
      await findLingoOperationByTransactionId(
        appAccount,
        puzzle.commit_tx_id,
        {
          ids: ['lingo_commit'],
        }
      );

    const recomputedHash = verifyDigest({
      puzzleDate: puzzle.puzzle_date,
      answer: puzzle.answer,
      secret: puzzle.secret,
    });

    const responseBody = {
      ...base,

      answer: puzzle.answer,
      secret: puzzle.secret,

      recomputedHash,

      onChainCommitHash: onChainCommit
        ? onChainCommit.json.commit_hash
        : null,

      hashMatchesOnChain: onChainCommit
        ? recomputedHash === onChainCommit.json.commit_hash
        : null,
    };

    // Cache ONLY once the exact stored transaction was found.
    if (onChainCommit) {
      revealedCache.set(date, responseBody);
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('verify route error:', err);

    return res.status(500).json({
      error: 'internal error',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;