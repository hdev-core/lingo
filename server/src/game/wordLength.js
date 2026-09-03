// src/game/wordLength.js
//
// Chooses the word length for a given puzzle date.
//
// Length used to be a hardcoded 5 in scripts/daily_commit.js. The data model
// never assumed it -- daily_puzzles.word_length is stored per puzzle and
// routes/guess.js validates each guess against that stored value -- so the
// constant was the only thing pinning the game to 5.
//
// Selection is DETERMINISTIC on the puzzle date, not random. This matters for
// a commit-reveal game: anyone can recompute which length a given date should
// have used, so the choice is auditable rather than something the server
// could quietly vary after the fact.

const DEFAULT_LENGTHS = [5];
const MIN_LEN = 4;
const MAX_LEN = 9;

function parseLengths(raw) {
  if (!raw || !String(raw).trim()) return DEFAULT_LENGTHS;

  const parsed = String(raw)
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= MIN_LEN && n <= MAX_LEN);

  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length ? unique : DEFAULT_LENGTHS;
}

function getSupportedLengths(env = process.env) {
  return parseLengths(env.PUZZLE_WORD_LENGTHS);
}

// Stable, dependency-free hash of the YYYY-MM-DD date string.
function hashDate(puzzleDate) {
  const s = String(puzzleDate);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickLengthForDate(puzzleDate, env = process.env) {
  const lengths = getSupportedLengths(env);
  if (lengths.length === 1) return lengths[0];
  return lengths[hashDate(puzzleDate) % lengths.length];
}

module.exports = { getSupportedLengths, pickLengthForDate, MIN_LEN, MAX_LEN };
