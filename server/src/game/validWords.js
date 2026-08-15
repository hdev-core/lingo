// src/game/validWords.js
//
// Checks whether a submitted guess is a real, acceptable word -- this is
// deliberately a MUCH larger list than the curated `words` table.
//
// Important distinction (same one real Wordle makes): the `words` table
// is the curated ANSWER pool (tagged by difficulty/category/theme, small,
// hand-picked). This is the much larger VALID-GUESS list -- any of these
// ~13k words can be *guessed*, even though only ~2.3k of them would ever
// be picked as an actual day's answer. Rejecting a guess just because it
// isn't in the small answer-curation table would incorrectly reject
// perfectly good guesses.
//
// Uses the same open, MIT-licensed source as the seed script
// (tabatkins/wordle-list), loaded once into memory rather than hitting
// the DB per guess.

const fs = require('fs');
const path = require('path');

let validWordsSet = null;

function loadValidWords() {
  if (!validWordsSet) {
    // data/valid-guesses.txt -- see scripts/fetch_valid_guesses.js for how
    // this file is generated/updated.
    const filePath = path.join(__dirname, '..', '..', 'data', 'valid-guesses.txt');
    const raw = fs.readFileSync(filePath, 'utf-8');
    validWordsSet = new Set(
      raw
        .split('\n')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return validWordsSet;
}

function isValidGuess(word) {
  const set = loadValidWords();
  return set.has(word.toLowerCase());
}

module.exports = { isValidGuess, loadValidWords };