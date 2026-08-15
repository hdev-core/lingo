const test = require('node:test');
const assert = require('node:assert/strict');
const { getFeedback, STATES } = require('../src/game/wordFeedback');

test('exact match -- every letter correct', () => {
  const fb = getFeedback('crane', 'crane');
  assert.deepEqual(
    fb.map((f) => f.state),
    Array(5).fill(STATES.CORRECT)
  );
});

test('no letters in common -- everything absent', () => {
  const fb = getFeedback('crane', 'ghost');
  assert.deepEqual(
    fb.map((f) => f.state),
    Array(5).fill(STATES.ABSENT)
  );
});

test('duplicate-letter case: apple/paper does not over-count yellows', () => {
  // answer "apple" has two p's (positions 1, 2); guess "paper" has p at 0 and 2.
  // one should land CORRECT (position match), the other PRESENT -- not both PRESENT.
  const fb = getFeedback('apple', 'paper');
  assert.deepEqual(
    fb.map((f) => f.state),
    [STATES.PRESENT, STATES.PRESENT, STATES.CORRECT, STATES.PRESENT, STATES.ABSENT]
  );
});

test('duplicate guess letters are not over-counted', () => {
  const fb = getFeedback('crane', 'crack');

  assert.deepEqual(
    fb.map((f) => f.state),
    [
      STATES.CORRECT,
      STATES.CORRECT,
      STATES.CORRECT,
      STATES.ABSENT,
      STATES.ABSENT,
    ]
  );
});

test('duplicate non-green letters are not over-counted', () => {
  const fb = getFeedback('steal', 'eerie');

  assert.deepEqual(
    fb.map((f) => f.state),
    [
      STATES.PRESENT,
      STATES.ABSENT,
      STATES.ABSENT,
      STATES.ABSENT,
      STATES.ABSENT,
    ]
  );
});

test('duplicate-letter case: guess has more copies of a letter than the answer', () => {
  // answer "kitty" has one t at position 2; guess "tithe" has t at 0 and 2.
  const fb = getFeedback('kitty', 'tithe');
  assert.deepEqual(
    fb.map((f) => f.state),
    [STATES.PRESENT, STATES.CORRECT, STATES.CORRECT, STATES.ABSENT, STATES.ABSENT]
  );
});

test('rejects mismatched guess/answer length', () => {
  assert.throws(() => getFeedback('crane', 'cranes'), /does not match/);
});
