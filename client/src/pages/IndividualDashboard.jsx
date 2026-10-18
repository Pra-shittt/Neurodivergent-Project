import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../services/mockApi'
import MetricSlider from '../components/MetricSlider'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Plus, TrendingUp, BookOpen, Zap, Eye, Tag, Loader2 } from 'lucide-react'

const TRIGGERS = ['Bright lights', 'Loud noises', 'Crowded spaces', 'Time pressure', 'Social demands', 'Unexpected changes', 'Strong smells', 'Physical touch', 'Screen time', 'Multitasking']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card" style={{ padding: '10px 14px', fontSize: '0.78rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function IndividualDashboard() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [logForm, setLogForm] = useState({ mood: 3, executiveFunction: 3, sensoryOverload: 3, maskingFatigue: 3, triggers: [], journal: '' })

  useEffect(() => {
    mockApi.getLogs(user.id).then(res => {
      if (res.success) setLogs(res.data.logs)
      setLoading(false)
    })
  }, [user.id])

  const toggleTrigger = (t) => setLogForm(f => ({
    ...f,
    triggers: f.triggers.includes(t) ? f.triggers.filter(x => x !== t) : [...f.triggers, t]
  }))

  const submitLog = async () => {
    setSubmitting(true)
    const res = await mockApi.submitLog(user.id, logForm)
    if (res.success) {
      setLogs(prev => {
        const idx = prev.findIndex(l => l.date === res.data.log.date)
        if (idx >= 0) { const n = [...prev]; n[idx] = res.data.log; return n }
        return [...prev, res.data.log]
      })
      setLogModalOpen(false)
      setLogForm({ mood: 3, executiveFunction: 3, sensoryOverload: 3, maskingFatigue: 3, triggers: [], journal: '' })
    }
    setSubmitting(false)
  }

  const chartData = logs.slice(-14).map(l => ({
    date: l.date.slice(5), // MM-DD
    Mood: l.mood,
    'Exec. Fn.': l.executiveFunction,
    Sensory: l.sensoryOverload,
    Masking: l.maskingFatigue,
  }))

  const latestLog = logs[logs.length - 1]

  const metricCards = [
    { label: 'Mood', value: latestLog?.mood, icon: '😊', color: '--accent-teal', max: 5 },
    { label: 'Executive Function', value: latestLog?.executiveFunction, icon: '🧩', color: '--accent-purple', max: 5 },
    { label: 'Sensory Load', value: latestLog?.sensoryOverload, icon: '🌊', color: '--accent-amber', max: 5 },
    { label: 'Masking Fatigue', value: latestLog?.maskingFatigue, icon: '🎭', color: '--accent-rose', max: 5 },
  ]

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }} className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Hey, {user.name.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {user.pronouns && <span style={{ color: 'var(--text-secondary)' }}>{user.pronouns} · </span>}
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => setLogModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Log Today
        </button>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 32 }}>
        {metricCards.map(m => (
          <div key={m.label} className="glass-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>TODAY</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: `var(${m.color})`, lineHeight: 1 }}>{m.value ?? '—'}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{m.label} <span style={{ color: 'var(--text-muted)' }}>/5</span></p>
            {m.value && (
              <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(m.value / 5) * 100}%`, background: `var(${m.color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TrendingUp size={18} color="var(--accent-purple)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>14-Day Trend</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="Mood" stroke="var(--accent-teal)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Exec. Fn." stroke="var(--accent-purple)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Sensory" stroke="var(--accent-amber)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Masking" stroke="var(--accent-rose)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No logs yet — add your first daily log!</p>
        )}
      </div>

      {/* Recent logs */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <BookOpen size={18} color="var(--accent-teal)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Journal Entries</h2>
        </div>
        {logs.filter(l => l.journal).slice(-5).reverse().map(l => (
          <div key={l.id} style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: 14, marginBottom: 16 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{l.date}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{l.journal}</p>
            {l.triggers?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {l.triggers.map(t => <span key={t} className="badge badge-purple"><Tag size={10} style={{ marginRight: 4 }} />{t}</span>)}
              </div>
            )}
          </div>
        ))}
        {logs.filter(l => l.journal).length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No journal entries yet.</p>
        )}
      </div>

      {/* Log Modal */}
      <Modal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} title="📋 Daily Check-In" maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Rate how you're feeling today on a scale of 1 (very low) to 5 (very high).</p>

          <MetricSlider label="Mood" icon="😊" value={logForm.mood} onChange={v => setLogForm(f => ({ ...f, mood: v }))} colorVar="--accent-teal" />
          <MetricSlider label="Executive Function" icon="🧩" value={logForm.executiveFunction} onChange={v => setLogForm(f => ({ ...f, executiveFunction: v }))} colorVar="--accent-purple" />
          <MetricSlider label="Sensory Overload" icon="🌊" value={logForm.sensoryOverload} onChange={v => setLogForm(f => ({ ...f, sensoryOverload: v }))} colorVar="--accent-amber" />
          <MetricSlider label="Masking Fatigue" icon="🎭" value={logForm.maskingFatigue} onChange={v => setLogForm(f => ({ ...f, maskingFatigue: v }))} colorVar="--accent-rose" />

          {/* Triggers */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={15} color="var(--accent-amber)" />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Environmental Triggers</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TRIGGERS.map(t => (
                <button key={t} type="button" onClick={() => toggleTrigger(t)}
                  style={{ padding: '5px 11px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${logForm.triggers.includes(t) ? 'var(--accent-amber)' : 'var(--border)'}`, background: logForm.triggers.includes(t) ? 'rgba(245,166,35,0.12)' : 'transparent', color: logForm.triggers.includes(t) ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Journal */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Eye size={15} color="var(--accent-teal)" />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Journal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>
            </div>
            <textarea value={logForm.journal} onChange={e => setLogForm(f => ({ ...f, journal: e.target.value }))}
              placeholder="How are you feeling? What happened today?…"
              className="input-field" style={{ minHeight: 90, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <button onClick={submitLog} disabled={submitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {submitting ? <><Loader2 size={15} className="animate-spin" />Saving…</> : '✓ Save Check-In'}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
