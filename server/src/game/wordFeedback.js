// src/game/wordFeedback.js
//
// Computes Wordle-style letter feedback for a guess against the day's
// answer. Handles duplicate letters correctly -- this is the classic bug:
// naively marking every occurrence of a letter "yellow" over-rewards
// guesses with repeated letters. Real Wordle (and this) only marks as many
// yellows as there are *remaining* unmatched copies of that letter in the
// answer, after greens are already accounted for.
//
// Verified against known duplicate-letter cases (apple/paper, sassy/assay,
// speed/erase, kitty/tithe) -- none over-count yellows for repeated
// letters.

const STATES = { CORRECT: 'correct', PRESENT: 'present', ABSENT: 'absent' };

function getFeedback(answer, guess) {
  const a = answer.toLowerCase().split('');
  const g = guess.toLowerCase().split('');

  if (a.length !== g.length) {
    throw new Error(`Guess length (${g.length}) does not match answer length (${a.length}).`);
  }

  const result = new Array(g.length).fill(null);
  const remaining = {}; // letter -> count of not-yet-claimed occurrences in answer

  // Pass 1: greens first, and tally up letters in the answer that weren't
  // immediately matched -- these are the only letters eligible for yellow.
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      result[i] = STATES.CORRECT;
    } else {
      remaining[a[i]] = (remaining[a[i]] || 0) + 1;
    }
  }

  // Pass 2: for every non-green guess letter, claim a yellow only if
  // there's still an unclaimed occurrence of that letter left over.
  for (let i = 0; i < g.length; i++) {
    if (result[i] === STATES.CORRECT) continue;
    if (remaining[g[i]] > 0) {
      result[i] = STATES.PRESENT;
      remaining[g[i]] -= 1;
    } else {
      result[i] = STATES.ABSENT;
    }
  }

  return result.map((state, i) => ({ letter: g[i], state }));
}

module.exports = { getFeedback, STATES };