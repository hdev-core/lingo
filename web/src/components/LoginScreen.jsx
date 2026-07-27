import { useState } from 'react'
import { Aioha, KeyTypes } from '@aioha/aioha'
import { useAuth } from '../context/AuthContext'
import './LoginScreen.css'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const aioha = new Aioha()
aioha.registerKeychain()

function LoginScreen() {
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()

    if (!username.trim()) return

    setStatus('signing')
    setErrorMessage('')

    try {
      // 1. Login/connect Hive Keychain account through Aioha
      const loginResult = await aioha.login({
  username: username.trim(),
  provider: 'keychain',
  keyType: KeyTypes.Posting,
})

      if (!loginResult) {
        throw new Error('Keychain login failed')
      }

      // 2. Ask backend for nonce
      const challengeRes = await fetch(
        `${API_BASE}/api/auth/challenge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
          }),
        }
      )

      if (!challengeRes.ok) {
        throw new Error('Could not get login challenge')
      }

      const { nonce } = await challengeRes.json()

      // 3. Sign nonce with posting key
      const signResult = await aioha.signMessage(
        nonce,
        KeyTypes.Posting
      )

      if (!signResult.success) {
        throw new Error(
          signResult.error ||
            'Signing failed'
        )
      }

      setStatus('verifying')

      // 4. Verify signature with backend
      const verifyRes = await fetch(
        `${API_BASE}/api/auth/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            nonce,
            signature: signResult.result,
          }),
        }
      )

      if (!verifyRes.ok) {
        const err = await verifyRes
          .json()
          .catch(() => ({}))

        throw new Error(
          err.error ||
            'Login verification failed'
        )
      }

      const session = await verifyRes.json()

      login(session)

      setStatus('idle')
    } catch (err) {
      console.error('Login error:', err)

      setErrorMessage(
        err.message ||
          'Something went wrong logging in'
      )

      setStatus('error')
    }
  }

  return (
    <div className="login-screen">
      <h1>LINGO</h1>

      <p className="login-subtitle">
        Log in with your Hive account to play
      </p>

      <form
        className="login-form"
        onSubmit={handleLogin}
      >
        <input
          type="text"
          placeholder="Hive username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.trim())
          }
          disabled={
            status === 'signing' ||
            status === 'verifying'
          }
        />

        <button
          type="submit"
          className="login-button"
          disabled={
            !username.trim() ||
            status === 'signing' ||
            status === 'verifying'
          }
        >
          {status === 'signing' &&
            'Waiting for Keychain...'}

          {status === 'verifying' &&
            'Verifying...'}

          {(status === 'idle' ||
            status === 'error') &&
            'Log in with Keychain'}
        </button>
      </form>

      {status === 'error' && (
        <p className="login-error">
          {errorMessage}
        </p>
      )}

      <p className="login-hint">
        Requires the{' '}
        <a
          href="https://hive-keychain.com/"
          target="_blank"
          rel="noreferrer"
        >
          Hive Keychain
        </a>{' '}
        browser extension.
      </p>
    </div>
  )
}

export default LoginScreen