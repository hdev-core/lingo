import './StreakCounter.css'

function StreakCounter({ streak = 0 }) {
  return (
    <div className="streak-counter" aria-label={`Current streak: ${streak} days`}>
      <span className="streak-icon" role="img" aria-hidden="true">🔥</span>
      <span className="streak-count">{streak}</span>
      <span className="streak-label">day streak</span>
    </div>
  )
}

export default StreakCounter