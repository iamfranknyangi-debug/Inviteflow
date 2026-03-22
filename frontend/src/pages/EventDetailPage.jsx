// ============================================================
//  EventDetailPage.jsx
// ============================================================
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { eventsAPI } from '../services/api';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useQuery(['event-detail', id], () => eventsAPI.summary(id).then(r=>r.data));
  const ev = data?.data;

  if (!ev) return <div style={{ color:'var(--text3)', padding:40, textAlign:'center' }}>Loading event...</div>;

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={()=>navigate('/events')}>
        ← Back to Events
      </button>
      <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600, marginBottom:6 }}>{ev.name}</h1>
      <p style={{ color:'var(--text3)', fontSize:14, marginBottom:24 }}>📅 {ev.event_date} · 📍 {ev.venue_name}</p>

      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[['Guests',ev.total_guests,'gold'],['Sent',ev.invitations_sent,'blue'],['Confirmed',ev.rsvp_confirmed,'green'],['Attended',ev.attended,'red']].map(([l,v,c])=>(
          <div key={l} className={`stat-card ${c}`}><div className="stat-label">{l}</div><div className="stat-val">{v||0}</div></div>
        ))}
      </div>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[['👥 Manage Guests','/guests'],['🎨 Design Card','/cards'],['📤 Send Invites','/send'],['⬛ QR Codes','/qr'],['✅ RSVP','/rsvp']].map(([l,p])=>(
          <button key={p} className="btn btn-ghost" onClick={()=>navigate(p)}>{l}</button>
        ))}
      </div>
    </>
  );
}
