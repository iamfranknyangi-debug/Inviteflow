// ============================================================
//  VerifyPage.jsx — public QR scan result page
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { qrAPI } from '../services/api';

export function VerifyPage() {
  const { token } = useParams();
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qrAPI.verify(token)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Invalid QR code'))
      .finally(() => setLoading(false));
  }, [token]);

  const style = {
    wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#0a0c10,#1a1035)', fontFamily:'sans-serif', padding:20 },
    card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(212,168,67,0.3)', borderRadius:20,
            padding:'40px 36px', maxWidth:420, width:'100%', textAlign:'center', backdropFilter:'blur(10px)' },
    gold: { color:'#d4a843' },
    text: { color:'rgba(255,255,255,0.85)' },
    muted:{ color:'rgba(255,255,255,0.45)', fontSize:13 },
  };

  if (loading) return <div style={style.wrap}><div style={style.card}><div style={{ color:'#d4a843', fontSize:20 }}>Verifying...</div></div></div>;

  if (error) return (
    <div style={style.wrap}>
      <div style={style.card}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ color:'#ff5f72', fontSize:18, fontWeight:600, marginBottom:8 }}>Invalid QR Code</div>
        <div style={style.muted}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={style.wrap}>
      <div style={style.card}>
        <div style={{ fontSize:48, marginBottom:16 }}>
          {data.checked_in_at ? '✅' : '🎟'}
        </div>
        <div style={{ fontSize:11, letterSpacing:3, color:'#d4a843', marginBottom:12, textTransform:'uppercase' }}>
          ✦ InviteFlow Verification ✦
        </div>
        <div style={{ fontSize:26, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'Georgia,serif' }}>
          {data.full_name}
        </div>
        <div style={{ fontSize:13, color:'#d4a843', marginBottom:20 }}>{data.guest_code}</div>

        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:18, marginBottom:20, textAlign:'left' }}>
          {[
            ['📅 Event', data.event_name],
            ['🗓 Date', data.event_date],
            ['🕖 Time', data.event_time],
            ['📍 Venue', data.venue_name],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={style.muted}>{k}</span>
              <span style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{
          padding:'10px 20px', borderRadius:30,
          background: data.rsvp_status==='confirmed' ? 'rgba(63,203,138,0.15)' : 'rgba(240,168,67,0.15)',
          border: `1px solid ${data.rsvp_status==='confirmed' ? 'rgba(63,203,138,0.4)' : 'rgba(240,168,67,0.4)'}`,
          color: data.rsvp_status==='confirmed' ? '#3fcb8a' : '#f0a843',
          fontSize:14, fontWeight:500,
        }}>
          {data.rsvp_status === 'confirmed' ? '✓ Attendance Confirmed' : `RSVP: ${data.rsvp_status}`}
        </div>

        {data.checked_in_at && (
          <div style={{ marginTop:12, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
            Checked in at {new Date(data.checked_in_at).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  RSVPPublicPage.jsx — guest RSVP confirmation page
// ============================================================
export function RSVPPublicPage() {
  const { token } = useParams();
  const [info, setInfo]   = useState(null);
  const [done, setDone]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ status:'confirmed', plus_ones:0, response_note:'' });

  useEffect(() => {
    import('../services/api').then(({ rsvpAPI }) => {
      rsvpAPI.getByToken(token)
        .then(r => { setInfo(r.data.data); if(r.data.data.status!=='pending') setDone(true); })
        .catch(() => setInfo(null))
        .finally(() => setLoading(false));
    });
  }, [token]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { rsvpAPI } = await import('../services/api');
      await rsvpAPI.respond(token, form);
      setDone(true);
    } catch { alert('Submission failed, please try again.'); }
    finally { setSubmitting(false); }
  };

  const style = {
    wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#0a0c10,#1a1035)', fontFamily:'sans-serif', padding:20 },
    card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(212,168,67,0.25)', borderRadius:20,
            padding:'36px 32px', maxWidth:460, width:'100%', backdropFilter:'blur(10px)' },
    label:{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:6, display:'block' },
    input:{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8,
            padding:'9px 14px', fontSize:14, color:'#fff', width:'100%', outline:'none', fontFamily:'sans-serif' },
    btn:  { padding:'11px 28px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600,
            background:'linear-gradient(135deg,#b8892e,#f0c460)', color:'#1a0f00', fontSize:15 },
  };

  if (loading) return <div style={style.wrap}><div style={{ color:'#d4a843' }}>Loading...</div></div>;
  if (!info)   return <div style={style.wrap}><div style={{ color:'#ff5f72' }}>Invalid RSVP link.</div></div>;

  return (
    <div style={style.wrap}>
      <div style={style.card}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:11, letterSpacing:3, color:'#d4a843', marginBottom:10, textTransform:'uppercase' }}>
            ✦ You're Invited ✦
          </div>
          <div style={{ fontSize:24, fontWeight:700, color:'#fff', fontFamily:'Georgia,serif', marginBottom:4 }}>
            {info.event_name}
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>
            {info.event_date} · {info.event_time} · {info.venue_name}
          </div>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{form.status==='confirmed'?'🎉':'💌'}</div>
            <div style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8 }}>
              {form.status==='confirmed' ? 'See you there!' : 'Thank you for letting us know!'}
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>
              {form.status==='confirmed' ? 'Your attendance is confirmed. We look forward to celebrating with you.' : 'We appreciate your response.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:16, color:'#fff', marginBottom:20 }}>
              Dear <strong style={{ color:'#d4a843' }}>{info.full_name}</strong>, will you be joining us?
            </div>

            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              {['confirmed','declined','maybe'].map(s => (
                <button key={s} onClick={()=>setForm({...form,status:s})}
                  style={{ flex:1, padding:'10px 4px', borderRadius:10, cursor:'pointer', fontSize:13,
                    background: form.status===s ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.status===s ? '#d4a843' : 'rgba(255,255,255,0.1)'}`,
                    color: form.status===s ? '#d4a843' : 'rgba(255,255,255,0.6)', fontWeight: form.status===s?600:400 }}>
                  {s==='confirmed'?'✓ Attending':s==='declined'?'✗ Decline':'? Maybe'}
                </button>
              ))}
            </div>

            {form.status==='confirmed' && (
              <div style={{ marginBottom:14 }}>
                <label style={style.label}>Plus ones (additional guests)</label>
                <input style={style.input} type="number" min={0} max={5} value={form.plus_ones}
                  onChange={e=>setForm({...form,plus_ones:+e.target.value})} />
              </div>
            )}

            <div style={{ marginBottom:20 }}>
              <label style={style.label}>Message (optional)</label>
              <textarea style={{ ...style.input, minHeight:70, resize:'vertical' }}
                placeholder="Any notes or message for the host..."
                value={form.response_note} onChange={e=>setForm({...form,response_note:e.target.value})} />
            </div>

            <button style={style.btn} onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm Response →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyPage;
