import './GuessGrid.css'

/**
 * GuessGrid — renders the Wordle-style grid of guesses.
 *
 * Props:
 * - wordLength: number of letters in the puzzle word (default 5)
 * - maxGuesses: total guess rows to render (default 6, per MVP fixed guess limit)
 * - guesses: array of past guesses, each guess is an array of
 *     { letter: string, status: 'correct' | 'present' | 'absent' }
 * - currentGuess: string — the guess currently being typed (not yet submitted)
 */
function GuessGrid({ wordLength = 5, maxGuesses = 6, guesses = [], currentGuess = '' }) {
  // Build a full list of rows: submitted guesses, then the in-progress row, then empty rows
  const rows = []

  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      // Already-submitted guess with feedback
      rows.push(guesses[i])
    } else if (i === guesses.length) {
      // The row the player is currently typing into
      const letters = currentGuess.split('')
      const row = Array.from({ length: wordLength }, (_, idx) => ({
        letter: letters[idx] || '',
        status: 'empty',
      }))
      rows.push(row)
    } else {
      // Empty future row
      rows.push(
        Array.from({ length: wordLength }, () => ({ letter: '', status: 'empty' }))
      )
    }
  }

  return (
    <div className="guess-grid" role="grid" aria-label="Puzzle guesses">
      {rows.map((row, rowIndex) => (
        <div className="guess-row" role="row" key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              role="gridcell"
              className={`guess-cell guess-cell--${cell.status}`}
            >
              {cell.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default GuessGrid