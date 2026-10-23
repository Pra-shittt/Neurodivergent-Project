import { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem('nd_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('nd_user') }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await apiClient.login(email, password)
    if (res.success) {
      setUser(res.data.user)
      localStorage.setItem('nd_user', JSON.stringify(res.data.user))
    }
    return res
  }

  const register = async (payload) => {
    const res = await apiClient.register(payload)
    if (res.success) {
      setUser(res.data.user)
      localStorage.setItem('nd_user', JSON.stringify(res.data.user))
    }
    return res
  }

  const logout = async () => {
    try { await apiClient.logout() } catch { /* ignore */ }
    setUser(null)
    localStorage.removeItem('nd_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
