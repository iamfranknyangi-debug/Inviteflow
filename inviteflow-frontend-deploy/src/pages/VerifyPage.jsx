import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { qrAPI } from '../services/api';

export default function VerifyPage() {
  const { token } = useParams();
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qrAPI.verify(token)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Invalid QR code'))
      .finally(() => setLoading(false));
  }, [token]);

  const s = {
    wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#0a0c10,#1a1035)', fontFamily:'sans-serif', padding:20 },
    card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(212,168,67,0.3)',
            borderRadius:20, padding:'40px 36px', maxWidth:420, width:'100%', textAlign:'center' },
  };

  if (loading) return <div style={s.wrap}><div style={{ color:'#d4a843', fontSize:20 }}>Verifying...</div></div>;

  if (error) return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ color:'#ff5f72', fontSize:18, fontWeight:600, marginBottom:8 }}>Invalid QR Code</div>
        <div style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ fontSize:48, marginBottom:16 }}>{data.checked_in_at ? '✅' : '🎟'}</div>
        <div style={{ fontSize:11, letterSpacing:3, color:'#d4a843', marginBottom:12 }}>✦ VERIFIED ✦</div>
        <div style={{ fontSize:26, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'Georgia,serif' }}>{data.full_name}</div>
        <div style={{ fontSize:13, color:'#d4a843', marginBottom:20 }}>{data.guest_code}</div>
        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:18, marginBottom:20, textAlign:'left' }}>
          {[['📅 Event',data.event_name],['🗓 Date',data.event_date],['🕖 Time',data.event_time],['📍 Venue',data.venue_name]].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>{k}</span>
              <span style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 20px', borderRadius:30, fontSize:14, fontWeight:500,
          background: data.rsvp_status==='confirmed'?'rgba(63,203,138,0.15)':'rgba(240,168,67,0.15)',
          border: `1px solid ${data.rsvp_status==='confirmed'?'rgba(63,203,138,0.4)':'rgba(240,168,67,0.4)'}`,
          color: data.rsvp_status==='confirmed'?'#3fcb8a':'#f0a843' }}>
          {data.rsvp_status==='confirmed'?'✓ Attendance Confirmed':`RSVP: ${data.rsvp_status}`}
        </div>
      </div>
    </div>
  );
}
