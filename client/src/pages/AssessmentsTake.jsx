import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../services/mockApi'
import Modal from '../components/Modal'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ClipboardList, ChevronRight, CheckCircle2, Loader2, BarChart3, AlertTriangle } from 'lucide-react'

const bandColor = { green: '--accent-green', amber: '--accent-amber', rose: '--accent-rose' }

export default function AssessmentsTake() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [userAssessments, setUserAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultModal, setResultModal] = useState(null)

  useEffect(() => {
    Promise.all([
      mockApi.getAssessmentTemplates(),
      mockApi.getUserAssessments(user.id),
    ]).then(([t, a]) => {
      if (t.success) setTemplates(t.data.templates)
      if (a.success) setUserAssessments(a.data.assessments)
      setLoading(false)
    })
  }, [user.id])

  const startAssessment = (template) => {
    setActiveTemplate(template)
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
  }

  const answerQ = (value) => {
    const qId = activeTemplate.questions[currentQ].id
    setAnswers(a => ({ ...a, [qId]: value }))
    if (currentQ < activeTemplate.questions.length - 1) {
      setCurrentQ(c => c + 1)
    }
  }

  const submitAssessment = async () => {
    setSubmitting(true)
    const answersArr = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }))
    const res = await mockApi.submitAssessment(user.id, activeTemplate.id, answersArr)
    if (res.success) {
      setResult(res.data.assessment)
      setUserAssessments(prev => [...prev, res.data.assessment])
    }
    setSubmitting(false)
  }

  const allAnswered = activeTemplate && Object.keys(answers).length === activeTemplate.questions.length

  const radarData = result ? activeTemplate.sections.map(s => ({
    section: s.length > 12 ? s.slice(0, 12) + '…' : s,
    score: result.sectionScores[s] || 0,
  })) : []

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  // Assessment in progress
  if (activeTemplate && !result) {
    const q = activeTemplate.questions[currentQ]
    const progress = (Object.keys(answers).length / activeTemplate.questions.length) * 100

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }} className="fade-in">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{activeTemplate.name}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Object.keys(answers).length}/{activeTemplate.questions.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-teal))', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>Section: <span style={{ color: 'var(--text-secondary)' }}>{q.section}</span></p>
        </div>

        {/* Question card */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 24 }} key={q.id}>
          <p style={{ fontSize: '0.75rem', color: 'var(--accent-purple-soft)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 16, textTransform: 'uppercase' }}>Question {currentQ + 1}</p>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>{q.text}</p>
        </div>

        {/* Option buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeTemplate.options.map((opt, i) => (
            <button key={opt} onClick={() => answerQ(i)}
              style={{ padding: '13px 18px', borderRadius: 12, border: `1px solid ${answers[q.id] === i ? 'var(--accent-purple)' : 'var(--border)'}`, background: answers[q.id] === i ? 'rgba(124,106,247,0.12)' : 'var(--bg-secondary)', color: answers[q.id] === i ? 'var(--accent-purple-soft)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '0.9rem', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${answers[q.id] === i ? 'var(--accent-purple)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', background: answers[q.id] === i ? 'var(--accent-purple)' : 'transparent', color: answers[q.id] === i ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>
                {answers[q.id] === i ? '✓' : i + 1}
              </span>
              {opt}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {currentQ > 0 && <button onClick={() => setCurrentQ(c => c - 1)} className="btn-secondary">← Prev</button>}
            {currentQ < activeTemplate.questions.length - 1 && answers[q.id] !== undefined && (
              <button onClick={() => setCurrentQ(c => c + 1)} className="btn-secondary">Next →</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setActiveTemplate(null)} className="btn-secondary">Cancel</button>
            {allAnswered && (
              <button onClick={submitAssessment} disabled={submitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {submitting ? <><Loader2 size={14} className="animate-spin" />Scoring…</> : '✓ Submit'}
              </button>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Result screen
  if (result) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }} className="fade-in">
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <CheckCircle2 size={48} color="var(--accent-teal)" style={{ marginBottom: 14 }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{activeTemplate.name} Complete</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{activeTemplate.fullName}</p>
          </div>

          {/* Score */}
          <div style={{ background: `rgba(var(--accent-purple-rgb, 124,106,247),0.08)`, border: `1px solid rgba(124,106,247,0.2)`, borderRadius: 12, padding: '18px 22px', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: '3rem', fontWeight: 900, color: `var(${bandColor[result.riskBand.color]})`, lineHeight: 1 }}>{result.totalScore}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>out of {result.maxScore}</p>
            <p style={{ marginTop: 10, fontWeight: 700, color: `var(${bandColor[result.riskBand.color]})`, fontSize: '0.95rem' }}>
              {result.riskBand.color === 'rose' && '🚨 '}{result.riskBand.label}
            </p>
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} />Sub-score Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="section" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Radar dataKey="score" stroke="var(--accent-purple)" fill="var(--accent-purple)" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Section scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {Object.entries(result.sectionScores).map(([section, score]) => (
              <div key={section} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{section}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 100, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (score / 10) * 100)}%`, background: 'var(--accent-purple)', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple-soft)', minWidth: 20 }}>{score}</span>
                </div>
              </div>
            ))}
          </div>

          {result.riskBand.color === 'rose' && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 20 }}>
              <AlertTriangle size={16} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Your score suggests significant symptoms. Consider sharing this report with your clinician for professional evaluation.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setActiveTemplate(null); setResult(null) }} className="btn-primary" style={{ flex: 1 }}>Back to Assessments</button>
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Assessment list
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }} className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Psychometric Assessments</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Standardised tools for self-understanding. Results are for personal insight — always discuss with a professional.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {templates.map(t => {
          const completed = userAssessments.filter(a => a.templateId === t.id)
          const latest = completed[completed.length - 1]
          return (
            <div key={t.id} className="glass-card" style={{ padding: '22px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <ClipboardList size={17} color="var(--accent-purple)" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</h2>
                  {latest && <span className="badge badge-green">✓ Completed</span>}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>{t.fullName}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{t.description}</p>
                {latest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Last score:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: `var(${bandColor[latest.riskBand.color]})` }}>{latest.totalScore}/{latest.maxScore} — {latest.riskBand.label}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {t.sections.map(s => <span key={s} className="badge badge-purple">{s}</span>)}
                  <span className="badge badge-teal">{t.questions.length} questions</span>
                </div>
              </div>
              <button onClick={() => startAssessment(t)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {latest ? 'Retake' : 'Start'} <ChevronRight size={15} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
