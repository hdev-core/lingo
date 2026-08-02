// src/game/wordSelection.js
//
// Picks the day's word from the curated `words` table. MVP rule, per the
// Product Spec's MVP cut: fixed 5-letter words, no difficulty-tier
// variation yet (that's explicitly deferred post-MVP). Prefers words
// that have never been used, falls back to the least-recently-used word
// if the unused pool ever runs dry.

async function pickWordForDate(client, { wordLength = 5 } = {}) {
  const unused = await client.query(
    `SELECT id, word FROM words
     WHERE is_active = true AND length = $1 AND used_count = 0
     ORDER BY random()
     LIMIT 1`,
    [wordLength]
  );

  if (unused.rows[0]) return unused.rows[0];

  // Fallback: every word of this length has been used at least once --
  // recycle the least-recently-used one rather than failing outright.
  const fallback = await client.query(
    `SELECT id, word FROM words
     WHERE is_active = true AND length = $1
     ORDER BY last_used_on ASC NULLS FIRST, random()
     LIMIT 1`,
    [wordLength]
  );

  if (!fallback.rows[0]) {
    throw new Error(`No active words of length ${wordLength} in the word bank.`);
  }
  return fallback.rows[0];
}

async function markWordUsed(client, wordId, puzzleDate) {
  await client.query(
    `UPDATE words SET used_count = used_count + 1, last_used_on = $2 WHERE id = $1`,
    [wordId, puzzleDate]
  );
}

module.exports = { pickWordForDate, markWordUsed };