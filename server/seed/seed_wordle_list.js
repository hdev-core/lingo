/**
 * seed_wordle_list.js
 *
 * Pulls a public-domain / open-source Wordle-style word list and inserts
 * it into the `words` table as difficulty:"easy"/"medium", category:"general".
 *
 * Source used here: tabatkins/wordle-list on GitHub (MIT-licensed, plain
 * text, one 5-letter word per line, no scraped puzzle content -- just a
 * dictionary of valid words). Swap SOURCE_URL for any list you prefer.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node seed_wordle_list.js
 *
 * Requires: `pg` (npm install pg)
 */

const { Client } = require('pg');

const SOURCE_URL = 'https://raw.githubusercontent.com/tabatkins/wordle-list/main/words';

// Very rough difficulty heuristic for a v1 seed -- feel free to replace
// with something better once the Puzzle Curator defines real tiers.
function guessDifficulty(word) {
  const uncommonLetters = /[jqxzvkw]/i;
  if (uncommonLetters.test(word)) return 'hard';
  const vowels = (word.match(/[aeiou]/gi) || []).length;
  return vowels >= 2 ? 'easy' : 'medium';
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Set DATABASE_URL before running this script.');
    process.exit(1);
  }

  console.log(`Fetching word list from ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch word list: ${res.status}`);
  const text = await res.text();

  const words = text
    .split('\n')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w)); // MVP is fixed 5-letter, general words

  console.log(`Loaded ${words.length} candidate words. Inserting ...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const word of words) {
      const difficulty = guessDifficulty(word);
      const result = await client.query(
        `INSERT INTO words (word, length, difficulty, category, theme, source)
         VALUES ($1, 5, $2, 'general', 'general', 'wordle-open-list')
         ON CONFLICT (word) DO NOTHING`,
        [word, difficulty]
      );
      inserted += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log(`Done. Inserted ${inserted} new words.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});