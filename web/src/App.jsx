import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles/tokens.css'
import './App.css'

// Placeholder screens — will be built out fully in later feature cards
function DailyPuzzle() {
  return <h1>Daily Puzzle</h1>
}

function Results() {
  return <h1>Results & Share</h1>
}

function Leaderboard() {
  return <h1>Leaderboard</h1>
}

function Profile() {
  return <h1>Profile & Streak</h1>
}

function Wallet() {
  return <h1>Wallet & Rewards</h1>
}

function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">LINGO</div>
        <nav className="app-nav">
          <Link to="/">Puzzle</Link>
          <Link to="/results">Results</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/wallet">Wallet</Link>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<DailyPuzzle />} />
          <Route path="/results" element={<Results />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App