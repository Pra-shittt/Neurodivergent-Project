import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'

const PRONOUNS = ['they/them', 'she/her', 'he/him', 'she/they', 'he/they', 'xe/xem', 'prefer not to say']
const DIAGNOSES = ['ADHD', 'ASD', 'Both ADHD & ASD', 'Awaiting assessment', 'Self-identified', 'Other']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'individual', pronouns: '', diagnoses: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleDiagnosis = (d) => {
    setForm(f => ({
      ...f,
      diagnoses: f.diagnoses.includes(d) ? f.diagnoses.filter(x => x !== d) : [...f.diagnoses, d]
    }))
  }

  const nextStep = () => { setError(''); setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await register(form)
    setLoading(false)
    if (res.success) {
      navigate(res.data.user.role === 'clinician' ? '/clinician' : '/dashboard')
    } else {
      setError(res.error)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at top right, rgba(78,205,196,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(124,106,247,0.06) 0%, transparent 60%), var(--bg-primary)' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: 480, padding: '40px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Brain size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>An inclusive space for neurodivergent individuals</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= s ? 'var(--accent-purple)' : 'var(--border)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>I am a…</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ value: 'individual', label: '🧠 Individual / Self-Advocate' }, { value: 'clinician', label: '🩺 Clinician / Therapist' }].map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    style={{ padding: '12px 10px', borderRadius: 10, border: `2px solid ${form.role === r.value ? 'var(--accent-purple)' : 'var(--border)'}`, background: form.role === r.value ? 'rgba(124,106,247,0.1)' : 'var(--bg-secondary)', color: form.role === r.value ? 'var(--accent-purple-soft)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s', textAlign: 'center' }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Full name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-name" type="text" required placeholder="Your name" value={form.name}
                  onChange={e => set('name', e.target.value)} className="input-field" style={{ paddingLeft: 36 }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-email" type="email" required placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} className="input-field" style={{ paddingLeft: 36 }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-password" type="password" required minLength={8} placeholder="Min. 8 characters" value={form.password}
                  onChange={e => set('password', e.target.value)} className="input-field" style={{ paddingLeft: 36 }} />
              </div>
            </div>

            <button type="button" disabled={!form.name || !form.email || form.password.length < 8} onClick={nextStep}
              className="btn-primary" style={{ marginTop: 4 }}>
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            {/* Pronouns */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Your pronouns <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRONOUNS.map(p => (
                  <button key={p} type="button" onClick={() => set('pronouns', form.pronouns === p ? '' : p)}
                    style={{ padding: '6px 12px', borderRadius: 99, border: `1px solid ${form.pronouns === p ? 'var(--accent-teal)' : 'var(--border)'}`, background: form.pronouns === p ? 'rgba(78,205,196,0.12)' : 'transparent', color: form.pronouns === p ? 'var(--accent-teal-soft)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.2s' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnoses (only for individuals) */}
            {form.role === 'individual' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Relevant diagnoses / experiences <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DIAGNOSES.map(d => (
                    <button key={d} type="button" onClick={() => handleDiagnosis(d)}
                      style={{ padding: '6px 12px', borderRadius: 99, border: `1px solid ${form.diagnoses.includes(d) ? 'var(--accent-purple)' : 'var(--border)'}`, background: form.diagnoses.includes(d) ? 'rgba(124,106,247,0.12)' : 'transparent', color: form.diagnoses.includes(d) ? 'var(--accent-purple-soft)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.2s' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', fontSize: '0.82rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', padding: '10px 12px', borderRadius: 8 }}>
                <AlertCircle size={14} />{error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Back</button>
              <button id="reg-submit" type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><Loader2 size={15} className="animate-spin" />Creating…</> : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-purple-soft)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
