import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brain, LayoutDashboard, ClipboardList, Users, LogOut, Menu, X, ChevronRight } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const individualLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/assessments', icon: ClipboardList, label: 'Assessments' },
  ]

  const clinicianLinks = [
    { to: '/clinician', icon: Users, label: 'Workstation' },
  ]

  const links = user?.role === 'clinician' ? clinicianLinks : individualLinks

  return (
    <nav style={{
      background: 'rgba(13,13,20,0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--accent-purple-soft), var(--accent-teal-soft))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NeuroPortal
          </span>
        </NavLink>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9,
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s',
                color: isActive ? 'var(--accent-purple-soft)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(124,106,247,0.12)' : 'transparent',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* User info + logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="hidden md:flex">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.pronouns} · {user.role}</span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
              {user.name?.[0]}
            </div>
            <button onClick={handleLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 8, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-rose)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={18} />
            </button>
            {/* Mobile menu */}
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none' }} className="md:hidden">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                color: isActive ? 'var(--accent-purple-soft)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(124,106,247,0.1)' : 'transparent', fontWeight: 500,
              })}
            >
              <Icon size={17} />{label}<ChevronRight size={14} style={{ marginLeft: 'auto' }} />
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
