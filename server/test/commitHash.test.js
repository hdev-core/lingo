const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { calculateCommitHash } = require('../src/puzzle/commitHash');

test('commit hash uses the exact UTF-8 date|answer|secret format', () => {
  const puzzleDate = '2026-08-11';
  const answer = 'tests';
  const secret = '0123456789abcdef0123456789abcdef';

  const expected = crypto
    .createHash('sha256')
    .update('2026-08-11|tests|0123456789abcdef0123456789abcdef', 'utf8')
    .digest('hex');

  assert.equal(calculateCommitHash({ puzzleDate, answer, secret }), expected);
});

test('commit hash rejects a Date instead of a YYYY-MM-DD string', () => {
  assert.throws(
    () =>
      calculateCommitHash({
        puzzleDate: new Date('2026-08-11T00:00:00Z'),
        answer: 'tests',
        secret: '0123456789abcdef0123456789abcdef',
      }),
    /YYYY-MM-DD/
  );
});
