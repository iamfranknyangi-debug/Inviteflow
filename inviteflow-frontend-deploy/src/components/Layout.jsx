// ============================================================
//  Layout.jsx — Sidebar + Topbar shell
// ============================================================
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

const NAV = [
  { section: 'Main' },
  { to:'/dashboard', icon:'⊞', label:'Dashboard' },
  { to:'/events',    icon:'📅', label:'Events' },
  { section: 'Invitations' },
  { to:'/guests',    icon:'👥', label:'Guests' },
  { to:'/cards',     icon:'🎨', label:'Card Designer' },
  { to:'/qr',        icon:'⬛', label:'QR Codes' },
  { to:'/send',      icon:'📤', label:'Send Invites' },
  { section: 'Tracking' },
  { to:'/rsvp',      icon:'✅', label:'RSVP' },
  { to:'/reports',   icon:'📊', label:'Reports' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:90, display:'none' }}
          className="mobile-overlay" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">✉</div>
          <span className="logo-text">InviteFlow</span>
        </div>

        <nav className="nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <span className="ni">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">
              {user?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.full_name || 'Admin'}</div>
              <div className="user-role">{user?.role || 'Administrator'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
            onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-sm mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div style={{ flex:1 }} />
          <div className="topbar-actions">
            <div className="avatar" style={{ width:34, height:34, cursor:'pointer', fontSize:13 }}>
              {user?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>
        <main style={{ padding:28, flex:1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
