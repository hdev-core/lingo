import { useState } from 'react'
import { initAioha, KeyTypes, Providers } from '@aioha/aioha'
import { useAuth } from '../context/AuthContext'
import './LoginScreen.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const aioha = initAioha()

function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    const normalizedUsername = username.trim().toLowerCase()
    if (!normalizedUsername) return

    setStatus('signing')
    setErrorMessage('')

    try {
      const challengeRes = await fetch(`${API_BASE}/api/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUsername }),
      })
      if (!challengeRes.ok) throw new Error('Could not get login challenge')
      const { nonce } = await challengeRes.json()

      // Aioha persists its own session separately from ours. If a stale
      // session exists from an earlier attempt (possibly under a
      // different account), clear ALL of Aioha's stored logins first --
      // not just the current provider -- so login() doesn't reject with
      // "Already logged in" (error 4901).
      if (aioha.isLoggedIn()) {
        await aioha.logoutAll()
      }

      // aioha.login signs the nonce as a message via Keychain and
      // establishes the Aioha session in one step.
      const loginResult = await aioha.login(Providers.Keychain, normalizedUsername, {
        msg: nonce,
        keyType: KeyTypes.Posting,
      })

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Signing was cancelled or failed')
      }

      setStatus('verifying')

      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // required so the browser stores the httpOnly session cookie
        body: JSON.stringify({
          username: normalizedUsername,
          nonce,
          signature: loginResult.result,
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