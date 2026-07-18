import './GuessGrid.css'

function GuessGrid({ wordLength = 5, maxGuesses = 6, guesses = [], currentGuess = '' }) {
  const rows = []

  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      rows.push(guesses[i])
    } else if (i === guesses.length) {
      const letters = currentGuess.split('')
      const row = Array.from({ length: wordLength }, (_, idx) => ({
        letter: letters[idx] || '',
        status: letters[idx] ? 'filled' : 'empty',
      }))
      rows.push(row)
    } else {
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