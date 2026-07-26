import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Puzzle from './components/Puzzle'
import Results from './components/Results'
import Leaderboard from './components/Leaderboard'
import Profile from './components/Profile'
import Wallet from './components/Wallet'
import ThemeToggle from './components/ThemeToggle'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginScreen from './components/LoginScreen'
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
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <LoginScreen />
        </main>
      </div>
    )
  }

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
        <ThemeToggle />
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
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App