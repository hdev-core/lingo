import { useState, useCallback, useEffect } from 'react'
import GuessGrid from './GuessGrid'
import Keyboard from './Keyboard'
import StreakCounter from './StreakCounter'
import { useAuth } from '../context/AuthContext'
import './Puzzle.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// The answer is never sent to the browser -- that is the whole point of the
// commit-reveal scheme. Feedback is computed server-side and returned as an
// array of 'correct' | 'present' | 'absent', which we zip with the guessed
// word for rendering.
function toRow(word, feedback) {
  return word
    .toUpperCase()
    .split('')
    .map((letter, i) => ({ letter, status: feedback[i] }))
}

const RANK = { absent: 0, present: 1, correct: 2 }

function lettersFromRows(rows) {
  const statuses = {}
  rows.forEach((row) =>
    row.forEach(({ letter, status }) => {
      if (!statuses[letter] || RANK[status] > RANK[statuses[letter]]) {
        statuses[letter] = status
      }
    })
  )
  return statuses
}

function Puzzle() {
  const { isAuthenticated } = useAuth()

  const [puzzle, setPuzzle] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameStatus, setGameStatus] = useState('playing')
  const [letterStatuses, setLetterStatuses] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load today's puzzle, and any progress already recorded for this player.
  // Progress comes from the server, not localStorage, so a refresh or a
  // different device resumes the same game.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/puzzle/today`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `puzzle unavailable (${res.status})`)
        }
        const data = await res.json()
        if (cancelled) return

        const rows = (data.guesses || []).map((g) => toRow(g.word, g.feedback))
        setPuzzle(data)
        setGuesses(rows)
        setLetterStatuses(lettersFromRows(rows))

        if (data.solved) setGameStatus('won')
        else if (rows.length >= data.maxGuesses) setGameStatus('lost')
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const submitGuess = useCallback(
    async (word) => {
      setSubmitting(true)
      setMessage('')
      try {
        const res = await fetch(`${API_BASE}/api/guess`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: word.toLowerCase() }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setMessage(data.error || 'Could not submit that guess.')
          return
        }

        const row = toRow(word, data.feedback)
        const next = [...guesses, row]
        setGuesses(next)
        setCurrentGuess('')
        setLetterStatuses(lettersFromRows(next))

        if (data.solved) setGameStatus('won')
        else if (data.attemptsRemaining <= 0) setGameStatus('lost')
      } catch {
        setMessage('Network error — your guess was not recorded.')
      } finally {
        setSubmitting(false)
      }
    },
    [guesses]
  )

  const handleKeyPress = useCallback(
    (key) => {
      if (!puzzle || gameStatus !== 'playing' || submitting) return
      const wordLength = puzzle.wordLength

      if (key === 'ENTER') {
        if (currentGuess.length !== wordLength) {
          setMessage(`Needs ${wordLength} letters.`)
          return
        }
        submitGuess(currentGuess)
      } else if (key === 'BACKSPACE') {
        setMessage('')
        setCurrentGuess((g) => g.slice(0, -1))
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < wordLength) {
        setMessage('')
        setCurrentGuess((g) => g + key)
      }
    },
    [currentGuess, gameStatus, puzzle, submitGuess, submitting]
  )

  useEffect(() => {
    function handlePhysicalKey(e) {
      const key = e.key.toUpperCase()
      if (key === 'ENTER') handleKeyPress('ENTER')
      else if (key === 'BACKSPACE') handleKeyPress('BACKSPACE')
      else if (/^[A-Z]$/.test(key)) handleKeyPress(key)
    }
    window.addEventListener('keydown', handlePhysicalKey)
    return () => window.removeEventListener('keydown', handlePhysicalKey)
  }, [handleKeyPress])

  if (loadError) {
    return (
      <div className="puzzle-screen">
        <div className="puzzle-status puzzle-status--lost">{loadError}</div>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="puzzle-screen">
        <div className="puzzle-status">Loading today’s puzzle…</div>
      </div>
    )
  }

  return (
    <div className="puzzle-screen">
      <StreakCounter streak={0} />

      {gameStatus !== 'playing' && (
        <div className={`puzzle-status puzzle-status--${gameStatus}`}>
          {gameStatus === 'won'
            ? 'Solved it! 🎉'
            : 'Out of guesses — the answer is revealed at end of day.'}
        </div>
      )}

      {message && <div className="puzzle-status">{message}</div>}

      <GuessGrid
        wordLength={puzzle.wordLength}
        maxGuesses={puzzle.maxGuesses}
        guesses={guesses}
        currentGuess={currentGuess}
      />

      <Keyboard onKeyPress={handleKeyPress} letterStatuses={letterStatuses} />
    </div>
  )
}

export default Puzzle
