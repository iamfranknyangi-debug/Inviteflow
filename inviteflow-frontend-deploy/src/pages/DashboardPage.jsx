// ============================================================
//  DashboardPage.jsx
// ============================================================
import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, eventsAPI } from '../services/api';
import { format } from 'date-fns';

function StatCard({ label, value, sub, color, icon, progress }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {progress != null && (
        <div className="progress-track" style={{ marginTop:8 }}>
          <div className="progress-fill" style={{ width:`${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats }  = useQuery('dashboard', () => reportsAPI.dashboard().then(r=>r.data.data));
  const { data: evData } = useQuery('events-list', () => eventsAPI.list({ limit:5 }).then(r=>r.data));

  const events = evData?.data || [];

  const rsvpBars = stats ? [
    { label:'Confirmed', val:stats.rsvp_confirmed, total:stats.total_guests, color:'var(--success)' },
    { label:'Pending',   val:stats.rsvp_pending,   total:stats.total_guests, color:'var(--warn)' },
    { label:'Declined',  val:stats.rsvp_declined,  total:stats.total_guests, color:'var(--danger)' },
    { label:'Not Sent',  val:(stats.total_guests-stats.invitations_sent), total:stats.total_guests, color:'var(--text3)' },
  ] : [];

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Dashboard</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Welcome back — here's your overview</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Guests"       value={stats?.total_guests}     icon="👥" color="gold" sub={`Across ${stats?.total_events||0} events`} />
        <StatCard label="Invitations Sent"   value={stats?.invitations_sent} icon="📤" color="blue"
          progress={stats ? Math.round((stats.invitations_sent/Math.max(stats.total_guests,1))*100) : 0} />
        <StatCard label="RSVP Confirmed"     value={stats?.rsvp_confirmed}   icon="✅" color="green"
          sub={stats?.invitations_sent ? `${Math.round(stats.rsvp_confirmed/stats.invitations_sent*100)}% response rate` : ''} />
        <StatCard label="Attended"           value={stats?.total_attended}   icon="🏁" color="red"
          sub={stats?.rsvp_confirmed ? `${Math.round(stats.total_attended/stats.rsvp_confirmed*100)}% of confirmed` : ''} />
      </div>

      <div className="row" style={{ alignItems:'flex-start', gap:20 }}>
        {/* Left col */}
        <div style={{ flex:1.6, minWidth:0 }}>
          <div className="card">
            <div className="section-header" style={{ marginBottom:16 }}>
              <span className="section-title">Upcoming Events</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/events')}>View All</button>
            </div>
            {events.length === 0 && <p style={{ color:'var(--text3)', fontSize:14 }}>No events yet. <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/events')}>Create one →</button></p>}
            {events.map(ev => (
              <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid var(--border)' }}
                onClick={()=>navigate(`/events/${ev.id}`)} className="node">
                <div style={{ width:42, height:42, background:'var(--bg4)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {ev.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{ev.event_date} · {ev.venue_name?.split(',')[0]}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{ev.rsvp_confirmed||0}/{ev.total_guests||0}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>confirmed</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="card">
            <div style={{ fontFamily:'Georgia,serif', fontSize:16, fontWeight:600, marginBottom:16 }}>RSVP Overview</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {rsvpBars.map(({ label, val, total, color }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:12, fontSize:13 }}>
                  <div style={{ width:80, color:'var(--text2)', textAlign:'right', fontSize:12 }}>{label}</div>
                  <div style={{ flex:1, height:8, background:'var(--bg4)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:color, width:`${total?Math.round(val/total*100):0}%`, transition:'.6s' }} />
                  </div>
                  <div style={{ width:32, fontSize:12, color:'var(--text2)' }}>{val||0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop:16 }}>
            <div style={{ fontFamily:'Georgia,serif', fontSize:16, fontWeight:600, marginBottom:16 }}>Quick Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['👥', 'Add Guests', '/guests'],
                ['🎨', 'Design Card', '/cards'],
                ['📤', 'Send Invites', '/send'],
                ['⬛', 'QR Codes', '/qr'],
              ].map(([icon, label, path]) => (
                <button key={path} className="btn btn-ghost" style={{ justifyContent:'flex-start', gap:10 }}
                  onClick={()=>navigate(path)}>
                  {icon} {label}
                </button>
              ))}
              <button className="btn btn-primary" style={{ justifyContent:'center' }} onClick={()=>navigate('/reports')}>
                📊 Full Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
