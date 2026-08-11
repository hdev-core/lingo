import { createContext, useContext, useState, useEffect, useRef } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// How often to silently refresh the session while the app is open.
// Session cookie lasts 7 days server-side; refreshing well within that
// window keeps a long-open tab from ever going stale.
const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * AuthProvider — wraps the app and provides login/logout/session state.
 *
 * The session token itself lives in an httpOnly cookie set by the backend
 * (not readable by JS, protecting against XSS token theft). On load, we
 * ask the backend "am I logged in?" via /api/auth/me, which reads the
 * cookie server-side and tells us the username if valid. While logged in,
 * we periodically call /api/auth/refresh so a long-open tab's session
 * doesn't silently expire.
 */
export function AuthProvider({ children }) {
  const [username, setUsername] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshIntervalRef = useRef(null)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setUsername(data.username)
        } else {
          setUsername(null)
        }
      } catch {
        setUsername(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

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
        if (!res.ok) {
          // Session died server-side (expired/revoked elsewhere) -- reflect
          // that in the UI rather than pretending we're still logged in.
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
    try {
      await fetch(`${API_BASE}/api/auth/revoke`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // even if the request fails, clear local state so the UI reflects
      // logged-out immediately
    }
    setUsername(null)
  }

  const value = {
    isAuthenticated: !!username,
    isLoading,
    username,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}