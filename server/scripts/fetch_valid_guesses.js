/**
 * scripts/fetch_valid_guesses.js
 *
 * Downloads the open, MIT-licensed word list (same source as the answer
 * seed script) to data/valid-guesses.txt, for use as the guess-validity
 * check in src/game/validWords.js. Re-run this any time you want to
 * refresh the list; it's a static file, not a live fetch per request.
 *
 * Usage: node scripts/fetch_valid_guesses.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://raw.githubusercontent.com/tabatkins/wordle-list/main/words';

async function main() {
  console.log(`Fetching valid-guess word list from ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch word list: ${res.status}`);
  const text = await res.text();

  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'valid-guesses.txt');
  fs.writeFileSync(outPath, text.trim() + '\n');

  const count = text.split('\n').filter(Boolean).length;
  console.log(`Wrote ${count} words to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});