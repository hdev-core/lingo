const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadValidWords,
  isValidGuess,
} = require('../src/game/validWords');

test(
  'deployment includes a usable valid-guesses word list',
  () => {
    const words =
      loadValidWords();

    assert.ok(
      words.size > 10000,
      `expected >10000 valid guesses, got ${words.size}`
    );

    assert.equal(
      isValidGuess('crane'),
      true
    );

    assert.equal(
      isValidGuess('speed'),
      true
    );

    assert.equal(
      isValidGuess('zzzzz'),
      false
    );
  }
);