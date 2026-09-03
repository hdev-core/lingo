/**
 * scripts/seed_words.js
 *
 * Seeds the curated `words` answer bank from data/answer-bank.json.
 *
 * WHY THIS EXISTS: the original word bank was populated by hand directly into
 * Supabase and recorded nowhere. When that project lapsed, the entire answer
 * bank was lost with it and could not be rebuilt from the repo. Keeping the
 * data in version control and the load in a script means the bank can always
 * be recreated from scratch.
 *
 * Idempotent: re-running inserts only words that aren't already present, and
 * never resets used_count or last_used_on for existing entries.
 *
 * Usage: node --env-file=.env scripts/seed_words.js [--dry]
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DRY = process.argv.includes('--dry');

async function main() {
  const bankPath = path.join(__dirname, '..', 'data', 'answer-bank.json');
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));

  // A word that isn't in the guess list can never be submitted, so it would be
  // an unwinnable puzzle. Refuse to seed one.
  const validPath = path.join(__dirname, '..', 'data', 'valid-guesses.txt');
  const valid = new Set(
    fs.readFileSync(validPath, 'utf-8').split('\n').map((w) => w.trim()).filter(Boolean)
  );

  const problems = [];
  for (const row of bank) {
    if (row.word !== row.word.toLowerCase()) problems.push(`${row.word}: not lowercase`);
    if (row.word.length !== row.length) problems.push(`${row.word}: length ${row.length} != ${row.word.length}`);
    if (!valid.has(row.word)) problems.push(`${row.word}: NOT in valid-guesses.txt -> unwinnable`);
  }
  if (problems.length) {
    console.error('Refusing to seed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`${bank.length} words validated (all present in the guess list).`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL/DATABASE_URL not set');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const before = (await client.query('SELECT COUNT(*)::int AS n FROM words')).rows[0].n;

    if (DRY) {
      console.log(`[dry run] words currently ${before}; would attempt ${bank.length} inserts.`);
      return;
    }

    let inserted = 0;
    for (const r of bank) {
      const res = await client.query(
        `INSERT INTO words (word, length, difficulty, category, theme, source, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (word) DO NOTHING`,
        [r.word, r.length, r.difficulty, r.category, r.theme, r.source]
      );
      inserted += res.rowCount;
    }

    const after = (await client.query('SELECT COUNT(*)::int AS n FROM words')).rows[0].n;
    console.log(`words: ${before} -> ${after} (${inserted} inserted, ${bank.length - inserted} already present)`);

    const dist = await client.query(
      `SELECT length, COUNT(*)::int AS n FROM words WHERE is_active GROUP BY length ORDER BY length`
    );
    for (const row of dist.rows) console.log(`  length ${row.length}: ${row.n}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
