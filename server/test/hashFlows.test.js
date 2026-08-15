const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  commitDigest,
  revealDigest,
  verifyDigest,
} = require('../src/puzzle/hashFlows');

test(
  'commit/reveal/verify all produce the same canonical digest',
  () => {
    const input = {
      puzzleDate: '2026-08-11',
      answer: 'tests',
      secret:
        '0123456789abcdef0123456789abcdef',
    };

    const expected = crypto
      .createHash('sha256')
      .update(
        '2026-08-11|' +
          'tests|' +
          '0123456789abcdef0123456789abcdef',
        'utf8'
      )
      .digest('hex');

    assert.equal(
      commitDigest(input),
      expected
    );

    assert.equal(
      revealDigest(input),
      expected
    );

    assert.equal(
      verifyDigest(input),
      expected
    );
  }
);