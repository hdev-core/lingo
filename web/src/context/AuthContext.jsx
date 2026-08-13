import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { aioha } from '../lib/aioha'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const OLD_SESSION_STORAGE_KEY = 'lingo-session'
const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const SESSION_CHECK_TIMEOUT_MS = 10 * 1000 // 10 seconds
const REFRESH_TIMEOUT_MS = 10 * 1000 // 10 seconds
const LOGOUT_TIMEOUT_MS = 10 * 1000 // 10 seconds

function withTimeout(promise, ms, timeoutMessage) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

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
  const refreshControllerRef = useRef(null)

  const checkSession = useCallback(async () => {
    setIsLoading(true)
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
        // A non-401 error (429, 5xx) is not proof of being logged out.
        setSessionCheckError(true)
      }
    } catch {
      // Network failure, timeout, or abort is not proof of logout.
      setSessionCheckError(true)
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Remove the old pre-cookie JWT if it still exists from an older build.
    localStorage.removeItem(OLD_SESSION_STORAGE_KEY)

    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!username) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }

      if (refreshControllerRef.current) {
        refreshControllerRef.current.abort()
        refreshControllerRef.current = null
      }

      return
    }

    refreshIntervalRef.current = setInterval(async () => {
      const controller = new AbortController()
      refreshControllerRef.current = controller

      const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)

      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        })

        if (res.status === 401) {
          // Session genuinely expired or was revoked.
          setUsername(null)
        }
      } catch {
        // Network failure, timeout, or an abort during logout is transient.
        // Leave the current session state alone.
      } finally {
        clearTimeout(timeoutId)

        if (refreshControllerRef.current === controller) {
          refreshControllerRef.current = null
        }
      }
    }, REFRESH_INTERVAL_MS)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }

      if (refreshControllerRef.current) {
        refreshControllerRef.current.abort()
        refreshControllerRef.current = null
      }
    }
  }, [username])

  function login(sessionData) {
    setUsername(sessionData.username)
  }

  async function logout() {
    // Stop any future refresh and abort an in-flight refresh before logout.
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (refreshControllerRef.current) {
      refreshControllerRef.current.abort()
      refreshControllerRef.current = null
    }

    // Reflect logout in the UI immediately.
    setUsername(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS)

    try {
      await fetch(`${API_BASE}/api/auth/revoke`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })
    } catch {
      // Local logout should not hang because the revoke request failed.
    } finally {
      clearTimeout(timeoutId)
    }

    try {
      await withTimeout(
        aioha.logoutAll(),
        LOGOUT_TIMEOUT_MS,
        'Aioha logout timed out'
      )
    } catch {
      // Best-effort cleanup; do not block sign-out on Aioha.
    }
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

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return ctx
}