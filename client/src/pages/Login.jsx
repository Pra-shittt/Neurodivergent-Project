import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await login(form.email, form.password)
    setLoading(false)
    if (res.success) {
      navigate(res.data.user.role === 'clinician' ? '/clinician' : '/dashboard')
    } else {
      setError(res.error)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at top left, rgba(124,106,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(78,205,196,0.06) 0%, transparent 60%), var(--bg-primary)' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: 440, padding: '40px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Brain size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sign in to your NeuroPortal account</p>
        </div>

        {/* Demo hints */}
        <div style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--accent-teal-soft)', fontWeight: 600, marginBottom: 4 }}>Demo Accounts</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Individual: <span style={{ color: 'var(--text-secondary)' }}>alex@demo.com</span><br />
            Clinician: <span style={{ color: 'var(--text-secondary)' }}>morgan@demo.com</span><br />
            Password: <span style={{ color: 'var(--text-secondary)' }}>demo1234</span>
          </p>
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="login-email" type="email" required placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field" style={{ paddingLeft: 38 }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="login-password" type={showPw ? 'text' : 'password'} required placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field" style={{ paddingLeft: 38, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', fontSize: '0.82rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', padding: '10px 12px', borderRadius: 8 }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          <button id="login-submit" type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-purple-soft)', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
