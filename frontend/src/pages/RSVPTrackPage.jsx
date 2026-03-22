// ============================================================
//  RSVPTrackPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { eventsAPI, rsvpAPI } from '../services/api';
import toast from 'react-hot-toast';

export function RSVPTrackPage() {
  const qc = useQueryClient();
  const [eventId, setEventId] = useState('');
  const [scanId,  setScanId]  = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [tab, setTab] = useState('list');

  const { data: evData }   = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const { data: rsvpData } = useQuery(
    ['rsvp-list', eventId],
    () => rsvpAPI.listByEvent(eventId).then(r=>r.data),
    { enabled: !!eventId }
  );

  const events  = evData?.data || [];
  const entries = rsvpData?.data || [];

  const updateMut = useMutation(
    ({ gid, status }) => rsvpAPI.updateByAdmin(gid, { status }),
    {
      onSuccess: () => { qc.invalidateQueries(['rsvp-list', eventId]); toast.success('Status updated'); },
      onError:   () => toast.error('Update failed'),
    }
  );

  const handleManualScan = async () => {
    if (!scanId.trim()) return;
    // Find guest by code in current list
    const guest = entries.find(e => e.guest_code?.toUpperCase() === scanId.trim().toUpperCase());
    if (!guest) { setScanResult({ error: `Guest "${scanId}" not found` }); return; }
    setScanResult({ guest });
    updateMut.mutate({ gid: guest.guest_id, status: 'confirmed' });
  };

  const confirmed  = entries.filter(e => e.status === 'confirmed').length;
  const declined   = entries.filter(e => e.status === 'declined').length;
  const pending    = entries.filter(e => e.status === 'pending').length;
  const attended   = entries.filter(e => e.checked_in_at).length;

  const statusColor = { confirmed:'var(--success)', declined:'var(--danger)', pending:'var(--warn)', maybe:'var(--accent2)' };

  return (
    <>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>RSVP & Attendance</h1>
      </div>

      {/* Event selector */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20 }}>
        <select className="form-select" style={{ width:300 }} value={eventId} onChange={e=>setEventId(e.target.value)}>
          <option value="">Select event to view...</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
        </select>
      </div>

      {/* Stat cards */}
      {eventId && (
        <div className="stats-grid" style={{ marginBottom:20 }}>
          {[['Confirmed',confirmed,'green','✅'],['Pending',pending,'gold','⏳'],['Declined',declined,'red','✗'],['Attended',attended,'blue','🏁']].map(([l,v,c,i]) => (
            <div key={l} className={`stat-card ${c}`}><div className="stat-icon">{i}</div><div className="stat-label">{l}</div><div className="stat-val">{v}</div></div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        <div className={`tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>Guest List</div>
        <div className={`tab ${tab==='scan'?'active':''}`} onClick={()=>setTab('scan')}>Manual Check-In</div>
      </div>

      {tab === 'list' && (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Guest</th><th>Phone</th><th>RSVP Status</th><th>Plus Ones</th><th>Attended</th><th>Update</th></tr>
              </thead>
              <tbody>
                {!eventId && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Select an event above</td></tr>}
                {eventId && entries.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>No RSVP records yet</td></tr>}
                {entries.map(g => (
                  <tr key={g.guest_id}>
                    <td>
                      <div style={{ fontWeight:500 }}>{g.full_name}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{g.guest_code}{g.is_vip?' ⭐':''}</div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--text2)' }}>{g.phone}</td>
                    <td>
                      <span className="badge" style={{
                        background:`${statusColor[g.status]}22`,
                        color: statusColor[g.status],
                        border:`1px solid ${statusColor[g.status]}44` }}>
                        {g.status}
                      </span>
                    </td>
                    <td style={{ fontSize:13 }}>{g.plus_ones || 0}</td>
                    <td>{g.checked_in_at
                      ? <span className="badge badge-blue">✓ {new Date(g.checked_in_at).toLocaleTimeString()}</span>
                      : <span className="badge badge-gray">—</span>}
                    </td>
                    <td>
                      <select className="form-select" style={{ width:130, padding:'5px 10px', fontSize:12 }}
                        value={g.status}
                        onChange={e => updateMut.mutate({ gid: g.guest_id, status: e.target.value })}>
                        <option value="pending">⏳ Pending</option>
                        <option value="confirmed">✓ Confirmed</option>
                        <option value="declined">✗ Declined</option>
                        <option value="maybe">? Maybe</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'scan' && (
        <div style={{ maxWidth:480 }}>
          <div className="card" style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⬛</div>
            <div style={{ fontWeight:500, marginBottom:6 }}>Camera QR Scanner</div>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>Point your device camera at a guest QR code</div>
            <button className="btn btn-primary" onClick={()=>toast.success('Camera scanning — implement with jsQR or ZXing library')}>
              📷 Open Camera
            </button>
          </div>
          <div className="card">
            <div style={{ fontWeight:500, marginBottom:12 }}>Manual Entry</div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <input className="form-input" placeholder="Enter Guest Code e.g. G-00001"
                value={scanId} onChange={e=>setScanId(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleManualScan()} style={{ flex:1 }} />
              <button className="btn btn-primary" onClick={handleManualScan}>Verify</button>
            </div>
            {scanResult && (
              scanResult.error
                ? <div style={{ color:'var(--danger)', fontSize:13, padding:'10px 14px', background:'rgba(255,95,114,.1)', borderRadius:8 }}>✕ {scanResult.error}</div>
                : <div style={{ background:'rgba(63,203,138,.1)', border:'1px solid rgba(63,203,138,.3)', borderRadius:10, padding:16 }}>
                    <div style={{ color:'var(--success)', fontWeight:600, marginBottom:8 }}>✓ Guest Verified!</div>
                    <div style={{ fontWeight:500 }}>{scanResult.guest.full_name}</div>
                    <div style={{ fontSize:13, color:'var(--text3)' }}>{scanResult.guest.guest_code}</div>
                  </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RSVPTrackPage;
