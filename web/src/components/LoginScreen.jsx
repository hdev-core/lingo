import { useState } from 'react'
import { Aioha, KeyTypes } from '@aioha/aioha'
import { useAuth } from '../context/AuthContext'
import './LoginScreen.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Aioha instance is created once, outside the component, so it isn't
// recreated on every render.
const aioha = new Aioha()
aioha.registerKeychain()

function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | signing | verifying | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim()) return

    setStatus('signing')
    setErrorMessage('')

    try {
      // 1. Ask the backend for a one-time nonce for this username
      const challengeRes = await fetch(`${API_BASE}/api/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!challengeRes.ok) throw new Error('Could not get login challenge')
      const { nonce } = await challengeRes.json()

      // 2. Ask Keychain (via Aioha) to sign the nonce with the player's
      // posting key. No blockchain transaction is created here, so this
      // consumes no Resource Credits, and the key never leaves Keychain.
      const signResult = await aioha.signMessage(nonce, KeyTypes.Posting)
      if (!signResult.success) {
        throw new Error(signResult.error || 'Signing was cancelled or failed')
      }

      setStatus('verifying')

      // 3. Send the signed nonce back to the backend for verification
      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          nonce,
          signature: signResult.result,
        }),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}))
        throw new Error(err.error || 'Login verification failed')
      }

      const session = await verifyRes.json()
      login(session)
      setStatus('idle')
    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage(err.message || 'Something went wrong logging in')
      setStatus('error')
    }
  }

  return (
    <div className="login-screen">
      <h1>LINGO</h1>
      <p className="login-subtitle">Log in with your Hive account to play</p>

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Hive username"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          disabled={status === 'signing' || status === 'verifying'}
        />

        <button
          type="submit"
          className="login-button"
          disabled={!username.trim() || status === 'signing' || status === 'verifying'}
        >
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