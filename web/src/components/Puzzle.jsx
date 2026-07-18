import { useState, useCallback, useEffect } from 'react'
import GuessGrid from './GuessGrid'
import Keyboard from './Keyboard'
import StreakCounter from './StreakCounter'
import './Puzzle.css'

const WORD_LENGTH = 5
const MAX_GUESSES = 6

// Temporary local answer for UI testing only.
// Real answer will come from the backend after the commit-reveal cycle.
const TEMP_ANSWER = 'HIVES'

function evaluateGuess(guess, answer) {
  const result = Array(guess.length).fill(null)
  const answerLetters = answer.split('')
  const guessLetters = guess.split('')

  guessLetters.forEach((letter, i) => {
    if (answerLetters[i] === letter) {
      result[i] = { letter, status: 'correct' }
      answerLetters[i] = null
    }
  })

  guessLetters.forEach((letter, i) => {
    if (result[i]) return
    const foundIndex = answerLetters.indexOf(letter)
    if (foundIndex !== -1) {
      result[i] = { letter, status: 'present' }
      answerLetters[foundIndex] = null
    } else {
      result[i] = { letter, status: 'absent' }
    }
  })

  return result
}

function Puzzle() {
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameStatus, setGameStatus] = useState('playing')
  const [streak, setStreak] = useState(0)
  const [letterStatuses, setLetterStatuses] = useState({})

  const handleKeyPress = useCallback(
    (key) => {
      if (gameStatus !== 'playing') return

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) return

        const evaluated = evaluateGuess(currentGuess, TEMP_ANSWER)
        const nextGuesses = [...guesses, evaluated]
        setGuesses(nextGuesses)
        setCurrentGuess('')

        setLetterStatuses((prev) => {
          const updated = { ...prev }
          const rank = { absent: 0, present: 1, correct: 2 }
          evaluated.forEach(({ letter, status }) => {
            if (!updated[letter] || rank[status] > rank[updated[letter]]) {
              updated[letter] = status
            }
          })
          return updated
        })

        const isWin = evaluated.every((cell) => cell.status === 'correct')
        if (isWin) {
          setGameStatus('won')
          setStreak((s) => s + 1)
        } else if (nextGuesses.length >= MAX_GUESSES) {
          setGameStatus('lost')
          setStreak(0)
        }
      } else if (key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1))
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key)
      }
    },
    [currentGuess, guesses, gameStatus]
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

  return (
    <div className="puzzle-screen">
      <StreakCounter streak={streak} />

      {gameStatus !== 'playing' && (
        <div className={`puzzle-status puzzle-status--${gameStatus}`}>
          {gameStatus === 'won' ? 'Solved it! 🎉' : `Out of guesses — it was ${TEMP_ANSWER}`}
        </div>
      )}

      <GuessGrid
        wordLength={WORD_LENGTH}
        maxGuesses={MAX_GUESSES}
        guesses={guesses}
        currentGuess={currentGuess}
      />

      <Keyboard onKeyPress={handleKeyPress} letterStatuses={letterStatuses} />
    </div>
  )
}

export default Puzzle