const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSupportedLengths,
  pickLengthForDate,
} = require('../src/game/wordLength');

test('defaults to 5 when unconfigured, so existing behaviour is unchanged', () => {
  assert.deepEqual(getSupportedLengths({}), [5]);
  assert.equal(pickLengthForDate('2026-09-03', {}), 5);
});

test('parses a configured range, sorted and de-duplicated', () => {
  assert.deepEqual(getSupportedLengths({ PUZZLE_WORD_LENGTHS: '7,4,5,4' }), [4, 5, 7]);
});

test('ignores out-of-range and non-numeric entries', () => {
  assert.deepEqual(
    getSupportedLengths({ PUZZLE_WORD_LENGTHS: '3,10,abc,,6' }),
    [6],
  );
});

test('falls back to the default when nothing valid remains', () => {
  assert.deepEqual(getSupportedLengths({ PUZZLE_WORD_LENGTHS: '1,2,99' }), [5]);
});

test('is deterministic for a given date — required for commit-reveal auditability', () => {
  const env = { PUZZLE_WORD_LENGTHS: '4,5,6,7,8,9' };
  const first = pickLengthForDate('2026-09-03', env);
  for (let i = 0; i < 50; i += 1) {
    assert.equal(pickLengthForDate('2026-09-03', env), first);
  }
});

test('only ever returns a configured length', () => {
  const env = { PUZZLE_WORD_LENGTHS: '4,6,9' };
  const allowed = new Set([4, 6, 9]);
  for (let d = 1; d <= 28; d += 1) {
    const date = `2026-09-${String(d).padStart(2, '0')}`;
    assert.ok(allowed.has(pickLengthForDate(date, env)), `${date} produced an unconfigured length`);
  }
});

test('varies across dates rather than pinning one length', () => {
  const env = { PUZZLE_WORD_LENGTHS: '4,5,6,7,8,9' };
  const seen = new Set();
  for (let d = 1; d <= 28; d += 1) {
    seen.add(pickLengthForDate(`2026-09-${String(d).padStart(2, '0')}`, env));
  }
  assert.ok(seen.size > 1, 'expected more than one length across a month');
});
