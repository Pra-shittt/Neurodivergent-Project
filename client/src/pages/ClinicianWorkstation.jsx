import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../services/apiClient'
import Modal from '../components/Modal'
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, AlertTriangle, ChevronRight, NotebookPen, TrendingUp, Link2, Loader2, Search, ClipboardCheck } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card" style={{ padding: '10px 14px', fontSize: '0.78rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function ClinicianWorkstation() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedPatientForAssessments, setSelectedPatientForAssessments] = useState(null)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [linkMsg, setLinkMsg] = useState(null)
  const [savingNote, setSavingNote] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiClient.getClinicianPatients(user._id || user.id).then(res => {
      if (res.success) setPatients(res.data.patients)
      setLoading(false)
    })
  }, [user._id, user.id])

  const openPatient = async (p) => {
    setSelectedPatient(p)
    const res = await apiClient.getClinicalNotes(user._id || user.id, p._id || p.id)
    if (res.success) setNotes(res.data.notes)
    setNoteModalOpen(true)
  }

  const openAssessments = (p) => {
    setSelectedPatientForAssessments(p)
    setAssessmentModalOpen(true)
  }

  const saveNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    const res = await apiClient.addClinicalNote(user._id || user.id, selectedPatient._id || selectedPatient.id, noteText)
    if (res.success) {
      setNotes(n => [...n, res.data.note])
      setNoteText('')
    }
    setSavingNote(false)
  }

  const linkPatient = async () => {
    setLinkMsg(null)
    const res = await apiClient.linkPatient(user._id || user.id, inviteCode)
    if (res.success) {
      setLinkMsg({ type: 'success', text: `✓ Linked ${res.data.patient.name} to your roster.` })
      const refreshed = await apiClient.getClinicianPatients(user._id || user.id)
      if (refreshed.success) setPatients(refreshed.data.patients)
      setInviteCode('')
    } else {
      setLinkMsg({ type: 'error', text: res.error })
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const getChartData = (p) => (p.recentLogs || []).map(l => ({
    date: l.date.slice(5),
    Masking: l.maskingFatigue,
    Mood: l.mood,
    Sensory: l.sensoryOverload,
  }))

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  const burnoutCount = patients.filter(p => p.burnoutFlag).length
  const totalAssessmentsCount = patients.reduce((acc, p) => acc + (p.assessments?.length || 0), 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Clinician Workstation
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Dr. {user.name} · {user.pronouns} · {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setLinkModalOpen(true); setLinkMsg(null) }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={15} /> Link Patient
        </button>
      </div>

      {/* Burnout alert banner */}
      {burnoutCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', marginBottom: 24 }}>
          <div className="pulse-dot" />
          <AlertTriangle size={17} color="var(--accent-rose)" />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>🚨 Burnout Alert:</span>{' '}
            {burnoutCount} patient{burnoutCount > 1 ? 's have' : ' has'} shown high masking fatigue for 3+ consecutive days.
          </p>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 340 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search patients…" className="input-field" style={{ paddingLeft: 36 }} />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Patients', value: patients.length, color: '--accent-teal', icon: '👥' },
          { label: 'Active Alerts', value: burnoutCount, color: '--accent-rose', icon: '🚨' },
          { label: 'Completed Assessments', value: totalAssessmentsCount, color: '--accent-purple', icon: '📋' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: '1.7rem', fontWeight: 800, color: `var(${s.color})`, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Patient roster */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredPatients.length === 0 && (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <Users size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)' }}>{search ? 'No patients match your search.' : 'No patients linked yet. Use "Link Patient" to get started.'}</p>
          </div>
        )}
        {filteredPatients.map(p => {
          const chartData = getChartData(p)
          const patientAssessments = p.assessments || []
          return (
            <div key={p._id || p.id} className="glass-card" style={{ padding: '22px 24px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Patient info */}
              <div style={{ flex: '1 1 240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
                    {p.name[0]}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</h2>
                      {p.burnoutFlag && <span style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-rose)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>🚨 BURNOUT RISK</span>}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.pronouns} · {(p.diagnoses || []).join(', ')}</p>
                  </div>
                </div>

                {/* Latest daily metrics */}
                {p.recentLogs?.[p.recentLogs.length - 1] && (() => {
                  const l = p.recentLogs[p.recentLogs.length - 1]
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                      {[
                        { k: 'Mood', v: l.mood, c: '--accent-teal' },
                        { k: 'Exec. Fn.', v: l.executiveFunction, c: '--accent-purple' },
                        { k: 'Sensory', v: l.sensoryOverload, c: '--accent-amber' },
                        { k: 'Masking', v: l.maskingFatigue, c: '--accent-rose' },
                      ].map(m => (
                        <div key={m.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 10px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.k}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: `var(${m.c})` }}>{m.v}/5</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Assessment score pills on the patient card */}
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClipboardCheck size={12} color="var(--accent-teal)" /> Formal Assessments ({patientAssessments.length})
                  </p>
                  {patientAssessments.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {patientAssessments.map(a => {
                        const bandColor = a.riskBand?.color === 'rose' ? 'var(--accent-rose)' : a.riskBand?.color === 'amber' ? 'var(--accent-amber)' : 'var(--accent-green)'
                        return (
                          <div
                            key={a.id || a._id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'var(--bg-secondary)',
                              border: `1px solid var(--border)`,
                              fontSize: '0.72rem',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.templateName}</span>
                            <span style={{ fontWeight: 700, color: bandColor }}>{a.totalScore}/{a.maxScore}</span>
                            <span style={{ fontSize: '0.68rem', color: bandColor, opacity: 0.9 }}>({a.riskBand?.label?.split('—')[0]?.trim()})</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No assessments completed yet.</p>
                  )}
                </div>
              </div>

              {/* Mini trend chart */}
              {chartData.length > 0 && (
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}><TrendingUp size={11} />Recent 3-Day Trend</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="Masking" stroke="var(--accent-rose)" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="Mood" stroke="var(--accent-teal)" strokeWidth={1.5} dot={false} />
                      <Tooltip content={<CustomTooltip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => openAssessments(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    padding: '7px 13px',
                    borderRadius: 8,
                    border: '1px solid var(--accent-teal)',
                    background: 'rgba(78, 205, 196, 0.12)',
                    color: 'var(--accent-teal)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <ClipboardCheck size={14} /> Assessments ({patientAssessments.length})
                </button>

                <button
                  onClick={() => openPatient(p)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', padding: '7px 14px' }}
                >
                  <NotebookPen size={14} /> Notes <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Patient Assessments Modal */}
      <Modal
        isOpen={assessmentModalOpen}
        onClose={() => setAssessmentModalOpen(false)}
        title={`📋 Assessment Results — ${selectedPatientForAssessments?.name}`}
        maxWidth={620}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(!selectedPatientForAssessments?.assessments || selectedPatientForAssessments.assessments.length === 0) ? (
            <div style={{ padding: '30px 20px', textAlign: 'center' }}>
              <ClipboardCheck size={36} color="var(--text-muted)" style={{ marginBottom: 10 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No completed psychometric assessments found for this patient yet.
              </p>
            </div>
          ) : (
            selectedPatientForAssessments.assessments.map(a => {
              const bandColor = a.riskBand?.color === 'rose' ? 'var(--accent-rose)' : a.riskBand?.color === 'amber' ? 'var(--accent-amber)' : 'var(--accent-green)'
              const pct = Math.round((a.totalScore / a.maxScore) * 100)
              const sectionEntries = a.sectionScores ? Object.entries(a.sectionScores) : []

              return (
                <div
                  key={a.id || a._id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {a.templateName}
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Completed: {new Date(a.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 99,
                          color: bandColor,
                          background: `${bandColor}22`,
                          border: `1px solid ${bandColor}55`,
                        }}
                      >
                        {a.riskBand?.label}
                      </span>
                    </div>
                  </div>

                  {/* Total Score Meter */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Overall Score:</span>
                      <span style={{ fontWeight: 800, color: bandColor }}>
                        {a.totalScore} / {a.maxScore} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: bandColor, borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                  </div>

                  {/* Subscale / Section Scores */}
                  {sectionEntries.length > 0 && (
                    <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Subscale Breakdown</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                        {sectionEntries.map(([sec, score]) => (
                          <div key={sec} style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sec}</p>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{score}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Modal>

      {/* Clinical Notes Modal */}
      <Modal isOpen={noteModalOpen} onClose={() => { setNoteModalOpen(false); setNoteText('') }} title={`📝 Clinical Notes — ${selectedPatient?.name}`} maxWidth={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>No notes yet.</p>}
            {notes.map(n => (
              <div key={n._id || n.id} style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: 12 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{n.content}</p>
              </div>
            ))}
          </div>
          <div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add a clinical note…"
              className="input-field" style={{ minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} />
            <button onClick={saveNote} disabled={savingNote || !noteText.trim()} className="btn-primary"
              style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              {savingNote ? <><Loader2 size={14} className="animate-spin" />Saving…</> : '+ Add Note'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Link Patient Modal */}
      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="🔗 Link a Patient" maxWidth={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ask your patient for their unique invite code to add them to your roster.</p>
          <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. ALEX-2024" className="input-field" style={{ letterSpacing: '0.1em', fontWeight: 600 }} />
          {linkMsg && (
            <p style={{ fontSize: '0.82rem', color: linkMsg.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-rose)', fontWeight: 600 }}>{linkMsg.text}</p>
          )}
          <button onClick={linkPatient} disabled={!inviteCode} className="btn-primary">Link Patient</button>
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
