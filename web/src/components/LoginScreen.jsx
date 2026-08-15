import { useState } from 'react'
import { KeyTypes, Providers } from '@aioha/aioha'
import { aioha } from '../lib/aioha'
import { useAuth } from '../context/AuthContext'
import './LoginScreen.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const AUTH_REQUEST_TIMEOUT_MS = 10 * 1000 // 10 seconds
const KEYCHAIN_LOGIN_TIMEOUT_MS = 30 * 1000 // 30 seconds

function normalizeUsername(raw) {
  return raw.trim().replace(/^@/, '').toLowerCase()
}

function withTimeout(promise, ms, timeoutMessage) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

async function fetchWithTimeout(url, options, ms = AUTH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()

    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername) {
      return
    }

    let phase = 'challenge'

    setStatus('challenge')
    setErrorMessage('')

    try {
      const challengeRes = await fetchWithTimeout(
        `${API_BASE}/api/auth/challenge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: normalizedUsername }),
        }
      )

      if (!challengeRes.ok) {
        const err = await challengeRes.json().catch(() => ({}))
        throw new Error(err.error || 'Could not get login challenge')
      }

      const { nonce } = await challengeRes.json()

      phase = 'signing'
      setStatus('signing')

      // Clear any stale Aioha login before starting a new Keychain login.
      if (aioha.isLoggedIn()) {
        await aioha.logoutAll()
      }

      const loginResult = await withTimeout(
        aioha.login(Providers.Keychain, normalizedUsername, {
          msg: nonce,
          keyType: KeyTypes.Posting,
        }),
        KEYCHAIN_LOGIN_TIMEOUT_MS,
        'Keychain took too long to respond. Please try again.'
      )

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Signing was cancelled or failed')
      }

      phase = 'verifying'
      setStatus('verifying')

      const verifyRes = await fetchWithTimeout(
        `${API_BASE}/api/auth/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: normalizedUsername,
            nonce,
            signature: loginResult.result,
          }),
        }
      )

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}))
        throw new Error(err.error || 'Login verification failed')
      }

      const session = await verifyRes.json()

      login(session)
      setStatus('idle')
    } catch (err) {
      console.error('Login error:', err)

      let message

      if (err.name === 'AbortError') {
        message =
          phase === 'challenge'
            ? 'The server took too long to create a login challenge. Please try again.'
            : 'The server took too long to verify your login. Please try again.'
      } else if (err.name === 'TypeError') {
        message = 'Could not reach the server. Check your connection and try again.'
      } else {
        message = err.message || 'Something went wrong logging in'
      }

      setErrorMessage(message)
      setStatus('error')
    }
  }

  const isBusy =
    status === 'challenge' || status === 'signing' || status === 'verifying'

  return (
    <div className="login-screen">
      <h1>LINGO</h1>
      <p className="login-subtitle">Log in with your Hive account to play</p>

      <form className="login-form" onSubmit={handleLogin}>
        <label htmlFor="hive-username" className="sr-only">
          Hive username
        </label>

        <input
          id="hive-username"
          type="text"
          placeholder="Hive username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
          disabled={isBusy}
        />

        <button
          type="submit"
          className="login-button"
          disabled={!username.trim() || isBusy}
        >
          {status === 'challenge' && 'Connecting to server...'}
          {status === 'signing' && 'Waiting for Keychain...'}
          {status === 'verifying' && 'Verifying...'}
          {(status === 'idle' || status === 'error') && 'Log in with Keychain'}
        </button>
      </form>

      {status === 'error' && (
        <p className="login-error" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="login-hint">
        Requires the{' '}
        <a href="https://hive-keychain.com/" target="_blank" rel="noreferrer">
          Hive Keychain
        </a>{' '}
        browser extension.
      </p>
    </div>
  )
}

export default LoginScreen