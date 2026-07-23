import './Profile.css'

// Placeholder data — real data comes from the backend player stats endpoint
const MOCK_PROFILE = {
  username: 'you.hive',
  currentStreak: 3,
  longestStreak: 11,
  lingoBalance: 84,
  solveHistory: [true, true, false, true, true, true, false],
}

function Profile() {
  const { username, currentStreak, longestStreak, lingoBalance, solveHistory } = MOCK_PROFILE

  return (
    <div className="profile-screen">
      <h1>Profile</h1>
      <p className="profile-username">@{username}</p>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{currentStreak}</span>
          <span className="profile-stat-label">Current streak</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{longestStreak}</span>
          <span className="profile-stat-label">Longest streak</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{lingoBalance}</span>
          <span className="profile-stat-label">LINGO balance</span>
        </div>
      </div>

      <h2 className="profile-subheading">Last 7 days</h2>
      <div className="profile-history">
        {solveHistory.map((solved, i) => (
          <span
            key={i}
            className={`profile-history-day ${solved ? 'profile-history-day--solved' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

export default Profile