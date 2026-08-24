// src/puzzle/hashFlows.js
//
// Flow-specific names around the ONE canonical hash implementation.
// Commit, reveal, and verify all delegate to calculateCommitHash(), which
// prevents any of the three paths from drifting to a different format.

const { calculateCommitHash } = require('./commitHash');

function commitDigest(input) {
  return calculateCommitHash(input);
}

function revealDigest(input) {
  return calculateCommitHash(input);
}

function verifyDigest(input) {
  return calculateCommitHash(input);
}

module.exports = {
  commitDigest,
  revealDigest,
  verifyDigest,
};