import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import IndividualDashboard from './pages/IndividualDashboard'
import AssessmentsTake from './pages/AssessmentsTake'
import ClinicianWorkstation from './pages/ClinicianWorkstation'
import { Loader2 } from 'lucide-react'

// Protected route wrapper
function Protected({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'clinician' ? '/clinician' : '/dashboard'} replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={36} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {user && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to={user.role === 'clinician' ? '/clinician' : '/dashboard'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'clinician' ? '/clinician' : '/dashboard'} /> : <Register />} />

        {/* Individual routes */}
        <Route path="/dashboard" element={<Protected role="individual"><IndividualDashboard /></Protected>} />
        <Route path="/assessments" element={<Protected role="individual"><AssessmentsTake /></Protected>} />

        {/* Clinician routes */}
        <Route path="/clinician" element={<Protected role="clinician"><ClinicianWorkstation /></Protected>} />

        {/* Default redirect */}
        <Route path="*" element={
          user
            ? <Navigate to={user.role === 'clinician' ? '/clinician' : '/dashboard'} />
            : <Navigate to="/login" />
        } />
      </Routes>
    </div>
  )
}
