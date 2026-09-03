/**
 * scripts/fetch_valid_guesses.js
 *
 * Builds data/valid-guesses.txt -- the guess-VALIDITY list used by
 * src/game/validWords.js. This is deliberately a much larger set than the
 * curated `words` answer bank: any of these may be *guessed*, while only
 * hand-picked entries are ever used as a day's answer.
 *
 * Sources, merged and de-duplicated:
 *   1. dwyl/english-words (MIT) -- general English, filtered to 4-9 letters.
 *      The previous source (tabatkins/wordle-list) is Wordle-specific and
 *      therefore 5-letter only, which blocked variable-length puzzles.
 *   2. data/extra-words.txt -- curated additions: crypto/Hive vocabulary and
 *      a few ordinary words the base dictionary omits (e.g. "validator").
 *
 * Anything seeded into the `words` answer bank must appear here, or the
 * puzzle is unwinnable: the player cannot submit a word isValidGuess rejects.
 *
 * Usage: node scripts/fetch_valid_guesses.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';

const MIN_LEN = 4;
const MAX_LEN = 9;

async function main() {
  console.log(`Fetching base word list from ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch word list: ${res.status}`);
  const text = await res.text();

  const pattern = new RegExp(`^[a-z]{${MIN_LEN},${MAX_LEN}}$`);
  const words = new Set();

  for (const raw of text.split('\n')) {
    const w = raw.trim().toLowerCase();
    if (pattern.test(w)) words.add(w);
  }
  const fromDict = words.size;

  const extraPath = path.join(__dirname, '..', 'data', 'extra-words.txt');
  let added = 0;
  if (fs.existsSync(extraPath)) {
    for (const raw of fs.readFileSync(extraPath, 'utf-8').split('\n')) {
      const w = raw.trim().toLowerCase();
      if (!w || w.startsWith('#')) continue;
      if (!pattern.test(w)) {
        console.warn(`  skipping "${w}" (not ${MIN_LEN}-${MAX_LEN} lowercase letters)`);
        continue;
      }
      if (!words.has(w)) added++;
      words.add(w);
    }
  }

  const sorted = [...words].sort();
  const outPath = path.join(__dirname, '..', 'data', 'valid-guesses.txt');
  fs.writeFileSync(outPath, sorted.join('\n') + '\n');

  const byLen = {};
  for (const w of sorted) byLen[w.length] = (byLen[w.length] || 0) + 1;

  console.log(`Wrote ${sorted.length} words to ${outPath}`);
  console.log(`  ${fromDict} from the dictionary, ${added} new from extra-words.txt`);
  for (let l = MIN_LEN; l <= MAX_LEN; l++) {
    console.log(`  length ${l}: ${byLen[l] || 0}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
