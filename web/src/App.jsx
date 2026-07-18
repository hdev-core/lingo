import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Puzzle from './components/Puzzle'
import './styles/tokens.css'
import './App.css'

function DailyPuzzle() {
  return (
    <div>
      <h1>Daily Puzzle</h1>
      <Puzzle />
    </div>
  )
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