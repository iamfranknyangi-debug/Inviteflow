// ============================================================
//  ReportsPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { reportsAPI, eventsAPI } from '../services/api';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

function FunnelBar({ label, value, percent, maxVal, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:13, color:'var(--text2)' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:500 }}>
          {value} <span style={{ color:'var(--text3)', fontSize:11 }}>({percent}%)</span>
        </span>
      </div>
      <div style={{ height:10, background:'var(--bg4)', borderRadius:5, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:5, width:`${percent}%`,
          background: color || 'linear-gradient(90deg,var(--gold3),var(--gold2))',
          transition:'.6s', opacity: 0.85 + (percent/100)*0.15 }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const { data: evData }    = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const { data: dashData }  = useQuery('reports-dash', () => reportsAPI.dashboard().then(r=>r.data.data));
  const { data: evReport }  = useQuery(
    ['reports-event', selectedEvent], () => reportsAPI.event(selectedEvent).then(r=>r.data.data),
    { enabled: !!selectedEvent }
  );

  const events = evData?.data || [];
  const s = dashData;

  const exportCSV = async () => {
    if (!selectedEvent) return toast.error('Select an event first');
    try {
      const { data } = await reportsAPI.exportCSV(selectedEvent);
      saveAs(new Blob([data], { type:'text/csv' }), `guests-report.csv`);
      toast.success('CSV downloaded');
    } catch { toast.error('Export failed'); }
  };

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Reports & Analytics</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Full overview of invitation performance</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Global stats */}
      <div className="stats-grid" style={{ marginBottom:28 }}>
        {[
          ['Total Events',    s?.total_events,     'gold',  '📅'],
          ['Total Guests',    s?.total_guests,     'blue',  '👥'],
          ['Invites Sent',    s?.invitations_sent, 'green', '📤'],
          ['Confirmed RSVP',  s?.rsvp_confirmed,   'red',   '✅'],
        ].map(([label,val,color,icon]) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-val">{val ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Event selector */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <label style={{ fontWeight:500, fontSize:14 }}>Deep-dive into event:</label>
          <select className="form-select" style={{ width:300 }} value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}>
            <option value="">Select an event...</option>
            {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{ alignItems:'flex-start', gap:20 }}>
        {/* Left */}
        <div style={{ flex:1.5, minWidth:0 }}>
          {/* Funnel */}
          {s && (
            <div className="card" style={{ marginBottom:20 }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:20 }}>Invitation Funnel (All Events)</div>
              {[
                ['Total Guests',    s.total_guests,      100],
                ['Invites Sent',    s.invitations_sent,  s.total_guests ? Math.round(s.invitations_sent/s.total_guests*100):0],
                ['Responded',       s.rsvp_confirmed+s.rsvp_declined, s.total_guests ? Math.round((s.rsvp_confirmed+s.rsvp_declined)/s.total_guests*100):0],
                ['Confirmed',       s.rsvp_confirmed,    s.total_guests ? Math.round(s.rsvp_confirmed/s.total_guests*100):0],
                ['Attended',        s.total_attended,    s.total_guests ? Math.round(s.total_attended/s.total_guests*100):0],
              ].map(([l,v,p]) => <FunnelBar key={l} label={l} value={v||0} percent={p||0} />)}
            </div>
          )}

          {/* Events breakdown table */}
          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'18px 20px', fontFamily:'Georgia,serif', fontSize:17, fontWeight:600 }}>Events Summary</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th><th>Guests</th><th>Sent</th><th>Confirmed</th><th>Attended</th><th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => {
                    const rate = e.invitations_sent ? Math.round((e.rsvp_confirmed||0)/e.invitations_sent*100) : 0;
                    return (
                      <tr key={e.id}>
                        <td><span style={{ marginRight:8 }}>{e.emoji}</span>{e.name}</td>
                        <td>{e.total_guests||0}</td>
                        <td>{e.invitations_sent||0}</td>
                        <td>{e.rsvp_confirmed||0}</td>
                        <td>{e.attended||0}</td>
                        <td><span className={`badge ${rate>=70?'badge-green':rate>=40?'badge-yellow':'badge-gray'}`}>{rate}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* RSVP pie-style bars */}
          {s && (
            <div className="card" style={{ marginBottom:20 }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:18 }}>RSVP Breakdown</div>
              <div className="chart-bar-wrap">
                {[
                  ['Confirmed', s.rsvp_confirmed, 'var(--success)'],
                  ['Pending',   s.rsvp_pending,   'var(--warn)'],
                  ['Declined',  s.rsvp_declined,  'var(--danger)'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:12, fontSize:13 }}>
                    <div style={{ width:80, textAlign:'right', fontSize:12, color:'var(--text2)' }}>{l}</div>
                    <div style={{ flex:1, height:8, background:'var(--bg4)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:4, background:c, width:`${s.total_guests?Math.round(v/s.total_guests*100):0}%`, transition:'.6s' }} />
                    </div>
                    <div style={{ width:40, fontSize:12, color:'var(--text2)' }}>{v||0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-event report */}
          {evReport && (
            <div className="card">
              <div style={{ fontFamily:'Georgia,serif', fontSize:16, fontWeight:600, marginBottom:16 }}>Event Detail</div>
              {[
                ['Total Guests',   evReport.summary?.total_guests],
                ['Invites Sent',   evReport.summary?.invitations_sent],
                ['Confirmed',      evReport.summary?.rsvp_confirmed],
                ['Declined',       evReport.summary?.rsvp_declined],
                ['Pending',        evReport.summary?.rsvp_pending],
                ['Attended',       evReport.summary?.attended],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:14 }}>
                  <span style={{ color:'var(--text2)' }}>{l}</span>
                  <span style={{ fontWeight:500 }}>{v??'—'}</span>
                </div>
              ))}

              {evReport.channels?.length > 0 && (
                <>
                  <div style={{ fontWeight:500, fontSize:13, marginTop:16, marginBottom:10, color:'var(--text3)' }}>By Channel</div>
                  {evReport.channels.map(ch => (
                    <div key={ch.channel} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13 }}>
                      <span style={{ textTransform:'capitalize' }}>
                        {ch.channel==='sms'?'📱':'💬'} {ch.channel}
                      </span>
                      <span>{ch.sent} sent · {ch.failed} failed</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
