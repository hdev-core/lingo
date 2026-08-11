import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { aioha } from '../lib/aioha'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const OLD_SESSION_STORAGE_KEY = 'lingo-session'
const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const SESSION_CHECK_TIMEOUT_MS = 10 * 1000 // 10 seconds

/**
 * AuthProvider — wraps the app and provides login/logout/session state.
 *
 * The session token lives in an httpOnly cookie set by the backend. On
 * load, we ask the backend "am I logged in?" via /api/auth/me. A network
 * failure or timeout is NOT the same as "logged out" -- only an explicit
 * 401 clears the session, so a transient blip or rate limit doesn't
 * silently sign someone out.
 */
export function AuthProvider({ children }) {
  const [username, setUsername] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionCheckError, setSessionCheckError] = useState(false)
  const refreshIntervalRef = useRef(null)

  const checkSession = useCallback(async () => {
    setSessionCheckError(false)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
        signal: controller.signal,
      })

      if (res.status === 401) {
        setUsername(null)
      } else if (res.ok) {
        const data = await res.json()
        setUsername(data.username)
      } else {
        // A non-401 error (429, 5xx) is not proof of being logged out --
        // leave whatever session state we already had alone, just flag
        // that the check itself failed.
        setSessionCheckError(true)
      }
    } catch {
      // Network failure, timeout, or abort -- same reasoning as above.
      setSessionCheckError(true)
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Clear the old pre-cookie localStorage session, if it's still there
    // from an earlier preview build -- it's never read, but it's a raw
    // 7-day JWT sitting in XSS-readable storage and should not linger.
    localStorage.removeItem(OLD_SESSION_STORAGE_KEY)

    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!username) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      return
    }

    refreshIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (res.status === 401) {
          // Session genuinely died server-side (expired/revoked) --
          // reflect that. Any other failure (429, 5xx, network) is
          // treated as transient and the session is left alone.
          setUsername(null)
        }
      } catch {
        // network hiccup -- leave state as-is, try again next interval
      }
    }, REFRESH_INTERVAL_MS)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [username])

  function login(sessionData) {
    setUsername(sessionData.username)
  }

  async function logout() {
    const controller = new AbortController()
    try {
      await fetch(`${API_BASE}/api/auth/revoke`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })
    } catch {
      // even if the request fails, clear local state so the UI reflects
      // logged-out immediately
    }

    try {
      await aioha.logoutAll()
    } catch {
      // best-effort -- don't block sign-out on Aioha's own cleanup
    }

    setUsername(null)
  }

  const value = {
    isAuthenticated: !!username,
    isLoading,
    sessionCheckError,
    username,
    login,
    logout,
    retryCheckSession: checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}