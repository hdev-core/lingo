import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
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

function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <NavLink to="/">Back to today's puzzle</NavLink>
    </div>
  )
}

function AppShell() {
  // NavLink automatically adds an "active" class when the route matches,
  // so we can style the current page differently in App.css
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">LINGO</div>
        <nav className="app-nav">
          <NavLink to="/" end>Puzzle</NavLink>
          <NavLink to="/results">Results</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<DailyPuzzle />} />
          <Route path="/results" element={<Results />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          {/* Catch-all: any unmatched route shows the 404 page */}
          <Route path="*" element={<NotFound />} />
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