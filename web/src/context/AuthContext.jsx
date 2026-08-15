import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
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

async function readErrorMessage(res, fallback) {
  try {
    const data = await res.json()

    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    // Fall through to the fallback message.
  }

  return fallback
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
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)

  const refreshIntervalRef = useRef(null)
  const refreshControllerRef = useRef(null)
  const logoutInFlightRef = useRef(false)

  const checkSession = useCallback(async () => {
    setIsLoading(true)
    setSessionCheckError(false)

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      SESSION_CHECK_TIMEOUT_MS
    )

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
    if (!username || isLoggingOut) {
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

      const timeoutId = setTimeout(
        () => controller.abort(),
        REFRESH_TIMEOUT_MS
      )

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
        // Network failure or timeout is transient.
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
  }, [username, isLoggingOut])

  function login(sessionData) {
    setLogoutError(null)
    setUsername(sessionData.username)
  }

  async function logout() {
    if (logoutInFlightRef.current) {
      return false
    }

    logoutInFlightRef.current = true
    setIsLoggingOut(true)
    setLogoutError(null)

    // Stop future refreshes and abort an in-flight refresh before attempting
    // server-side revocation.
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (refreshControllerRef.current) {
      refreshControllerRef.current.abort()
      refreshControllerRef.current = null
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      LOGOUT_TIMEOUT_MS
    )

    try {
      const res = await fetch(`${API_BASE}/api/auth/revoke`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })

      if (!res.ok) {
        const message = await readErrorMessage(
          res,
          'Could not sign out. Please try again.'
        )

        throw new Error(message)
      }

      // Only render the user as signed out once the server confirms that the
      // httpOnly-cookie session has been revoked.
      setUsername(null)

      try {
        await withTimeout(
          aioha.logoutAll(),
          LOGOUT_TIMEOUT_MS,
          'Aioha logout timed out'
        )
      } catch {
        // The server session is already revoked. Aioha cleanup is best-effort
        // and must not turn a successful sign-out into a failed one.
      }

      return true
    } catch (err) {
      let message

      if (err?.name === 'AbortError') {
        message =
          'Sign out timed out. Your session may still be active. Please try again.'
      } else if (err instanceof TypeError) {
        // Browsers report network failures as TypeError ("Failed to fetch").
        message =
          'Could not sign out. Your session may still be active. Please try again.'
      } else {
        // Preserve a meaningful error returned by the backend.
        message =
          err?.message ||
          'Could not sign out. Your session may still be active. Please try again.'
      }

      // Keep the authenticated UI visible because server-side revocation was
      // not confirmed. The refresh effect restarts when isLoggingOut becomes
      // false.
      setLogoutError(message)

      return false
    } finally {
      clearTimeout(timeoutId)
      logoutInFlightRef.current = false
      setIsLoggingOut(false)
    }
  }

  const value = {
    isAuthenticated: !!username,
    isLoading,
    sessionCheckError,
    isLoggingOut,
    logoutError,
    username,
    login,
    logout,
    retryCheckSession: checkSession,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return ctx
}