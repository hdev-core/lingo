import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const SESSION_STORAGE_KEY = 'lingo-session'

/**
 * AuthProvider — wraps the app and provides login/logout/session state.
 *
 * Session shape (from backend): { username, token, expiresAt }
 * Stored in localStorage so a refresh doesn't log the player out,
 * consistent with "session issue/refresh/revoke" from the card spec.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null
    try {
      const parsed = JSON.parse(stored)
      // Drop expired sessions on load
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        return null
      }
      return parsed
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [session])

  function login(sessionData) {
    setSession(sessionData)
  }

  function logout() {
    setSession(null)
  }

  const value = {
    session,
    isAuthenticated: !!session,
    username: session?.username ?? null,
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