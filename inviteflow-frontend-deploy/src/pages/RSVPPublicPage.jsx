import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { rsvpAPI } from '../services/api';

export default function RSVPPublicPage() {
  const { token } = useParams();
  const [info, setInfo]   = useState(null);
  const [done, setDone]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ status:'confirmed', plus_ones:0, response_note:'' });

  useEffect(() => {
    rsvpAPI.getByToken(token)
      .then(r => { setInfo(r.data.data); if(r.data.data.status!=='pending') setDone(true); })
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await rsvpAPI.respond(token, form);
      setDone(true);
    } catch { alert('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const s = {
    wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#0a0c10,#1a1035)', fontFamily:'sans-serif', padding:20 },
    card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(212,168,67,0.25)',
            borderRadius:20, padding:'36px 32px', maxWidth:460, width:'100%' },
    input: { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
             borderRadius:8, padding:'9px 14px', fontSize:14, color:'#fff', width:'100%',
             outline:'none', fontFamily:'sans-serif', boxSizing:'border-box' },
    btn: { padding:'11px 28px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600,
           background:'linear-gradient(135deg,#b8892e,#f0c460)', color:'#1a0f00', fontSize:15, width:'100%' },
  };

  if (loading) return <div style={s.wrap}><div style={{ color:'#d4a843' }}>Loading...</div></div>;
  if (!info)   return <div style={s.wrap}><div style={{ color:'#ff5f72', textAlign:'center' }}>Invalid RSVP link.</div></div>;

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:11, letterSpacing:3, color:'#d4a843', marginBottom:10 }}>✦ YOU ARE INVITED ✦</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#fff', fontFamily:'Georgia,serif', marginBottom:4 }}>{info.event_name}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{info.event_date} · {info.event_time} · {info.venue_name}</div>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{form.status==='confirmed'?'🎉':'💌'}</div>
            <div style={{ fontSize:18, fontWeight:600, color:'#fff', marginBottom:8 }}>
              {form.status==='confirmed' ? 'See you there!' : 'Thank you for letting us know!'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:15, color:'#fff', marginBottom:20 }}>
              Dear <strong style={{ color:'#d4a843' }}>{info.full_name}</strong>, will you be joining us?
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              {['confirmed','declined','maybe'].map(st => (
                <button key={st} onClick={()=>setForm({...form,status:st})}
                  style={{ flex:1, padding:'10px 4px', borderRadius:10, cursor:'pointer', fontSize:13,
                    background: form.status===st?'rgba(212,168,67,0.2)':'rgba(255,255,255,0.05)',
                    border:`1px solid ${form.status===st?'#d4a843':'rgba(255,255,255,0.1)'}`,
                    color: form.status===st?'#d4a843':'rgba(255,255,255,0.6)', fontWeight:form.status===st?600:400 }}>
                  {st==='confirmed'?'✓ Attending':st==='declined'?'✗ Decline':'? Maybe'}
                </button>
              ))}
            </div>
            {form.status==='confirmed' && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Plus ones</div>
                <input style={s.input} type="number" min={0} max={5} value={form.plus_ones}
                  onChange={e=>setForm({...form,plus_ones:+e.target.value})} />
              </div>
            )}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Message (optional)</div>
              <textarea style={{ ...s.input, minHeight:70, resize:'vertical' }}
                value={form.response_note} onChange={e=>setForm({...form,response_note:e.target.value})} />
            </div>
            <button style={s.btn} onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm Response →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
