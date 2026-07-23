import './Results.css'

// Placeholder data — will come from real game state once puzzle
// results are passed between screens (post-MVP wiring)
const MOCK_RESULT = {
  solved: true,
  guessCount: 4,
  streak: 3,
  lingoEarned: 12,
  pattern: [
    ['absent', 'present', 'absent', 'absent', 'correct'],
    ['correct', 'absent', 'present', 'absent', 'correct'],
    ['correct', 'correct', 'absent', 'present', 'correct'],
    ['correct', 'correct', 'correct', 'correct', 'correct'],
  ],
}

const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' }

function Results() {
  const { solved, guessCount, streak, lingoEarned, pattern } = MOCK_RESULT

  return (
    <div className="results-screen">
      <h1>Results</h1>

      <div className={`results-banner ${solved ? 'results-banner--won' : 'results-banner--lost'}`}>
        {solved ? `Solved in ${guessCount}/6! 🎉` : 'Not solved today'}
      </div>

      <div className="results-pattern" aria-label="Spoiler-free guess pattern">
        {pattern.map((row, i) => (
          <div className="results-pattern-row" key={i}>
            {row.map((status, j) => (
              <span key={j}>{EMOJI[status]}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="results-stats">
        <div className="results-stat">
          <span className="results-stat-value">{streak}</span>
          <span className="results-stat-label">Streak</span>
        </div>
        <div className="results-stat">
          <span className="results-stat-value">{lingoEarned}</span>
          <span className="results-stat-label">LINGO earned</span>
        </div>
      </div>

      <button type="button" className="share-button">
        Share to Hive
      </button>
    </div>
  )
}

export default Results