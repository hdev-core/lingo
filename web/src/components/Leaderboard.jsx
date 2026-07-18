import { useState } from 'react'
import './Leaderboard.css'

// Placeholder data — real data comes from HAF-backed leaderboard API later
const MOCK_DAILY = [
  { rank: 1, username: 'hive-wordsmith', value: '0:42' },
  { rank: 2, username: 'blockchain.betty', value: '0:58' },
  { rank: 3, username: 'defi.dave', value: '1:05' },
]

const MOCK_WEEKLY = [
  { rank: 1, username: 'hive-wordsmith', value: '7/7 solved' },
  { rank: 2, username: 'defi.dave', value: '6/7 solved' },
  { rank: 3, username: 'blockchain.betty', value: '5/7 solved' },
]

function Leaderboard() {
  const [tab, setTab] = useState('daily')
  const data = tab === 'daily' ? MOCK_DAILY : MOCK_WEEKLY

  return (
    <div className="leaderboard-screen">
      <h1>Leaderboard</h1>

      <div className="leaderboard-tabs">
        <button
          type="button"
          className={`leaderboard-tab ${tab === 'daily' ? 'leaderboard-tab--active' : ''}`}
          onClick={() => setTab('daily')}
        >
          Today
        </button>
        <button
          type="button"
          className={`leaderboard-tab ${tab === 'weekly' ? 'leaderboard-tab--active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          This Week
        </button>
      </div>

      <ol className="leaderboard-list">
        {data.map((entry) => (
          <li key={entry.rank} className="leaderboard-row">
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-username">{entry.username}</span>
            <span className="leaderboard-value">{entry.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Leaderboard