import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../services/apiClient'
import MetricSlider from '../components/MetricSlider'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Plus, TrendingUp, BookOpen, Zap, Eye, Tag, Loader2, Mic, Square,
  Upload, Sparkles, AlertCircle, HelpCircle, Link2, Copy, Check,
  ShieldCheck, UserCheck, Unlink, Wand2, Lock, Radio
} from 'lucide-react'
import { detectTriggersFromText } from '../utils/triggerDetector'

const TRIGGERS = [
  'Bright lights',
  'Loud noises',
  'Crowded spaces',
  'Time pressure',
  'Social demands',
  'Unexpected changes',
  'Strong smells',
  'Physical touch',
  'Screen time',
  'Multitasking'
]

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
  const [logForm, setLogForm] = useState({
    mood: 3,
    executiveFunction: 3,
    sensoryOverload: 3,
    maskingFatigue: 3,
    triggers: [],
    journal: ''
  })

  // Clinician & Privacy States
  const [inviteCode, setInviteCode] = useState('')
  const [clinicianInfo, setClinicianInfo] = useState(null)
  const [privacySettings, setPrivacySettings] = useState({ shareMetrics: true, shareJournals: false })
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [clinicianEmailInput, setClinicianEmailInput] = useState('')
  const [linkingClinician, setLinkingClinician] = useState(false)
  const [clinicianMsg, setClinicianMsg] = useState(null)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacySuccessMsg, setPrivacySuccessMsg] = useState(null)

  // Audio recording & Speech-to-Text states
  const [recording, setRecording] = useState(false)
  const [isLiveListening, setIsLiveListening] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioProcessing, setAudioProcessing] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [audioSuccess, setAudioSuccess] = useState(null)
  const [detectedInsightItems, setDetectedInsightItems] = useState([])
  const [showScoreGuide, setShowScoreGuide] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const fileInputRef = useRef(null)
  const speechRecognizerRef = useRef(null)

  // Load daily logs and user invite / clinician details
  useEffect(() => {
    const userId = user._id || user.id
    apiClient.getLogs(userId).then(res => {
      if (res.success) setLogs(res.data.logs || [])
      setLoading(false)
    })

    apiClient.getInviteCode(userId).then(res => {
      if (res.success && res.data) {
        if (res.data.inviteCode) setInviteCode(res.data.inviteCode)
        if (res.data.clinician) setClinicianInfo(res.data.clinician)
        if (res.data.privacySettings) setPrivacySettings(res.data.privacySettings)
      }
    })
  }, [user._id, user.id])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop()
      }
    }
  }, [])

  const copyInviteCode = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2500)
  }

  const toggleTrigger = (t) => setLogForm(f => ({
    ...f,
    triggers: f.triggers.includes(t) ? f.triggers.filter(x => x !== t) : [...f.triggers, t]
  }))

  const handlePrivacyToggle = async (key) => {
    const newSettings = { ...privacySettings, [key]: !privacySettings[key] }
    setPrivacySettings(newSettings)
    setSavingPrivacy(true)
    setPrivacySuccessMsg(null)
    const res = await apiClient.updatePrivacy(newSettings)
    setSavingPrivacy(false)
    if (res.success) {
      setPrivacySuccessMsg('✓ Privacy preferences updated!')
      setTimeout(() => setPrivacySuccessMsg(null), 3000)
    }
  }

  const handleLinkClinician = async (e) => {
    e.preventDefault()
    if (!clinicianEmailInput.trim()) return
    setLinkingClinician(true)
    setClinicianMsg(null)
    const res = await apiClient.linkClinician(clinicianEmailInput.trim())
    setLinkingClinician(false)
    if (res.success && res.data?.clinician) {
      setClinicianInfo(res.data.clinician)
      setClinicianEmailInput('')
      setClinicianMsg({ type: 'success', text: `✓ Connected to ${res.data.clinician.name}!` })
    } else {
      setClinicianMsg({ type: 'error', text: res.error || 'Could not find clinician with that email.' })
    }
  }

  const handleUnlinkClinician = async () => {
    if (!window.confirm('Are you sure you want to unlink from your clinician?')) return
    const res = await apiClient.unlinkClinician()
    if (res.success) {
      setClinicianInfo(null)
      setClinicianMsg({ type: 'success', text: 'Unlinked from clinician.' })
    }
  }

  // -------------------------------------------------------------
  // TRIGGER DETECTION ENGINE (Works on typed text & transcribed audio)
  // -------------------------------------------------------------
  const runTriggerDetection = (textToAnalyze, append = false) => {
    const text = textToAnalyze !== undefined ? textToAnalyze : logForm.journal
    if (!text || !text.trim()) {
      setAudioError('Please enter some text in the journal first to detect triggers.')
      return
    }

    setAudioError(null)
    const detection = detectTriggersFromText(text)
    const newChips = detection.matchedTriggers

    if (newChips.length > 0) {
      setLogForm(f => ({
        ...f,
        triggers: append
          ? Array.from(new Set([...f.triggers, ...newChips]))
          : Array.from(new Set([...f.triggers, ...newChips])),
      }))
      setDetectedInsightItems(detection.detectedItems)
      setAudioSuccess(`✨ AI Detected ${newChips.length} trigger${newChips.length > 1 ? 's' : ''}: ${newChips.join(', ')}`)
    } else {
      setAudioSuccess('✓ Analysis complete: No elevated environmental or sensory triggers detected.')
    }
  }

  // -------------------------------------------------------------
  // AUDIO & VOICE SPEECH-TO-TEXT SYSTEM
  // -------------------------------------------------------------
  const startLiveSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return false

    try {
      const recognition = new SpeechRecognition()
      speechRecognizerRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsLiveListening(true)
        setAudioError(null)
        setAudioSuccess(null)
      }

      recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          }
        }
        if (finalTranscript) {
          setLogForm(f => {
            const updated = f.journal ? `${f.journal} ${finalTranscript.trim()}` : finalTranscript.trim()
            runTriggerDetection(updated, true)
            return { ...f, journal: updated }
          })
        }
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          setAudioError(`Voice recognition error: ${event.error}`)
        }
        setIsLiveListening(false)
      }

      recognition.onend = () => {
        setIsLiveListening(false)
      }

      recognition.start()
      return true
    } catch {
      return false
    }
  }

  const stopLiveSpeechRecognition = () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop()
      setIsLiveListening(false)
    }
  }

  const startRecording = async () => {
    setAudioError(null)
    setAudioSuccess(null)

    // Attempt browser Live Speech Recognition first (seamless real-time stream)
    const startedLive = startLiveSpeechRecognition()
    if (startedLive) {
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
      return
    }

    // Fallback: standard audio MediaRecorder stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      setAudioError('Microphone access denied or unavailable: ' + err.message)
    }
  }

  const stopRecording = () => {
    if (isLiveListening) {
      stopLiveSpeechRecognition()
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioError(null)
    setAudioSuccess(null)
    await processAudio(file)
    e.target.value = ''
  }

  const processAudio = async (fileOrBlob) => {
    setAudioProcessing(true)
    setAudioError(null)
    setAudioSuccess(null)
    try {
      const res = await apiClient.analyzeAudio(fileOrBlob, logForm)
      if (res.success && res.data) {
        const transcript = res.data.transcript
        const combined = logForm.journal ? `${logForm.journal}\n${transcript}` : transcript

        setLogForm(f => ({
          ...f,
          journal: combined
        }))

        // Comprehensive trigger detection on the audio transcript
        runTriggerDetection(combined, true)
      } else {
        setAudioError(res.error || 'Could not transcribe audio clearly.')
      }
    } catch (err) {
      setAudioError(err.message || 'Error processing audio.')
    } finally {
      setAudioProcessing(false)
    }
  }

  // -------------------------------------------------------------
  // DAILY LOG SUBMISSION
  // -------------------------------------------------------------
  const submitLog = async () => {
    setSubmitting(true)
    const todayDate = new Date().toISOString().split('T')[0]

    // Ensure detection runs on final journal text before saving if triggers were not explicitly selected
    let finalTriggers = logForm.triggers
    if (logForm.journal && finalTriggers.length === 0) {
      const autoDetect = detectTriggersFromText(logForm.journal)
      if (autoDetect.matchedTriggers.length > 0) {
        finalTriggers = autoDetect.matchedTriggers
      }
    }

    const res = await apiClient.submitLog(user._id || user.id, {
      ...logForm,
      triggers: finalTriggers,
      date: todayDate,
    })

    if (res.success) {
      setLogs(prev => {
        const idx = prev.findIndex(l => l.date === res.data.log.date)
        if (idx >= 0) {
          const n = [...prev]
          n[idx] = res.data.log
          return n
        }
        return [...prev, res.data.log]
      })
      setLogModalOpen(false)
      setLogForm({ mood: 3, executiveFunction: 3, sensoryOverload: 3, maskingFatigue: 3, triggers: [], journal: '' })
      setAudioError(null)
      setAudioSuccess(null)
    }
    setSubmitting(false)
  }

  const chartData = logs.slice(-14).map(l => ({
    date: l.date.slice(5),
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
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

      {/* Clinician Connection & Privacy Banner Card */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 28, borderLeft: '4px solid var(--accent-teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          {/* Invite Code Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(78, 205, 196, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Link2 size={22} color="var(--accent-teal)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Clinician Invite Code
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent-teal)', fontFamily: 'monospace' }}>
                  {inviteCode || 'GENERATING…'}
                </span>
                <button
                  type="button"
                  onClick={copyInviteCode}
                  disabled={!inviteCode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: copiedInvite ? 'rgba(78,205,196,0.2)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: copiedInvite ? 'var(--accent-teal)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  title="Copy code to share with doctor"
                >
                  {copiedInvite ? <><Check size={12} color="var(--accent-teal)" /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Give this code to your doctor to link to their clinical roster.
              </p>
            </div>
          </div>

          {/* Clinician Linked Status or Direct Connect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {clinicianInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(124, 106, 247, 0.1)', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(124, 106, 247, 0.25)' }}>
                <UserCheck size={18} color="var(--accent-purple-soft)" />
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Dr. {clinicianInfo.name}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{clinicianInfo.email}</p>
                </div>
                <button
                  onClick={handleUnlinkClinician}
                  title="Unlink Clinician"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-rose)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Unlink size={14} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkClinician} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="email"
                  value={clinicianEmailInput}
                  onChange={e => setClinicianEmailInput(e.target.value)}
                  placeholder="Doctor's email (e.g. morgan@demo.com)"
                  className="input-field"
                  style={{ fontSize: '0.78rem', padding: '6px 12px', minWidth: 220 }}
                />
                <button
                  type="submit"
                  disabled={linkingClinician || !clinicianEmailInput.trim()}
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                >
                  {linkingClinician ? <Loader2 size={13} className="animate-spin" /> : 'Connect Doctor'}
                </button>
              </form>
            )}
          </div>
        </div>

        {clinicianMsg && (
          <p style={{ fontSize: '0.75rem', marginTop: 10, color: clinicianMsg.type === 'success' ? 'var(--accent-teal)' : 'var(--accent-rose)', fontWeight: 600 }}>
            {clinicianMsg.text}
          </p>
        )}

        {/* Sharing & Privacy Toggles */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={15} color="var(--accent-teal)" />
            <span style={{ fontWeight: 600 }}>Clinician Sharing Preferences:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={privacySettings.shareMetrics}
                onChange={() => handlePrivacyToggle('shareMetrics')}
                disabled={savingPrivacy}
              />
              <span style={{ color: privacySettings.shareMetrics ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                Share Daily Metrics
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={privacySettings.shareJournals}
                onChange={() => handlePrivacyToggle('shareJournals')}
                disabled={savingPrivacy}
              />
              <span style={{ color: privacySettings.shareJournals ? 'var(--accent-teal)' : 'var(--text-muted)', fontWeight: privacySettings.shareJournals ? 600 : 400 }}>
                {privacySettings.shareJournals ? '👁️ Diary Entries Shared' : '🔒 Diary Entries Kept Private'}
              </span>
            </label>

            {privacySuccessMsg && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                {privacySuccessMsg}
              </span>
            )}
          </div>
        </div>
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
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
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

      {/* Recent logs & Diary */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={18} color="var(--accent-teal)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Journal & Diary Entries</h2>
          </div>
          <span style={{ fontSize: '0.72rem', color: privacySettings.shareJournals ? 'var(--accent-teal)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {privacySettings.shareJournals ? <Eye size={12} /> : <Lock size={12} />}
            {privacySettings.shareJournals ? 'Visible to linked clinician' : 'Kept private from clinician'}
          </span>
        </div>
        {logs.filter(l => l.journal).slice(-5).reverse().map(l => (
          <div key={l.id || l._id} style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.date}</p>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Mood: {l.mood}/5 · Sensory: {l.sensoryOverload}/5
              </span>
            </div>
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

      {/* Log Modal with Live Voice STT + Instant Detection */}
      <Modal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} title="📋 Daily Check-In" maxWidth={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Rate how you're feeling today on a scale of 1 (very low) to 5 (very high).</p>
            <button
              type="button"
              onClick={() => setShowScoreGuide(s => !s)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-teal)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={13} /> {showScoreGuide ? 'Hide score guide' : 'What do these scores mean?'}
            </button>
          </div>

          {showScoreGuide && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.78rem',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div>
                <strong style={{ color: 'var(--accent-teal)' }}>😊 Mood:</strong> Overall emotional state (1 = very low / distressed, 5 = positive / regulated).
              </div>
              <div>
                <strong style={{ color: 'var(--accent-purple)' }}>🧩 Executive Function:</strong> Working memory, task initiation & mental focus (1 = ADHD paralysis / brain fog, 5 = strong flow & productivity).
              </div>
              <div>
                <strong style={{ color: 'var(--accent-amber)' }}>🌊 Sensory Overload:</strong> Environmental sensitivity to noise, bright lights, crowds (1 = peaceful & calm, 5 = severe overload / shutdown).
              </div>
              <div>
                <strong style={{ color: 'var(--accent-rose)' }}>🎭 Masking Fatigue:</strong> Exhaustion from suppressing neurodivergent traits or forcing social camouflage (1 = unmasked & natural, 5 = severe burnout).
              </div>
            </div>
          )}

          <MetricSlider label="Mood" icon="😊" value={logForm.mood} onChange={v => setLogForm(f => ({ ...f, mood: v }))} colorVar="--accent-teal" />
          <MetricSlider label="Executive Function" icon="🧩" value={logForm.executiveFunction} onChange={v => setLogForm(f => ({ ...f, executiveFunction: v }))} colorVar="--accent-purple" />
          <MetricSlider label="Sensory Overload" icon="🌊" value={logForm.sensoryOverload} onChange={v => setLogForm(f => ({ ...f, sensoryOverload: v }))} colorVar="--accent-amber" />
          <MetricSlider label="Masking Fatigue" icon="🎭" value={logForm.maskingFatigue} onChange={v => setLogForm(f => ({ ...f, maskingFatigue: v }))} colorVar="--accent-rose" />

          {/* Environmental Triggers with Auto-Select */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={15} color="var(--accent-amber)" />
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Environmental Triggers</p>
              </div>
              {logForm.triggers.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {logForm.triggers.length} selected
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TRIGGERS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrigger(t)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 99,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: `1px solid ${logForm.triggers.includes(t) ? 'var(--accent-amber)' : 'var(--border)'}`,
                    background: logForm.triggers.includes(t) ? 'rgba(245,166,35,0.18)' : 'transparent',
                    color: logForm.triggers.includes(t) ? 'var(--accent-amber)' : 'var(--text-muted)',
                  }}
                >
                  {logForm.triggers.includes(t) && '✓ '}{t}
                </button>
              ))}
            </div>
          </div>

          {/* Journal with Voice & Auto-Detection */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={15} color="var(--accent-teal)" />
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Journal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(speak or type)</span>
                </p>
              </div>

              {/* Audio & Detect Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg"
                  style={{ display: 'none' }}
                />

                {/* Auto-Detect Triggers Button */}
                <button
                  type="button"
                  onClick={() => runTriggerDetection()}
                  disabled={!logForm.journal.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--accent-amber)',
                    background: 'rgba(245, 166, 35, 0.12)',
                    color: 'var(--accent-amber)',
                    cursor: logForm.journal.trim() ? 'pointer' : 'not-allowed',
                    opacity: logForm.journal.trim() ? 1 : 0.6,
                  }}
                  title="Detect sensory, executive, and social triggers from journal text"
                >
                  <Wand2 size={13} /> Detect Triggers
                </button>

                {!recording ? (
                  <>
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={audioProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--accent-purple)',
                        background: 'rgba(124, 106, 247, 0.15)',
                        color: 'var(--accent-purple-soft)',
                        cursor: 'pointer',
                      }}
                      title="Speak your journal using your microphone"
                    >
                      <Mic size={13} /> Voice Journal
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={audioProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        padding: '4px 9px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                      title="Upload an audio file (.webm, .wav, .mp3)"
                    >
                      <Upload size={13} /> Upload Audio
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--accent-rose)',
                      background: 'rgba(248, 113, 113, 0.25)',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      animation: 'pulse 1.2s infinite',
                    }}
                  >
                    <Square size={12} fill="currentColor" /> Stop & Save ({recordingTime}s)
                  </button>
                )}
              </div>
            </div>

            {/* Live speech listening indicator */}
            {recording && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                marginBottom: 10,
                borderRadius: 8,
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                fontSize: '0.78rem',
                color: 'var(--accent-rose)',
              }}>
                <Radio size={14} className="pulse-dot" />
                <span>Listening actively... Speak naturally, words and triggers will be captured.</span>
              </div>
            )}

            {/* Processing state */}
            {audioProcessing && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                marginBottom: 10,
                borderRadius: 8,
                background: 'rgba(124, 106, 247, 0.12)',
                border: '1px solid var(--accent-purple)',
                fontSize: '0.78rem',
                color: 'var(--accent-purple-soft)',
              }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Transcribing audio & analyzing triggers...</span>
              </div>
            )}

            {/* Success / Detected Trigger Feedback */}
            {audioSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                marginBottom: 10,
                borderRadius: 8,
                background: 'rgba(78, 205, 196, 0.12)',
                border: '1px solid var(--accent-teal)',
                fontSize: '0.78rem',
                color: 'var(--accent-teal)',
              }}>
                <Sparkles size={14} />
                <span>{audioSuccess}</span>
              </div>
            )}

            {/* Error Feedback */}
            {audioError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                marginBottom: 10,
                borderRadius: 8,
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid var(--accent-rose)',
                fontSize: '0.78rem',
                color: 'var(--accent-rose)',
              }}>
                <AlertCircle size={14} />
                <span>{audioError}</span>
              </div>
            )}

            <textarea
              value={logForm.journal}
              onChange={e => setLogForm(f => ({ ...f, journal: e.target.value }))}
              placeholder="How are you feeling? Speak or type your journal entry here..."
              className="input-field"
              style={{ minHeight: 110, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <button
            onClick={submitLog}
            disabled={submitting || recording || audioProcessing}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {submitting ? <><Loader2 size={15} className="animate-spin" />Saving…</> : '✓ Save Check-In'}
          </button>
        </div>
      </Modal>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  )
}
