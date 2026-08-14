const crypto = require('crypto');

function calculateCommitHash({ puzzleDate, answer, secret }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
    throw new TypeError('puzzleDate must be a YYYY-MM-DD string');
  }

  return crypto
    .createHash('sha256')
    .update(`${puzzleDate}|${answer}|${secret}`, 'utf8')
    .digest('hex');
}

module.exports = { calculateCommitHash };
